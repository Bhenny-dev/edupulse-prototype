import { test, expect, type Page } from './fixtures'
import { unifiedCoursewareUI, generatedWeek } from '../courseware-unified-fixture'

const dir = '../feature-documentation/system-manual/03-courseware-generation-and-review'
const delivery = '../feature-documentation/system-manual/15-backend-content-delivery'
const shot = async (page: Page, name: string, folder = dir) => {
  const menuScene = name.includes('actions-menu')
  await page.mouse.move(2, 400)
  // A full-page capture resizes the viewport, which intentionally dismisses menus.
  await page.screenshot({ path: `${folder}/${name}.png`, fullPage: !menuScene, animations: 'disabled', style: '.app-topbar{position:static !important}' })
  if (menuScene) await expect(page.getByRole('menu')).toBeVisible()
}

test('synthetic unified courseware list, generation and three-dot menus', async ({ page }) => {
  const fixture = await unifiedCoursewareUI(page)
  await page.route('**/api/ai?action=health', route => route.fulfill({ json: { ready: true, provider: 'Synthetic transport', model: 'UI fixture', models: [] } }))
  let finish!: () => void
  const gate = new Promise<void>(resolve => { finish = resolve })
  await page.route('**/api/ai?action=courseware', async route => { await gate; await route.fulfill({ json: generatedWeek(route.request().postDataJSON().week) }) })
  await page.goto('/#/courseware')
  await expect(page.locator('[data-course="baseline-syllabus"]')).toContainText('3 of 9 generated')
  await shot(page, '01-courseware-with-active-syllabus')
  await page.getByRole('button', { name: 'More actions for IT 102', exact: true }).click()
  await shot(page, '12-course-actions-menu')
  await page.keyboard.press('Escape')
  await page.locator('[data-course="baseline-syllabus"]').getByRole('button', { name: 'View', exact: true }).click()
  await shot(page, '02-weekly-outline-ready-to-generate')
  await page.locator('[data-week="2"]').getByRole('button', { name: 'Generate', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Stop generation', exact: true })).toBeVisible()
  try { await shot(page, '03-generating-with-pulse-thinking') } finally { finish() }
  await expect(page.locator('[data-week="2"] [data-content-id]')).toHaveCount(3)
  await expect.poll(() => Object.keys((fixture.getWorkspace() as { content: object }).content).length).toBe(6)
  for (const toast of await page.locator('.toast').all()) await toast.click()
  await shot(page, '04-generated-drafts-for-review')
  await shot(page, '04-persisted-courseware-drafts', delivery)
  await page.getByRole('button', { name: 'Week 2 actions', exact: true }).click()
  await shot(page, '13-week-actions-menu')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Actions for Week 2 learning material', exact: true }).click()
  await shot(page, '14-item-actions-menu')
  await page.keyboard.press('Escape')
  await page.reload()
  await page.locator('[data-week="2"]').getByRole('button', { name: 'View', exact: true }).click()
  await page.locator('[data-content-id="gen-mat-baseline-syllabus-w2"]').getByRole('button', { name: 'View', exact: true }).click()
  await expect(page.locator('.doc-viewer-text strong')).toHaveText('function')
  await shot(page, '05-reloaded-generated-lesson', delivery)
})

test('synthetic Pulse guidance describes the combined Courseware workspace', async ({ page }) => {
  await unifiedCoursewareUI(page)
  await page.goto('/#/courseware')
  await page.getByRole('button', { name: 'Open Pulse assistant', exact: true }).click()
  const pulse = page.getByRole('dialog', { name: 'Pulse', exact: true })
  await pulse.getByRole('button', { name: 'Pulse options', exact: true }).click()
  await pulse.getByRole('button', { name: 'Guide this page', exact: true }).click()
  await pulse.getByRole('button', { name: 'Help me get through my review queue', exact: true }).click()
  await expect(pulse).toContainText('Open Courseware')
  await expect(pulse).toContainText('three-dot actions menu')
  await page.mouse.move(2, 400)
  await pulse.screenshot({ path: `${dir}/17-pulse-courseware-guidance.png`, animations: 'disabled' })
})
