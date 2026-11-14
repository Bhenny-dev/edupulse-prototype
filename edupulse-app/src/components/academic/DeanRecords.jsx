import DeanCourses from './DeanCourses'
import DeanInstructors from './DeanInstructors'
import DeanStudents from './DeanStudents'
import './dean.css'

/** Dean pages: Course (course list and course loads), Instructors and Students. */
export default function DeanRecords({ data, view }) {
  if (view === 'instructors') return <DeanInstructors data={data} />
  if (view === 'students') return <DeanStudents data={data} />
  return <DeanCourses data={data} />
}
