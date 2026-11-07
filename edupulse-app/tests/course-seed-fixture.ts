import type { Page } from '@playwright/test'
import { baselineUI, baselineWorkspace } from './baseline-fixture'
import { planCourseSeed, IT_PROGRAM, programmingOutline, units } from '../scripts/lib/it-course-seed.mjs'

// Fictional identities and mocked transport; lesson text is the real authored seed catalog.
export async function courseSeedUI(page: Page) {
  const fixture = await baselineUI(page)
  const owner = { id: 'fe67b9d2-719b-4b10-91cd-76031ab115fe', role: 'instructor' }
  const outline = programmingOutline().map(row => ({ ...row, contents: row.week === 1 ? ['Course Orientation and Network Concepts'] : units['IT 202'].find(unit => unit.week === row.week) ? [units['IT 202'].find(unit => unit.week === row.week)!.title] : row.contents }))
  const orientation = ['material', 'activity', 'assessment'].map(type => [`retained-${type}`, { syllabusId: 'seed-networking', week: 1, type, status: 'draft', content: type === 'assessment' ? baselineWorkspace.content['baseline-quiz'].content : { title: `Retained orientation ${type}`, sections: [{ heading: 'Capture provenance', body: 'Synthetic orientation substitutes for the existing instructor item in this UI-only capture.' }, { heading: 'Review', body: 'This capture does not establish an approved syllabus or student completion.' }] } }])
  const students = [1, 2].flatMap(year => Array.from({ length: year === 1 ? 131 : 157 }, (_, index) => {
    const number = `SYN-${year}-${String(index + 1).padStart(3, '0')}`
    return { student_number: number, email: `${number.toLowerCase()}@gmail.com`, full_name: `Synthetic learner ${year}-${index + 1}`, year_level: year, department: 'College of Information Technology', program: IT_PROGRAM }
  }))
  const input = { owner, students, workspace: { revision: 1, data: { syllabi: [{ id: 'seed-programming', courseCode: 'IT 102', courseTitle: 'Computer Programming 1', status: 'downloaded_for_approval', instructorId: owner.id, version: 1, courseOutline: [{ week: 1, ilos: 'test', contents: ['test'] }] }, { id: 'seed-networking', courseCode: 'IT 202', courseTitle: 'Fundamentals of Networking', status: 'active', instructorId: owner.id, version: 2, courseOutline: outline, approvedFile: { name: 'synthetic-capture-only.pdf', approvalAttested: true } }], content: Object.fromEntries(orientation), registrations: [] } } }
  const plan = planCourseSeed(input, { now: '2026-11-06T08:00:00.000Z', networkingYear: 2 })
  // Reserved example domains keep screenshot identities visibly fictional.
  for (const roster of plan.data.registrations) for (const student of roster.students || []) student.Email = student.Email.replace('@gmail.com', '@example.invalid')
  fixture.setWorkspace(plan.data)
  fixture.records.courses = plan.data.syllabi.map((s, index) => ({ id: String(index + 1).repeat(32), course_code: s.courseCode, course_title: s.courseTitle, instructor_id: owner.id, active: s.status === 'active', source_revision: 2, syllabus_status: s.status, outline: s.courseOutline, instructor_name: 'Synthetic instructor' }))
  fixture.records.enrollments = plan.data.registrations.flatMap(roster => (roster.students || []).map(student => ({ course_id: roster.courseCode === 'IT 102' ? '1'.repeat(32) : '2'.repeat(32), student_email: student.Email, display_name: student.Name, student_ref: student.StudentID, block_section: roster.blockSection })))
  fixture.records.publications = []; fixture.records.attempts = []; fixture.records.accesses = []; fixture.records.notices = []; fixture.records.events = []; fixture.records.institutional = []
  return { ...fixture, plan }
}
