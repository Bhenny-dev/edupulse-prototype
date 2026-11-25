import { LoadingStatus } from '../ui/LoadingFeedback'
import {lazy,Suspense,useEffect,useRef,useState} from 'react'
import {Link,useLocation,useNavigate,useSearchParams} from 'react-router-dom'
import {useAuth} from '../../context/AuthContext'
import {useAcademicRecords} from '../../context/AcademicContext'
import {recordsForLoadTerm,loadTerm,CURRENT_LOAD_TERM} from '../../utils/loadTerms'
import {studentClassPath} from '../../utils/studentClassPath'
import {ClassCard,EmptyClasses} from '../classroom/ClassCards'
import JoinClassDialog from './JoinClassDialog'
import {enrolledCourses} from './StudentClassDetail'
import {KPIs} from './AcademicUI'
import StudentProgressBar from './StudentProgressBar'
import {courseProgress,isDelivered,pendingAssessments,recordsNow} from './studentProgress'
import StudentDueWork from './StudentDueWork'
import useAcademicTerm from './useAcademicTerm'
import LoadTermFilter from './LoadTermFilter'
import './student-classroom.css'

const ClassPortal = lazy(() => import('./AcademicPortal'))

const searchWords = value => String(value || '').normalize('NFKD').replace(/\p{Mark}/gu,'').toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu,' ').trim()

const termLabel = course => {
  const [,semester] = loadTerm(course.academic_year || CURRENT_LOAD_TERM.split('|')[0],course.semester || '').split('|')
  return [semester,course.academic_year && 'AY ' + course.academic_year].filter(Boolean).join(' · ')
}

