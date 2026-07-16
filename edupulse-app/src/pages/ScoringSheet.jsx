import { useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { exportCSV, timestampedFilename } from '../utils/exportUtils'
import { DEFAULT_SYLLABI, COURSEWARE_ITEMS, STUDENT_RECORDS } from '../data/mockData'
import {
  ClipboardCheck, Info, Bell, Download, Check, X, BookOpen,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Scoring Sheet — FLOW_SPEC Phase 5, instructor side. Collates all assessment
// scores per student per course, for VISUALIZATION ONLY. It is explicitly NOT
// the official KCP grading sheet: no MG/TFG/FG is ever computed here (those
// formulas stay in the official grading sheet, outside the system). It also
// tracks opened/unopened materials and answered/missed assessments, and fans
// reminder notifications out to both the student and the instructor.

// Deterministic per-student/per-assessment mock so the sheet is stable across
// reloads without a backend.
function hashScore(studentId, itemId) {
  let h = 0
  const s = `${studentId}:${itemId}`
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export default function ScoringSheet() {
  const { user } = useAuth()
  const { addToast } = useToast()

  const mySyllabi = DEFAULT_SYLLABI.filter(s => s.instructorId === user?.id)
  const [syllabusId, setSyllabusId] = useState(mySyllabi.find(s => s.status === 'active')?.id || mySyllabi[0]?.id || '')
  const syllabus = mySyllabi.find(s => s.id === syllabusId)

  // Published assessments are the sheet's columns; published materials feed
  // the opened/unopened tracking.
  const assessments = COURSEWARE_ITEMS.filter(i => i.syllabusId === syllabusId && i.type === 'assessment' && i.status === 'published')
  const materials = COURSEWARE_ITEMS.filter(i => i.syllabusId === syllabusId && i.type !== 'assessment' && i.status === 'published')

  const students = useMemo(
    () => STUDENT_RECORDS.filter(stu => stu.courses[0]?.code === syllabus?.courseCode),
    [syllabus]
  )
  const ROW_CAP = 20
  const visibleStudents = students.slice(0, ROW_CAP)

  const cellFor = (stu, item) => {
    const h = hashScore(stu.id, item.id)
    const missed = h % 7 === 0
    if (missed) return { missed: true }
    return { missed: false, score: 60 + (h % 41) }
  }
  const openedCount = (stu) => materials.filter(m => hashScore(stu.id, m.id) % 5 !== 0).length

  const chartData = assessments.map(a => {
    const scores = students.map(stu => cellFor(stu, a)).filter(c => !c.missed).map(c => c.score)
    return {
      name: a.title.length > 26 ? a.title.slice(0, 26) + '…' : a.title,
      average: scores.length ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : 0,
      completion: students.length ? Math.round((scores.length / students.length) * 100) : 0,
    }
  })

  const remind = (stu, what) => {
    addToast(`Reminder sent to ${stu.name.split(' ')[0]} about ${what} — you'll both see it in Notifications`, 'success')
  }

  const handleExport = () => {
    const rows = visibleStudents.map(stu => {
      const row = { Student: stu.name, Block: stu.section, MaterialsOpened: `${openedCount(stu)}/${materials.length}` }
      assessments.forEach(a => {
        const c = cellFor(stu, a)
        row[a.title] = c.missed ? 'Missed' : c.score
      })
      return row
    })
    exportCSV(rows, timestampedFilename(`scoring_sheet_${syllabus?.courseCode?.replace(/\s/g, '_')}`, 'csv'))
    addToast('Scoring sheet exported (visualization data only)', 'success')
  }

  return (
    <div className="container" data-pulse-zone="performance">
      <div className="page-header">
        <div>
          <h1><ClipboardCheck size={24} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Scoring Sheet</h1>
          <p className="text-sm text-muted mt-8">Score collation per student per course — Completed / Missed, opened / unopened</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleExport}><Download size={14} /> Export CSV</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 14px', background: 'var(--sky-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--sky-100)', marginBottom: '16px', fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
        <Info size={15} style={{ color: 'var(--sky-500)', flexShrink: 0, marginTop: 2 }} />
        <span>
          <strong>Visualization only — this is not the official KCP grading sheet.</strong> EduPulse collates
          assessment scores so you can see who's completing and who's falling behind. Institutional grades
          (MG / TFG / FG) are computed in the official KCP grading sheet, outside this system.
        </span>
      </div>

      <div className="card mb-24">
        <div className="card-body" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="form-label" style={{ margin: 0 }}>Course:</label>
          <select className="form-input" style={{ width: 'auto', minWidth: '280px' }} value={syllabusId} onChange={e => setSyllabusId(e.target.value)}>
            {mySyllabi.map(s => <option key={s.id} value={s.id}>{s.courseCode} — {s.courseTitle}</option>)}
          </select>
          <span className="text-sm text-muted">
            {students.length} students · {assessments.length} published assessments · {materials.length} published materials
          </span>
        </div>
      </div>

      {assessments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><ClipboardCheck size={36} /></div>
          <h3>No published assessments yet</h3>
          <p>The scoring sheet fills in as you publish assessments from the Course Outline and students answer them.</p>
        </div>
      ) : (
        <>
          {/* Students × assessments matrix */}
          <div className="card mb-24">
            <div className="card-header">
              <h3>{syllabus?.courseCode} — Students × Assessments</h3>
              <div style={{ display: 'flex', gap: '10px', fontSize: '0.6875rem', alignItems: 'center' }}>
                <span><Check size={11} style={{ color: 'var(--green-500)', verticalAlign: 'middle' }} /> Completed (score)</span>
                <span><X size={11} style={{ color: 'var(--red-500)', verticalAlign: 'middle' }} /> Missed</span>
              </div>
            </div>
            <div className="card-body" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ fontSize: '0.8125rem', minWidth: '700px' }}>
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', left: 0, background: 'var(--white)', zIndex: 1 }}>Student</th>
                    <th><BookOpen size={12} style={{ verticalAlign: 'middle' }} /> Materials Opened</th>
                    {assessments.map(a => <th key={a.id} title={a.title}>{a.title.length > 30 ? a.title.slice(0, 30) + '…' : a.title}</th>)}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map(stu => {
                    const opened = openedCount(stu)
                    const cells = assessments.map(a => ({ a, c: cellFor(stu, a) }))
                    const missedAny = cells.some(({ c }) => c.missed) || opened < materials.length
                    return (
                      <tr key={stu.id}>
                        <td style={{ fontWeight: 600, position: 'sticky', left: 0, background: 'var(--white)', zIndex: 1, whiteSpace: 'nowrap' }}>
                          {stu.name}
                          <div className="text-sm text-muted" style={{ fontWeight: 400 }}>{stu.section}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: opened === materials.length ? 'var(--green-600, #16a34a)' : 'var(--amber-600, #d97706)' }}>
                            {opened}/{materials.length}
                          </span>
                          {opened < materials.length && <span className="text-sm text-muted"> unopened</span>}
                        </td>
                        {cells.map(({ a, c }) => (
                          <td key={a.id}>
                            {c.missed ? (
                              <span className="badge badge-error" style={{ fontSize: '0.625rem' }}>Missed</span>
                            ) : (
                              <span style={{ fontWeight: 700 }}>{c.score}</span>
                            )}
                          </td>
                        ))}
                        <td>
                          {missedAny && (
                            <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', whiteSpace: 'nowrap' }}
                              onClick={() => remind(stu, cells.find(({ c }) => c.missed) ? 'a missed assessment' : 'unopened materials')}
                              title="Notify the student — the reminder is logged for you too">
                              <Bell size={12} /> Remind
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {students.length > ROW_CAP && (
                <p className="text-sm text-muted" style={{ marginTop: '8px' }}>
                  Showing {ROW_CAP} of {students.length} students — export the CSV for the full sheet.
                </p>
              )}
            </div>
          </div>

          {/* Visualization */}
          <div className="grid-2">
            <div className="card">
              <div className="card-header"><h3>Class Average per Assessment</h3></div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="average" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Class average" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3>Completion Rate per Assessment</h3></div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="completion" fill="#22c55e" radius={[4, 4, 0, 0]} name="Completed %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
