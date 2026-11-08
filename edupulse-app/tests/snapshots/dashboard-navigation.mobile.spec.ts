import { test, expect } from './fixtures'
import { dashboardNavigationUI } from '../dashboard-navigation-fixture'

test('synthetic mobile summary links and filtered course list', async ({ page }) => {
  await dashboardNavigationUI(page)
  await page.goto('/#/dashboard')
  await expect(page.locator('.kpi-grid').first().getByRole('link')).toHaveCount(4)
  await page.locator('.kpi-grid').first().screenshot({ path: '../feature-documentation/system-manual/22-dashboard-summary-navigation/06-mobile-summary-links.png', animations: 'disabled' })
  await page.getByRole('link', { name: 'Drafts to Review', exact: true }).click()
  await expect(page.locator('[data-course]')).toHaveCount(1)
  await page.screenshot({ path: '../feature-documentation/system-manual/22-dashboard-summary-navigation/07-mobile-draft-courses.png', animations: 'disabled' })
})
