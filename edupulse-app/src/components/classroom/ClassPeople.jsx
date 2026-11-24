import { useMemo, useRef, useState } from 'react'
import { ClipboardCheck, UserPlus } from 'lucide-react'
import { currentAttempts } from '../academic/academicData'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace, useWorkspaceViewState } from '../../context/WorkspaceContext'
import { monitoringCohorts, cohortRecords } from '../academic/monitoringModel'
import MonitoringRoster from '../academic/MonitoringRoster'
import MonitoringAnalytics from '../academic/MonitoringAnalytics'
import { Table } from '../academic/AcademicUI'
import CourseClassList from '../courseware/CourseClassList'
import { classStudents, studentCount } from '../../utils/classroom'
import { loadTerm } from '../../utils/loadTerms'
import { BlockCode, InviteStudents } from './ClassCodes'
import { EmptyClasses } from './ClassCards'
import '../academic/monitoring.css'
import './classroom.css'

/** The per-block cohorts of this course once its course record exists (the approved syllabus). */
function useClassCohorts(course, data) {
  const { user } = useAuth(), workspace = useWorkspace()
  return useMemo(() => monitoringCohorts(data, workspace, user.id).filter(cohort => course.courseIds.includes(cohort.course.id) && course.blocks.includes(cohort.block)), [data, workspace, user.id, course])
}
const blockKey = (course, block) => `${course.code}|${block}|${loadTerm(course.academicYear, course.semester).split('|')[1] || course.semester}|${course.academicYear}`

/** Class List: the instructor, then each block's students with its class code and how they were added. */
export default function ClassPeople({ course, data, readOnly = false, onAddBlock }) {
  const { user } = useAuth(), workspace = useWorkspace(), cohorts = useClassCohorts(course, data)
  const counts = classStudents(course, workspace.registrations, data.enrollments)
  const [adding, setAdding] = useState(null), [notice, setNotice] = useState('')
  const listed = block => (workspace.registrations || []).filter(row => row.status === 'active' && row.assignmentKey === course.assignmentKey && row.blockSection === block).flatMap(row => row.students || [])
  const names = block => new Map(listed(block).map(student => [String(student.Email || '').toLowerCase(), student.Name]))
  return <>
    {notice && <p role="status" className="mb-16">{notice}</p>}
    <section className="class-section" aria-label="Instructor"><div className="class-section-heading"><h2>Instructor</h2></div>
      <div className="class-people-row"><span className="class-avatar" aria-hidden="true">{user?.name?.charAt(0)}</span><span><strong>{user?.name}</strong>{user?.email && <span className="text-sm text-muted"> · {user.email}</span>}</span></div></section>
    {course.blocks.map(block => {
      const cohort = cohorts.find(item => item.block === block), joined = (data.classJoins || []).filter(join => join.load_key === blockKey(course, block)), known = names(block)
      return <section key={block} className="class-section" aria-label={`Block ${block} class list`}>
        <div className="class-section-heading"><h2>Block {block} <span className="text-muted">· {studentCount(counts.get(block)?.size || 0)}</span></h2>
          <div className="class-section-tools"><BlockCode course={course} block={block} codes={data.classCodes} readOnly={readOnly} />{!readOnly && <InviteStudents course={course} block={block} codes={data.classCodes} />}{!readOnly && !cohort && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdding(block)}><UserPlus size={14} aria-hidden="true" />Add students</button>}</div></div>
        {joined.length > 0 && <p className="text-sm text-muted mb-16">Joined with the class code: {joined.map(join => known.get(String(join.student_email || '').toLowerCase()) || join.student_number).join(', ')}.</p>}
        {cohort ? <MonitoringRoster cohort={cohort} readOnly={readOnly} title="Enrolled students" /> : <>
          <Table label={`Block ${block} students`} headers={['Student', 'Student number', 'Email']} rows={listed(block).map(student => [student.Name || 'Name not recorded', student.StudentID || 'Not recorded', student.Email || 'Not recorded'])} empty={`No students in block ${block} yet. Share its class code or add students.`} />
          {listed(block).length > 0 && <p className="text-sm text-muted mt-8">These students are on the class list. They open the course once its approved syllabus is added.</p>}
        </>}
      </section>
    })}
    {!course.blocks.length && <EmptyClasses title="No block sections yet">Create a class code for a block section so students can join, or upload its class list.</EmptyClasses>}
    {!readOnly && <div className="class-section-tools mb-24"><button type="button" className="btn btn-secondary" onClick={onAddBlock}>Add a block section with a code</button><button type="button" className="btn btn-ghost" onClick={() => setAdding('new')}>Upload a class list for a new block</button></div>}
    {adding && <CourseClassList course={course} block={adding === 'new' ? undefined : adding} onClose={() => setAdding(null)} onSaved={message => { setAdding(null); setNotice(message) }} />}
  </>
}

/** Scores: each block's delivered-assessment scores (EduPulse scores, never official grades). */
export function ClassScores({ course, data }) {
  const cohorts = useClassCohorts(course, data)
  const [block, setBlock] = useWorkspaceViewState(`class:${course.id}:scores-block`, null)
  const cohort = cohorts.find(item => item.block === block) || cohorts[0], analytics = useRef(null)
  const scoped = cohort ? cohortRecords(data, cohort) : null
  const pending = scoped ? currentAttempts(scoped).filter(attempt => attempt.grading_status === 'pending_review' && !attempt.is_test).length : 0
  const showReview = () => [...(analytics.current?.querySelectorAll('h2') || [])].find(heading => /Review responses/.test(heading.textContent))?.scrollIntoView({ block: 'start' })
  if (!cohort) return <EmptyClasses title="No scores yet">Scores appear here when students of a block submit delivered assessments. A block needs its class list and the approved syllabus of the course first.</EmptyClasses>
  return <>
    {cohorts.length > 1 && <nav className="tabs mb-24" aria-label="Scores by block section">{cohorts.map(item => <button type="button" key={item.id} className={`tab ${item === cohort ? 'active' : ''}`} aria-pressed={item === cohort} onClick={() => setBlock(item.block)}>Block {item.block}</button>)}</nav>}
    <p className="text-sm text-muted mb-16">Block {cohort.block}: scores of delivered assessments. The latest submitted attempt counts. These are EduPulse assessment scores, not official grades.</p>
    {pending > 0 && <div className="class-mark-banner" role="status"><ClipboardCheck size={18} aria-hidden="true" /><span><strong>{pending}</strong> written {pending === 1 ? 'response is' : 'responses are'} waiting for your marking in block {cohort.block}.</span>
      <button type="button" className="btn btn-secondary btn-sm" onClick={showReview}>Go to review</button></div>}
    <div ref={analytics}><MonitoringAnalytics key={cohort.id} data={scoped} tab="assessments" scope={cohort.id} /></div>
  </>
}
