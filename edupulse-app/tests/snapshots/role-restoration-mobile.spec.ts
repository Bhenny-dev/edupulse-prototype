import { test, expect } from './fixtures'
import { mkdir } from 'node:fs/promises'
import { restorationUI } from '../role-restoration-fixture'
test('synthetic restored mobile charts, matrix and dark role navigation', async ({ page }) => {
  const root = '../feature-documentation/system-walkthrough/09-restored-role-pages'; await mkdir(root, { recursive: true })
  await restorationUI(page); await page.goto('/#/student-monitoring?course='+ 'a'.repeat(32)+'&block=BSIT-1A&tab=assessments'); await expect(page.getByRole('img', { name: /^Assessment score radar:/ })).toBeVisible(); await page.screenshot({ path: `${root}/33-mobile-performance.png`, scale:'css',animations: 'disabled', fullPage: true })
  await page.getByRole('button',{name:'Learning Material Access',exact:true}).click(); await expect(page.getByRole('heading', { name: 'Class access per material', exact: true })).toBeVisible(); await page.screenshot({ path: `${root}/34-mobile-materials.png`, scale:'css',animations: 'disabled', fullPage: true })
  await page.getByRole('button',{name:'Back to handled classes',exact:true}).click();await page.getByRole('button', { name: 'Dark mode', exact: true }).click(); await page.goto('/#/dashboard'); await expect(page.getByRole('navigation', { name: 'Quick actions' })).toBeVisible()
  // Summary numbers count up and the chart draws with JavaScript animation that `scale:'css',animations: 'disabled'` cannot stop.
  await page.waitForTimeout(1800); await page.screenshot({ path: `${root}/35-mobile-dark-dashboard.png`, scale:'css',animations: 'disabled', fullPage: true })
})
