import { lazy, Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart3, Copy, Plus, Settings2, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import useAcademicTerm from '../academic/useAcademicTerm'
import { SYLLABUS_STATUS_META } from '../../data/syllabusStatus'
import { instructorCourses, syllabusForCourse } from '../../utils/instructorCourses'
import { classStudents } from '../../utils/classroom'
import { ClassCard, EmptyClasses } from './ClassCards'
import CreateClassDialog from './CreateClassDialog'
import { codeFor } from './ClassCodes'
import { classUpcoming, pendingAssessments, pendingReview } from './classWork'
import { HomeRail, ReviewPanel, UpcomingPanel } from './HomePanels'
import './classroom.css'

const ClassPage = lazy(() => import('../courseware/InstructorCourses'))

/** Instructor Home: one card per assigned course, Create class, and the open class as a page over Home (?course=). */
export default function InstructorHome({ data, loaded, status, actions }) {
  const { user } = useAuth(), workspace = useWorkspace(), [params, setParams] = useSearchParams(), { addToast } = useToast()
  const { term, writable } = useAcademicTerm()
  const courses = useMemo(() => instructorCourses(data, user.id, workspace.syllabi), [data, user.id, workspace.syllabi])
  const [creating, setCreating] = useState(false)
  const counts = course => classStudents(course, workspace.registrations, data.enrollments)
  // Opening pushes a history entry, so the browser's Back closes the class; Close and Escape do the same.
  const open = (course, extra = {}) => setParams({ course: course.id, term, ...extra })
  const close = () => {
    const id = params.get('course')
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
  const repeated = code => courses.filter(course => course.code === code).length > 1
  const named = course => `${course.code}${repeated(course.code) && course.blocks.length ? ` · ${course.blocks.join(', ')}` : ''}`
  const [now] = useState(() => Date.now())
  const review = useMemo(() => courses.map(course => ({ course, count: pendingReview(data, course), assessments: pendingAssessments(data, course) })).filter(item => item.count > 0), [courses, data])
  const upcoming = useMemo(() => courses.flatMap(course => classUpcoming({ content: workspace.content, data, course, syllabus: syllabusForCourse(workspace.syllabi, course), now }).map(item => ({ ...item, course }))).sort((a, b) => a.at.localeCompare(b.at)).slice(0, 50), [courses, data, workspace.content, workspace.syllabi, now])
  const copyCode = async (code, block) => {
    try { await navigator.clipboard.writeText(code); addToast(`Copied the class code of block ${block}`, 'success') }
    catch { addToast('Copy is unavailable here. Open the class and select the code.', 'warning') }
  }
  return <div className="container classroom-home" data-pulse-zone="general" data-pulse-target="Home">
    <div className="page-header"><div><h1>Home</h1><p className="text-muted">Welcome back, {user?.name}. Your classes are the courses the Dean assigned to you.</p></div>
      <div className="class-home-actions">{actions}{writable && courses.length > 0 && <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" />Create class</button>}</div></div>
    {status}
    {data.classroomError && <p role="status" className="connected-pulse-warning mb-16">{data.classroomError}</p>}
    {!writable && courses.length > 0 && <p className="text-sm text-muted mb-16">This semester is view-only. Open a class to review its records.</p>}
    {loaded && !courses.length && <EmptyClasses title="No classes yet">The Dean has not assigned a course to you for this semester. Your classes appear here once a course is loaded; then create a class code so your students can join.</EmptyClasses>}
    {courses.length > 0 && <section id="your-classes" aria-label="Your classes" className="class-card-grid">{courses.map(course => {
      const syllabus = syllabusForCourse(workspace.syllabi, course), students = counts(course)
      const menu = { label: `More for ${course.code}${repeated(course.code) ? ` (${course.blocks.join(', ')})` : ''}`, actions: [
        ...course.blocks.map(block => ({ block, code: codeFor(data.classCodes, course, block) })).filter(item => item.code).map(({ block, code }) => ({ label: `Copy class code, block ${block}`, icon: Copy, onSelect: () => copyCode(code.code, block) })),
        { label: 'Class List', icon: Users, onSelect: () => open(course, { tab: 'class-list' }) },
        { label: 'Scores', icon: BarChart3, onSelect: () => open(course, { tab: 'scores' }) },
        { label: 'Block sections', icon: Settings2, onSelect: () => open(course, { view: 'blocks' }) }] }
      return <ClassCard key={course.id} code={course.code} title={course.title} buttonClassName="instructor-course-card" cardId={course.id} onOpen={() => open(course)} menu={menu}
        label={`Open course ${course.code}${repeated(course.code) ? ` (${course.blocks.join(', ') || 'no block'})` : ''}`}
        lines={[[course.semester, course.academicYear && `AY ${course.academicYear}`, course.units && `${course.units} units`].filter(Boolean).join(' · ')]}
        chips={course.blocks.length ? course.blocks.map(block => `Block ${block} · ${students.get(block)?.size || 0}`) : ['No block section yet']}
        status={syllabus ? `Syllabus: ${SYLLABUS_STATUS_META[syllabus.status]?.label || syllabus.status}` : 'Syllabus not added'} />
    })}</section>}
    {courses.length > 0 && <HomeRail reviewCount={review.reduce((sum, item) => sum + item.count, 0)} upcomingCount={upcoming.length} onOpen={openPanel} />}
    {panel === 'review' && <ReviewPanel classes={review} named={named} onOpenClass={open} onClose={closePanel} />}
    {panel === 'upcoming' && <UpcomingPanel items={upcoming} named={named} onOpenClass={open} onClose={closePanel} />}
    {params.get('course') && <Suspense fallback={null}><ClassPage onClose={close} /></Suspense>}
    {creating && <CreateClassDialog courses={courses} codes={data.classCodes} counts={counts} onClose={() => setCreating(false)} onCreated={(course, result) => { setCreating(false); open(course, { tab: 'announcements', code: result.block }) }} />}
  </div>
}
