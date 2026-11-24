import { test, expect } from '@playwright/test'
import { baselineUI } from '../baseline-fixture'

const DAY = 86_400_000
const later = (offset: number) => new Date(Date.now() + offset).toISOString()

test('a student sees recorded progress on the Home card and inside the class', async ({ page }) => {
  const fixture = await baselineUI(page, 'student')
  const [lesson] = fixture.records.publications
  fixture.records.attempts = fixture.records.attempts.slice(0, 2) // the Variables and Functions quizzes are answered, the Arrays quiz is not
  fixture.records.reading = [{ publication_id: lesson.id, source_version: 'v1', student_email: 'ui.fixture@example.invalid', sections_read: 1, total_sections: 2, updated_at: later(-DAY) }]
  await page.goto('/#/courseware')
  const card = page.locator('.class-card').filter({has:page.getByRole('button',{name:/^Open IT 102 /})})
  const bar = card.getByRole('progressbar', { name: 'IT 102 items done' })
  await expect(bar).toHaveAttribute('value', '2')
  await expect(bar).toHaveAttribute('max', '4')
  await expect(card).toContainText('2 of 4 items done')
  await card.getByRole('button',{name:/^Open IT 102 /}).click()
  const course = page.getByRole('dialog',{name:/IT 102/})
  await expect(course.getByRole('progressbar', { name: 'IT 102 items done' })).toHaveAttribute('value', '2')
})

test('pending assessments use server time for due and missed work', async ({ page }) => {
  const fixture = await baselineUI(page, 'student')
  fixture.records.attempts = []
  fixture.records.serverNow = later(10 * DAY) // this device is ten days behind the server
  const [, variables, functions, arrays] = fixture.records.publications
  variables.due_at = later(5 * DAY) // still ahead on the device clock, already missed on the server's
  functions.due_at = later(12 * DAY) // two days after the server's now
  arrays.due_at = later(20 * DAY) // ten days after the server's now
  await page.goto('/#/dashboard')
  const work=page.getByRole('region',{name:'Pending Assessments'})
  await expect(work.getByRole('listitem')).toHaveCount(3)
  await expect(work.getByRole('listitem').first()).toContainText('Functions quiz')
  await expect(work.getByRole('listitem').first()).toContainText('Due in 2 days')
  await work.getByLabel('Show assessments').selectOption('missing')
  await expect(work.getByRole('listitem')).toHaveCount(1)
  await expect(work.getByRole('listitem')).toContainText('Variables quiz')
  await expect(work.getByRole('listitem')).toContainText('Due date missed')
  await page.goto('/#/notifications')
  await expect(page.getByText('Unanswered assessment: Variables quiz', { exact: true })).toBeVisible()
  await expect(page.getByText(/Due date missed: /)).toHaveCount(1)
  await expect(page.getByText(/Due in 2 days: /)).toHaveCount(1)
  await page.getByText('Unanswered assessment: Variables quiz',{exact:true}).locator('..').getByRole('link',{name:'Open course item'}).click()
  await expect(page).toHaveURL(/#\/dashboard\?course=.*studentTab=materials.*item=/)
  await expect(page.getByRole('dialog',{name:'Variables quiz',exact:true})).toBeVisible()
})
