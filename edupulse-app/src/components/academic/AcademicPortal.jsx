import {useSearchParams} from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useWorkspaceViewState } from '../../context/WorkspaceContext'
import { useAuth } from '../../context/AuthContext'
import { useAcademicRecords } from '../../context/AcademicContext'
import { pulse } from '../pulse/pulseBus'
import { SkeletonKPI, SkeletonTable } from '../ui/LoadingSkeleton'
import { Spinner } from '../ui/LoadingFeedback'
import AcademicPerformance from './AcademicPerformance'
import InstructorMonitoring from './InstructorMonitoring'
import AcademicManagement from './AcademicManagement'
import StudentCourses, { enrolledCourses, StudentClassDetail, studentClassSubtitle } from './StudentCourses'
import StudentPractice from './StudentPractice'
import AcademicLibrary, { OpenedPublication } from './AcademicLibrary'
import TopicWorkPanel from '../classroom/TopicWorkPanel'
import PageModal from '../ui/PageModal'
import DocumentViewer from '../courseware/DocumentViewer'
import AcademicSyncStatus from './AcademicSyncStatus'
import DeanRecords from './DeanRecords'
import { deanPreview } from './deanPreview'
import GlassIcon from '../ui/GlassIcon'
import { BookOpen, GraduationCap, Users } from 'lucide-react'
import useAcademicTerm from './useAcademicTerm'
import LoadTermFilter from './LoadTermFilter'
import {loadTerm,recordsForLoadTerm} from '../../utils/loadTerms'
import { deliveryState } from '../../utils/blockDelivery'

const DEAN_HEADERS = { records: [BookOpen, 'var(--sky-500)', 'Courses, instructor loads and syllabus contents'], instructors: [GraduationCap, 'var(--purple-500)', 'Instructor accounts, qualifications and course loads'], students: [Users, 'var(--green-500)', 'Student accounts, blocks and learning progress'] }
import './academic.css'

const TITLES = { instructors:'Instructors', students:'Students', performance: 'Performance', monitoring: 'Student Monitoring', monitor: 'Academic Oversight', courses: 'Course Loading', records: 'Academic Records', courseware: 'Published Courseware', assessment: 'Assessments' }

