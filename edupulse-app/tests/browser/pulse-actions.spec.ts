import { test, expect, type Page } from '@playwright/test'

// Pulse actions: proposals from a conversation that change data only after the
// user confirms, then link to where the result is visible. Invented test names only.
const classList = `StudentID,Name,Email,YearLevel,Block
2026-00101,Ana T. Ramos,ana.ramos@example.edu,1,BSIT-1A
2026-00102,"Cruz, Ben L.",ben.cruz@example.edu,1,BSIT-1A
2026-00103,Carla Mendoza,carla.mendoza@example.edu,1,BSIT-1A`
const outline = [
  { week: 1, ilos: 'Explain how a program runs', contents: ['Introduction to programming', 'Algorithms and flowcharts'], activities: 'Trace a flowchart', assessments: 'Recitation' },
  { week: 2, ilos: 'Use variables and data types correctly', contents: ['Variables', 'Data types', 'Operators'], activities: 'Laboratory: temperature converter', assessments: 'Short quiz' },
]

test.beforeEach(async ({ request }) => {
  const snapshot = await (await request.get('/api/ai?action=workspace')).json()
  const syllabus = { id: 'syl-pulse-actions', courseCode: 'IT 102', courseTitle: 'Computer Programming 1', status: 'active', version: 1, instructorId: 1, sample: true, lastUpdated: '2026-10-01T00:00:00.000Z', courseDescription: 'Basics of programming logic and syntax using a structured language.', courseOutline: outline, history: [] }
  const saved = await request.put('/api/ai?action=workspace', { data: { revision: snapshot.revision, data: { syllabi: [syllabus], content: {}, registrations: [] } } })
  expect(saved.status()).toBe(200)
})

async function openPulse(page: Page, persona: string, path: string) {
  await page.goto('/')
  await page.getByRole('button', { name: persona, exact: true }).click()
  await page.goto(path)
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  return page.getByRole('dialog', { name: 'Pulse', exact: true })
}
async function say(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill(text)
  await page.getByRole('button', { name: 'Send', exact: true }).click()
}

test('an attached class list is registered only after Confirm, opens My Courses, can be searched and undone', async ({ page }) => {
  const pulse = await openPulse(page, 'Instructor', '/#/dashboard')
  await pulse.locator('input[type="file"]').setInputFiles({ name: 'IT 102 BSIT-1A class list.csv', mimeType: 'text/csv', buffer: Buffer.from(classList) })
  await expect(pulse.locator('.connected-pulse-attachments')).toContainText('class list, 3 students')
  await say(page, 'Register these students')
  const card = pulse.getByRole('region', { name: 'Register class list IT 102 BSIT-1A class list.csv' })
  await expect(card.getByLabel('Course to register')).toHaveValue('IT 102')
  await expect(card.getByLabel('Block section')).toHaveValue('BSIT-1A')
  await expect(card).toContainText('Ben L. Cruz')
  await expect(card).toContainText('This adds a new class list for IT 102 · BSIT-1A')
  // Nothing is registered before the user confirms.
  expect(await page.evaluate(() => location.hash)).toBe('#/dashboard')
  await card.getByRole('button', { name: 'Register 3 students' }).click()
  await expect(pulse.getByText(/IT 102 · BSIT-1A now lists 3 students \(3 new\)/)).toBeVisible()
  await expect(page).toHaveURL(/#\/syllabus\?tab=register/)
  const table = page.locator('table').filter({ hasText: 'Block Section' })
  await expect(table.getByRole('row').filter({ hasText: 'BSIT-1A' })).toContainText('3')

  await say(page, 'Is Ben Cruz registered?')
  const results = pulse.getByRole('region', { name: 'Search results' }).last()
  await expect(results).toContainText('Registered students')
  await expect(results).toContainText('Ben L. Cruz')
  await expect(results).toContainText('Source: IT 102 BSIT-1A class list.csv')

  await pulse.getByRole('button', { name: 'Undo' }).click()
  await expect(pulse.getByText('Registration undone.')).toBeVisible()
  await expect(table.getByRole('row').filter({ hasText: 'BSIT-1A' })).toHaveCount(0)
})

test('the My Courses uploader reads a real class list instead of sample names and merges a second upload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto('/#/syllabus?tab=register')
  await page.locator('.upload-zone input[type="file"]').setInputFiles({ name: 'IT102-BSIT1A.csv', mimeType: 'text/csv', buffer: Buffer.from(classList) })
  await expect(page.getByText('Student Preview (3 records)')).toBeVisible()
  await expect(page.getByText('Carla Mendoza')).toBeVisible()
  await expect(page.getByLabel('Select Course *')).toHaveValue('IT 102')
  await expect(page.getByLabel('Block Section *')).toHaveValue('BSIT-1A')
  await page.locator('.upload-zone input[type="file"]').setInputFiles({ name: 'unsupported.xls', mimeType: 'application/vnd.ms-excel', buffer: Buffer.from('invalid') })
  await expect(page.getByText('Student Preview (3 records)')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Register Course' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Try Again', exact: true }).click()
  await page.locator('.upload-zone input[type="file"]').setInputFiles({ name: 'IT102-BSIT1A.csv', mimeType: 'text/csv', buffer: Buffer.from(classList) })
  await expect(page.getByText('Student Preview (3 records)')).toBeVisible()
  await page.getByRole('button', { name: 'Register Course' }).click()
  await page.locator('.upload-zone input[type="file"]').setInputFiles({ name: 'IT102-BSIT1A-late.csv', mimeType: 'text/csv', buffer: Buffer.from('Name,Block\nAna T. Ramos,BSIT-1A\nDan Uy,BSIT-1A') })
  await page.getByLabel('Select Course *').selectOption('IT 102')
  await page.getByRole('button', { name: 'Register Course' }).click()
  await expect(page.getByText(/IT 102 · BSIT-1A: 4 students registered \(1 new, 1 already registered\)/)).toBeVisible()
})

