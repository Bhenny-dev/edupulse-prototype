import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { BookOpen, Eye, Sparkles, ClipboardCheck, List } from 'lucide-react'
import { STUDENT_RECORDS, INSTRUCTORS } from '../../data/mockData'
import CoursewareActions from './CoursewareActions'
import { plannedCoursewareTypes } from '../../lib/rag/coursewarePlan'
import './courseware.css'

const isExam = row => !row.ilos && /examination/i.test(row.assessments || '')
export default function CoursewareLibrary({ syllabi, contentStore, user, onSelectCourse, itemStatus = '' }) {
  const isStudent = user?.role === 'student'
  const courses = useMemo(() => {
    const record = isStudent ? STUDENT_RECORDS.find(student => student.name === user?.name) : null
    const enrolled = record ? new Set(record.courses.map(course => course.code)) : null
    return syllabi.filter(s => s.status === 'active' && s.courseOutline?.length && (!enrolled || enrolled.has(s.courseCode))).map(syllabus => {
      const weeks = syllabus.courseOutline.filter(row => !isExam(row))
      const entries = Object.values(contentStore).filter(item => item.content && item.syllabusId === syllabus.id && weeks.some(row => row.week === item.week))
      const drafts = entries.filter(item => item.status === 'draft'), checked = entries.filter(item => item.status === 'checked'), published = entries.filter(item => item.status === 'published')
      const complete = weeks.length > 0 && entries.every(item=>['published','hidden'].includes(item.status)) && weeks.every(row => plannedCoursewareTypes(row).every(type => entries.some(item => item.week === row.week && item.type === type && item.status === 'published')))
      const expected=entries.length+weeks.reduce((sum,row)=>sum+plannedCoursewareTypes(row).filter(type=>!entries.some(item=>item.week===row.week&&item.type===type)).length,0)
      return { syllabus, weeks, drafts, checked, published, total: entries.length, expected, complete }
    }).filter(course => !itemStatus || course[itemStatus === 'draft' ? 'drafts' : 'published'].length > 0)
  }, [syllabi, contentStore, isStudent, user?.name, itemStatus])
  if (!courses.length && itemStatus) return <div className="empty-state"><div className="empty-state-icon"><BookOpen size={36} /></div><h3>{itemStatus === 'draft' ? 'No drafts to review' : 'No published items yet'}</h3><p>Use Show all courses to return to your active course outlines.</p></div>
  if (!courses.length) return <div className="empty-state"><div className="empty-state-icon"><BookOpen size={36} /></div><h3>{isStudent ? 'No courseware yet' : 'Add your first course'}</h3><p>{isStudent ? 'Published courseware will appear here for your enrolled courses.' : 'Upload an approved syllabus in My Syllabus, review its outline, then select it to start generating course materials.'}</p>{!isStudent && <Link className="btn btn-primary" to="/syllabus?tab=mine&upload=approved">Upload syllabi</Link>}</div>
  return <table className="data-table cw-course-list" aria-label="Courseware courses">
    <thead><tr><th>Course</th>{!isStudent && <th>Status</th>}<th>Items</th><th>Teaching weeks</th><th>Actions</th></tr></thead>
    <tbody>{courses.map(({ syllabus, weeks, drafts, checked, published, total, expected, complete }) => <tr key={syllabus.id} data-course={syllabus.id}>
      <td><strong>{syllabus.courseCode}</strong><div className="text-sm text-muted">{syllabus.courseTitle}{syllabus.sample && ' · Sample'}</div>{!isStudent && <small className="text-muted">{user?.authenticated ? user.name : INSTRUCTORS.find(instructor => instructor.id === syllabus.instructorId)?.name || 'Instructor not assigned'}</small>}</td>
      {!isStudent && <td data-label="Status"><span className={`badge ${complete ? 'badge-published' : total ? 'badge-checked' : 'badge-draft'}`}>{complete ? 'Complete' : total ? 'In Progress' : 'Not Started'}</span></td>}
      <td data-label="Items"><div className="cw-item-counts">{isStudent ? <span>{published.length} published</span> : <>
        <span className="text-muted">{total} of {expected} generated</span><progress className="cw-course-progress" aria-label={`Generated content for ${syllabus.courseCode}`} value={Math.min(total, expected)} max={expected || 1} />
        {!!drafts.length && <span>{drafts.length} draft</span>}{!!checked.length && <span>{checked.length} checked</span>}{!!published.length && <span>{published.length} published</span>}
      </>}</div></td>
      <td data-label="Teaching weeks">{weeks.length} {weeks.length === 1 ? 'week' : 'weeks'}</td>
      <td><div className="cw-row-actions">
        {(!isStudent || published.length > 0) && <button className="btn btn-secondary btn-sm" onClick={() => onSelectCourse(syllabus.id)}>{(isStudent ? published.length : total) > 0 ? <><Eye size={15} /> View</> : <><Sparkles size={15} /> Generate</>}</button>}
        {isStudent && !published.length && <span className="text-sm text-muted">No materials yet</span>}
        {!isStudent && <CoursewareActions label={`More actions for ${syllabus.courseCode}`} actions={[
          { label: 'View weekly outline', icon: List, onSelect: () => onSelectCourse(syllabus.id) },
          { label: 'Review drafts', icon: ClipboardCheck, disabled: !drafts.length, onSelect: () => onSelectCourse(syllabus.id, drafts[0].week) },
        ]} />}
      </div></td>
    </tr>)}</tbody>
  </table>
}
