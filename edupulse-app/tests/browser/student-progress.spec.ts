import { test, expect } from '@playwright/test'
import { baselineUI } from '../baseline-fixture'

const DAY = 86_400_000
const later = (offset: number) => new Date(Date.now() + offset).toISOString()

test('a student sees progress bars on the course card, in the course and on each material', async ({ page }) => {
  const fixture = await baselineUI(page, 'student')
  const [lesson] = fixture.records.publications
  fixture.records.attempts = fixture.records.attempts.slice(0, 2) // the Variables and Functions quizzes are answered, the Arrays quiz is not
  fixture.records.reading = [{ publication_id: lesson.id, source_version: 'v1', student_email: 'ui.fixture@example.invalid', sections_read: 1, total_sections: 2, updated_at: later(-DAY) }]
  await page.goto('/#/courseware')
  const card = page.getByRole('button', { name: 'Open course IT 102', exact: true })
  const bar = card.getByRole('progressbar', { name: 'IT 102 items done' })
  await expect(bar).toHaveAttribute('value', '2')
  await expect(bar).toHaveAttribute('max', '4')
  await expect(card).toContainText('2 of 4 items done')
  await card.click()
  const course = page.locator('section.class-banner').filter({ hasText: 'Instructor:' }).first()
  await expect(course.getByRole('progressbar', { name: 'IT 102 items done' })).toHaveAttribute('value', '2')
  await expect(page.getByText('Week 1 · 2 item(s) · 1 of 2 done', { exact: true })).toBeVisible()
  await expect(page.getByText('Week 3 · 1 item(s) · 0 of 1 done', { exact: true })).toBeVisible()
  const material = page.getByRole('progressbar', { name: 'Variables lesson sections read', exact: true })
  await expect(material).toHaveAttribute('value', '1')
  await expect(material).toHaveAttribute('max', '2')
})

test('reminders are blue, orange three days before the due date and red once it is missed, on the server clock', async ({ page }) => {
  const fixture = await baselineUI(page, 'student')
  fixture.records.attempts = []
  fixture.records.serverNow = later(10 * DAY) // this device is ten days behind the server
  const [, variables, functions, arrays] = fixture.records.publications
  variables.due_at = later(5 * DAY) // still ahead on the device clock, already missed on the server's
  functions.due_at = later(12 * DAY) // two days after the server's now
  arrays.due_at = later(20 * DAY) // ten days after the server's now
  await page.goto('/#/dashboard')
  const reminders = page.locator('[data-reminder]')
  await expect(reminders).toHaveCount(4)
  await expect(reminders.first()).toHaveAttribute('data-reminder', 'red')
  await expect(page.locator('[data-reminder="red"]')).toContainText('Unanswered assessment: "Variables quiz".')
  await expect(page.locator('[data-reminder="red"]')).toContainText('Due date missed')
  await expect(page.locator('[data-reminder="orange"]')).toContainText('Unanswered assessment: "Functions quiz".')
  await expect(page.locator('[data-reminder="orange"]')).toContainText('Due in 2 days')
  await expect(page.locator('[data-reminder="blue"]')).toHaveCount(2)
  await expect(page.locator('[data-reminder="blue"]').filter({ hasText: 'Unanswered assessment: "Arrays quiz".' })).toContainText('Delivered')
  await page.goto('/#/notifications')
  await expect(page.getByText('Unanswered assessment: Variables quiz', { exact: true })).toBeVisible()
  await expect(page.getByText(/Due date missed: /)).toHaveCount(1)
  await expect(page.getByText(/Due in 2 days: /)).toHaveCount(1)
})
