import { test } from './fixtures'
import { approvedCourseUI } from '../approved-course-ui'
test('approved course outline on a phone', async ({ page }) => {
  await approvedCourseUI(page)
  await page.screenshot({ path: '../feature-documentation/system-manual/44-instructor-course-workspace/15-approved-course-outline-phone.png', animations: 'disabled' })
})
