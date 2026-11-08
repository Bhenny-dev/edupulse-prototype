import { test, expect } from '@playwright/test'
import { dashboardNavigationUI } from '../dashboard-navigation-fixture'
import { unifiedWorkspace } from '../courseware-unified-fixture'

test('instructor summary cards open their matching lists and preserve browser Back', async ({ page }) => {
  await dashboardNavigationUI(page)
  await page.goto('/#/dashboard')
  const destinations = [
    ['My Courses', '/courseware'], ['Active Syllabi', '/syllabus?tab=mine&status=active'],
    ['Drafts to Review', '/courseware?status=draft'], ['Published Items', '/courseware?status=published'],
  ]
  for (const [label, path] of destinations) {
    const card = page.getByRole('link', { name: label, exact: true })
    await expect(card).toHaveAttribute('href', '#' + path)
    await card.click()
    await expect(page).toHaveURL(url => url.hash === '#' + path)
    if (label === 'Active Syllabi') {
      await expect(page.locator('[data-syllabus-id]')).toHaveCount(2)
      await expect(page.locator('[data-syllabus-id="unfinished-syllabus"]')).toHaveCount(0)
      await page.getByRole('button', { name: 'Show all syllabi', exact: true }).click()
      await expect(page.locator('[data-syllabus-id]')).toHaveCount(3)
      await page.goBack()
    } else if (label === 'Drafts to Review' || label === 'Published Items') {
      await expect(page.locator('[data-course]')).toHaveCount(1)
      await expect(page.locator('[data-course="baseline-syllabus"]')).toContainText(label === 'Drafts to Review' ? '1 draft' : '1 published')
      await page.reload()
      await expect(page.locator('[data-course]')).toHaveCount(1)
      await page.getByRole('button', { name: 'Show all courses', exact: true }).click()
      await expect(page.locator('[data-course]')).toHaveCount(2)
      await page.goBack()
    } else await expect(page.getByRole('heading', { name: 'Course', exact: true })).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'Instructor Dashboard', exact: true })).toBeVisible()
  }
  const courses = page.getByRole('link', { name: 'My Courses', exact: true })
  await page.keyboard.press('Tab')
  await courses.focus()
  await expect(courses).toBeFocused()
  expect(await courses.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/courseware$/)
})

test('zero-count cards remain useful and show honest empty states', async ({ page }) => {
  const fixture = await dashboardNavigationUI(page)
  const workspace = unifiedWorkspace()
  fixture.setWorkspace({ ...workspace, syllabi: workspace.syllabi.map(syllabus => ({ ...syllabus, status: 'drafted' })), content: {} })
  for (const [label, empty] of [['Active Syllabi', 'No active syllabi yet.'], ['Drafts to Review', 'No drafts to review'], ['Published Items', 'No published items yet']]) {
    await page.goto('/#/dashboard')
    await page.getByRole('link', { name: label, exact: true }).click()
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
