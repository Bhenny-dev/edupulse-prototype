import { test, expect } from './fixtures'
import { instructorCourseUI } from '../instructor-course-fixture'
test('assigned instructor course topics on a phone', async ({ page }) => {
  const fixture = await instructorCourseUI(page)
  await page.goto(`/#/courseware?course=${fixture.syllabus.id}`)
  await page.locator('[data-topic="variables"] > summary').click()
  await expect(page.getByRole('button', { name: 'Add overall assessment', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: '../feature-documentation/system-manual/44-instructor-course-workspace/07-mobile-course.png', animations: 'disabled' })
})
