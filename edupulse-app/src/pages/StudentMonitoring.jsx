import { useState, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useContentStore } from '../context/ContentStoreContext'
import { exportCSV, timestampedFilename } from '../utils/exportUtils'
import { DEFAULT_SYLLABI, COURSEWARE_ITEMS, STUDENT_RECORDS } from '../data/mockData'
import {
  ClipboardCheck, Info, Bell, Download, Check, X, BookOpen,
  Users, AlertTriangle, Eye, EyeOff, FileText, FlaskConical,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Student Monitoring — FLOW_SPEC Phase 5, instructor side.
// Two tabs: Assessment Scores (auto-recorded) and Learning Material Access.
// Tracks missing activities and unopened documents; instructor can remind students.

function hashScore(studentId, itemId) {
  let h = 0
  const s = `${studentId}:${itemId}`
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

const TABS = [
  { key: 'assessments', label: 'Assessment Scores', icon: ClipboardCheck },
  { key: 'materials', label: 'Learning Material Access', icon: BookOpen },
]

const ROW_CAP = 25

export default function StudentMonitoring() {
  const { user } = useAuth()
  const { addToast } = useToast()

  if (user?.role !== 'instructor') return <Navigate to="/dashboard" replace />

  const mySyllabi = DEFAULT_SYLLABI.filter(s => s.instructorId === user?.id)
  const [syllabusId, setSyllabusId] = useState(mySyllabi.find(s => s.status === 'active')?.id || mySyllabi[0]?.id || '')
  const [activeTab, setActiveTab] = useState('assessments')
  const syllabus = mySyllabi.find(s => s.id === syllabusId)
  const { store: contentStore } = useContentStore()

  // Merge COURSEWARE_ITEMS with contentStore items for this syllabus
  const csItems = useMemo(() => {
    return Object.entries(contentStore)
      .filter(([_, item]) => item.syllabusId === syllabusId && item.status === 'published')
      .map(([id, item]) => ({
        id,
        syllabusId: item.syllabusId,
        type: item.type,
        title: item.title,
        status: item.status,
        week: item.week,
      }))
  }, [contentStore, syllabusId])

  const assessments = useMemo(() => {
    const base = COURSEWARE_ITEMS.filter(i => i.syllabusId === syllabusId && i.type === 'assessment' && i.status === 'published')
    const csAssess = csItems.filter(i => i.type === 'assessment')
    const ids = new Set(base.map(i => i.id))
    return [...base, ...csAssess.filter(i => !ids.has(i.id))]
  }, [syllabusId, csItems])

  const materials = useMemo(() => {
    const base = COURSEWARE_ITEMS.filter(i => i.syllabusId === syllabusId && i.type !== 'assessment' && i.status === 'published')
    const csMat = csItems.filter(i => i.type !== 'assessment')
    const ids = new Set(base.map(i => i.id))
    return [...base, ...csMat.filter(i => !ids.has(i.id))]
  }, [syllabusId, csItems])

  const students = useMemo(
    () => STUDENT_RECORDS.filter(stu => stu.courses[0]?.code === syllabus?.courseCode),
    [syllabus]
  )
  const visibleStudents = students.slice(0, ROW_CAP)

  const cellFor = (stu, item) => {
    const h = hashScore(stu.id, item.id)
    const missed = h % 7 === 0
    if (missed) return { missed: true }
    return { missed: false, score: 60 + (h % 41) }
  }

  const materialAccessed = (stu, material) => {
    return hashScore(stu.id, material.id) % 5 !== 0
  }

  const openedCount = (stu) => materials.filter(m => materialAccessed(stu, m)).length
  const missedCount = (stu) => assessments.filter(a => cellFor(stu, a).missed).length

  const remind = (stu, what) => {
    addToast(`Reminder sent to ${stu.name.split(' ')[0]} about ${what} — you'll both see it in Notifications`, 'success')
  }

  const remindAll = (what) => {
    addToast(`Batch reminder sent to all students with ${what} — logged in Notifications`, 'success')
  }

  // ── Assessment charts ──
  const assessmentChartData = assessments.map(a => {
    const scores = students.map(stu => cellFor(stu, a)).filter(c => !c.missed).map(c => c.score)
    return {
      name: a.title.length > 24 ? a.title.slice(0, 24) + '…' : a.title,
      average: scores.length ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : 0,
      completion: students.length ? Math.round((scores.length / students.length) * 100) : 0,
    }
  })

  // ── Material access chart ──
  const materialChartData = materials.map(m => {
    const accessed = students.filter(stu => materialAccessed(stu, m)).length
    return {
      name: m.title.length > 24 ? m.title.slice(0, 24) + '…' : m.title,
      accessRate: students.length ? Math.round((accessed / students.length) * 100) : 0,
      accessed,
      notAccessed: students.length - accessed,
    }
  })

  // ── Summary stats ──
  const totalMissed = students.reduce((acc, stu) => acc + missedCount(stu), 0)
  const totalUnopened = students.reduce((acc, stu) => acc + (materials.length - openedCount(stu)), 0)
  const studentsWithIssues = students.filter(stu => missedCount(stu) > 0 || openedCount(stu) < materials.length).length

  // ── Export ──
  const handleExport = () => {
    if (activeTab === 'assessments') {
      const rows = visibleStudents.map(stu => {
        const row = { Student: stu.name, Block: stu.section, MissedAssessments: missedCount(stu) }
        assessments.forEach(a => {
          const c = cellFor(stu, a)
          row[a.title] = c.missed ? 'Missed' : c.score
        })
        return row
      })
      exportCSV(rows, timestampedFilename(`assessment_scores_${syllabus?.courseCode?.replace(/\s/g, '_')}`, 'csv'))
    } else {
      const rows = visibleStudents.map(stu => {
        const row = { Student: stu.name, Block: stu.section, MaterialsOpened: `${openedCount(stu)}/${materials.length}` }
        materials.forEach(m => {
          row[m.title] = materialAccessed(stu, m) ? 'Accessed' : 'Not Accessed'
        })
        return row
      })
      exportCSV(rows, timestampedFilename(`material_access_${syllabus?.courseCode?.replace(/\s/g, '_')}`, 'csv'))
    }
    addToast('Export complete', 'success')
  }

  return (
    <div className="container" data-pulse-zone="performance">
      <div className="page-header">
        <div>
          <h1><ClipboardCheck size={24} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Student Monitoring</h1>
          <p className="text-sm text-muted mt-8">Track assessment completion and learning material access across your courses</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleExport}><Download size={14} /> Export CSV</button>
      </div>

      {/* Info banner */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 14px', background: 'var(--sky-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--sky-100)', marginBottom: '16px', fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
        <Info size={15} style={{ color: 'var(--sky-500)', flexShrink: 0, marginTop: 2 }} />
        <span>
          Assessment scores are automatically recorded as students submit. Material access is tracked when students open published documents.
          Use the <strong>Remind</strong> button to notify students about missing activities or unopened files.
        </span>
      </div>

      {/* Course selector + summary cards */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '1 1 280px' }}>
          <div className="card-body" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <label className="form-label" style={{ margin: 0 }}>Course:</label>
            <select className="form-input" style={{ width: 'auto', minWidth: '240px', flex: 1 }} value={syllabusId} onChange={e => setSyllabusId(e.target.value)}>
              {mySyllabi.map(s => <option key={s.id} value={s.id}>{s.courseCode} — {s.courseTitle}</option>)}
            </select>
          </div>
        </div>
        <div className="card" style={{ flex: '0 0 auto' }}>
          <div className="card-body" style={{ display: 'flex', gap: '20px', alignItems: 'center', fontSize: '0.8125rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--sky-600)' }}>{students.length}</div>
              <div className="text-muted">Students</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.25rem', color: totalMissed > 0 ? 'var(--red-500, #ef4444)' : 'var(--green-500, #22c55e)' }}>{totalMissed}</div>
              <div className="text-muted">Missed Activities</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.25rem', color: totalUnopened > 0 ? 'var(--amber-500, #f59e0b)' : 'var(--green-500, #22c55e)' }}>{totalUnopened}</div>
              <div className="text-muted">Unopened Files</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.25rem', color: studentsWithIssues > 0 ? 'var(--amber-500, #f59e0b)' : 'var(--green-500, #22c55e)' }}>{studentsWithIssues}</div>
              <div className="text-muted">Need Attention</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--gray-200)', marginBottom: '20px' }}>
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600,
                fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px',
                color: activeTab === t.key ? 'var(--sky-600)' : 'var(--gray-500)',
                borderBottom: activeTab === t.key ? '2px solid var(--sky-500)' : '2px solid transparent',
                marginBottom: '-2px', transition: 'all 0.15s',
              }}
            >
              <Icon size={15} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* ═══════════════════════ Tab: Assessment Scores ═══════════════════════ */}
      {activeTab === 'assessments' && (
        <>
          {assessments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><ClipboardCheck size={36} /></div>
              <h3>No published assessments yet</h3>
              <p>Publish assessments from the Courseware Builder to start tracking scores here.</p>
            </div>
          ) : (
            <>
              {/* Students × Assessments table */}
              <div className="card mb-24">
                <div className="card-header">
                  <h3>{syllabus?.courseCode} — Assessment Scores</h3>
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
                        <th style={{ textAlign: 'center' }}>Missed</th>
                        {assessments.map(a => <th key={a.id} title={a.title} style={{ textAlign: 'center' }}>{a.title.length > 28 ? a.title.slice(0, 28) + '…' : a.title}</th>)}
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleStudents.map(stu => {
                        const missed = missedCount(stu)
                        const cells = assessments.map(a => ({ a, c: cellFor(stu, a) }))
                        const hasMissed = cells.some(({ c }) => c.missed)
                        return (
                          <tr key={stu.id}>
                            <td style={{ fontWeight: 600, position: 'sticky', left: 0, background: 'var(--white)', zIndex: 1, whiteSpace: 'nowrap' }}>
                              {stu.name}
                              <div className="text-sm text-muted" style={{ fontWeight: 400 }}>{stu.section}</div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {missed > 0 ? (
                                <span style={{ fontWeight: 700, color: 'var(--red-500, #ef4444)' }}>{missed}</span>
                              ) : (
                                <span style={{ color: 'var(--green-500, #22c55e)' }}>0</span>
                              )}
                            </td>
                            {cells.map(({ a, c }) => (
                              <td key={a.id} style={{ textAlign: 'center' }}>
                                {c.missed ? (
                                  <span className="badge badge-error" style={{ fontSize: '0.625rem' }}>Missed</span>
                                ) : (
                                  <span style={{ fontWeight: 700 }}>{c.score}</span>
                                )}
                              </td>
                            ))}
                            <td>
                              {hasMissed && (
                                <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', whiteSpace: 'nowrap' }}
                                  onClick={() => remind(stu, 'missed assessment(s)')}
                                  title="Send reminder about missed assessments">
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
                      Showing {ROW_CAP} of {students.length} students — export CSV for the full list.
                    </p>
                  )}
                </div>
              </div>

              {/* Assessment charts */}
              <div className="grid-2">
                <div className="card">
                  <div className="card-header"><h3>Class Average per Assessment</h3></div>
                  <div className="card-body">
                    {assessmentChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={assessmentChartData} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="average" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Class average" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-sm text-muted">No data</p>}
                  </div>
                </div>
                <div className="card">
                  <div className="card-header"><h3>Completion Rate per Assessment</h3></div>
                  <div className="card-body">
                    {assessmentChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={assessmentChartData} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="completion" fill="#22c55e" radius={[4, 4, 0, 0]} name="Completed %" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-sm text-muted">No data</p>}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ═══════════════════════ Tab: Learning Material Access ═══════════════════════ */}
      {activeTab === 'materials' && (
        <>
          {materials.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><BookOpen size={36} /></div>
              <h3>No published materials yet</h3>
              <p>Publish learning materials from the Courseware Builder to start tracking access here.</p>
            </div>
          ) : (
            <>
              {/* Students × Materials table */}
              <div className="card mb-24">
                <div className="card-header">
                  <h3>{syllabus?.courseCode} — Learning Material Access</h3>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '0.6875rem', alignItems: 'center' }}>
                    <span><Eye size={11} style={{ color: 'var(--green-500)', verticalAlign: 'middle' }} /> Accessed</span>
                    <span><EyeOff size={11} style={{ color: 'var(--amber-500, #f59e0b)', verticalAlign: 'middle' }} /> Not Accessed</span>
                  </div>
                </div>
                <div className="card-body" style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '0.8125rem', minWidth: '700px' }}>
                    <thead>
                      <tr>
                        <th style={{ position: 'sticky', left: 0, background: 'var(--white)', zIndex: 1 }}>Student</th>
                        <th style={{ textAlign: 'center' }}>Unopened</th>
                        {materials.map(m => <th key={m.id} title={m.title} style={{ textAlign: 'center' }}>{m.title.length > 28 ? m.title.slice(0, 28) + '…' : m.title}</th>)}
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleStudents.map(stu => {
                        const unopened = materials.length - openedCount(stu)
                        const accessCells = materials.map(m => ({ m, accessed: materialAccessed(stu, m) }))
                        const hasUnopened = accessCells.some(({ accessed }) => !accessed)
                        return (
                          <tr key={stu.id}>
                            <td style={{ fontWeight: 600, position: 'sticky', left: 0, background: 'var(--white)', zIndex: 1, whiteSpace: 'nowrap' }}>
                              {stu.name}
                              <div className="text-sm text-muted" style={{ fontWeight: 400 }}>{stu.section}</div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {unopened > 0 ? (
                                <span style={{ fontWeight: 700, color: 'var(--amber-500, #f59e0b)' }}>{unopened}</span>
                              ) : (
                                <span style={{ color: 'var(--green-500, #22c55e)' }}>0</span>
                              )}
                            </td>
                            {accessCells.map(({ m, accessed }) => (
                              <td key={m.id} style={{ textAlign: 'center' }}>
                                {accessed ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--green-600, #16a34a)', fontWeight: 600, fontSize: '0.75rem' }}>
                                    <Eye size={12} /> Opened
                                  </span>
                                ) : (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--amber-600, #d97706)', fontWeight: 600, fontSize: '0.75rem' }}>
                                    <EyeOff size={12} /> Unopened
                                  </span>
                                )}
                              </td>
                            ))}
                            <td>
                              {hasUnopened && (
                                <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', whiteSpace: 'nowrap' }}
                                  onClick={() => remind(stu, 'unopened learning materials')}
                                  title="Send reminder about unopened files">
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
                      Showing {ROW_CAP} of {students.length} students — export CSV for the full list.
                    </p>
                  )}
                </div>
              </div>

              {/* Material access chart */}
              <div className="card">
                <div className="card-header">
                  <h3>Access Rate per Material</h3>
                </div>
                <div className="card-body">
                  {materialChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={materialChartData} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="accessRate" fill="#a855f7" radius={[4, 4, 0, 0]} name="Access rate %" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-muted">No data</p>}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
