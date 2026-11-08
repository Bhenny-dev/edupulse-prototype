import { test, expect, type Page } from './fixtures'
import { mkdir } from 'node:fs/promises'
import { automaticRecordsUI, rosterWorkflow } from '../automatic-records-fixture'
import { unifiedCoursewareUI } from '../courseware-unified-fixture'
const root = '../feature-documentation/system-manual/21-automatic-records-and-course-rosters'
async function shot(page: Page, name: string, selector?: string) { await mkdir(root, { recursive: true }); await page.mouse.move(2, 400); for (const toast of await page.locator('.toast').all()) await toast.click(); await (selector ? page.locator(selector) : page).screenshot({ path: `${root}/${name}.png`, animations: 'disabled', fullPage: !selector, style: '.app-topbar{position:static !important}' }) }
test('automatic records: saved roster CRUD and confirmation boundaries', async ({ page }) => { await rosterWorkflow(page, name => shot(page, name)) })
test('automatic records: retained cache while updating and offline', async ({ page, context }) => {
  await page.clock.install(); const fixture = await automaticRecordsUI(page)
  await page.goto('/#/dashboard'); await expect(page.getByRole('status').filter({ hasText: 'Records up to date' })).toBeVisible()
  await page.waitForLoadState('networkidle')
  const start = fixture.counts().gets, release = fixture.holdRead()
  try { await page.clock.fastForward(301000); await expect.poll(() => fixture.counts().gets).toBeGreaterThan(start); await shot(page, '04-background-update') } finally { release() }
  await expect(page.getByRole('status').filter({ hasText: 'Records up to date' })).toBeVisible()
  await page.evaluate(async () => { await document.fonts.ready }); await context.setOffline(true)
  try { await expect(page.getByRole('status').filter({ hasText: 'Offline' }).first()).toBeVisible(); await shot(page, '05-offline-cache') } finally { await context.setOffline(false) }
})
test('automatic records: focused syllabus tabs and Course page', async ({ page }) => {
  await automaticRecordsUI(page); await page.goto('/#/syllabus'); await expect(page.getByRole('button', { name: 'Syllabus Builder', exact: true })).toBeVisible(); await shot(page, '06-syllabus-tabs')
  await unifiedCoursewareUI(page); await page.goto('/#/courseware'); await page.reload(); await expect(page.getByRole('table', { name: 'Courseware courses', exact: true })).toBeVisible(); await shot(page, '07-course-page')
})
