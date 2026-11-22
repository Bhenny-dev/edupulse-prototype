import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { currentAttempts } from '../academic/academicData'
import { instructorCourses, instructorRecords, syllabusForCourse, courseStudentCount, assignedStudentCount } from '../../utils/instructorCourses'
import ClassCard, { ClassCardGrid } from '../ui/ClassCard'
import DataTable, { StatusPill } from '../ui/DataTable'
import { SkeletonKPI } from '../ui/LoadingSkeleton'
import './instructor-courses.css'

const dateText = value => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''

// Instructor Home in the Classroom layout (UI redesign U2): one class card per loaded course,
// then "To review" (answers waiting for marking) and recent activity as tables.
export default function InstructorOverview({ data, loaded, status, actions }) {
  const { user } = useAuth(), { syllabi, registrations } = useWorkspace(), navigate = useNavigate()
  const courses = instructorCourses(data, user.id, syllabi), records = instructorRecords(data, courses)
  const current = currentAttempts(records)
  const attempts = current.filter(item => item.grading_status !== 'pending_review' && item.max_score > 0)
  const total = attempts.reduce((sum, item) => ({ score: sum.score + item.score, maximum: sum.maximum + item.max_score }), { score: 0, maximum: 0 })
  const now = Date.now()
  const materials = records.publications.filter(item => item.active && item.type !== 'assessment' && (!item.release_at || new Date(item.release_at).getTime() <= now))
  const students = assignedStudentCount(records, courses, registrations)
  const publication = id => records.publications.find(item => item.id === id)
  const courseOf = courseId => courses.find(course => course.courseIds.includes(courseId))
  const nameOf = email => records.enrollments.find(row => row.student_email?.toLowerCase() === email?.toLowerCase())?.display_name || email || 'Student'
  const toReview = current.filter(item => item.grading_status === 'pending_review').map(item => {
    const work = publication(item.publication_id), course = courseOf(work?.course_id)
    return { id: item.id || `${item.publication_id}:${item.student_email}`, student: nameOf(item.student_email), title: work ? `Week ${work.week} · ${work.title}` : 'Assessment', course: course?.code || '', courseId: work?.course_id, submitted: item.submitted_at }
  })
  const activity = materials.map(item => ({ ...item, course: courseOf(item.course_id)?.code || '' }))

  return <div className="container instructor-overview" data-pulse-zone="general" data-pulse-target="Instructor Dashboard">
    <div className="page-header"><div><h1>Instructor Dashboard</h1><p className="text-muted">Your classes this term</p></div>{actions}</div>
    {status}
    {!loaded ? <div className="kpi-grid mb-24">{Array.from({ length: 4 }, (_, i) => <SkeletonKPI key={i} />)}</div> : <dl className="home-stats">
      <div><dt>Courses loaded</dt><dd>{courses.length}</dd></div>
      <div><dt>Students handled</dt><dd>{students}</dd></div>
      <div><dt>Teaching materials delivered</dt><dd>{materials.length}</dd></div>
      <div><dt>Assessment average</dt><dd>{total.maximum ? `${Math.round(total.score / total.maximum * 100)}%` : '—'}</dd></div>
    </dl>}

    {loaded && !courses.length && <p className="text-muted">The Dean has not assigned any courses to this account yet.</p>}
    <ClassCardGrid>{courses.map(course => {
      const syllabus = syllabusForCourse(syllabi, course)
      const due = records.publications.filter(item => item.active && course.courseIds.includes(item.course_id) && item.due_at && new Date(item.due_at).getTime() >= now)
        .sort((a, b) => a.due_at.localeCompare(b.due_at)).map(item => ({ key: item.id, label: item.title, detail: `Due ${dateText(item.due_at)} · Week ${item.week}` }))
      return <ClassCard key={course.id} className="instructor-course-card" to={`/courseware?course=${encodeURIComponent(course.id)}`}
        code={course.code} title={course.title} subtitle={course.blocks.join(' · ') || 'Class list not added'} items={due} emptyItems="No work due this week."
        meta={<><span>{courseStudentCount(records, course.courseIds)} students</span><span>{syllabus?.status === 'active' ? 'Syllabus ready' : 'Add an approved syllabus'}</span></>} />
    })}</ClassCardGrid>

    {loaded && courses.length > 0 && <section className="home-section"><h2>To review</h2>
      <DataTable label="To review" rows={toReview} searchPlaceholder="Search students or assessments" empty="Nothing to review. Answers that need your marking appear here."
        filters={[{ key: 'course', label: 'Courses' }]} initialSort={{ key: 'submitted', direction: 'asc' }}
        onRowClick={row => navigate(`/student-monitoring?tab=assessments${row.courseId ? `&course=${encodeURIComponent(row.courseId)}` : ''}`)}
        columns={[{ key: 'title', label: 'Assessment' }, { key: 'student', label: 'Student' }, { key: 'course', label: 'Course', width: 120 },
          { key: 'submitted', label: 'Turned in', width: 130, searchable: false, render: row => dateText(row.submitted) }, { key: 'state', label: 'Status', sortable: false, searchable: false, width: 120, render: () => <StatusPill tone="success">Turned in</StatusPill> }]} />
    </section>}

    {loaded && courses.length > 0 && <section className="home-section"><h2>Recent course activity</h2>
      <DataTable label="Recent course activity" rows={activity} pageSize={10} searchPlaceholder="Search materials" empty="No recorded course activity yet."
        filters={[{ key: 'course', label: 'Courses' }]} initialSort={{ key: 'updated_at', direction: 'desc' }}
        onRowClick={row => navigate(`/courseware?course=${encodeURIComponent(row.course_id)}`)}
        columns={[{ key: 'title', label: 'Teaching material' }, { key: 'course', label: 'Course', width: 120 }, { key: 'week', label: 'Week', width: 90, searchable: false },
          { key: 'updated_at', label: 'Updated', width: 130, searchable: false, render: row => dateText(row.updated_at) }]} />
    </section>}
  </div>
}
