import {useSearchParams} from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useWorkspaceViewState } from '../../context/WorkspaceContext'
import { useAuth } from '../../context/AuthContext'
import { useAcademicRecords } from '../../context/AcademicContext'
import { pulse } from '../pulse/pulseBus'
import { SkeletonKPI, SkeletonTable } from '../ui/LoadingSkeleton'
import { Spinner } from '../ui/LoadingFeedback'
import AcademicPerformance from './AcademicPerformance'
import InstructorMonitoring from './InstructorMonitoring'
import AcademicManagement from './AcademicManagement'
import StudentCourses from './StudentCourses'
import StudentPractice from './StudentPractice'
import AcademicLibrary, { OpenedPublication } from './AcademicLibrary'
import AcademicSyncStatus from './AcademicSyncStatus'
import DeanRecords from './DeanRecords'
import { deanPreview } from './deanPreview'
import './academic.css'

const TITLES = { instructors:'Instructors', students:'Students', performance: 'Performance', monitoring: 'Student Monitoring', monitor: 'Academic Oversight', courses: 'Course Loading', records: 'Academic Records', courseware: 'Published Courseware', assessment: 'Assessments' }

// Live sections share the account-scoped RLS projection. Missing live records
// never fall back to the separate preview persona's sample scores. The account
// dashboard lives in pages/Dashboard.jsx with the preview role dashboards.
export default function AcademicPortal({ view }) {
  const { user } = useAuth()
  const [pageParams]=useSearchParams()
  const records = useAcademicRecords()
  const preview=!user?.authenticated&&(user?.role==='dean'||user?.role==='instructor'&&view==='monitoring')
  const data=preview?deanPreview():records.data, loadError=records.error, loading=records.loading, loaded=records.loaded||preview, execute=records.command
  const deanPage=user?.role==='dean'&&['records','instructors','students'].includes(view)
  const title=user?.role==='student'&&view==='courseware'?'My Courses':user?.role==='student'&&view==='assessment'?'Practice Assessments':user?.role==='dean'&&view==='records'?'Course':TITLES[view]
  const [readerId,setReaderId]=useWorkspaceViewState(`academic-reader:${view}`,null)
  const [assessmentId,setAssessmentId]=useState(null)
  const selected=data.publications.find(item=>item.active&&item.id===(assessmentId||readerId)&&(view!=='courseware'||user?.role!=='student'||item.course_id===pageParams.get('course')))||null
  const [answers, setAnswers] = useState({}), [busy, setBusy] = useState(false), [result, setResult] = useState(null), [error, setError] = useState('')
  const [session,setSession]=useState(null)
  const [adminTest,setAdminTest]=useState(false)
  useEffect(()=>{if(selected)document.getElementById('opened-publication')?.scrollIntoView({block:'start'})},[selected?.id])
  const learnerControls=user?.role==='student'&&(!user?.supportSubject||adminTest)
  const run = async command => {
    setBusy(true); setError('')
    try { const response = await execute({...command,...(user?.supportSubject&&adminTest?{adminTest:true}:{})}); setResult(response); pulse.progress('academic-command-complete', command.operation); return response }
    catch (failure) { setError(failure.message); return null }
    finally { setBusy(false) }
  }
  const exportRecords = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'edupulse-authorized-records.json'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const isStudent = user?.role === 'student'
  const open = async item => {
    if(isStudent&&item.type!=='assessment'){
      setAssessmentId(null);setReaderId(item.id);setResult(null);setAnswers({});
      if(learnerControls)void run({operation:'open',publication:item.id,version:item.source_version});
      return
    }
    setSession(null)
    if(learnerControls && item.type==='assessment' && !data.attempts.some(a=>a.publication_id===item.id&&String(a.source_version)===String(item.source_version))) {
      const started=await run({operation:'start',publication:item.id,version:item.source_version})
      if(!started)return
      setSession(started)
    }
    setAssessmentId(item.type==='assessment'?item.id:null);setReaderId(item.type==='assessment'?null:item.id); setAnswers({}); setResult(null)
  }
  return <div className={`container academic-portal${isStudent?' student-learning':''}`} aria-busy={loading || busy} data-pulse-target={title} data-pulse-zone={deanPage?'records':view === 'performance' ? 'performance' : view === 'courseware' ? 'courseware' : view === 'monitor' ? 'monitor' : view === 'records' ? 'records' : view === 'courses' ? 'course-loading' : view === 'monitoring' ? 'performance' : undefined}>
    <div className="page-header"><div><h1>{title}</h1><p className="text-sm text-muted">{preview?'Preview sample records':deanPage?'Recorded course, instructor and student activity':'Account records · Instructor-confirmed EduSuite exports · No institutional grade computations'}</p></div><div className="academic-actions">{!preview&&<AcademicSyncStatus/>}{user?.role==='dean'&&view==='students'&&<a className="btn btn-secondary btn-sm" href="#/performance">View student performance</a>}<button className="btn btn-secondary btn-sm" disabled={loading || !loaded || busy || !!loadError} onClick={exportRecords}>Export authorized records</button></div></div>
    {(error || loadError) && <div role="alert" className="connected-pulse-warning">{error || loadError}</div>}
    {loading && !loaded && <section className="academic-loading" aria-label="Loading academic records"><p role="status" className="text-sm text-muted mb-16">Loading authorized academic records…</p><div aria-hidden="true"><div className="kpi-grid mb-24">{Array.from({ length: user?.role === 'associate_dean' ? 3 : 4 }, (_, index) => <SkeletonKPI key={index} />)}</div><SkeletonTable rows={4} cols={4} /></div></section>}
    {busy && <p role="status" className="text-sm text-muted mb-16"><Spinner /> Saving your request…</p>}
    {(loaded || (!loading && !loadError)) && <>
      {!deanPage && !loadError && !data.courses.length && !data.assignedCourses?.length && <div className="empty-state" role="status"><h2>No authorized academic records yet</h2><p>Instructors register confirmed class lists, activate an approved syllabus, review courseware and publish it. Students need a matching account email in the registered class list. Saved workspaces synchronize automatically.</p></div>}
      {view==='monitoring'&&user?.role==='instructor'?<InstructorMonitoring data={data}/>:['performance', 'monitoring'].includes(view) && user?.role !== 'associate_dean' && <AcademicPerformance data={data} role={user?.role} monitoring={view === 'monitoring'} />}
      {deanPage?<DeanRecords data={data} view={view}/>:['records', 'courses', 'monitor'].includes(view) && <AcademicManagement data={data} role={user?.role} view={view} />}
      {isStudent&&user?.supportSubject&&['courseware','assessment'].includes(view)&&<section className="connected-pulse-warning mb-24"><label><input type="checkbox" checked={adminTest} onChange={e=>{setAdminTest(e.target.checked);setSession(null);setAssessmentId(null)}}/> Enable Admin demonstration controls</label><p>Actions are saved as Pipeline test with the Admin actor. Independent student work is protected.</p></section>}
      {isStudent&&view==='courseware'?<StudentCourses data={data} onOpen={open} busy={busy}/>:isStudent&&view==='assessment'?<StudentPractice data={data} onOpen={open} busy={busy} adminTest={adminTest}/>:['courseware', 'assessment'].includes(view) && <AcademicLibrary data={data} assessments={view === 'assessment'} onOpen={open} busy={busy} />}
      {selected && <div id="opened-publication"><OpenedPublication key={`${selected.id}:${session?.id || "reader"}`} selected={selected} data={data} isStudent={learnerControls} adminTest={Boolean(user?.supportSubject&&adminTest)} answers={answers} setAnswers={setAnswers} result={result} session={session} busy={busy} onClose={() => {setAssessmentId(null);setReaderId(null)}} onRetake={async()=>{const started=await run({operation:'start',publication:selected.id,version:selected.source_version,retake:true});if(started){setSession(started);setAnswers({});setResult(null)}}} onSubmit={() => run({ operation: 'respond', publication: selected.id, version: selected.source_version, session:session?.id, responses: selected.content.questions.map((_, index) => answers[index]) })} /></div>}
    </>}
  </div>
}
