import { expect, type Page } from '@playwright/test'
import { instructorCourseUI } from '../instructor-course-fixture'
import { baselineUI } from '../baseline-fixture'

const folder = '../feature-documentation/system-manual/44-instructor-course-workspace'
export async function classStreamScene(page: Page, mobile = false) {
  if (!mobile) await page.setViewportSize({ width: 1440, height: 1100 })
  const fixture = await instructorCourseUI(page)
  const course = fixture.records.courses[0]
  course.outline = [{ week: 1, contents: ['Earlier projected topic'] }]
  const material = fixture.records.publications[0]
  const coverage = { materialIds: ['lesson'] }
  const workspace = fixture.getWorkspace() as any
  const quiz = workspace.content.quiz
  const concept = { ...quiz.content, courseItemId: 'check', title: 'Assignment concept check', coverage }
  const reflection = { ...concept, courseItemId: 'reflection', title: 'Assignment reflection', assessmentRole: 'reflection' }
  workspace.content.check = { ...quiz, position: 1536, status: 'published', content: concept }
  workspace.content.reflection = { ...quiz, position: 1792, status: 'published', content: reflection }
  fixture.setWorkspace(workspace)
  fixture.records.publications.push({ ...material, id: '1-check', workspace_item_id: 'check', type: 'assessment', title: concept.title, content: { ...concept, courseTopicId: 'old-topic', teachingOrder: 2 } })
  fixture.records.publications.push({ ...material, id: '0-reflection', workspace_item_id: 'reflection', type: 'assessment', title: reflection.title, content: { ...reflection, courseTopicId: 'old-topic', teachingOrder: 1 } })
  const post = { id: 'weekly-orientation', course_code: course.course_code, academic_year: '2026-2027', semester: '1st Semester', block: 'BSIT-1A', week: 1, placement: 'before' as const, title: 'Before the first class', body: 'Bring your notes for the worked example and concept check.', attachments: [], created_at: '2026-11-25T01:00:00Z', updated_at: '2026-11-25T01:00:00Z' }
  fixture.records.announcements = [post, { ...post, id: 'variable-reminder', title: 'Worked example reminder', body: 'Trace the value after each assignment.', topic_id: 'variables', placement: 'within' }]
  await page.goto(`/#/courseware?course=${fixture.syllabus.id}&tab=stream`)
  const week = page.getByRole('region', { name: 'Week 1', exact: true })
  const assessment = week.getByRole('button', { name: 'Open Assignment concept check' })
  await expect(assessment).toBeVisible()
  await expect(week.getByRole('article', { name: 'Worked example reminder' })).toBeVisible()
  const delivered = ['Variables lesson', 'Assignment concept check', 'Assignment reflection']
  await expect(week.getByRole('region', { name: 'Variables and named values' }).locator('.class-stream-item h4')).toHaveText(delivered)
  if (mobile) {
    await week.scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${folder}/17-stream-phone.png`, animations: 'disabled' })
  } else {
    await page.screenshot({ path: `${folder}/16-stream.png`, animations: 'disabled' })
    await week.getByRole('button', { name: /Announce for Variables and named values/ }).click()
    const composer = page.getByRole('dialog', { name: 'New announcement' })
    await composer.getByLabel('Placement').selectOption('before')
    await composer.screenshot({ path: `${folder}/18-announcement-placement.png`, animations: 'disabled' })
    await composer.getByRole('button', { name: 'Cancel' }).click()
    await page.getByRole('button', { name: 'Teaching Materials & Assessments', exact: true }).click()
    const topic = page.locator('[data-topic="variables"]')
    await topic.locator('summary').click()
    await expect(topic.locator('.instructor-sequence-heading > strong')).toHaveText([...delivered, 'Variable check'])
    await page.screenshot({ path: `${folder}/21-shared-teaching-plan.png`, animations: 'disabled' })
  }
}

export async function studentAnnouncementScene(page: Page) {
  const { records } = await baselineUI(page, 'student')
  const course = records.courses[0], material = records.publications[0], quiz = records.publications[1]
  course.outline = [{ week: 1, contents: ['Variables and named values'], ilos: 'Describe how a variable stores a value.' }]
  material.content = { ...material.content, courseTopicId: 'week-1', courseItemId: 'variables-reading' }
  quiz.content = { ...quiz.content, courseTopicId: 'week-1', coverage: { materialIds: ['variables-reading'] } }
  const index = records.publications.indexOf(quiz)
  records.publications.splice(index, 1)
  records.publications.unshift(quiz)
  const post = { id: 'orientation', course_id: course.id, course_code: course.course_code, academic_year: '2026-2027', semester: '1st Semester', block: 'BSIT-1A', week: 1, placement: 'before' as const, title: 'Before the first class', body: 'Bring your notes for the worked example and concept check.', attachments: [], created_at: '2026-11-25T01:00:00Z', updated_at: '2026-11-25T01:00:00Z' }
  records.announcements = [post, { ...post, id: 'variable-reminder', title: 'Worked example reminder', body: 'Trace the value after each assignment.', topic_id: 'week-1', placement: 'within' }]
  await page.goto(`/#/courseware?course=${course.id}&studentTab=materials`)
  await expect(page.locator('#announcement-orientation + details.student-topic')).toBeVisible()
  await expect(page.locator('.student-subtopic #announcement-variable-reminder')).toBeVisible()
  const topic = page.locator('.student-subtopic').filter({ has: page.locator('#announcement-variable-reminder') })
  await expect(topic.locator('.student-resource:not(.student-announcement) h3')).toHaveText(['Variables lesson', 'Variables quiz'])
  await page.setViewportSize({ width: 1440, height: 1180 })
  await page.screenshot({ path: '../feature-documentation/system-manual/41-student-learning/12-placed-announcements.png', animations: 'disabled' })
}
