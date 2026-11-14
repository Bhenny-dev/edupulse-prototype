import { Link } from 'react-router-dom'
import { BookOpen, Users, Files, TrendingUp, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { currentAttempts } from '../academic/academicData'
import { instructorCourses, instructorRecords, syllabusForCourse, courseStudentCount } from '../../utils/instructorCourses'
import SummaryCard from '../ui/SummaryCard'
import { SkeletonKPI } from '../ui/LoadingSkeleton'
import './instructor-courses.css'

export default function InstructorOverview({ data, loaded, status, actions }) {
  const { user } = useAuth(), { syllabi } = useWorkspace()
  const courses = instructorCourses(data, user.id, syllabi), records = instructorRecords(data, courses)
  const attempts = currentAttempts(records).filter(item => item.grading_status !== 'pending_review' && item.max_score > 0)
  const total = attempts.reduce((sum, item) => ({ score: sum.score + item.score, maximum: sum.maximum + item.max_score }), { score: 0, maximum: 0 })
  const materials = records.publications.filter(item => item.active && item.type !== 'assessment' && (!item.release_at || new Date(item.release_at).getTime() <= Date.now()))
  const students = courseStudentCount(records, records.courses.map(course => course.id))
  return <div className="container instructor-overview" data-pulse-zone="general" data-pulse-target="Instructor Dashboard">
    <div className="page-header"><div><h1>Instructor Dashboard</h1><p className="text-muted">Your assigned courses and students</p></div>{actions}</div>
    {status}
    <div className="kpi-grid mb-24">{!loaded ? Array.from({ length: 4 }, (_, i) => <SkeletonKPI key={i} />) : <>
      <SummaryCard icon={BookOpen} label="Courses loaded" value={courses.length} to="/courseware" />
      <SummaryCard icon={Users} label="Students handled" value={students} to="/student-monitoring" color="var(--purple-500)" bg="var(--purple-100)" />
      <SummaryCard icon={Files} label="Teaching materials delivered" value={materials.length} to="/courseware" color="var(--green-500)" bg="var(--green-100)" />
      <SummaryCard icon={TrendingUp} label="Assessment average" value={total.maximum ? `${Math.round(total.score / total.maximum * 100)}%` : '—'} to="/student-monitoring?tab=assessments" color="var(--amber-500)" bg="var(--amber-100)" />
    </>}</div>
    <section className="card"><div className="card-header"><h2>My courses and block sections</h2><Link className="btn btn-secondary btn-sm" to="/courseware">Open courses <ArrowRight size={14} /></Link></div><div className="card-body">
      {loaded && !courses.length && <p className="text-muted">The Dean has not assigned any courses to this account yet.</p>}
      <div className="instructor-course-grid">{courses.map(course => { const syllabus = syllabusForCourse(syllabi, course); return <Link className="instructor-course-card" key={course.id} to={`/courseware?course=${encodeURIComponent(course.id)}`}><BookOpen size={24} aria-hidden="true" /><div><strong>{course.code} — {course.title}</strong><p>{course.blocks.join(' · ') || 'Block not recorded'}</p><small>{courseStudentCount(records, course.courseIds)} students · {syllabus?.status === 'active' ? 'Syllabus ready' : 'Add an approved syllabus'}</small></div><ArrowRight size={16} aria-hidden="true" /></Link> })}</div>
    </div></section>
    <section className="card mt-24"><div className="card-header"><h2>Recent course activity</h2></div><div className="card-body">{!materials.length && <p className="text-muted">No recorded course activity yet.</p>}{[...materials].sort((a,b) => (b.updated_at || '').localeCompare(a.updated_at || '')).slice(0, 5).map(event => <div className="instructor-activity" key={event.id}><strong>{event.title}</strong><p className="text-muted">{records.courses.find(course => course.id === event.course_id)?.course_code}</p>{event.updated_at && <time dateTime={event.updated_at}>{new Date(event.updated_at).toLocaleDateString()}</time>}</div>)}</div></section>
  </div>
}
