import { test, expect, type Page, type Locator } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'

// System manual: step-by-step task screenshots from the production build.
const ROOT = '../feature-documentation/system-manual'
test.describe.configure({ mode: 'serial' })
async function shot(target: Page | Locator, folder: string, name: string) {
  await mkdir(`${ROOT}/${folder}`, { recursive: true })
  const component = !('goto' in target)
  // Toasts from earlier steps would cover the screen being documented.
  const page = component ? (target as Locator).page() : target as Page
  for (const toast of await page.locator('.toast').all()) await toast.click().catch(() => undefined)
  await expect(page.locator('.toast')).toHaveCount(0, { timeout: 5000 }).catch(() => undefined)
  await target.screenshot({ path: `${ROOT}/${folder}/${name}.png`, animations: 'disabled', ...(component ? { style: '.app-topbar{position:static !important}' } : {}) })
}
const saved = (page: Page) => expect(page.getByText('Local workspace · Saved', { exact: true })).toBeVisible({ timeout: 30_000 })

test('syllabus lifecycle: build, check, download, approve, extract, activate', async ({ page, request }) => {
  const f = '02-syllabus-lifecycle'
  // Remove IT 102 copies left by earlier captures (samples stay) so the manual follows one syllabus.
  const snapshot = await (await request.get('/api/ai?action=workspace')).json()
  if (snapshot.data) {
    const stale = new Set(snapshot.data.syllabi.filter((s: { sample?: boolean; courseCode: string }) => !s.sample && s.courseCode === 'IT 102').map((s: { id: string }) => s.id))
    const content = Object.fromEntries(Object.entries(snapshot.data.content).filter(([, item]) => !stale.has((item as { syllabusId: string }).syllabusId)))
    const saved = await request.put('/api/ai?action=workspace', { data: { revision: snapshot.revision, data: { ...snapshot.data, syllabi: snapshot.data.syllabi.filter((s: { id: string }) => !stale.has(s.id)), content } } })
    expect(saved.status()).toBe(200)
  }
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto('/#/syllabus?tab=builder')
  await page.getByLabel('Course', { exact: true }).selectOption('IT 102')
  await page.locator('[data-section="1"]').scrollIntoViewIfNeeded()
  await shot(page.locator('[data-section="1"]'), f, '01-select-course-autofills-section-1')
  await page.getByPlaceholder('Learning outcome...', { exact: true }).first().fill('Explain variable declarations and assignment, and trace how a value changes.')
  await page.getByPlaceholder('Topic...', { exact: true }).first().fill('Variables and assignment')
  await page.locator('[data-section="5"]').scrollIntoViewIfNeeded()
  await shot(page.locator('[data-section="5"]'), f, '02-write-course-outline')
  await page.getByRole('button', { name: 'Save as Drafted', exact: true }).scrollIntoViewIfNeeded()
  await shot(page, f, '03-save-as-drafted-button')
  await page.getByRole('button', { name: 'Save as Drafted', exact: true }).click()
  await saved(page)
  await page.goto('/#/syllabus?tab=mine')
  const row = page.getByRole('row').filter({ hasText: 'IT 102' }).filter({ hasNotText: /sample/i }).first()
  await expect(row).toBeVisible()
  await shot(page, f, '04-my-syllabus-drafted')
  await row.getByRole('button', { name: 'Mark as Checked', exact: true }).click()
  await shot(row, f, '05-marked-as-checked')
  const downloadPromise = page.waitForEvent('download')
  await row.getByRole('button', { name: 'Download for Approval', exact: true }).click()
  const file = await (await downloadPromise).path()
  await shot(row, f, '06-downloaded-for-approval')
  await row.getByRole('button', { name: 'Upload Approved File', exact: true }).click()
  await shot(page, f, '07-upload-approved-file-attestation')
  await page.getByRole('checkbox').check()
  await page.getByLabel('Approved DOCX', { exact: true }).setInputFiles({ name: 'IT102-approved.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: await readFile(file!) })
  await expect(row.getByText('Approved — Uploaded', { exact: true })).toBeVisible()
  await expect(page.locator('.overlay-backdrop')).toHaveCount(0)
  await shot(row, f, '08-approved-file-uploaded')
  await row.getByRole('button', { name: 'Extract Outline', exact: true }).click()
  await expect(page.getByText('Variables and assignment', { exact: true })).toBeVisible()
  await shot(page, f, '09-review-extracted-outline')
  await page.getByRole('button', { name: /Confirm Extraction/ }).click()
  await saved(page)
  await expect(row.getByText('Drives courseware', { exact: true })).toBeVisible()
  await shot(row, f, '10-active-drives-courseware')
  await row.getByTitle('Version History').click()
  await expect(page.getByRole('dialog', { name: 'Syllabus history' })).toBeVisible()
  await shot(page.getByRole('dialog', { name: 'Syllabus history' }), f, '11-version-history-dialog')
  await page.getByRole('button', { name: 'Close', exact: true }).click()
})

test('courseware: generate a week, review alignment, check', async ({ page }) => {
  const f = '03-courseware-generation-and-review'
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto('/#/courseware')
  await expect(page.getByText('Computer Programming 1', { exact: true }).first()).toBeVisible({ timeout: 30_000 })
  await shot(page, f, '01-courseware-with-active-syllabus')
  // The instructor's own IT 102 (not the read-only sample) carries the outline written in the lifecycle test.
  await page.getByRole('row').filter({ hasText: 'IT 102' }).filter({ hasNotText: 'Sample' }).getByRole('button', { name: 'Start Generating', exact: true }).first().click()
  await expect(page.getByText('Variables and assignment', { exact: true }).first()).toBeVisible()
  await shot(page, f, '02-weekly-outline-ready-to-generate')
  await page.getByRole('button', { name: 'Generate', exact: true }).first().click()
  await page.mouse.move(2, 400)
  await page.waitForTimeout(1500)
  await shot(page, f, '03-generating-with-pulse-thinking')
  // A local CPU model can take several minutes; a failure is reported as an error toast.
  const open = page.getByRole('button', { name: 'Open', exact: true }).first(), failure = page.locator('.toast-error').first()
  await expect(open.or(failure)).toBeVisible({ timeout: 540_000 })
  if (await failure.isVisible()) throw new Error(`Generation failed: ${await failure.textContent()}`)
  await shot(page, f, '04-generated-drafts-for-review')
  await open.click()
  const evidence = page.locator('.ai-draft-evidence').first()
  await expect(evidence).toBeVisible({ timeout: 60_000 })
  await shot(page, f, '05-draft-document-view')
  await evidence.scrollIntoViewIfNeeded()
  await shot(evidence, f, '06-outline-alignment-check')
})
