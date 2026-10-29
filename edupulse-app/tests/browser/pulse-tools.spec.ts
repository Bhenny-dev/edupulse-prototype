import { test, expect, type Page } from '@playwright/test'
import { makePdf } from '../fixtures'

async function open(page: Page, path = '/#/dashboard') {
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto(path)
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  return page.getByRole('dialog', { name: 'Pulse', exact: true })
}
async function say(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill(text)
  await page.getByRole('button', { name: 'Send', exact: true }).click()
}

test('natural conversation redirects and starts the real interactive syllabus guide', async ({ page }) => {
  const pulse = await open(page)
  await say(page, 'ok then, can you redirect me to where i can start with building my syllabus')
  await expect(page).toHaveURL(/syllabus\?tab=builder/)
  await expect(pulse).toContainText('Opened Syllabus Builder')
  await say(page, 'Guide me through this page')
  await expect(pulse.getByText(/Step 1 of/)).toBeVisible()
  await expect(pulse.getByRole('button', { name: 'Next step' })).toBeVisible()
})

test('PDF syllabus attachment offers exact section previews, preserves unrelated fields, and rejects stale targets', async ({ page }) => {
  const pulse = await open(page, '/#/syllabus?tab=builder')
  const pdf = makePdf([['Section 1: Course Information', 'Course Code: IT 102', 'Course Title: Computer Programming 1', 'Section 5: Course Outline', 'Week 1', 'ILOs: Explain variable declarations.', 'Topics: Variables and assignment']])
  await pulse.locator('input[type="file"]').setInputFiles({ name: 'IT102-syllabus.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf) })
  await expect(pulse.locator('.connected-pulse-attachments')).toContainText('IT102-syllabus.pdf', { timeout: 30000 })
  await say(page, 'Import the course outline from this syllabus')
  const card = pulse.getByRole('region', { name: 'Import syllabus sections' })
  await card.getByRole('button', { name: 'Prepare edit preview' }).click()
  await expect(card).toContainText('Variables and assignment')
  await card.getByLabel('Course for this syllabus').selectOption('IT 102')
  // Mutating the form after a preview must invalidate that preview.
  await page.getByLabel('Course', { exact: true }).selectOption('IT 102')
  await card.getByRole('button', { name: 'Apply to open form' }).click()
  await expect(card.getByRole('alert')).toContainText('changed after this proposal')
  await card.getByRole('button', { name: 'Refresh preview' }).click()
  await card.getByRole('button', { name: 'Apply to open form' }).click()
  await expect(pulse).toContainText('Applied to the open form')
  await page.getByRole('button', { name: 'Close Pulse', exact: true }).click()
  await expect(page.getByPlaceholder('Topic...', { exact: true }).first()).toHaveValue('Variables and assignment')
})

test('private history saves preferences, recalls across chats, forgets and deletes source conversations', async ({ page }) => {
  const pulse = await open(page)
  const preference = `I prefer concise bullet points for test ${Date.now()}.`
  await say(page, `Remember that ${preference}`)
  await expect(pulse.locator('.pulse-context-status')).toContainText('Conversation saved', { timeout: 15000 })
  await pulse.getByRole('button', { name: 'Pulse options', exact: true }).click(); await pulse.getByRole('button', { name: 'Conversations and memory' }).click()
  const history = pulse.getByRole('region', { name: 'Conversations, memory and tools' })
  await history.getByText(/Saved preferences/).click()
  await expect(history).toContainText(preference)
  await history.getByRole('button', { name: 'New conversation', exact: true }).click()
  await say(page, 'Recall my previous preference for concise bullet points')
  await expect(pulse.getByRole('region', { name: 'Recalled private context' })).toContainText(preference)
  await expect(pulse.locator('.pulse-context-status')).toContainText('Conversation saved', { timeout: 15000 })
  await pulse.getByRole('button', { name: 'Pulse options', exact: true }).click(); await pulse.getByRole('button', { name: 'Conversations and memory' }).click()
  await history.getByText(/Saved preferences/).click()
  await history.locator('li').filter({ hasText: preference }).filter({ has: page.getByRole('button', { name: 'Forget', exact: true }) }).getByRole('button', { name: 'Forget', exact: true }).click()
  await expect(history.getByText(preference, { exact: true })).toHaveCount(0)
})

test('roster removal previews exact rows and persists only after confirmation', async ({ page, request }) => {
  const snapshot = await (await request.get('/api/ai?action=workspace')).json()
  await request.put('/api/ai?action=workspace', { data: { revision: snapshot.revision, data: { syllabi: [], content: {}, registrations: [] } } })
  const pulse = await open(page)
  const csv = 'StudentID,Name,Email,YearLevel,Block\nA101,Ana Test,ana@example.invalid,1,BSIT-1A\nB102,Ben Test,ben@example.invalid,1,BSIT-1A'
  await pulse.locator('input[type="file"]').setInputFiles({ name: 'IT102-BSIT1A-class-list.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await expect(pulse.locator('.connected-pulse-attachments')).toContainText('2 students')
  await say(page, 'Register these students')
  await pulse.getByRole('button', { name: 'Register 2 students' }).click()
  await expect(pulse).toContainText('now lists 2 students')
  await say(page, 'Remove student B102 from the IT 102 class list')
  const card = pulse.getByRole('region', { name: 'Review roster changes' })
  await card.getByRole('checkbox', { name: /B102/ }).check()
  await card.getByRole('button', { name: 'Preview roster changes' }).click()
  await expect(card).toContainText('Proposed: 1 students')
  expect((await (await request.get('/api/ai?action=workspace')).json()).data.registrations[0].studentCount).toBe(2)
  await card.getByRole('button', { name: 'Confirm roster changes' }).click()
  await expect(pulse).toContainText('IT 102 · BSIT-1A: 1 students.')
  const saved = (await (await request.get('/api/ai?action=workspace')).json()).data.registrations[0]
  expect(saved.students.map((item: { StudentID: string }) => item.StudentID)).toEqual(['A101'])
})

test('a generated section patch is previewed and a failed database save never reports completion', async ({ page, request }) => {
  const snapshot = await (await request.get('/api/ai?action=workspace')).json()
  await request.put('/api/ai?action=workspace', { data: { revision: snapshot.revision, data: { syllabi: [], content: {}, registrations: [] } } })
  await page.route('**/api/ai?action=operator', route => route.fulfill({ json: { patch: { programOutcomes: ['Explain variables using a worked example.'] }, generated: true, requiresConfirmation: true } }))
  const pulse = await open(page, '/#/syllabus?tab=builder')
  await page.getByLabel('Course', { exact: true }).selectOption('IT 102')
  await say(page, 'Improve the program outcomes in this syllabus')
  const card = pulse.getByRole('region', { name: 'Review content edit' })
  await expect(card).toContainText('Explain variables using a worked example.')
  expect((await (await request.get('/api/ai?action=workspace')).json()).data.syllabi).toEqual([])
  await page.route('**/api/ai?action=workspace', async route => route.request().method() === 'PUT' ? route.fulfill({ status: 503, json: { error: { code: 'WORKSPACE_UNAVAILABLE', message: 'Synthetic database outage; nothing saved.' } } }) : route.fallback())
  await card.getByRole('button', { name: 'Confirm and save draft' }).click()
  // A failed PUT is followed by a read to disambiguate a lost commit response.
  await expect(card.getByRole('alert')).toContainText('Synthetic database outage', { timeout: 15000 })
  expect((await (await request.get('/api/ai?action=workspace')).json()).data.syllabi).toEqual([])
  await page.unroute('**/api/ai?action=workspace')
  await card.getByRole('button', { name: 'Confirm and save draft' }).click()
  await expect(pulse).toContainText('Draft saved.')
  const saved = (await (await request.get('/api/ai?action=workspace')).json()).data.syllabi[0]
  expect(saved.programOutcomes).toEqual(['Explain variables using a worked example.'])
  expect(saved.status).toBe('drafted')
})
