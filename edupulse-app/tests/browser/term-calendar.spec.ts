import { test, expect } from '@playwright/test'
import { deanManagementUI } from '../dean-management-fixture'
import { instructorCourseUI } from '../instructor-course-fixture'

test('the Dean records when classes start, which every block schedule counts from', async ({ page }) => {
  const fixture = await deanManagementUI(page)
  await page.goto('/#/records')
  await page.getByRole('button', { name: 'Set classes start for 1st Semester 2026-2027' }).click()
  const dialog = page.getByRole('dialog', { name: 'Classes start' })
  await dialog.getByLabel('Teaching weeks').fill('40')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Choose the first day of classes.')
  await dialog.getByLabel('First day of classes').fill('2026-08-10')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('A semester has 1 to 30 teaching weeks.')
  await dialog.getByLabel('Teaching weeks').fill('18')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog).toHaveCount(0)
  expect(fixture.commands.at(-1)).toEqual({ action: 'term.calendar', semester: '1st Semester', academic_year: '2026-2027', classes_start: '2026-08-10', weeks: 18 })
  await expect(page.getByText('Classes start Mon, Aug 10, 2026 in 1st Semester 2026-2027 (18 teaching weeks). Blocks without saved delivery dates open each week at their first class meeting.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Classes start Mon, Aug 10, 2026 for 1st Semester 2026-2027' })).toBeVisible()
})

test('an instructor block without saved dates follows its class schedule from the classes-start date', async ({ page }, info) => {
  const fixture = await instructorCourseUI(page)
  // IT 102 has the syllabus; block BSIT-1A already has saved dates, block BSIT-1B (Monday and Tuesday at 7:30) has none.
  const existing = fixture.records.institutional!.find(row => row.kind === 'loads' && row.data.CourseCode === 'IT 102')!
  fixture.records.institutional!.push({ kind: 'loads', record_key: 'IT 102|BSIT-1B|1', data: { ...existing.data, Block: 'BSIT-1B', ScheduleDays: 'MT', ScheduleTime: '7:30 - 10:00', Room: 'A322' } },
    { kind: 'term_calendar', record_key: '1st Semester|2026-2027', data: { Semester: '1st Semester', AcademicYear: '2026-2027', ClassesStart: '2026-08-10', Weeks: '18' } })
  await page.goto('/#/courseware')
  // A course loaded with two blocks is two classes on Home, one card each; the class opens with only its own block.
  const cards = page.locator('.instructor-course-card').filter({ hasText: 'IT 102' })
  await expect(cards).toHaveCount(2)
  await expect(cards.filter({ hasText: 'BSIT-1A' })).not.toContainText('BSIT-1B')
  await cards.filter({ hasText: 'BSIT-1B' }).click()
  await expect(page).toHaveURL(/block=BSIT-1B/)
  await expect(page.getByRole('dialog', { name: 'Class IT 102 block BSIT-1B' })).toBeVisible()
  await page.getByRole('button', { name: 'Block section', exact: true }).click()
  await expect(page.getByRole('note').filter({ hasText: 'Classes start' })).toContainText('Classes start Mon, Aug 10, 2026 · 18 teaching weeks. A block without saved dates opens each week\'s courseware at its first class meeting.')
  await expect(page.getByRole('button', { name: 'Schedule BSIT-1A' })).toHaveCount(0)
  const card = page.getByRole('button', { name: 'Schedule BSIT-1B' })
  await expect(card).toContainText('Follows the class schedule: week 1 opens Mon, Aug 10, 7:30 AM')
  await expect(card).toContainText('Class schedule: MT · 7:30 - 10:00 · Room A322 · 5 hours a week')
  await card.scrollIntoViewIfNeeded()
  await page.screenshot({ path: info.outputPath('block-sections-calendar.jpg'), type: 'jpeg', quality: 70, animations: 'disabled' })
  await card.click()
  const editor = page.getByRole('dialog', { name: 'Delivery schedule for BSIT-1B' })
  await expect(editor).toContainText('These dates follow the class schedule from the Dean’s classes-start date, and students already see them. Save only to change them.')
  const weeks = editor.getByRole('table')
  await expect(weeks.getByLabel('Week 1 class date')).toHaveValue('2026-08-10')
  await expect(weeks.getByLabel('Week 1 opening time')).toHaveValue('07:30')
  await expect(weeks.getByLabel('Week 2 class date')).toHaveValue('2026-08-17')

  // Each delivered item says when it opens for every block: BSIT-1A by its saved dates, BSIT-1B by its class schedule.
  await page.getByRole('button', { name: 'Close block schedule' }).click()
  await page.getByRole('button', { name: 'Teaching Materials & Assessments', exact: true }).click()
  const delivery = page.locator('.instructor-block-delivery').filter({ hasText: 'BSIT-1B' }).first()
  await expect(delivery).toContainText(/^Delivery: BSIT-1B open since Mon, Aug 10, 7:30 AM$/)
})
