import { test, expect } from './fixtures'
import { mkdir } from 'node:fs/promises'
import { automaticRecordsUI, rosterWorkflow } from '../automatic-records-fixture'
const root = '../feature-documentation/system-manual/21-automatic-records-and-course-rosters'
test('automatic records: mobile roster and solid dark surfaces', async ({ page }) => {
  await mkdir(root, { recursive: true }); await page.addInitScript(() => localStorage.setItem('edupulse-dark-mode', 'true'))
  await rosterWorkflow(page, async name => { for (const toast of await page.locator('.toast').all()) await toast.click(); await page.screenshot({ path: `${root}/mobile-${name}.png`, animations: 'disabled' }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true) })
})
test('automatic records: mobile dashboard removes manual refresh and sync', async ({ page }) => {
  await automaticRecordsUI(page); await page.goto('/#/dashboard'); await expect(page.getByRole('status').filter({ hasText: 'Records up to date' })).toBeVisible()
  await page.screenshot({ path: `${root}/mobile-04-dashboard.png`, animations: 'disabled' })
})