export default function StudentHome() {
  const records = useAcademicRecords()
  const {user} = useAuth()
  const {term} = useAcademicTerm()
  const navigate = useNavigate()
  const [params,setParams] = useSearchParams()
  const {state} = useLocation()
  const classOpen = params.has('course')
  const classOpener = useRef(null)
  useEffect(() => {
    if (!classOpen) classOpener.current?.focus({preventScroll:true})
  }, [classOpen])
  const closeClass = () => {
    if (state?.classEntry) return navigate(-1)
    const next = new URLSearchParams(params)
    for (const key of ['course','studentTab','item','publication','week','join']) next.delete(key)
    setParams(next,{replace:true})
  }
  const joining = !classOpen && params.get('join') === 'class'
  const setJoining = open => {
    const next = new URLSearchParams(params)
    if (open) next.set('join','class')
    else next.delete('join')
    open ? setParams(next,{state:{joinEntry:true}}) : state?.joinEntry ? navigate(-1) : setParams(next,{replace:true})
  }
  const [notice,setNotice] = useState('')
  const [search,setSearch] = useState('')
  const data = recordsForLoadTerm(records.data,term)
  const courses = enrolledCourses(data)
  const canJoin = !user?.supportSubject
  const block = course => course.block_section || data.enrollments.find(row => row.course_id === course.id)?.block_section
  const waiting = data.classJoins.filter(join =>
    (term === 'all' || loadTerm(join.academic_year,join.semester) === term) &&
    !courses.some(course => course.course_code === join.course_code && block(course) === join.block)
  )

  const terms = searchWords(search).split(' ').filter(Boolean)
  const matches = (course, section) => {
    const name = searchWords([course.course_code,course.course_title,course.instructor_name,section].join(' '))
    return terms.every(word => name.includes(word))
  }
  const visibleCourses = courses.filter(course => matches(course,block(course)))
  const visibleWaiting = waiting.filter(course => matches(course,course.block))
  const visibleCount = visibleCourses.length + visibleWaiting.length

  function joined(result) {
    const joinedTerm = loadTerm(result.academic_year,result.semester)
    if (result.course_id) {
      const message = result.status === 'member' ? 'You are already a member of this class.' : 'You joined the class.'
      navigate(studentClassPath(result.course_id,{term:joinedTerm,studentTab:'announcements'}),{replace:true,state:{joinNotice:message,classEntry:state?.joinEntry}})
      return
    }
    const next = new URLSearchParams(params)
    next.delete('join')
    next.set('term',joinedTerm)
    setParams(next,{replace:true})
    setNotice('Your membership is saved. The class will open when your instructor makes the course available.')
  }

  const now = recordsNow(data)
  const delivered = data.publications.filter(item => isDelivered(item, now))
  const materialIds = new Set(delivered.filter(item => item.type !== 'assessment' && !item.content?.submissionOnly).map(item => item.id))
  const pending = pendingAssessments(data, now)
  const announcements = data.announcements.filter(post => courses.some(course => course.id === post.course_id))
    .sort((a,b) => b.created_at.localeCompare(a.created_at)).slice(0,5)

  return <div className="container student-home">
    <header className="page-header">
      <div><h1>Home</h1><p>Your classes and upcoming work</p></div>
      <div className="academic-actions">
        <LoadTermFilter data={records.data}/>
        {canJoin && <button className="btn btn-primary" onClick={() => setJoining(true)}>Join Class</button>}
      </div>
    </header>
    {(records.error || data.classroomError) && <div className="connected-pulse-warning" role="alert">
      {records.error || data.classroomError} <button className="btn btn-secondary" onClick={() => records.load(true)}>Retry loading classes</button>
    </div>}
    {notice && <p role="status">{notice}</p>}
    {data.homeBlock && <section className="card mb-24"><div className="card-body">
      <h2>My Block</h2>
      <p>{[
        data.homeBlock.code,
        data.homeBlock.year_level && 'Year ' + data.homeBlock.year_level,
        data.homeBlock.program,
        Number.isInteger(data.homeBlock.students) && data.homeBlock.students + ' students',
      ].filter(Boolean).join(' · ')}</p>
    </div></section>}
    {records.loading && !records.loaded ? <LoadingStatus label="Loading your classes..." /> : <>
      {courses.length > 0 && <KPIs items={[
        ['Enrolled courses', courses.length],
        ['Delivered materials', materialIds.size],
        ['Delivered assessments', delivered.filter(item => item.type === 'assessment').length],
        ['Materials opened', new Set(data.accesses.filter(access => materialIds.has(access.publication_id)).map(access => access.publication_id)).size],
      ]}/>}
      {Boolean(courses.length || waiting.length) && <div className="student-class-search">
        <label className="form-label">Find a class
          <input className="form-input" type="search" placeholder="Course, instructor or section" value={search} onChange={event => setSearch(event.target.value)} aria-controls="your-classes"/>
        </label>
        {search && <button type="button" className="btn btn-secondary" onClick={() => setSearch('')}>Clear search</button>}
      </div>}
      {search && <p role="status" className="text-sm text-muted">{visibleCount ? visibleCount + (visibleCount === 1 ? ' class matches' : ' classes match') : 'No classes match your search.'}</p>}
      <section id="your-classes" aria-label="Your classes" className="class-card-grid">
        {visibleCourses.map(course => {
          const progress = courseProgress(data,course.id,now)
          return <ClassCard key={course.id} code={course.course_code} title={course.course_title}
          label={'Open ' + course.course_code + ' ' + course.course_title}
          onOpen={event => {
            classOpener.current = event.currentTarget
            navigate(studentClassPath(course.id,{term,studentTab:'announcements'}),{state:{classEntry:true}})
          }}
          lines={[course.instructor_name || 'Instructor not recorded',termLabel(course),course.units && course.units + ' units']}
          chips={[block(course) || 'Section not recorded']}
          status={course.suspended ? 'Membership suspended' : !course.active ? 'Awaiting instructor release' : undefined}
          progress={progress.total > 0 && !course.suspended && <StudentProgressBar value={progress.done} total={progress.total} label={course.course_code+' items done'} text={progress.label}/>}/>
        })}
        {visibleWaiting.map(join => <ClassCard key={join.load_key} waiting code={join.course_code} title={join.course_title}
          label={join.course_code + ' ' + join.block + ', joined'}
          lines={[join.instructor_name,termLabel(join)]} chips={[join.block]} status="Joined. Waiting for course materials." />)}
      </section>
      {!courses.length && !waiting.length && !records.error && <EmptyClasses title="No classes in this term">
        {canJoin ? 'Enter the class code shared by your instructor to join.' : 'No instructor-confirmed memberships are available.'}
      </EmptyClasses>}
      <section className="card mt-24"><div className="card-body">
        <StudentDueWork work={pending} renderItem={item=><>
          <Link state={{classEntry:true}} to={studentClassPath(item.course_id,{term,studentTab:'materials',item:item.id})}>{item.title}</Link>
          <span className="text-sm text-muted">{courses.find(course => course.id === item.course_id)?.course_code} / Week {item.week}</span>
        </>}/>
      </div></section>
      <section className="card mt-24"><div className="card-body">
        <h2>Recent Announcements</h2>
        {announcements.length ? <ul className="student-home-items">{announcements.map(post => <li key={post.id}>
          <Link state={{classEntry:true}} to={studentClassPath(post.course_id,{term,studentTab:'announcements',item:post.id})}>{post.title}</Link>
          <span className="text-sm text-muted">{post.course_code}</span>
        </li>)}</ul> : <p>No published announcements.</p>}
      </div></section>
    </>}
    {classOpen && <Suspense fallback={<LoadingStatus className="class-opening-status" label="Opening class..." />}><ClassPortal view="courseware" classModal onCloseClass={closeClass}/></Suspense>}
    {canJoin && joining && <JoinClassDialog onClose={() => setJoining(false)} onJoined={joined}/>}
  </div>
}
