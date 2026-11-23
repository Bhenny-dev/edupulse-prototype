import {useState} from 'react'
import {Link,useNavigate,useSearchParams} from 'react-router-dom'
import {useAuth} from '../../context/AuthContext'
import {useAcademicRecords} from '../../context/AcademicContext'
import {recordsForLoadTerm,loadTerm,CURRENT_LOAD_TERM} from '../../utils/loadTerms'
import {ClassCard,EmptyClasses} from '../classroom/ClassCards'
import JoinClassDialog from './JoinClassDialog'
import {enrolledCourses} from './StudentCourses'
import {currentAttempts} from './academicData'
import useAcademicTerm from './useAcademicTerm'
import LoadTermFilter from './LoadTermFilter'
import './student-classroom.css'

function coursePath(course, term, tab, item) {
  const params = new URLSearchParams({course, term, studentTab:tab})
  if (item) params.set('item', item)
  return '/courseware?' + params
}

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
  const joining = params.get('join') === 'class'
  const setJoining = open => {
    const next = new URLSearchParams(params)
    if (open) next.set('join','class')
    else next.delete('join')
    setParams(next,{replace:!open})
  }
  const [notice,setNotice] = useState('')
  const data = recordsForLoadTerm(records.data,term)
  const courses = enrolledCourses(data)
  const canJoin = !user?.supportSubject
  const block = course => course.block_section || data.enrollments.find(row => row.course_id === course.id)?.block_section
  const waiting = data.classJoins.filter(join =>
    (term === 'all' || loadTerm(join.academic_year,join.semester) === term) &&
    !courses.some(course => course.course_code === join.course_code && block(course) === join.block)
  )

  function joined(result) {
    const joinedTerm = loadTerm(result.academic_year,result.semester)
    if (result.course_id) {
      const message = result.status === 'member' ? 'You are already a member of this class.' : 'You joined the class.'
      navigate(coursePath(result.course_id,joinedTerm,'announcements'),{replace:true,state:{joinNotice:message}})
      return
    }
    const next = new URLSearchParams(params)
    next.delete('join')
    next.set('term',joinedTerm)
    setParams(next,{replace:true})
    setNotice('Your membership is saved. The class will open when your instructor makes the course available.')
  }

  const submitted = new Set(currentAttempts(data).map(attempt => attempt.publication_id))
  const pending = data.publications.filter(p => p.active && p.type === 'assessment' && !submitted.has(p.id))
    .sort((a,b) => (a.due_at || '9999').localeCompare(b.due_at || '9999'))
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
    {records.loading && !records.loaded ? <p role="status">Loading your classes...</p> : <>
      <section aria-label="Your classes" className="class-card-grid">
        {courses.map(course => <ClassCard key={course.id} code={course.course_code} title={course.course_title}
          label={'Open ' + course.course_code + ' ' + course.course_title}
          onOpen={() => navigate(coursePath(course.id,term,'announcements'))}
          lines={[course.instructor_name || 'Instructor not recorded',termLabel(course),course.units && course.units + ' units']}
          chips={[block(course) || 'Section not recorded']}
          status={course.suspended ? 'Membership suspended' : !course.active ? 'Awaiting instructor release' : undefined}/>)}
        {waiting.map(join => <ClassCard key={join.load_key} waiting code={join.course_code} title={join.course_title}
          label={join.course_code + ' ' + join.block + ', joined'}
          lines={[join.instructor_name,termLabel(join)]} chips={[join.block]} status="Joined. Waiting for course materials." />)}
      </section>
      {!courses.length && !waiting.length && !records.error && <EmptyClasses title="No classes in this term">
        {canJoin ? 'Enter the class code shared by your instructor to join.' : 'No instructor-confirmed memberships are available.'}
      </EmptyClasses>}
      <section className="card mt-24"><div className="card-body">
        <h2>Pending Assessments</h2>
        {pending.length ? <ul className="student-home-items">{pending.slice(0,6).map(item => <li key={item.id}>
          <Link to={coursePath(item.course_id,term,'materials',item.id)}>{item.title}</Link>
          <span className="text-sm text-muted">{courses.find(course => course.id === item.course_id)?.course_code} · Week {item.week}{item.due_at ? ' · Due ' + new Date(item.due_at).toLocaleString('en-PH',{timeZone:'Asia/Manila'}) + ' (Philippine time)' : ''}</span>
        </li>)}</ul> : <p>No pending published assessments in this term.</p>}
        {pending.length>6 && <Link to="/courseware">View all classes</Link>}
      </div></section>
      <section className="card mt-24"><div className="card-body">
        <h2>Recent Announcements</h2>
        {announcements.length ? <ul className="student-home-items">{announcements.map(post => <li key={post.id}>
          <Link to={coursePath(post.course_id,term,'announcements',post.id)}>{post.title}</Link>
          <span className="text-sm text-muted">{post.course_code}</span>
        </li>)}</ul> : <p>No published announcements.</p>}
      </div></section>
    </>}
    {canJoin && joining && <JoinClassDialog onClose={() => setJoining(false)} onJoined={joined}/>}
  </div>
}
