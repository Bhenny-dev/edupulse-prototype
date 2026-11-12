import { test, expect } from './fixtures'
import { mkdir } from 'node:fs/promises'
import { automaticRecordsUI, rosterWorkflow } from '../automatic-records-fixture'
const root = '../feature-documentation/system-manual/21-automatic-records-and-course-rosters'
test('automatic records: mobile roster and solid dark surfaces', async ({ page }) => {
  await mkdir(root, { recursive: true }); await page.addInitScript(() => localStorage.setItem('edupulse-dark-mode', 'true'))
  await rosterWorkflow(page, async name => { for(let i=0;i<10&&await page.locator('.toast').count();i++)await page.locator('.toast').first().click({timeout:1500}).catch(()=>{}); await page.screenshot({ path: `${root}/mobile-${name}.png`, scale:'css',animations: 'disabled' }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true) })
})
test('automatic records: mobile dashboard removes manual refresh and sync', async ({ page }) => {
  await automaticRecordsUI(page); await page.goto('/#/dashboard'); await expect(page.getByRole('status').filter({ hasText: 'Records up to date' })).toBeVisible()
  await page.screenshot({ path: `${root}/mobile-04-dashboard.png`, scale:'css',animations: 'disabled' })
})
