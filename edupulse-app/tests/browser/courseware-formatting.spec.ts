import { test, expect } from '../snapshots/fixtures'
import { coursewareFormattingUI, openFormattingWeek, formattedBody, formattedMaterial } from '../courseware-formatting-fixture'
import { restorationUI } from '../role-restoration-fixture'

test('document formats saved Markdown and places evaluation after all sections', async ({ page }) => {
  await coursewareFormattingUI(page)
  await openFormattingWeek(page)
  const body = page.locator('.doc-viewer-text').first()
  await expect(body.locator('strong').first()).toHaveText('Network foundations')
  await expect(body.locator('em')).toHaveText('switch')
  await expect(body.getByRole('heading', { name: 'Small network', level: 3 })).toBeVisible()
  await expect(body.locator('ul > li')).toHaveCount(2)
  await expect(body.locator('ol > li')).toHaveCount(2)
  await expect(body.locator('table th')).toHaveText(['Device', 'Role'])
  await expect(body.locator('pre code')).toContainText('• This is a literal code example.\n**Keep these markers inside code.**')
  await expect(body.locator('p').first()).not.toContainText('**')
  const review = page.locator('.ai-draft-evidence')
  expect(await review.evaluate(el => !!(document.querySelector('.doc-viewer-body')!.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true)
  expect(await review.evaluate(el => el.getBoundingClientRect().top >= document.querySelector('.doc-viewer-body')!.getBoundingClientRect().bottom)).toBe(true)
  await review.scrollIntoViewIfNeeded()
  await expect(review).toContainText('96% coverage')
  await expect(review).toContainText('2 supported, 1 for your verification')
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByLabel('Section 1 content', { exact: true })).toHaveValue(formattedBody)
  await page.getByLabel('Section 1 content', { exact: true }).fill('**Saved emphasis** stays formatted after reopening.')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.reload()
  await page.locator('[data-content-id="formatted-material"]').getByRole('button', { name: 'View', exact: true }).click()
  await expect(page.locator('.doc-viewer-text strong')).toHaveText('Saved emphasis')
})

test('activity and assessment evaluation follow their content', async ({ page }) => {
  await coursewareFormattingUI(page)
  await openFormattingWeek(page, 3)
  await expect(page.locator('.doc-viewer-text strong').first()).toHaveText('Network foundations')
  expect(await page.locator('.ai-draft-evidence').evaluate(el => el.getBoundingClientRect().top >= document.querySelector('.doc-viewer-body')!.getBoundingClientRect().bottom)).toBe(true)
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await openFormattingWeek(page, 1)
  await expect(page.getByRole('button', { name: 'Save Assessment', exact: true })).toBeVisible()
  expect(await page.locator('.ai-draft-evidence').evaluate(el => el.getBoundingClientRect().top >= document.querySelector('.assessment-questions')!.getBoundingClientRect().bottom)).toBe(true)
  await expect(page.getByLabel('Question 1 explanation', { exact: true })).toHaveValue('Reviewed course reference.')
})

test('student document and slides format emphasis without exposing draft evaluation', async ({ page }) => {
  const fixture = await restorationUI(page, 'student')
  fixture.records.publications[0].content = { ...structuredClone(formattedMaterial), subtitle: 'Week 1 learning material' }
  fixture.records.publications[0].title = formattedMaterial.title
  fixture.records.courses[0].course_title = 'Computer Networks'
  await page.goto('/#/courseware')
  await page.getByRole('button', { name: 'Open material', exact: true }).click()
  await expect(page.locator('.doc-viewer-text strong').first()).toHaveText('Network foundations')
  await expect(page.locator('.ai-draft-evidence')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Presentation', exact: true }).click()
  await page.getByRole('button', { name: /Next/i }).first().click()
  await expect(page.locator('.pres-slide-points strong').first()).toHaveText('Network foundations')
  await expect(page.locator('.pres-slide-points').first()).not.toContainText('**Network foundations**')
  await expect(page.locator('.ai-draft-evidence')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
})

test('formatted content keeps HTML inert and prevents unsafe links or remote image loads', async ({ page }) => {
  const fixture = await coursewareFormattingUI(page)
  const workspace = fixture.getWorkspace() as { content: Record<string, { content: { sections: { heading: string; body: string }[] } }> }
  workspace.content['formatted-material'].content.sections = [{ heading: 'Safety example', body: '**Safe bold**\n\n<script>window.coursewareInjected = true</script>\n\n[Unsafe link](javascript:alert%281%29)\n\n[Reference](https://example.org/lesson)\n\n![Image description](https://example.invalid/tracker.png)\n\n<img src=x onerror="window.coursewareInjected=true">' }]
  fixture.setWorkspace(workspace)
  const externalImages: string[] = []
  page.on('request', request => { if (request.url().includes('example.invalid/tracker')) externalImages.push(request.url()) })
  await openFormattingWeek(page)
  const body = page.locator('.doc-viewer-text')
  await expect(body.locator('strong')).toHaveText('Safe bold')
  await expect(body.locator('script, img, iframe')).toHaveCount(0)
  await expect(body.getByRole('link', { name: 'Unsafe link' })).toHaveCount(0)
  await expect(body.getByRole('link', { name: 'Reference' })).toHaveAttribute('href', 'https://example.org/lesson')
  await expect(body.getByText('Image description', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => 'coursewareInjected' in window)).toBe(false)
  expect(externalImages).toEqual([])
})
