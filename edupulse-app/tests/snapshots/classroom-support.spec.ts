import { test, expect } from './fixtures'
import { classroomSupportUI, expectClassColumns } from '../classroom-support-ui'

test('Admin instructor support class codes beside the announcements feed', async ({ page }) => {
  await classroomSupportUI(page, true)
  await page.goto('/#/dashboard?course=IT%20201&tab=announcements')
  await expect(page.getByLabel('Class code of block BSIT-2A: P 4 Q 8 R S T')).toBeVisible()
  await expectClassColumns(page)
  await page.screenshot({ path: '../feature-documentation/system-manual/44-instructor-course-workspace/12-admin-class-codes.png', animations: 'disabled' })
})
