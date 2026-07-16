import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { exportCSV, timestampedFilename } from '../utils/exportUtils'
import { STUDENT_RECORDS, DEFAULT_SYLLABI, ALERTS, BLOCK_SECTIONS } from '../data/mockData'
import { pulse as pulseBus } from '../components/pulse/pulseBus'
import {
  TrendingUp, AlertTriangle, Download, Users, Target, Award,
  ChevronRight, Mail, MessageSquare, Flag, Check, Bell, Layers,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Cell,
} from 'recharts'

// Performance — FLOW_SPEC Phase 5, instructor and student sides only. The
// Dean / Associate Dean's monitoring lives in Monitor (syllabus status,
// delivery progress, student oversight, alerts) — this page is "which topics
// has this student/class mastered, which need review," per SYSTEM_SPEC §1.2/1.3.

const COLORS = ['#0ea5e9', '#a855f7', '#22c55e', '#f59e0b', '#ef4444', '#38bdf8', '#818cf8']

const ALL_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'bytopic', label: 'By Topic' },
  { key: 'alerts', label: 'Alerts', roles: ['instructor'] },
]

function myStudentRecord(user) {
  if (!user?.name) return null
  const record = STUDENT_RECORDS.find(s => s.name === user.name)
  if (!record) return null
  return record
}

// "My students" for an instructor — every student in a block they advise.
function studentsForInstructor(user) {
  const mySectionCodes = BLOCK_SECTIONS.filter(bs => bs.adviserId === user?.id).map(bs => bs.code)
  return STUDENT_RECORDS.filter(s => mySectionCodes.includes(s.section))
}

/* ───────────────────────── Shared visual bits ───────────────────────── */

