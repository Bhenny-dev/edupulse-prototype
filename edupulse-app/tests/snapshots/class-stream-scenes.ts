import { expect, type Page } from '@playwright/test'
import { instructorCourseUI } from '../instructor-course-fixture'
import { baselineUI } from '../baseline-fixture'

const folder = '../feature-documentation/system-manual/44-instructor-course-workspace'
export async function classStreamScene(page: Page, mobile = false) {
  if (!mobile) await page.setViewportSize({ width: 1440, height: 1100 })
  const fixture = await instructorCourseUI(page)
  const course = fixture.records.courses[0]
  course.outline = fixture.syllabus.courseOutline
  const material = fixture.records.publications[0]
  fixture.records.publications.push({ ...material, id: 'delivered-check', type: 'assessment', title: 'Assignment concept check', content: { courseTopicId: 'variables', questions: [{ text: 'Which is a variable?', options: ['score', '42'] }] } })
  const post = { id: 'weekly-orientation', course_code: course.course_code, academic_year: '2026-2027', semester: '1st Semester', block: 'BSIT-1A', week: 1, placement: 'before' as const, title: 'Before the first class', body: 'Bring your notes for the worked example and concept check.', attachments: [], created_at: '2026-11-25T01:00:00Z', updated_at: '2026-11-25T01:00:00Z' }
  fixture.records.announcements = [post, { ...post, id: 'variable-reminder', title: 'Worked example reminder', body: 'Trace the value after each assignment.', topic_id: 'variables', placement: 'within' }]
  await page.goto(`/#/courseware?course=${fixture.syllabus.id}&tab=stream`)
  const week = page.getByRole('region', { name: 'Week 1', exact: true })
  const assessment = week.getByRole('button', { name: 'Open Assignment concept check' })
  await expect(assessment).toBeVisible()
  await expect(week.getByRole('article', { name: 'Worked example reminder' })).toBeVisible()
  if (mobile) {
    await week.scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${folder}/17-stream-phone.png`, animations: 'disabled' })
  } else {
    await page.screenshot({ path: `${folder}/16-stream.png`, animations: 'disabled' })
    await week.getByRole('button', { name: /Announce for Variables and named values/ }).click()
    const composer = page.getByRole('dialog', { name: 'New announcement' })
    await composer.getByLabel('Placement').selectOption('before')
    await composer.screenshot({ path: `${folder}/18-announcement-placement.png`, animations: 'disabled' })
  }
}

export async function studentAnnouncementScene(page: Page) {
  const { records } = await baselineUI(page, 'student')
  const course = records.courses[0], material = records.publications[0]
  course.outline = [{ week: 1, contents: ['Variables and named values'], ilos: 'Describe how a variable stores a value.' }]
  material.content = { ...material.content, courseTopicId: 'week-1' }
  const post = { id: 'orientation', course_id: course.id, course_code: course.course_code, academic_year: '2026-2027', semester: '1st Semester', block: 'BSIT-1A', week: 1, placement: 'before' as const, title: 'Before the first class', body: 'Bring your notes for the worked example and concept check.', attachments: [], created_at: '2026-11-25T01:00:00Z', updated_at: '2026-11-25T01:00:00Z' }
  records.announcements = [post, { ...post, id: 'variable-reminder', title: 'Worked example reminder', body: 'Trace the value after each assignment.', topic_id: 'week-1', placement: 'within' }]
  await page.goto(`/#/courseware?course=${course.id}&studentTab=materials`)
  await expect(page.locator('#announcement-orientation + details.student-topic')).toBeVisible()
  await expect(page.locator('.student-subtopic #announcement-variable-reminder')).toBeVisible()
  await page.screenshot({ path: '../feature-documentation/system-manual/41-student-learning/12-placed-announcements.png', animations: 'disabled' })
}
