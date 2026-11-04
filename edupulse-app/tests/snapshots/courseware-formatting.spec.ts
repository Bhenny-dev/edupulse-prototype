import { test, expect } from './fixtures'
import { coursewareFormattingUI, openFormattingWeek, formattedMaterial } from '../courseware-formatting-fixture'
import { restorationUI } from '../role-restoration-fixture'

const dir = '../feature-documentation/system-manual/03-courseware-generation-and-review'

test('synthetic courseware formatting and evaluation at the end', async ({ page }) => {
  await coursewareFormattingUI(page)
  await openFormattingWeek(page)
  await expect(page.locator('.doc-viewer-text strong').first()).toHaveText('Network foundations')
  await page.mouse.move(2, 400)
  await page.screenshot({ path: `${dir}/05-draft-document-view.png`, animations: 'disabled', fullPage: true, style: '.app-topbar{position:static !important}' })
  const evidence = page.locator('.ai-draft-evidence')
  await evidence.scrollIntoViewIfNeeded()
  await evidence.screenshot({ path: `${dir}/06-outline-alignment-check.png`, animations: 'disabled' })
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await openFormattingWeek(page, 1)
  await page.screenshot({ path: `${dir}/10-assessment-review-at-end.png`, animations: 'disabled', fullPage: true, style: '.app-topbar{position:static !important}' })
})

test('synthetic courseware formatting on solid dark surfaces', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('edupulse-dark-mode', 'true'))
  await coursewareFormattingUI(page)
  await openFormattingWeek(page)
  await expect(page.locator('.doc-viewer-text strong').first()).toHaveText('Network foundations')
  await page.mouse.move(2, 400)
  await page.screenshot({ path: `${dir}/11-formatted-document-dark.png`, animations: 'disabled', fullPage: true, style: '.app-topbar{position:static !important}' })
})

test('synthetic student formatted document and presentation', async ({ page }) => {
  const fixture = await restorationUI(page, 'student')
  fixture.records.publications[0].content = { ...structuredClone(formattedMaterial), subtitle: 'Week 1 learning material' }
  fixture.records.publications[0].title = formattedMaterial.title
  fixture.records.courses[0].course_title = 'Computer Networks'
  await page.goto('/#/courseware')
  await page.getByRole('button', { name: 'Open material', exact: true }).click()
  await expect(page.locator('.doc-viewer-text strong').first()).toHaveText('Network foundations')
  await expect(page.locator('.ai-draft-evidence')).toHaveCount(0)
  await page.mouse.move(2, 400)
  const root = '../feature-documentation/system-walkthrough/09-restored-role-pages'
  await page.screenshot({ path: `${root}/28-student-document.png`, animations: 'disabled', fullPage: true, style: '.app-topbar{position:static !important}' })
  await page.getByRole('button', { name: 'Presentation', exact: true }).click()
  await page.getByRole('button', { name: /Next/i }).first().click()
  await expect(page.locator('.pres-slide-points strong').first()).toHaveText('Network foundations')
  await page.mouse.move(2, 400)
  await page.screenshot({ path: `${root}/29-student-presentation.png`, animations: 'disabled', fullPage: true, style: '.app-topbar{position:static !important}' })
})
