import { test, expect } from './fixtures'
import { dashboardNavigationUI } from '../dashboard-navigation-fixture'

const folder = '../feature-documentation/system-manual/22-dashboard-summary-navigation'
test('synthetic instructor summary cards and their filtered destinations', async ({ page }) => {
  await dashboardNavigationUI(page)
  await page.goto('/#/dashboard')
  const cards = page.locator('.kpi-grid').first()
  await page.keyboard.press('Tab')
  await page.getByRole('link', { name: 'My Courses', exact: true }).focus()
  await expect(cards.locator('.kpi-value')).toHaveText(['3','2','1','1'])
  await cards.screenshot({ path: `${folder}/01-summary-links.png`, animations: 'disabled' })
  for (const [label, file] of [['Active Syllabi', '02-active-syllabi'], ['Drafts to Review', '03-draft-courses'], ['Published Items', '04-published-courses']]) {
    await page.goto('/#/dashboard')
    await page.getByRole('link', { name: label, exact: true }).click()
    await expect(page.getByRole('button', { name: /^Show all/ })).toBeVisible()
    await page.mouse.move(2, 400)
    await page.screenshot({ path: `${folder}/${file}.png`, animations: 'disabled' })
  }
  await page.evaluate(() => localStorage.setItem('edupulse-dark-mode', 'true'))
  await page.goto('/#/dashboard')
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark-mode/)
  await page.keyboard.press('Tab')
  await page.getByRole('link', { name: 'Drafts to Review', exact: true }).focus()
  await expect(cards.locator('.kpi-value')).toHaveText(['3','2','1','1'])
  await cards.screenshot({ path: `${folder}/05-dark-summary-links.png`, animations: 'disabled' })
})
