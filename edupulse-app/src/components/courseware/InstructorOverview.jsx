import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { instructorCourses, instructorRecords } from '../../utils/instructorCourses'
import './instructor-courses.css'

// The instructor Dashboard shows recent course activity only. Course and block counts live on
// the Course page, and students and scores on Student Monitoring, so neither is repeated here.
export default function InstructorOverview({ data, loaded, status, actions }) {
  const { user } = useAuth(), { syllabi } = useWorkspace()
  const courses = instructorCourses(data, user.id, syllabi), records = instructorRecords(data, courses)
  const materials = records.publications.filter(item => item.active && item.type !== 'assessment' && (!item.release_at || new Date(item.release_at).getTime() <= Date.now()))
  return <div className="container instructor-overview" data-pulse-zone="general" data-pulse-target="Instructor Dashboard">
    <div className="page-header"><div><h1>Instructor Dashboard</h1><p className="text-muted">Recent activity in your assigned courses</p></div>{actions}</div>
    {status}
    <section className="card"><div className="card-header"><h2>Recent course activity</h2></div><div className="card-body">
      {loaded && !courses.length && <p className="text-muted">The Dean has not assigned any courses to this account yet.</p>}
      {loaded && courses.length > 0 && !materials.length && <p className="text-muted">No recorded course activity yet.</p>}
      {[...materials].sort((a,b) => (b.updated_at || '').localeCompare(a.updated_at || '')).slice(0, 10).map(event => <div className="instructor-activity" key={event.id}><strong>{event.title}</strong><p className="text-muted">{records.courses.find(course => course.id === event.course_id)?.course_code}</p>{event.updated_at && <time dateTime={event.updated_at}>{new Date(event.updated_at).toLocaleDateString()}</time>}</div>)}
    </div></section>
  </div>
}
