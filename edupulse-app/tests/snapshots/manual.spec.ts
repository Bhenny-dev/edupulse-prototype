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
  await page.getByLabel('Approved DOCX or PDF', { exact: true }).setInputFiles({ name: 'IT102-approved.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: await readFile(file!) })
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

// Pulse actions (System Manual 9): proposals that run only after Confirm. The class list is
// sample data with invented names and reserved example.edu addresses, never real student records.
const sampleClassList = `StudentID,Name,Email,YearLevel,Block
2026-90001,Alma S. Reyes,alma.reyes@example.edu,1,BSIT-1B
2026-90002,"Bautista, Carlo M.",carlo.bautista@example.edu,1,BSIT-1B
2026-90003,Dario Mendoza,dario.mendoza@example.edu,1,BSIT-1B
2026-90004,Elena V. Santos,elena.santos@example.edu,1,BSIT-1B
2026-90005,Felix Uy,felix.uy@example.edu,1,BSIT-1B
2026-90006,Gina P. Flores,gina.flores@example.edu,1,BSIT-1B`
const pulseDialog = (page: Page) => page.getByRole('dialog', { name: 'Pulse', exact: true })
async function askPulse(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill(text)
  await page.getByRole('button', { name: 'Send', exact: true }).click()
}

test('Pulse actions: register an attached class list, then search it', async ({ page }) => {
  const f = '09-pulse-actions'
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto('/#/syllabus?tab=register')
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  const dialog = pulseDialog(page)
  await dialog.locator('input[type="file"]').setInputFiles({ name: 'sample IT 102 BSIT-1B class list.csv', mimeType: 'text/csv', buffer: Buffer.from(sampleClassList) })
  await expect(dialog.locator('.connected-pulse-attachments')).toContainText('class list, 6 students')
  await page.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('Register these students in my course')
  await shot(dialog, f, '01-attach-class-list')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  const card = dialog.getByRole('region', { name: /^Register class list/ })
  await expect(card.getByLabel('Course to register')).toHaveValue('IT 102')
  await card.scrollIntoViewIfNeeded()
  await shot(dialog, f, '02-register-card')
  await card.getByRole('button', { name: 'Register 6 students' }).click()
  await expect(dialog.getByText(/IT 102 · BSIT-1B now lists 6 students/)).toBeVisible()
  await saved(page)
  await shot(page, f, '03-registered-in-my-courses')
  await askPulse(page, 'Is Dario Mendoza registered?')
  await expect(dialog.getByRole('region', { name: 'Search results' })).toContainText('Registered students')
  await shot(dialog, f, '04-search-results')
  // Leave the capture workspace as it was.
  await dialog.getByRole('button', { name: 'Undo' }).click()
  await saved(page)
})

test('Pulse actions: a student files a material under a course', async ({ page, request }) => {
  const f = '09-pulse-actions'
  await page.goto('/')
  await page.getByRole('button', { name: 'Student', exact: true }).click()
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  const dialog = pulseDialog(page)
  const notes = 'Layout notes for the lab. Flexbox arranges items in one direction; CSS Grid places them in rows and columns at the same time. With a mobile-first approach the base styles target small screens, and media queries add columns as the screen gets wider. Custom properties keep spacing and colours in one place.'
  await dialog.locator('input[type="file"]').setInputFiles({ name: 'css-layout-notes.txt', mimeType: 'text/plain', buffer: Buffer.from(notes) })
  await expect(dialog.locator('.connected-pulse-attachments')).toContainText('css-layout-notes.txt')
  await askPulse(page, 'Which course is this for? Please save it there.')
  const card = dialog.getByRole('region', { name: 'Add css-layout-notes.txt to a course' })
  await expect(card).toContainText('Ranked by meaning (embeddings) and keyword match', { timeout: 60_000 })
  await card.scrollIntoViewIfNeeded()
  await shot(dialog, f, '05-material-course-suggestion')
  await card.getByRole('button', { name: /^Add to library under/ }).click()
  await expect(dialog.getByText(/Added to your knowledge library/)).toBeVisible({ timeout: 120_000 })
  await shot(dialog, f, '06-material-added')
  // Leave the capture library as it was.
  const documents = (await (await request.get('/api/ai?action=documents')).json()).documents as { id: string; title: string }[]
  for (const document of documents.filter(d => d.title.endsWith('· css layout notes'))) await request.delete('/api/ai?action=documents', { data: { id: document.id } })
})

test('Pulse actions: prepare a week of courseware from the syllabus outline', async ({ page }) => {
  const f = '09-pulse-actions'
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto('/#/courseware')
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  const dialog = pulseDialog(page)
  await askPulse(page, 'Generate week 1 materials for IT 102')
  const card = dialog.getByRole('region', { name: 'Generate courseware' })
  await expect(card.getByLabel('Week to generate')).toHaveValue('1')
  await card.scrollIntoViewIfNeeded()
  await shot(dialog, f, '07-generate-week-source')
  await card.getByRole('button', { name: 'Cancel', exact: true }).click()
})

test('class-list uploader clears a refused replacement and lets the same filename be retried', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto('/#/syllabus?tab=register')
  const input = page.locator('.upload-zone input[type="file"]')
  const file = { name: 'IT102-BSIT1B.csv', mimeType: 'text/csv', buffer: Buffer.from(sampleClassList) }
  await input.setInputFiles(file)
  await expect(page.getByText('Student Preview (6 records)')).toBeVisible()
  await input.setInputFiles({ ...file, name: 'unsupported.xls' })
  await expect(page.getByText('Student Preview (6 records)')).toHaveCount(0)
  await shot(page.locator('.upload-zone'), '09-pulse-actions', '08-class-list-upload-error')
  await page.getByRole('button', { name: 'Try Again', exact: true }).click()
  await input.setInputFiles(file)
  await expect(page.getByText('Student Preview (6 records)')).toBeVisible()
})
