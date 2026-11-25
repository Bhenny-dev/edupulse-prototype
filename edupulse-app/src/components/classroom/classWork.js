import { currentAttempts } from '../academic/academicData'
import { instructorRecords } from '../../utils/instructorCourses'

/** Written responses waiting for this instructor's marking in one class (the latest attempt per student and assessment). */
export function pendingReview(data, course) {
  return currentAttempts(instructorRecords(data, [course])).filter(attempt => attempt.grading_status === 'pending_review' && !attempt.is_test).length
}

/** The same waiting responses grouped by assessment, for the To review page. */
export function pendingAssessments(data, course) {
  const scoped = instructorRecords(data, [course]), groups = new Map()
  for (const attempt of currentAttempts(scoped).filter(item => item.grading_status === 'pending_review' && !item.is_test)) {
    const publication = scoped.publications.find(item => item.id === attempt.publication_id)
    const group = groups.get(attempt.publication_id) || { key: attempt.publication_id, title: publication?.title || 'Assessment', week: publication?.week, count: 0 }
    group.count += 1; groups.set(attempt.publication_id, group)
  }
  return [...groups.values()].sort((a, b) => (a.week || 0) - (b.week || 0) || a.title.localeCompare(b.title))
}

/** The next published due dates and week openings of one class, soonest first (EduPulse dates only, nothing invented). */
export function classUpcoming({ content, data, course, syllabus, now }) {
  if (!syllabus) return []
  const due = Object.values(content || {}).filter(item => item.syllabusId === syllabus.id && item.status === 'published' && item.dueAt && Date.parse(item.dueAt) > now)
    .map(item => ({ key: `due:${syllabus.id}:${item.content?.title}:${item.dueAt}`, at: item.dueAt, text: `Due: ${item.content?.title || item.title}` }))
  const opens = (data.deliverySchedules || []).filter(row => row.syllabus_id === syllabus.id && course.blocks.includes(row.block_section))
    .flatMap(row => row.windows.filter(window => Date.parse(window.opens_at) > now).map(window => ({ key: `open:${syllabus.id}:${row.block_section}:${window.week}`, at: window.opens_at, text: `Week ${window.week} opens for block ${row.block_section}` })))
  return [...due, ...opens].sort((a, b) => a.at.localeCompare(b.at))
}
