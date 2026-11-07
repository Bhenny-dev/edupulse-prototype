import { test, expect } from './fixtures'
import { courseSeedUI } from '../course-seed-fixture'

const dir = '../feature-documentation/system-manual/18-it-course-seed'
test('synthetic identities show seeded blocks, syllabus draft and authored lesson without student results', async ({ page }) => {
  await courseSeedUI(page)
  await page.goto('/#/syllabus?tab=register')
  const roster = page.getByRole('region', { name: 'Enrolled students table', exact: true })
  await expect(roster.getByRole('row')).toHaveCount(26)
  await page.getByRole('combobox', { name: 'Block section', exact: true }).selectOption('BSIT-2E')
  await page.mouse.move(2, 400)
  await page.screenshot({ path: `${dir}/01-seeded-course-students.png`, animations: 'disabled', fullPage: true, style: '.app-topbar{position:static !important}' })
  await page.goto('/#/syllabus?tab=mine')
  await expect(page.getByRole('row').filter({ hasText: 'IT 102' })).toContainText('Drafted')
  await page.mouse.move(2, 400)
  await page.screenshot({ path: `${dir}/02-programming-draft.png`, fullPage: true, animations: 'disabled', style: '.app-topbar{position:static !important}' })
  await page.goto('/#/courseware?course=seed-networking&week=6')
  await page.locator('[data-content-id="gen-mat-seed-networking-w6"]').getByRole('button', { name: 'View', exact: true }).click()
  await expect(page.locator('.doc-viewer-text').filter({ hasText: '192.0.2.63' })).toBeVisible()
  await page.mouse.move(2, 400)
  await page.screenshot({ path: `${dir}/03-authored-subnetting-lesson.png`, fullPage: true, animations: 'disabled', style: '.app-topbar{position:static !important}' })
  await page.goto('/#/performance')
  await expect(page.getByText('No assessment attempts recorded.', { exact: true }).first()).toBeVisible()
  await page.mouse.move(2, 400)
  await page.screenshot({ path: `${dir}/04-no-student-attempts.png`, fullPage: true, animations: 'disabled', style: '.app-topbar{position:static !important}' })
})