// Live sections share the account-scoped RLS projection. Missing live records
// never fall back to the separate preview persona's sample scores. The account
// dashboard lives in pages/Dashboard.jsx with the preview role dashboards.
export default function AcademicPortal({ view, classModal = false, onCloseClass }) {
  const { user } = useAuth()
  const [pageParams,setPageParams]=useSearchParams()
  const records = useAcademicRecords()
  const staff=['dean','associate_dean'].includes(user?.role)
  const preview=!user?.authenticated&&(staff||user?.role==='instructor'&&view==='monitoring')
  const allData=preview?deanPreview():records.data
  const isStudent=user?.role==='student'
  const linkedCourse=isStudent&&view==='courseware'&&!pageParams.has('term')
    ? enrolledCourses(allData).find(course=>course.id===pageParams.get('course')) : null
  const linkedTerm=linkedCourse?.academic_year&&linkedCourse?.semester
    ? loadTerm(linkedCourse.academic_year,linkedCourse.semester) : null
  const {term,writable}=useAcademicTerm(linkedTerm)
  const data=recordsForLoadTerm(allData,term), loadError=records.error, loading=records.loading, loaded=records.loaded||preview, execute=records.command
  const deanPage=staff&&['records','instructors','students'].includes(view)
  const title=user?.role==='student'&&view==='courseware'?'My Courses':user?.role==='student'&&view==='assessment'?'Practice Assessments':staff&&view==='records'?'Course':TITLES[view]
  const [readerId,setReaderId]=useWorkspaceViewState(`academic-reader:${view}`,null)
  const selected=data.publications.find(item=>item.active&&item.id===(pageParams.get('item')||(user?.role==='student'?null:readerId))&&(view!=='courseware'||user?.role!=='student'||item.course_id===pageParams.get('course')))||null
  const sourcePreview = data.publications.find(item => item.id === pageParams.get('publication') && item.active && item.type !== 'assessment' && item.course_id === pageParams.get('course') && item.content && (!isScheduledStudent(item) || deliveryState(item)==='open'))
  function isScheduledStudent(item){return user?.role==='student'&&item.delivery_mode==='block_schedule'}
  const closeSourcePreview = () => { const query = new URLSearchParams(pageParams); query.delete('publication'); setPageParams(query) }
  const [answerDraft,setAnswerDraft]=useState(null), [busy, setBusy] = useState(false), [result, setResult] = useState(null), [error, setError] = useState('')
  const [startedSession,setSession]=useState(null)
  const session=startedSession?.publication_id===selected?.id&&startedSession?.source_version===selected?.source_version?startedSession:(data.sessions||[]).filter(s=>s.student_id===user?.id&&s.publication_id===selected?.id&&s.source_version===selected?.source_version).sort((a,b)=>b.attempt_no-a.attempt_no)[0]||null
  // The form is ephemeral and tied to the exact version and session. History
  // navigation can change the reader without remounting the academic page.
  const answerScope=selected&&session?`${selected.id}:${selected.source_version}:${session.id}`:null
  const answers=answerDraft?.scope===answerScope?answerDraft.values:{}
  const setAnswers=update=>{
    if(answerScope) setAnswerDraft(previous=>({scope:answerScope,values:update(previous?.scope===answerScope?previous.values:{})}))
  }
  useEffect(()=>{setAnswerDraft(previous=>previous?.scope===answerScope?previous:null)},[answerScope])
  const adminTest=user?.role==='student'&&Boolean(user?.supportSubject)
  const learnerControls=writable&&user?.role==='student'&&(!user?.supportSubject||adminTest)
  const commandLock=useRef(false)
  const run = async command => {
    if(commandLock.current)return null
    commandLock.current=true
    setBusy(true); setError('')
    try { const response = await execute({...command,...(user?.supportSubject&&adminTest?{adminTest:true}:{})}); if(command.operation==='respond'&&response?.id){setResult({...response,publication_id:command.publication,source_version:command.version});setAnswerDraft(null)} pulse.progress('academic-command-complete', command.operation); return response }
    catch (failure) { setError(failure.message); return null }
    finally { commandLock.current=false;setBusy(false) }
  }
  const unsaved=isStudent&&selected?.type==='assessment'&&Object.keys(answers).length>0&&!data.attempts.some(a=>a.publication_id===selected.id&&String(a.source_version)===String(selected.source_version)&&a.attempt_no===(session?.attempt_no||1))
  useEffect(()=>{if(!unsaved)return;const warn=e=>{e.preventDefault();e.returnValue=''};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[unsaved])
  const closeReader=()=>{if(busy)return;if(unsaved&&!window.confirm('Leave this assessment? Your unsaved responses will be lost.'))return;setReaderId(null);setAnswerDraft(null);const next=new URLSearchParams(pageParams);next.delete('item');setPageParams(next)}
  const showReader=id=>{
    if(pageParams.get('item')===id)return
    if(!isStudent)setReaderId(id)
    const next=new URLSearchParams(pageParams)
    next.set('item',id)
    setPageParams(next)
  }
  const open = async item => {
    if(writable&&isScheduledStudent(item)){
      const current=await run({operation:'read-publication',publication:item.id,version:item.source_version})
      if(!current)return
      item=current
      if(deliveryState(item)!=='open'||!item.content){showReader(item.id);setResult(null);setAnswerDraft(null);return}
    }
    if(isStudent&&item.type!=='assessment'){
      showReader(item.id);setResult(null);setAnswerDraft(null);
      if(learnerControls)void run({operation:'open',publication:item.id,version:item.source_version});
      return
    }
    showReader(item.id); setAnswerDraft(null); setResult(null)
  }
  const startAssessment = async (retake = false) => {
    if (!learnerControls || selected?.type !== 'assessment') return
    const started = await run({ operation: 'start', publication: selected.id, version: selected.source_version, ...(retake && { retake: true }) })
    if (!started) return
    setSession({ ...started, publication_id: selected.id, source_version: selected.source_version })
    setAnswerDraft(null)
    setResult(null)
  }
  const reader = selected && <PageModal title={selected.title} subtitle={`${data.courses.find(course=>course.id===selected.course_id)?.course_code||'Course'} / Week ${selected.week} \u00b7 ${selected.type==='assessment'?'Assessment':selected.content?.submissionOnly?'Submission bin':'Teaching material'}`} closeLabel={selected.type==='assessment'?'Close assessment':'Close material'} onClose={closeReader} bodyClassName="reader-page-body"><div id="opened-publication">{error&&<p role="alert" className="connected-pulse-warning">{error}</p>}<OpenedPublication pageModal onStart={()=>startAssessment()} onRecheck={()=>open(selected)} onNext={open} key={`${selected.id}:${session?.id || "reader"}`} selected={selected} data={data} isStudent={isStudent} canAttempt={learnerControls} adminTest={Boolean(user?.supportSubject&&adminTest)} answers={answers} setAnswers={setAnswers} result={result} session={session} busy={busy} onClose={closeReader} onRetake={()=>startAssessment(true)} onSubmit={() => {if(window.confirm('Submit this assessment? Check your responses before confirming.'))return run({ operation: 'respond', publication: selected.id, version: selected.source_version, session:session?.id, responses: selected.content.questions.map((_, index) => answers[index]) })}} />{isStudent&&user?.authenticated&&!user.supportSubject&&<TopicWorkPanel key={selected.id} publication={selected} readOnly={!writable}/>}</div></PageModal>
  const sourceReader = sourcePreview && <PageModal title={sourcePreview.title} label="Referenced teaching material" subtitle="Source preview" closeLabel="Close source material" onClose={closeSourcePreview} bodyClassName="reader-page-body"><DocumentViewer embedded readOnly isStudent content={sourcePreview.content} onBack={closeSourcePreview} /></PageModal>
  if (classModal) {
    const course = enrolledCourses(data).find(item => item.id === pageParams.get('course'))
    const title = course ? [course.course_code,course.course_title].join(' — ') : loading ? 'Opening class' : 'Class unavailable'
    return <PageModal title={title} subtitle={course && studentClassSubtitle(course,data)} closeLabel="Close class and return to Home" onClose={onCloseClass} className="class-modal" bodyClassName="student-learning">
      <div data-pulse-zone="courseware" data-pulse-target={course?.course_title || 'Class'}>
        {loadError && <div role="alert">{loadError} <button className="btn btn-secondary" onClick={() => records.load(true)}>Retry loading class</button></div>}
        {loading && !loaded && <p role="status">Loading your class...</p>}
        {course ? <StudentClassDetail selected={course} data={data} onOpen={open} busy={busy}/> : loaded && <p role="alert">This class is unavailable in the selected term or is no longer assigned to your account.</p>}
        {course && error && !selected && <p role="alert">{error}</p>}
        {course && pageParams.has('item') && !selected && pageParams.get('studentTab') !== 'announcements' && <p role="alert">This item is unavailable in your class.</p>}
        {course && reader}
        {course && sourceReader}
      </div>
    </PageModal>
  }
  return <div className={`container academic-portal${isStudent?' student-learning':''}`} aria-busy={loading || busy} data-pulse-target={title} data-pulse-zone={deanPage?'records':view === 'performance' ? 'performance' : view === 'courseware' ? 'courseware' : view === 'monitor' ? 'monitor' : view === 'records' ? 'records' : view === 'courses' ? 'course-loading' : view === 'monitoring' ? 'performance' : undefined}>
    <div className="page-header"><div className={deanPage?'dean-page-title':undefined}>{deanPage&&<GlassIcon icon={DEAN_HEADERS[view][0]} color={DEAN_HEADERS[view][1]} size="lg"/>}<div><h1>{title}</h1><p className="text-sm text-muted">{preview?'Preview sample records':deanPage?DEAN_HEADERS[view][2]:isStudent?'Your courses, learning activities and personal results':'Account records · Instructor-confirmed EduSuite exports · No institutional grade computations'}</p></div></div><div className="academic-actions academic-header-actions">{(deanPage||isStudent)&&<LoadTermFilter data={allData}/>}{!preview&&<AcademicSyncStatus/>}{user?.role==='dean'&&view==='students'&&<a className="btn btn-secondary btn-sm" href="#/performance">View student performance</a>}</div></div>
    {!deanPage&&!isStudent&&<LoadTermFilter data={allData}/>}
    {((error && !selected) || loadError) && <div role="alert" className="connected-pulse-warning">{error || loadError}</div>}
    {loading && !loaded && <section className="academic-loading" aria-label="Loading academic records"><p role="status" className="text-sm text-muted mb-16">Loading authorized academic records…</p><div aria-hidden="true"><div className="kpi-grid mb-24">{Array.from({ length: user?.role === 'associate_dean' ? 3 : 4 }, (_, index) => <SkeletonKPI key={index} />)}</div><SkeletonTable rows={4} cols={4} /></div></section>}
    {busy && <p role="status" className="text-sm text-muted mb-16"><Spinner /> Saving your request…</p>}
    {(loaded || (!loading && !loadError)) && <>
      {!deanPage && !loadError && !data.courses.length && !data.assignedCourses?.length && <div className="empty-state" role="status"><h2>No authorized academic records yet</h2><p>Instructors register confirmed class lists, activate an approved syllabus, review courseware and publish it. Students need a matching account email in the registered class list. Saved workspaces synchronize automatically.</p></div>}
      {view==='monitoring'&&user?.role==='instructor'?<InstructorMonitoring data={data} readOnly={!writable}/>:['performance', 'monitoring'].includes(view) && user?.role !== 'associate_dean' && <AcademicPerformance data={data} role={user?.role} monitoring={view === 'monitoring'} />}
      {deanPage?<DeanRecords data={allData} view={view}/>:['records', 'courses', 'monitor'].includes(view) && <AcademicManagement data={data} role={user?.role} view={view} />}
      {isStudent&&view==='courseware'?<StudentCourses data={data} onOpen={open} busy={busy}/>:isStudent&&view==='assessment'&&writable?<StudentPractice data={data} onOpen={open} busy={busy} adminTest={adminTest}/>:['courseware', 'assessment'].includes(view) && <AcademicLibrary data={data} assessments={view === 'assessment'} onOpen={open} busy={busy} />}
      {isStudent&&pageParams.has('item')&&!selected&&pageParams.get('studentTab')!=='announcements'&&<p role="alert">This item is unavailable in your class.</p>}
      {reader}
    </>}
    {sourceReader}
  </div>
}
