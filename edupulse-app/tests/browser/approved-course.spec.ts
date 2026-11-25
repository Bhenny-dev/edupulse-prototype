import { test, expect } from '../snapshots/fixtures'
import { approvedCourseUI } from '../approved-course-ui'
for (const status of ['active', 'approved_uploaded']) test(`course shows its ${status} outline without draft or upload controls`, async ({ page }) => {
  const fixture = await approvedCourseUI(page, status)
  await page.reload()
  await expect(page.getByRole('heading', { name: /^Week 1/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Upload syllabi', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Announcements', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Next step', exact: true })).toHaveCount(0)
  expect(fixture.commands).toEqual([])
  fixture.setWorkspace({ ...fixture.getWorkspace(), syllabi: [{ ...fixture.syllabus, status: 'drafted' }] })
  await page.goto('/#/dashboard?course=IT%20102&tab=materials'); await page.reload()
  // A class with only a draft has no approved syllabus: it points to the Syllabus page, where uploads are saved.
  await expect(page.getByRole('heading', { name: 'Teaching materials start from the approved syllabus', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Upload syllabi', exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /^Week 1/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Continue editing draft', exact: true })).toHaveCount(0)
})
