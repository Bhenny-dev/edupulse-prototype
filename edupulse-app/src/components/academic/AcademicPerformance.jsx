import { useState } from 'react'
import { BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Panel, Empty, KPIs, Table, CsvButton, CourseFilter, useAcademicTabs } from './AcademicUI'
import { assessmentSummary, currentAttempts, filterAcademic, learnerRows, percent, studentAttempt, topicSummary } from './academicData'
import ModalLayer from '../ui/ModalLayer'
import TopicMastery from './TopicMastery'
import AttemptReview from './AttemptReview'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useAcademicRecords } from '../../context/AcademicContext'

const tip = { background: 'var(--white)', color: 'var(--gray-800)', border: '1px solid var(--gray-200)', borderRadius: 8 }
const tick = { fill: 'var(--gray-600)', fontSize: 11 }
const short = (text, max = 24) => text.length > max ? `${text.slice(0, max - 1)}…` : text
function AcademicReminders({data}) {
 const {command}=useAcademicRecords()
 const [message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const remind=async publication=>{setBusy(true);setError('');try{const result=await command({operation:'remind',publication});setMessage(`${result.sent} in-app reminders saved. Completed/opened items and reminders sent in the last day were excluded.`)}catch(failure){setError(failure.message)}finally{setBusy(false)}}
 return <Panel title="Remind about missing work"><p className="text-sm text-muted mb-16">Sends an in-app notice to enrolled student accounts with no current attempt or material open. Confirm the item before sending.</p>{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}<Table headers={['Publication','Due','Action']} rows={data.publications.filter(item=>item.active).map(item=>[item.title,item.due_at?new Date(item.due_at).toLocaleString():'No deadline',<button key={item.id} className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>remind(item.id)}>Confirm reminder</button>])}/></Panel>
}
export function ScoreCharts({ data }) {
  const summary = assessmentSummary(data).filter(item => item.score !== null).map(item => ({ ...item, name: short(item.label, 14) }))
  const history = [...data.attempts].filter(item => item.max_score > 0 && item.grading_status!=='pending_review').sort((a, b) => a.submitted_at.localeCompare(b.submitted_at)).map(item => ({ name: new Date(item.submitted_at).toLocaleDateString(), score: percent(item.score, item.max_score) }))
  return <div className="academic-grid">
    <Panel title="Assessment score radar">
      <p className="text-sm text-muted mb-16">Average raw score per current published assessment. Unanswered assessments are excluded. This is assessment coverage, not inferred topic mastery.</p>
      {summary.length >= 3 ? <div role="img" aria-label={`Assessment score radar: ${summary.map(item => `${item.label} ${item.score}%`).join(', ')}`}><ResponsiveContainer width="100%" height={290}><RadarChart data={summary} outerRadius="60%"><PolarGrid stroke="var(--gray-200)" /><PolarAngleAxis dataKey="name" tick={tick} /><PolarRadiusAxis domain={[0, 100]} tick={tick} /><Radar name="Raw score (%)" dataKey="score" stroke="var(--sky-500)" fill="var(--sky-500)" fillOpacity={0.22} isAnimationActive={false} /><Tooltip contentStyle={tip} labelFormatter={(_, payload) => payload[0]?.payload.label || ''} /></RadarChart></ResponsiveContainer></div> : <Empty>At least three scored assessments are needed for a meaningful radar. {summary.length} available.</Empty>}
    </Panel>
    <Panel title="Assessment history">
      <p className="text-sm text-muted mb-16">Each point is a saved attempt, ordered by submission time. Retained earlier versions remain in history.</p>
      {history.length ? <div role="img" aria-label="Recorded assessment scores over time"><ResponsiveContainer width="100%" height={290}><LineChart data={history}><CartesianGrid stroke="var(--gray-200)" strokeDasharray="3 3" /><XAxis dataKey="name" tick={tick} /><YAxis domain={[0, 100]} tick={tick} /><Tooltip contentStyle={tip} /><Line name="Raw score (%)" type="linear" dataKey="score" stroke="var(--sky-500)" strokeWidth={2} connectNulls={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div> : <Empty>No assessment attempts recorded.</Empty>}
    </Panel>
  </div>
}
export function CoverageChart({ data, material = false, completion = false }) {
  const values = material ? data.publications.filter(item => item.active && item.type !== 'assessment').map(item => ({ name: short(item.title), value: data.accesses.filter(access => access.publication_id === item.id).length })) : assessmentSummary(data).map(item => ({ name: short(item.label), value: completion ? item.completion : item.score }))
  return values.length ? <div role="img" aria-label={material ? 'Recorded material opens by publication' : completion ? 'Current assessment submission rate against confirmed roster' : 'Average raw assessment scores'}><ResponsiveContainer width="100%" height={280}><BarChart data={values}><CartesianGrid stroke="var(--gray-200)" strokeDasharray="3 3" /><XAxis dataKey="name" tick={tick} /><YAxis domain={material ? [0, 'auto'] : [0, 100]} allowDecimals={false} tick={tick} /><Tooltip contentStyle={tip} /><Bar name={material ? 'Recorded opens' : completion ? 'Submitted (%)' : 'Raw score (%)'} dataKey="value" fill="var(--sky-500)" radius={[4, 4, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div> : <Empty>No published {material ? 'materials' : 'assessments'} match this view.</Empty>
}
function Attempts({ data, isStudent }) {
  const publication = id => data.publications.find(item => item.id === id)
  const headers = ['Course', 'Assessment', ...(!isStudent ? ['Student account'] : []), 'Raw score', 'Submitted', 'Version', 'Marking']
  const rows = data.attempts.map(item => {
    const pub = publication(item.publication_id)
    return [data.courses.find(course => course.id === pub?.course_id)?.course_code || 'Retained course', pub?.title || 'Retained assessment', ...(!isStudent ? [data.enrollments.find(entry => entry.student_email === item.student_email)?.display_name || item.student_email || 'Retained student account'] : []), `${item.score}/${item.max_score}`, new Date(item.submitted_at).toLocaleString(), pub && String(pub.source_version) === String(item.source_version) ? 'Current' : 'Earlier version', item.grading_status==='pending_review'?'Awaiting instructor marking':'Graded']
  })
  return <Panel title="Recorded assessment attempts" actions={<CsvButton headers={headers} rows={rows} name="assessment-scores" />}><Table headers={headers} rows={rows} empty="No assessment attempts recorded." /><p className="text-sm text-muted mt-16">Objective items are scored on the server. These are raw assessment results; EduPulse does not calculate official grades or infer risk.</p></Panel>
}
export function MaterialAccess({ data, isStudent }) {
  const materials = data.publications.filter(item => item.active && item.type !== 'assessment')
  const rows = isStudent ? materials.map(item => [item.title, `Week ${item.week}`, data.accesses.find(access => access.publication_id === item.id)?.first_opened_at ? 'Opened' : 'Not opened']) : learnerRows(data).map(learner => [learner.display_name || learner.student_email, ...materials.map(item => !data.enrollments.some(entry => entry.course_id === item.course_id && entry.student_email === learner.student_email) ? 'Not enrolled' : data.accesses.some(access => access.publication_id === item.id && access.student_email?.toLowerCase() === learner.student_email.toLowerCase()) ? 'Opened' : 'No recorded open')])
  const headers = isStudent ? ['Material', 'Week', 'Status'] : ['Student', ...materials.map(item => item.title)]
  return <><Panel title="Learning Material Access" actions={<CsvButton headers={headers} rows={rows} name="material-access" />}><p className="text-sm text-muted mb-16">A recorded open confirms the first access. It does not measure time spent or completion of the reading.</p><Table headers={headers} rows={materials.length ? rows : []} /></Panel><Panel title="Material access chart"><CoverageChart data={data} material /></Panel><Panel title="Recorded material access"><Table headers={['Material', ...(!isStudent ? ['Student'] : []), 'First opened']} rows={data.accesses.map(item => [data.publications.find(pub => pub.id === item.publication_id)?.title || 'Retained material', ...(!isStudent ? [item.student_email || 'Retained student account'] : []), new Date(item.first_opened_at).toLocaleString()])} empty="No material opens recorded." /></Panel></>
}
export function ScoreMatrix({ data, onStudent }) {
  const assessments = data.publications.filter(item => item.active && item.type === 'assessment')
  const learners = learnerRows(data)
  return <Panel title="Assessment scoring matrix"><p className="text-sm text-muted mb-16">Current published versions only. “No attempt” is distinct from a score of zero. Color intensity follows the raw score percentage. Select a student for their recorded history.</p><Table headers={['Student', ...assessments.map(item => `W${item.week} · ${item.title}`)]} rows={assessments.length ? learners.map(learner => [<button key={learner.student_email} className="btn btn-ghost btn-sm" onClick={() => onStudent(learner)}>{learner.display_name || learner.student_email}</button>, ...assessments.map(item => {
    if (!data.enrollments.some(entry => entry.course_id === item.course_id && entry.student_email === learner.student_email)) return 'Not enrolled'
    const attempt = studentAttempt(data, item, learner.student_email)
    return attempt ? <span key={item.id} className="academic-score" style={{ background: `color-mix(in srgb, var(--sky-500) ${10 + percent(attempt.score, attempt.max_score) * .3}%, var(--white))` }}>{attempt.score}/{attempt.max_score} · {percent(attempt.score, attempt.max_score)}%</span> : item.due_at&&new Date(item.due_at)<new Date()?'Missed':'No attempt'
  })]) : []} /></Panel>
}
export default function AcademicPerformance({ data, role, monitoring = false }) {
  const isStudent = role === 'student'
  const workspace=useWorkspace()
  const [ackError,setAckError]=useState('')
  const [courseId, setCourseId] = useState(''), [block, setBlock] = useState(''), [since, setSince] = useState(''), [until, setUntil] = useState('')
  const [threshold, setThreshold] = useState(75), [student, setStudent] = useState(null)
  const topics=topicSummary(data).filter(item=>item.value<threshold)
  const { key, nav } = useAcademicTabs({ items: monitoring ? [['assessments', 'Assessment Scores'], ['materials', 'Learning Material Access']] : [['overview', 'Overview'], ['bytopic', 'By Topic'], ['materials', 'Learning Materials'], ['scores', 'Assessment Scores'], ...(!isStudent ? [['alerts', 'Alerts']] : [])], label: monitoring ? 'Student monitoring views' : 'Performance views' })
  const filtered = filterAcademic(data, courseId, block, since, until)
  const validDates = !since || !until || since <= until
  const current = currentAttempts(filtered)
  const summary = assessmentSummary(filtered)
  const graded=current.filter(item=>item.grading_status!=='pending_review')
  const average = percent(graded.reduce((sum, item) => sum + item.score, 0), graded.reduce((sum, item) => sum + item.max_score, 0))
  const alerts = graded.filter(item => percent(item.score, item.max_score) < threshold)
  const detail = student && { ...filtered, enrollments: filtered.enrollments.filter(item => item.student_email === student.student_email), attempts: filtered.attempts.filter(item => item.student_email?.toLowerCase() === student.student_email.toLowerCase()), accesses: filtered.accesses.filter(item => item.student_email?.toLowerCase() === student.student_email.toLowerCase()) }
  return <>
    <div className="academic-filters"><CourseFilter data={data} value={courseId} onChange={setCourseId} />{!isStudent && <label className="academic-filter">Block<select className="form-select" value={block} onChange={event => setBlock(event.target.value)}><option value="">All blocks</option>{[...new Set(data.enrollments.map(item => item.block_section).filter(Boolean))].sort().map(value => <option key={value}>{value}</option>)}</select></label>}<label className="academic-filter">From<input className="form-input" type="date" value={since} onChange={event => setSince(event.target.value)} /></label><label className="academic-filter">Through<input className="form-input" type="date" value={until} onChange={event => setUntil(event.target.value)} /></label></div>
    <p className="text-sm text-muted mb-16">Dates filter saved attempts and first opens. “No attempt” or “No recorded open” means no matching event in this date range.</p>
    {!validDates && <p role="alert">The start date must be on or before the end date.</p>}
    {nav}
    <KPIs items={[[isStudent ? 'My current attempts' : 'Current-version attempts', current.length], ['Average raw score', average === null ? '—' : `${average}%`], ['Published assessments', summary.length], ['Recorded material opens', filtered.accesses.length]]} />
    {(key === 'overview' || key === 'assessments') && <><ScoreCharts data={filtered} />{monitoring && <div className="academic-grid"><Panel title="Class average per assessment"><CoverageChart data={filtered} /></Panel><Panel title="Assessment submission rate"><CoverageChart data={filtered} completion /><p className="text-sm text-muted">Current-version attempts divided by the confirmed roster. This measures submission, not a pass rate.</p></Panel></div>}{!isStudent && <ScoreMatrix data={filtered} onStudent={setStudent} />}<Attempts data={filtered} isStudent={isStudent} /></>}
    {key === 'bytopic' && <><h2 className="mb-16">Topics and assessment coverage</h2><TopicMastery data={filtered} isStudent={isStudent} cutoff={threshold} onStudent={setStudent}/></>}
    {key === 'materials' && <MaterialAccess data={filtered} isStudent={isStudent} />}
    {key === 'scores' && <>{!isStudent && <ScoreMatrix data={filtered} onStudent={setStudent} />}<Attempts data={filtered} isStudent={isStudent} /></>}
    {role==='instructor' && (key==='scores'||key==='assessments') && <AttemptReview data={filtered}/>}
    {role==='instructor' && <AcademicReminders data={filtered}/>}
    {key === 'alerts' && <><Panel title="Score review threshold"><label className="academic-filter">Review scores below (%)<input className="form-input" type="number" min="0" max="100" value={threshold} onChange={event => setThreshold(Math.min(100, Math.max(0, Number(event.target.value))))} /></label><p className="text-sm text-muted mt-16">This is a local review filter, not a pass mark, official grade or automated risk classification.</p><Table headers={['Student', 'Assessment', 'Raw score']} rows={alerts.map(item => [item.student_email || 'Retained student account', filtered.publications.find(pub => pub.id === item.publication_id)?.title, `${item.score}/${item.max_score} (${percent(item.score, item.max_score)}%)`])} empty="No recorded current-version scores fall below this threshold." /></Panel><Panel title="Unanswered assessments"><Table headers={['Assessment', 'Current attempts', 'Roster size']} rows={summary.filter(item => item.attempts < item.expected).map(item => [item.title, item.attempts, item.expected])} empty="No unanswered assessment gaps in the available roster." /><p className="text-sm text-muted mt-16">No due dates are available. Unanswered does not mean overdue.</p></Panel></>}
    {key==='alerts'&&<Panel title="Topic mastery alerts"><p className="text-sm text-muted mb-16">Mapped, graded topic results below the selected cutoff. Acknowledgment is saved privately to this account and applies to this result and cutoff.</p>{ackError&&<p role="alert">{ackError}</p>}<Table headers={['Topic','Average mapped score','Action']} rows={topics.map(topic=>{const key=`${topic.id}:${topic.score}:${topic.max_score}:${threshold}`;return [topic.topic,`${topic.value}%`,<button key={key} className="btn btn-secondary btn-sm" disabled={workspace.loading||workspace.saving||(workspace.acknowledgments || []).includes(key)} onClick={async()=>{setAckError('');try{await workspace.commit(data=>({...data,acknowledgments:[...new Set([...(data.acknowledgments || []),key])].slice(-200)}))}catch(failure){setAckError(failure.message)}}}>{(workspace.acknowledgments || []).includes(key)?'Acknowledged':'Acknowledge topic alert'}</button>]})} empty="No mapped topic results below the cutoff."/></Panel>}
    {student && <ModalLayer onDismiss={() => setStudent(null)} onClick={() => setStudent(null)}><div className="modal-content academic-student-dialog" role="dialog" aria-modal="true" aria-label="Student performance detail" onClick={event => event.stopPropagation()}><div className="modal-header"><h2>{student.display_name || student.student_email}</h2><button className="modal-close" aria-label="Close student detail" onClick={() => setStudent(null)}>×</button></div><p className="text-sm text-muted mb-16">{student.student_email}</p><TopicMastery data={detail} isStudent compact/><ScoreCharts data={detail} /><Attempts data={detail} isStudent /></div></ModalLayer>}
  </>
}