function StudentRadarChart({ topics, size = 220 }) {
  const data = Object.entries(topics).map(([key, value]) => ({ subject: key.replace('t', 'T'), score: value, fullMark: 100 }))
  return (
    <ResponsiveContainer width="100%" height={size}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
        <Radar name="Score" dataKey="score" stroke="#0ea5e9" fill="#38bdf8" fillOpacity={0.3} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

function MasteryHeatmap({ students, topics }) {
  const getColor = (score) => { if (score >= 90) return '#22c55e'; if (score >= 80) return '#38bdf8'; if (score >= 70) return '#f59e0b'; return '#ef4444' }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
        <thead>
          <tr>
            <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, position: 'sticky', left: 0, background: 'var(--white)', zIndex: 1 }}>Student</th>
            {topics.map(t => <th key={t.id} style={{ padding: '8px', textAlign: 'center', fontWeight: 600, minWidth: '60px' }}>{t.title.substring(0, 6)}</th>)}
          </tr>
        </thead>
        <tbody>
          {students.map(s => (
            <tr key={s.id}>
              <td style={{ padding: '6px 8px', fontWeight: 600, position: 'sticky', left: 0, background: 'var(--white)', zIndex: 1, whiteSpace: 'nowrap' }}>{s.name.split(' ')[0]}</td>
              {topics.map(t => {
                const score = s.courses[0]?.topics[t.id] || 0
                return <td key={t.id} style={{ padding: '4px', textAlign: 'center' }}>
                  <div style={{ width: '100%', height: '28px', borderRadius: '4px', background: getColor(score), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.6875rem' }}>{score}</div>
                </td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StudentDetailPopover({ student, onClose }) {
  const courseData = student.courses[0]
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>{student.name}</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}><span className="badge badge-published">{student.section}</span><span className="badge badge-draft">{courseData.code}</span></div>
        <div className="kpi-grid mb-24">
          <div className="kpi-card"><div className="kpi-icon" style={{ background: 'var(--sky-100)' }}><TrendingUp size={18} style={{ color: 'var(--sky-500)' }} /></div><div><div className="kpi-value">{courseData.scores.midterm || '—'}%</div><div className="kpi-label">Midterm</div></div></div>
          <div className="kpi-card"><div className="kpi-icon" style={{ background: 'var(--green-100)' }}><Award size={18} style={{ color: 'var(--green-500)' }} /></div><div><div className="kpi-value" style={{ fontSize: '1rem' }}>{Object.values(courseData.topics).every(t => t >= 90) ? 'Excellent' : Object.values(courseData.topics).every(t => t >= 75) ? 'Good' : 'Needs Review'}</div><div className="kpi-label">Mastery</div></div></div>
        </div>
        <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '8px', fontSize: '0.875rem' }}>Topic Mastery Radar</h4>
        <StudentRadarChart topics={courseData.topics} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px' }}>
          {Object.entries(courseData.topics).map(([key, value]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="text-sm" style={{ minWidth: '60px', fontWeight: 600 }}>{key.replace('t', 'T ')}</span>
              <div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${value}%`, background: value >= 90 ? 'var(--green-500)' : value >= 75 ? 'var(--sky-500)' : 'var(--red-500)' }} /></div>
              <span className="text-sm font-bold" style={{ minWidth: '36px', textAlign: 'right' }}>{value}%</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button className="btn btn-secondary btn-sm"><Mail size={14} /> Email Student</button>
          <button className="btn btn-secondary btn-sm"><MessageSquare size={14} /> Add Note</button>
          <button className="btn btn-secondary btn-sm"><Flag size={14} /> Flag for Review</button>
        </div>
        <div className="modal-actions"><button className="btn btn-ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  )
}

/* ───────────────────────── Overview tab ───────────────────────── */

function StudentOverview({ user }) {
  const me = myStudentRecord(user)
  const course = me.courses[0]
  return (
    <div>
      <div className="kpi-grid mb-24">
        <div className="kpi-card"><div className="kpi-icon" style={{ background: 'var(--sky-100)' }}><TrendingUp size={20} style={{ color: 'var(--sky-500)' }} /></div><div><div className="kpi-value">{course.scores.midterm}%</div><div className="kpi-label">Midterm Score</div></div></div>
        <div className="kpi-card"><div className="kpi-icon" style={{ background: 'var(--green-100)' }}><Award size={20} style={{ color: 'var(--green-500)' }} /></div><div><div className="kpi-value">{Object.values(course.topics).filter(v => v >= 75).length}/{Object.values(course.topics).length}</div><div className="kpi-label">Topics Mastered</div></div></div>
        <div className="kpi-card"><div className="kpi-icon" style={{ background: 'var(--amber-100)' }}><Target size={20} style={{ color: 'var(--amber-500)' }} /></div><div><div className="kpi-value">{Object.values(course.topics).filter(v => v < 75).length}</div><div className="kpi-label">Need Review</div></div></div>
      </div>
      <div className="card">
        <div className="card-header"><h3>My Recent Scores — {course.code}</h3></div>
        <div className="card-body">
          <table className="data-table">
            <thead><tr><th>Assessment</th><th>Score</th></tr></thead>
            <tbody>
              <tr><td>Prelim</td><td><strong>{course.scores.prelim ?? '—'}{course.scores.prelim != null ? '%' : ''}</strong></td></tr>
              <tr><td>Midterm</td><td><strong>{course.scores.midterm ?? '—'}{course.scores.midterm != null ? '%' : ''}</strong></td></tr>
              <tr><td>Finals</td><td>{course.scores.finals != null ? <strong>{course.scores.finals}%</strong> : <span className="text-muted">Not yet recorded</span>}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function InstructorOverview({ onSelectStudent, user }) {
  const students = studentsForInstructor(user)
  const avg = students.length ? Math.round(students.reduce((a, s) => a + (s.courses[0]?.scores.midterm || 0), 0) / students.length) : 0
  return (
    <div>
      <div className="kpi-grid mb-24">
        <div className="kpi-card"><div className="kpi-icon" style={{ background: 'var(--sky-100)' }}><Users size={20} style={{ color: 'var(--sky-500)' }} /></div><div><div className="kpi-value">{students.length}</div><div className="kpi-label">Students</div></div></div>
        <div className="kpi-card"><div className="kpi-icon" style={{ background: 'var(--green-100)' }}><TrendingUp size={20} style={{ color: 'var(--green-500)' }} /></div><div><div className="kpi-value">{avg}%</div><div className="kpi-label">Class Average</div></div></div>
        <div className="kpi-card"><div className="kpi-icon" style={{ background: 'var(--red-100)' }}><AlertTriangle size={20} style={{ color: 'var(--red-500)' }} /></div><div><div className="kpi-value" style={{ color: 'var(--red-500)' }}>{students.filter(s => (s.courses[0]?.scores.midterm || 0) < 75).length}</div><div className="kpi-label">At Risk</div></div></div>
        <div className="kpi-card"><div className="kpi-icon" style={{ background: 'var(--purple-100)' }}><Award size={20} style={{ color: 'var(--purple-500)' }} /></div><div><div className="kpi-value" style={{ color: 'var(--purple-500)' }}>{students.filter(s => (s.courses[0]?.scores.midterm || 0) >= 90).length}</div><div className="kpi-label">Excelling</div></div></div>
      </div>
      <div className="card">
        <div className="card-header"><h3>Student List</h3></div>
        <div className="card-body">
          <table className="data-table">
            <thead><tr><th>Student</th><th>Section</th><th>Midterm</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {students.map(stu => {
                const score = stu.courses[0]?.scores.midterm || 0
                return (
                  <tr key={stu.id}>
                    <td><strong>{stu.name}</strong></td><td className="text-sm">{stu.section}</td><td><strong>{score}%</strong></td>
                    <td>{score >= 90 ? <span className="badge badge-approved">Excelling</span> : score >= 75 ? <span className="badge badge-published">On Track</span> : <span className="badge badge-error">At Risk</span>}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => onSelectStudent(stu)}><ChevronRight size={14} /> Details</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── By Topic tab ───────────────────────── */

function StudentByTopic({ user }) {
  const me = myStudentRecord(user)
  const course = me.courses[0]
  const trend = [
    { period: 'Prelim', score: course.scores.prelim || 0 },
    { period: 'Midterm', score: course.scores.midterm || 0 },
    ...(course.scores.finals != null ? [{ period: 'Finals', score: course.scores.finals }] : []),
  ]
  return (
    <div>
      <div className="grid-2 mb-24">
        <div className="card">
          <div className="card-header"><h3>My Topic Mastery</h3></div>
          <div className="card-body"><StudentRadarChart topics={course.topics} /></div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Score Trend (Historical)</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 10 }} /><Tooltip />
                <Line type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><h3>Per-Topic Status</h3></div>
        <div className="card-body">
          {Object.entries(course.topics).map(([key, value]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="text-sm" style={{ minWidth: '60px', fontWeight: 600 }}>{key.replace('t', 'Topic ')}</span>
              <div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${value}%`, background: value >= 75 ? 'var(--green-500)' : 'var(--red-500)' }} /></div>
              <span className={`badge ${value >= 75 ? 'badge-approved' : 'badge-error'}`} style={{ minWidth: '110px', textAlign: 'center' }}>{value >= 75 ? 'Mastered' : 'Needs Review'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ClassByTopic({ user }) {
  const topics = DEFAULT_SYLLABI[0]?.topics || []
  const scopedStudents = studentsForInstructor(user)
  return (
    <div>
      <div className="card mb-24" data-pulse-help="performance-chart" tabIndex={0} style={{ outline: 'none' }}>
        <div className="card-header"><h3><Layers size={16} /> Topic Mastery Heatmap — My Sections</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.6875rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444', display: 'inline-block' }} /> &lt;75</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b', display: 'inline-block' }} /> 75-84</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#38bdf8', display: 'inline-block' }} /> 85-89</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e', display: 'inline-block' }} /> 90+</span>
          </div>
        </div>
        <div className="card-body">
          <MasteryHeatmap students={scopedStudents} topics={topics} />
        </div>
      </div>
      <div className="grid-2 mb-24">
        <div className="card">
          <div className="card-header"><h3>Topic Mastery Overview</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={topics.map(t => ({ topic: t.title.substring(0, 10), avg: scopedStudents.length ? Math.round(scopedStudents.reduce((a, s) => a + (s.courses[0]?.topics[t.id] || 0), 0) / scopedStudents.length) : 0 }))} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="topic" tick={{ fontSize: 9 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="avg" radius={[4, 4, 0, 0]}>{topics.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Pass/Fail Rate by Topic</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={topics.map(t => {
                const scores = scopedStudents.map(s => s.courses[0]?.topics[t.id] || 0)
                return { topic: t.title.substring(0, 10), pass: scores.filter(s => s >= 75).length, fail: scores.filter(s => s < 75).length }
              })} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="topic" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip />
                <Bar dataKey="pass" stackId="a" fill="#22c55e" /><Bar dataKey="fail" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Alerts tab — score-threshold only, instructor ───────────────────────── */

function AlertsTab({ user }) {
  const { addToast } = useToast()
  const [threshold, setThreshold] = useState(75)
  const [acked, setAcked] = useState([])
  const masteryAlerts = ALERTS.filter(a => a.type === 'low_mastery')
  const alertScopeStudents = studentsForInstructor(user)
  const atRisk = alertScopeStudents.filter(s => (s.courses[0]?.scores.midterm || 0) < threshold)

  return (
    <div>
      <div className="card mb-24">
        <div className="card-header"><h3><AlertTriangle size={16} style={{ color: 'var(--red-500)' }} /> Student Threshold Alerts</h3></div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <label className="text-sm font-bold">Mastery cutoff:</label>
            <input className="form-input" type="number" min={0} max={100} value={threshold} onChange={e => setThreshold(parseInt(e.target.value) || 0)} style={{ width: '80px' }} />
            <span className="text-sm text-muted">Students below this score are flagged automatically — no manual refresh needed.</span>
          </div>
          {atRisk.length === 0 ? (
            <p className="text-sm text-muted">No students currently below {threshold}%.</p>
          ) : atRisk.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--red-100)', marginBottom: '8px' }}>
              <div><strong>{s.name}</strong> <span className="text-sm text-muted">— {s.section} · {s.courses[0]?.scores.midterm}%</span></div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-ghost btn-sm"><Mail size={12} /> Email</button>
                <button className="btn btn-ghost btn-sm" onClick={() => pulseBus.say(`Flagged ${s.name.split(' ')[0]} for review — they'll show up here until their score improves.`, { expression: 'encouraging' })}><Flag size={12} /> Flag</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3><Bell size={16} /> Topic Mastery Alerts</h3></div>
        <div className="card-body">
          {masteryAlerts.length === 0 ? <p className="text-sm text-muted">No topic-level mastery alerts.</p> : masteryAlerts.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--amber-100)', background: acked.includes(a.id) ? 'var(--gray-50)' : 'var(--amber-100)', marginBottom: '8px', opacity: acked.includes(a.id) ? 0.6 : 1 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{a.title}</div>
                <div className="text-sm text-muted">{a.course} · {new Date(a.created_at).toLocaleDateString()}</div>
              </div>
              {!acked.includes(a.id) ? (
                <button className="btn btn-secondary btn-sm" onClick={() => { setAcked(prev => [...prev, a.id]); addToast('Alert acknowledged', 'success') }}><Check size={12} /> Acknowledge</button>
              ) : <span className="badge badge-approved">Acknowledged</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Page shell ───────────────────────── */

export default function Performance() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [detailStudent, setDetailStudent] = useState(null)

  const visibleTabs = ALL_TABS.filter(t => !t.roles || t.roles.includes(user?.role))
  const requested = searchParams.get('tab')
  const tab = visibleTabs.some(t => t.key === requested) ? requested : visibleTabs[0].key
  const setTab = (key) => setSearchParams({ tab: key })

  const title = user?.role === 'instructor' ? 'Student Performance' : 'My Performance'

  const handleExport = () => {
    let rows, filename
    if (user?.role === 'student') {
      const me = myStudentRecord(user)
      rows = Object.entries(me.courses[0].topics).map(([topic, score]) => ({ Topic: topic, Score: score, Status: score >= 75 ? 'Mastered' : 'Needs Review' }))
      filename = 'my_performance'
    } else {
      const exportStudents = studentsForInstructor(user)
      rows = exportStudents.map(s => ({ Student: s.name, Section: s.section, Midterm: s.courses[0]?.scores.midterm ?? '' }))
      filename = 'performance_overview'
    }
    exportCSV(rows, timestampedFilename(filename, 'csv'))
    addToast('Performance report exported', 'success')
  }

  return (
    <div className="container" data-pulse-zone="performance">
      <div className="page-header">
        <h1>{title}</h1>
        <button className="btn btn-secondary btn-sm" onClick={handleExport}><Download size={14} /> Export Report</button>
      </div>

      <div className="tabs mb-24" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
        {visibleTabs.map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)} style={{ whiteSpace: 'nowrap' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && user?.role === 'student' && <StudentOverview user={user} />}
      {tab === 'overview' && user?.role === 'instructor' && <InstructorOverview onSelectStudent={setDetailStudent} user={user} />}

      {tab === 'bytopic' && user?.role === 'student' && <StudentByTopic user={user} />}
      {tab === 'bytopic' && user?.role === 'instructor' && <ClassByTopic user={user} />}

      {tab === 'alerts' && user?.role === 'instructor' && <AlertsTab user={user} />}

      {detailStudent && <StudentDetailPopover student={detailStudent} onClose={() => setDetailStudent(null)} />}
    </div>
  )
}
