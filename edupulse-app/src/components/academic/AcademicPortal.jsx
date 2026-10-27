import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { aiRequest } from '../../lib/aiClient'
import { pulse } from '../pulse/pulseBus'
import { SkeletonKPI, SkeletonTable } from '../ui/LoadingSkeleton'
import { Spinner } from '../ui/LoadingFeedback'

const EMPTY = { courses: [], publications: [], enrollments: [], attempts: [], accesses: [] }
const TITLES = { dashboard: 'Academic Dashboard', performance: 'Performance', monitoring: 'Student Monitoring', monitor: 'Academic Oversight', courses: 'Course Loading', records: 'Academic Records', courseware: 'Published Courseware', assessment: 'Assessments' }

// Authenticated views read only the API's RLS-filtered projection. Preview pages
// retain their existing fixtures; missing records never fall back to mock data.
export default function AcademicPortal({ view }) {
  const { user } = useAuth()
  const [data, setData] = useState(EMPTY), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null), [answers, setAnswers] = useState({}), [busy, setBusy] = useState(false), [result, setResult] = useState(null)
  const mounted = useRef(true)
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const records = await aiRequest('academic'); if (mounted.current) setData({ ...EMPTY, ...records }) }
    catch (err) { if (mounted.current) setError(err.message) }
    finally { if (mounted.current) setLoading(false) }
  }, [])
  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false } }, [load])
  const run = async command => {
    setBusy(true); setError('')
    try { const response = await aiRequest('academic', 'POST', command); setResult(response); await load(); pulse.progress('academic-command-complete', command.operation); return response }
    catch (err) { setError(err.message); return null }
    finally { setBusy(false) }
  }
  const course = id => data.courses.find(item => item.id === id)
  const exportRecords = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'edupulse-authorized-records.json'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const publication = id => data.publications.find(item => item.id === id)
  const studentName = item => data.enrollments.find(enrollment => enrollment.student_email === item.student_email)?.display_name || item.student_email || 'Retained student account'
  const canSync = ['instructor', 'admin'].includes(user?.baseRole || user?.role)
  const isStudent = user?.role === 'student'
  const isAssociate = user?.role === 'associate_dean'
  const showPerformance = ['performance', 'monitoring'].includes(view)
  const visible = data.publications.filter(item => item.active && (view === 'assessment' ? item.type === 'assessment' : view === 'courseware' ? item.type !== 'assessment' : true))
  const selectedAttempt = selected && data.attempts.find(attempt => attempt.publication_id === selected.id && attempt.source_version === selected.source_version)
  const open = async item => {
    if (isStudent && item.type !== 'assessment' && !await run({ operation: 'open', publication: item.id, version: item.source_version })) return
    setSelected(item); setAnswers({}); setResult(null)
  }
  return <div className="container" aria-busy={loading || busy} data-pulse-zone={view === 'performance' ? 'performance' : view === 'courseware' ? 'courseware' : undefined}>
    <div className="page-header"><div><h1>{TITLES[view] || 'Academic Records'}</h1><p className="text-sm text-muted">Account records · Instructor-confirmed EduSuite exports · No institutional grade computations</p></div>
      <div className="academic-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="btn btn-secondary btn-sm" disabled={loading || busy} onClick={load}>{loading && <Spinner />} Refresh records</button><button className="btn btn-secondary btn-sm" disabled={loading || busy} onClick={exportRecords}>Export authorized records</button>{canSync && <button className="btn btn-secondary btn-sm" disabled={loading || busy} onClick={() => run({ operation: 'sync' })}>Sync my workspace</button>}</div>
    </div>
    {error && <div role="alert" className="connected-pulse-warning">{error}</div>}
    {loading && <section className="academic-loading" aria-label="Loading academic records">
      <p role="status" className="text-sm text-muted mb-16">Loading authorized academic records…</p>
      <div aria-hidden="true"><div className="kpi-grid mb-24">{Array.from({ length: isAssociate ? 3 : 4 }, (_, i) => <SkeletonKPI key={i} />)}</div><SkeletonTable rows={4} cols={4} /></div>
    </section>}
    {busy && <p role="status" className="text-sm text-muted mb-16"><Spinner /> Saving your request…</p>}
    {!loading && !error && <>
      <div className="kpi-grid mb-24">{[['Courses', data.courses.length], ['Published items', visible.length], ['Roster entries', data.enrollments.length], ...(!isAssociate ? [['Recorded attempts', data.attempts.length]] : [])].map(([label, value]) => <div className="kpi-card" key={label}><div><div className="kpi-value">{value}</div><div className="kpi-label">{label}</div></div></div>)}</div>
      {!data.courses.length && <div className="empty-state" role="status"><h2>No authorized academic records yet</h2><p>Instructors register confirmed class lists, activate an approved syllabus, review courseware and publish it. Students need a matching account email in the registered class list. Existing instructor workspaces can be synchronized explicitly.</p></div>}
      {view === 'records' && <p className="text-sm text-muted mb-16">EduSuite remains the official record. This view shows instructor-confirmed class lists; it does not claim to import or synchronize the institution's course-load database.</p>}
      {data.courses.length > 0 && !['assessment', 'courseware'].includes(view) && <section className="card mb-24"><div className="card-header"><h2>Authorized courses</h2></div><div className="card-body" style={{ overflowX: 'auto' }}><table className="data-table"><thead><tr><th>Course</th><th>Title</th><th>Syllabus</th><th>Source revision</th></tr></thead><tbody>{data.courses.map(item => <tr key={item.id}><td data-label="Course">{item.course_code}</td><td data-label="Title">{item.course_title}</td><td data-label="Syllabus">{item.active ? 'Active' : 'Not active'}</td><td data-label="Source revision">{item.source_revision}</td></tr>)}</tbody></table></div></section>}
      {showPerformance && !isAssociate && <section className="card mb-24"><div className="card-header"><h2>Recorded assessment attempts</h2></div><div className="card-body" style={{ overflowX: 'auto' }}>{data.attempts.length ? <table className="data-table"><thead><tr><th>Course</th><th>Assessment</th>{!isStudent && <th>Student account</th>}<th>Raw score</th><th>Submitted</th></tr></thead><tbody>{data.attempts.map(item => <tr key={item.id}><td data-label="Course">{course(publication(item.publication_id)?.course_id)?.course_code || 'Retained course'}</td><td data-label="Assessment">{publication(item.publication_id)?.title || 'Retained assessment'}</td>{!isStudent && <td data-label="Student account">{studentName(item)}</td>}<td data-label="Raw score">{item.score}/{item.max_score}</td><td data-label="Submitted">{new Date(item.submitted_at).toLocaleString()}</td></tr>)}</tbody></table> : <p>No assessment attempts recorded.</p>}<p className="text-sm text-muted">Objective items are scored on the server. These are raw assessment results; EduPulse does not calculate official grades or infer risk.</p></div></section>}
      {showPerformance && !isAssociate && <section className="card mb-24"><div className="card-header"><h2>Recorded material access</h2></div><div className="card-body">{data.accesses.length ? <table className="data-table"><thead><tr><th>Material</th>{!isStudent && <th>Student</th>}<th>First opened</th></tr></thead><tbody>{data.accesses.map(item => <tr key={`${item.publication_id}-${item.student_id}`}><td data-label="Material">{publication(item.publication_id)?.title || 'Retained material'}</td>{!isStudent && <td data-label="Student">{studentName(item)}</td>}<td data-label="First opened">{new Date(item.first_opened_at).toLocaleString()}</td></tr>)}</tbody></table> : <p>No material opens recorded.</p>}</div></section>}
      {['courseware', 'assessment', 'dashboard', 'monitor'].includes(view) && visible.length > 0 && <section className="card mb-24"><div className="card-header"><h2>{view === 'assessment' ? 'Published assessments' : 'Published courseware'}</h2></div><div className="card-body">{visible.map(item => <div key={item.id} style={{ display: 'flex', gap: 12, justifyContent: 'space-between', padding: 12, borderBottom: '1px solid var(--gray-200)' }}><div><strong>{item.title}</strong><div className="text-sm text-muted">{course(item.course_id)?.course_code} · Week {item.week} · {item.type}</div></div><button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => open(item)}>{item.type === 'assessment' ? 'Open assessment' : 'Open material'}</button></div>)}</div></section>}
      {['records', 'monitor', 'monitoring', 'courses'].includes(view) && data.enrollments.length > 0 && <section className="card"><div className="card-header"><h2>Confirmed class lists</h2></div><div className="card-body" style={{ overflowX: 'auto' }}><table className="data-table"><thead><tr><th>Course</th><th>Block</th><th>Student ID</th><th>Name</th></tr></thead><tbody>{data.enrollments.map(item => <tr key={`${item.course_id}-${item.student_email}-${item.block_section}`}><td data-label="Course">{course(item.course_id)?.course_code}</td><td data-label="Block">{item.block_section}</td><td data-label="Student ID">{item.student_ref}</td><td data-label="Name">{item.display_name}</td></tr>)}</tbody></table></div></section>}
      {selected && <section className="card" style={{ marginTop: 24 }} aria-label="Opened courseware"><div className="card-header"><h2>{selected.title}</h2><button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>Close material</button></div><div className="card-body">
        {selected.type === 'assessment' ? <>
          {(selected.content.questions || []).map((question, index) => <fieldset key={index} style={{ marginBottom: 16, border: '1px solid var(--gray-200)', padding: 12 }}><legend>{index + 1}. {question.text}</legend>{question.options.map((option, optionIndex) => { const label = typeof option === 'string' ? option : option.text; return <label key={optionIndex} style={{ display: 'block', padding: 6 }}><input type="radio" name={`academic-question-${index}`} aria-label={`Question ${index + 1}: ${label}`} checked={answers[index] === optionIndex} disabled={Boolean(selectedAttempt) || busy || !isStudent} onChange={() => setAnswers(previous => ({ ...previous, [index]: optionIndex }))} /> {label}</label> })}</fieldset>)}
          {isStudent && !selectedAttempt && <button className="btn btn-primary" disabled={busy || Object.keys(answers).length !== selected.content.questions.length} onClick={() => run({ operation: 'submit', publication: selected.id, version: selected.source_version, responses: selected.content.questions.map((_, index) => answers[index]) })}>{busy && <Spinner />} Confirm and submit responses</button>}
          {(selectedAttempt || (result?.score !== undefined && result)) && <p role="status">Saved score: {(selectedAttempt || result).score}/{(selectedAttempt || result).max_score}. This published version has one saved attempt; retrying submission returns the same result.</p>}
        </> : <>{(selected.content.sections || []).map((section, index) => <section key={index}><h3>{section.heading || section.title}</h3><p style={{ whiteSpace: 'pre-wrap' }}>{section.body || section.content}</p></section>)}{!selected.content.sections && <p>{selected.content.instructions || selected.content.description || 'No readable content was provided.'}</p>}</>}
      </div></section>}
    </>}
  </div>
}
