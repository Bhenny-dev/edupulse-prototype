import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import useAcademicTerm from '../academic/useAcademicTerm'
import { SYLLABUS_STATUS_META } from '../../data/syllabusStatus'
import { instructorCourses, syllabusForCourse } from '../../utils/instructorCourses'
import { classStudents } from '../../utils/classroom'
import { ClassCard, EmptyClasses } from './ClassCards'
import CreateClassDialog from './CreateClassDialog'
import './classroom.css'

/** Instructor Home: one card per assigned course with its block sections, and Create class. */
export default function InstructorHome({ data, loaded, status, actions }) {
  const { user } = useAuth(), workspace = useWorkspace(), navigate = useNavigate()
  const { term, writable } = useAcademicTerm()
  const courses = useMemo(() => instructorCourses(data, user.id, workspace.syllabi), [data, user.id, workspace.syllabi])
  const [creating, setCreating] = useState(false)
  const counts = course => classStudents(course, workspace.registrations, data.enrollments)
  const open = (course, extra = {}) => navigate(`/courseware?${new URLSearchParams({ course: course.id, term, ...extra })}`)
  const repeated = code => courses.filter(course => course.code === code).length > 1
  return <div className="container classroom-home" data-pulse-zone="general" data-pulse-target="Home">
    <div className="page-header"><div><h1>Home</h1><p className="text-muted">Welcome back, {user?.name}. Your classes are the courses the Dean assigned to you.</p></div>
      <div className="class-home-actions">{actions}{writable && courses.length > 0 && <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" />Create class</button>}</div></div>
    {status}
    {data.classroomError && <p role="status" className="connected-pulse-warning mb-16">{data.classroomError}</p>}
    {!writable && courses.length > 0 && <p className="text-sm text-muted mb-16">This semester is view-only. Open a class to review its records.</p>}
    {loaded && !courses.length && <EmptyClasses title="No classes yet">The Dean has not assigned a course to you for this semester. Your classes appear here once a course is loaded; then create a class code so your students can join.</EmptyClasses>}
    {courses.length > 0 && <div className="class-card-grid">{courses.map(course => {
      const syllabus = syllabusForCourse(workspace.syllabi, course), students = counts(course)
      return <ClassCard key={course.id} code={course.code} title={course.title} buttonClassName="instructor-course-card" onOpen={() => open(course)}
        label={`Open course ${course.code}${repeated(course.code) ? ` (${course.blocks.join(', ') || 'no block'})` : ''}`}
        lines={[[course.semester, course.academicYear && `AY ${course.academicYear}`, course.units && `${course.units} units`].filter(Boolean).join(' · ')]}
        chips={course.blocks.length ? course.blocks.map(block => `Block ${block} · ${students.get(block)?.size || 0}`) : ['No block section yet']}
        status={syllabus ? `Syllabus: ${SYLLABUS_STATUS_META[syllabus.status]?.label || syllabus.status}` : 'Syllabus not added'} />
    })}</div>}
    {creating && <CreateClassDialog courses={courses} codes={data.classCodes} counts={counts} onClose={() => setCreating(false)} onCreated={(course, result) => { setCreating(false); open(course, { tab: 'announcements', code: result.block }) }} />}
  </div>
}
