import { test, expect } from './fixtures'
import { unifiedCoursewareUI } from '../courseware-unified-fixture'

const dir = '../feature-documentation/system-manual/03-courseware-generation-and-review'
test('synthetic unified courseware mobile list and item actions', async ({ page }) => {
  await unifiedCoursewareUI(page)
  await page.goto('/#/courseware')
  await expect(page.locator('[data-course="baseline-syllabus"]')).toContainText('3 of 9 generated')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.mouse.move(2, 400)
  await page.screenshot({ path: `${dir}/15-mobile-course-list.png`, fullPage: true, animations: 'disabled' })
  await page.locator('[data-course="baseline-syllabus"]').getByRole('button', { name: 'View', exact: true }).click()
  await page.locator('[data-week="1"]').getByRole('button', { name: 'View', exact: true }).click()
  await page.getByRole('button', { name: 'Actions for Variables lesson', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'View presentation', exact: true })).toBeVisible()
  await page.mouse.move(2, 400)
  await page.screenshot({ path: `${dir}/16-mobile-item-actions.png`, animations: 'disabled' })
})
