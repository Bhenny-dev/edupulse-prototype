import { test, expect } from '@playwright/test'
import { dashboardNavigationUI } from '../dashboard-navigation-fixture'
import { unifiedWorkspace } from '../courseware-unified-fixture'

test('instructor Dashboard shows recent activity without repeating the Course, Syllabus or Monitoring pages', async ({ page }) => {
  await dashboardNavigationUI(page)
  await page.goto('/#/dashboard')
  const main = page.getByRole('main')
  await expect(main.getByRole('heading', { name: 'Recent course activity', exact: true })).toBeVisible()
  await expect(main.locator('.kpi-card')).toHaveCount(0)
  await expect(main.getByRole('navigation', { name: 'Quick actions' })).toHaveCount(0)
  for (const heading of ['My courses and block sections', 'My Block Sections', 'Score Snapshot', 'Courseware Review Queue'])
    await expect(main.getByRole('heading', { name: heading, exact: true })).toHaveCount(0)
  for (const href of ['#/courseware', '#/syllabus', '#/student-monitoring'])
    await expect(main.locator(`a[href^="${href}"]`)).toHaveCount(0)
})

test('course and syllabus filters keep their lists and browser Back', async ({ page }) => {
  await dashboardNavigationUI(page)
  for (const path of ['/syllabus?tab=mine&status=active', '/courseware?status=draft', '/courseware?status=published']) {
    await page.goto('/#' + path)
    if (path.startsWith('/syllabus')) {
      await expect(page.locator('[data-syllabus-id]')).toHaveCount(2)
      await expect(page.locator('[data-syllabus-id="unfinished-syllabus"]')).toHaveCount(0)
      await page.getByRole('button', { name: 'Show all syllabi', exact: true }).click()
      await expect(page.locator('[data-syllabus-id]')).toHaveCount(3)
    } else {
      await expect(page.locator('[data-course]')).toHaveCount(1)
      await expect(page.locator('[data-course="baseline-syllabus"]')).toContainText(path.endsWith('draft') ? '1 draft' : '1 published')
      await page.reload()
      await expect(page.locator('[data-course]')).toHaveCount(1)
      await page.getByRole('button', { name: 'Show all courses', exact: true }).click()
      await expect(page.locator('[data-course]')).toHaveCount(2)
      await page.goBack()
      await expect(page.locator('[data-course]')).toHaveCount(1)
    }
  }
})

test('filtered lists show honest empty states', async ({ page }) => {
  const fixture = await dashboardNavigationUI(page)
  const workspace = unifiedWorkspace()
  fixture.setWorkspace({ ...workspace, syllabi: workspace.syllabi.map(syllabus => ({ ...syllabus, status: 'drafted' })), content: {} })
  for (const [path, empty] of [['/syllabus?tab=mine&status=active', 'No active syllabi yet.'], ['/courseware?status=draft', 'No drafts to review'], ['/courseware?status=published', 'No published items yet']]) {
    await page.goto('/#' + path)
    await expect(page.getByText(empty, { exact: true })).toBeVisible()
  }
})

test('leaving the active-syllabus filter keeps new drafts visible when returning to My Syllabus', async ({ page }) => {
  await dashboardNavigationUI(page)
  await page.goto('/#/syllabus?tab=mine&status=active')
  await expect(page.locator('[data-syllabus-id]')).toHaveCount(2)
  await page.getByRole('button', { name: 'Syllabus Builder', exact: true }).click()
  await expect(page).toHaveURL(/tab=builder$/)
  await page.getByRole('button', { name: 'My Syllabus', exact: true }).click()
  await expect(page.locator('[data-syllabus-id]')).toHaveCount(3)
})
