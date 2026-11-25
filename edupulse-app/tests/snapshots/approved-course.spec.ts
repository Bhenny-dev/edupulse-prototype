import { test } from './fixtures'
import { approvedCourseUI } from '../approved-course-ui'
test('approved course outline without repository draft or repeated intake', async ({ page }) => {
  await approvedCourseUI(page)
  await page.screenshot({ path: '../feature-documentation/system-manual/44-instructor-course-workspace/14-approved-course-outline.png', animations: 'disabled' })
})
