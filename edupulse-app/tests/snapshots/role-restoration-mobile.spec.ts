import { test, expect } from './fixtures'
import { mkdir } from 'node:fs/promises'
import { restorationUI } from '../role-restoration-fixture'
test('synthetic restored mobile charts, matrix and dark role navigation', async ({ page }) => {
  const root = '../feature-documentation/system-walkthrough/09-restored-role-pages'; await mkdir(root, { recursive: true })
  await restorationUI(page); await page.goto('/#/performance'); await expect(page.getByRole('img', { name: /^Assessment score radar:/ })).toBeVisible(); await page.screenshot({ path: `${root}/33-mobile-performance.png`, animations: 'disabled', fullPage: true })
  await page.goto('/#/scoring-sheet?tab=materials'); await expect(page.getByRole('heading', { name: 'Material access chart', exact: true })).toBeVisible(); await page.screenshot({ path: `${root}/34-mobile-materials.png`, animations: 'disabled', fullPage: true })
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click(); await page.goto('/#/dashboard'); await expect(page.getByRole('navigation', { name: 'Quick actions' })).toBeVisible(); await page.screenshot({ path: `${root}/35-mobile-dark-dashboard.png`, animations: 'disabled', fullPage: true })
})