test('a student’s material is matched to a course with reasons, and added to the library only after Confirm', async ({ page, request }) => {
  const notes = 'Loops repeat a block of statements. A for loop runs a fixed number of times, and a while loop checks its condition before every pass. Variables hold values, and each variable has a data type. Conditional statements choose which statements run.'
  const pulse = await openPulse(page, 'Student', '/#/dashboard')
  await pulse.locator('input[type="file"]').setInputFiles({ name: 'loops-review.txt', mimeType: 'text/plain', buffer: Buffer.from(notes) })
  await expect(pulse.locator('.connected-pulse-attachments')).toContainText('loops-review.txt')
  await say(page, 'Which course is this for?')
  const card = pulse.getByRole('region', { name: 'Add loops-review.txt to a course' })
  await expect(card.getByRole('radio', { name: /IT 102 — Computer Programming 1/ })).toBeChecked({ timeout: 30_000 })
  await expect(card).toContainText('“loops” (program outcome)')
  // The embedding model re-ranks the keyword shortlist; weak matches are not offered.
  await expect(card).toContainText('Ranked by meaning (embeddings) and keyword match', { timeout: 30_000 })
  await expect(card.getByRole('radio')).toHaveCount(1)
  await card.getByRole('button', { name: 'Add to library under IT 102' }).click()
  await expect(pulse.getByText(/Added to your knowledge library|Already in your library/)).toBeVisible({ timeout: 60_000 })
  const documents = (await (await request.get('/api/ai?action=documents')).json()).documents as { id: string; title: string; quality: { course?: string } }[]
  const filed = documents.find(d => d.title === 'IT 102 · loops review')
  expect(filed?.quality.course).toBe('IT 102')
  await request.delete('/api/ai?action=documents', { data: { id: filed!.id } })
})

test('requests to open a page navigate only within the role, and course generation shows its syllabus source before Confirm', async ({ page }) => {
  const pulse = await openPulse(page, 'Instructor', '/#/dashboard')
  await say(page, 'Take me to the scoring sheet')
  await expect(page).toHaveURL(/#\/student-monitoring/)
  await expect(pulse.getByText('Opened Student Monitoring.')).toBeVisible()

  await say(page, 'Generate week 2 materials for IT 102')
  const card = pulse.getByRole('region', { name: 'Generate courseware' })
  await expect(card.getByLabel('Week to generate')).toHaveValue('2')
  await expect(card).toContainText('Source: IT 102 syllabus v1 · Active · sample record · Course Outline, Week 2')
  await expect(card).toContainText('Variables; Data types; Operators')
  await card.getByRole('button', { name: 'Cancel' }).click()
  await expect(pulse.getByText('Generation cancelled. Nothing was changed.')).toBeVisible()

  // The Courseware link Pulse uses after generating opens the course at that week.
  await page.goto('/#/courseware?tab=builder&course=syl-pulse-actions&week=2')
  await expect(page.getByRole('heading', { name: /IT 102 — Computer Programming 1/ })).toBeVisible()
  await expect(page.locator('[data-week="2"]')).toBeInViewport()
})

test('a student cannot be sent to a page outside the student role', async ({ page }) => {
  const pulse = await openPulse(page, 'Student', '/#/dashboard')
  await say(page, 'Go to course loading')
  await expect(pulse.getByText('Course Loading is not available for your role.')).toBeVisible()
  await expect(page).toHaveURL(/#\/dashboard/)
  await say(page, 'Take me to my assessments')
  await expect(page).toHaveURL(/#\/assessment/)
})
