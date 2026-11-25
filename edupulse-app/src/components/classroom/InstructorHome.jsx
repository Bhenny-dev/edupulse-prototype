import { LoadingStatus } from '../ui/LoadingFeedback'
import { lazy, Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart3, Copy, Settings2, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import useAcademicTerm from '../academic/useAcademicTerm'
import { SYLLABUS_STATUS_META } from '../../data/syllabusStatus'
import { instructorCourses, syllabusForCourse } from '../../utils/instructorCourses'
import { classOf, classStudents, studentCount } from '../../utils/classroom'
import { ClassCard, EmptyClasses } from './ClassCards'
import { codeFor } from './ClassCodes'
import { classInvitationUrl } from '../../utils/classInvitation'
import { classUpcoming, pendingAssessments, pendingReview } from './classWork'
import { HomeRail, ReviewPanel, UpcomingPanel } from './HomePanels'
import './classroom.css'

const ClassPage = lazy(() => import('../courseware/InstructorCourses'))

/** Instructor Home: management-loaded classes and the open class as a page over Home. */
export default function InstructorHome({ data, loaded, status, actions }) {
  const { user } = useAuth(), workspace = useWorkspace(), [params, setParams] = useSearchParams(), { addToast } = useToast()
  const { term, writable } = useAcademicTerm()
  // One card per block section: a course loaded with several blocks is several classes.
  const courses = useMemo(() => instructorCourses(data, user.id, workspace.syllabi).flatMap(course => (course.blocks.length ? course.blocks : ['']).map(block => classOf(course, block))), [data, user.id, workspace.syllabi])
  const counts = course => classStudents(course, workspace.registrations, data.enrollments)
  const classKey = course => `${course.id}|${course.block}`
  // Opening pushes a history entry, so the browser's Back closes the class; Close and Escape do the same.
  const open = (course, extra = {}) => setParams({ course: course.id, ...(course.block ? { block: course.block } : {}), term, ...extra })
  const close = () => {
    const id = `${params.get('course')}|${params.get('block') || ''}`
    setParams(params.get('term') ? { term: params.get('term') } : {})
    // Back to Home with the keyboard where it was: on the class that was just closed.
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector(`[data-class-id="${CSS.escape(id || '')}"]`)?.focus({ preventScroll: true })))
  }
  const panel = ['review', 'upcoming'].includes(params.get('panel')) && !params.get('course') ? params.get('panel') : null
  const openPanel = name => setParams({ panel: name, ...(params.get('term') ? { term: params.get('term') } : {}) })
  const closePanel = () => {
    const name = params.get('panel')
    setParams(params.get('term') ? { term: params.get('term') } : {})
    // The keyboard goes back to the circle button that opened the page.
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector(`[data-panel="${CSS.escape(name || '')}"]`)?.focus({ preventScroll: true })))
  }
  const named = course => `${course.code}${course.block ? ` · ${course.block}` : ''}`
  const [now] = useState(() => Date.now())
  const review = useMemo(() => courses.map(course => ({ course, count: pendingReview(data, course), assessments: pendingAssessments(data, course) })).filter(item => item.count > 0), [courses, data])
  const upcoming = useMemo(() => courses.flatMap(course => classUpcoming({ content: workspace.content, data, course, syllabus: syllabusForCourse(workspace.syllabi, course), now }).map(item => ({ ...item, course }))).sort((a, b) => a.at.localeCompare(b.at)).slice(0, 50), [courses, data, workspace.content, workspace.syllabi, now])
  const copyCode = async (code, block) => {
    try { await navigator.clipboard.writeText(code); addToast(`Copied the class code of block ${block}`, 'success') }
    catch { addToast('Copy is unavailable here. Open the class and select the code.', 'warning') }
  }
  const copyInvitation = async (code, block) => {
    const url = classInvitationUrl(code)
    try { await navigator.clipboard.writeText(url); addToast(`Invitation link for block ${block} copied`, 'success') }
    catch { addToast(`Invitation link: ${url}`, 'info') }
  }
  return <div className="container classroom-home" data-pulse-zone="general" data-pulse-target="Home">
    <div className="page-header"><div><h1>Home</h1><p className="text-muted">Welcome back, {user?.name}. Your classes are the courses the Dean assigned to you.</p></div>
      <div className="class-home-actions">{actions}</div></div>
    {status}
    {data.classroomError && <p role="status" className="connected-pulse-warning mb-16">{data.classroomError}</p>}
    {!writable && courses.length > 0 && <p className="text-sm text-muted mb-16">This semester is view-only. Open a class to review its records.</p>}
    {loaded && !courses.length && <EmptyClasses title="No classes yet">Your classes appear automatically when the Dean or Program Coordinator loads your courses and block sections.</EmptyClasses>}
    {courses.length > 0 && <section id="your-classes" aria-label="Your classes" className="class-card-grid">{courses.map(course => {
      const syllabus = syllabusForCourse(workspace.syllabi, course), students = counts(course)
      const code = course.block ? codeFor(data.classCodes, course, course.block) : null
      const menu = { label: `More for ${named(course)}`, actions: [
        ...(code ? [{ label: 'Copy class code', icon: Copy, onSelect: () => copyCode(code.code, course.block) }, { label: 'Copy invitation link', icon: Copy, onSelect: () => copyInvitation(code.code, course.block) }] : []),
        { label: 'Class List', icon: Users, onSelect: () => open(course, { tab: 'class-list' }) },
        { label: 'Scores', icon: BarChart3, onSelect: () => open(course, { tab: 'scores' }) },
        { label: 'Block section', icon: Settings2, onSelect: () => open(course, { view: 'blocks' }) }] }
      return <ClassCard key={classKey(course)} code={course.code} title={course.title} buttonClassName="instructor-course-card" cardId={classKey(course)} onOpen={() => open(course)} menu={menu}
        label={`Open course ${named(course)}`}
        lines={[[course.semester, course.academicYear && `AY ${course.academicYear}`, course.units && `${course.units} units`].filter(Boolean).join(' · ')]}
        chips={course.block ? [`Block ${course.block} · ${studentCount(students.get(course.block)?.size || 0)}`] : ['No block section yet']}
        status={syllabus ? `Syllabus: ${SYLLABUS_STATUS_META[syllabus.status]?.label || syllabus.status}` : 'Syllabus not added'} />
    })}</section>}
    {courses.length > 0 && <HomeRail reviewCount={review.reduce((sum, item) => sum + item.count, 0)} upcomingCount={upcoming.length} onOpen={openPanel} />}
    {panel === 'review' && <ReviewPanel classes={review} named={named} onOpenClass={open} onClose={closePanel} />}
    {panel === 'upcoming' && <UpcomingPanel items={upcoming} named={named} onOpenClass={open} onClose={closePanel} />}
    {params.get('course') && <Suspense fallback={<LoadingStatus className="class-opening-status" label="Opening class..." />}><ClassPage onClose={close} /></Suspense>}
  </div>
}
