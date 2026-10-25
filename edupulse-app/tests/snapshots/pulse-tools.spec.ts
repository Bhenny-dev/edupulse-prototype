import { test, expect, type Page } from './fixtures.js'
import { makePdf } from '../fixtures.js'
const dir = '../feature-documentation/system-manual/09-pulse-actions'
const fullCard = '.connected-pulse{height:auto!important;max-height:none!important;overflow:visible!important}.connected-pulse-feed{overflow:visible!important;flex:none!important;max-height:none!important}'
test.setTimeout(60000)
async function say(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill(text)
  await page.getByRole('button', { name: 'Send', exact: true }).click()
}
async function open(page: Page, path: string) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto(path)
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  return page.getByRole('dialog', { name: 'Pulse', exact: true })
}
test('Pulse tools: PDF source sections and private memory controls', async ({ page }) => {
  const panel = await open(page, '/#/syllabus?tab=builder')
  const pdf = makePdf([['Section 1: Course Information', 'Course Code: IT 102', 'Course Title: Computer Programming 1', 'Section 5: Course Outline', 'Week 1', 'ILOs: Explain variable declarations.', 'Topics: Variables and assignment']])
  await panel.locator('input[type="file"]').setInputFiles({ name: 'sample-IT102-syllabus.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf) })
  await expect(panel.locator('.connected-pulse-attachments')).toContainText('sample-IT102-syllabus.pdf')
  await say(page, 'Import the course outline from this syllabus')
  const card = panel.getByRole('region', { name: 'Import syllabus sections' })
  await card.getByRole('button', { name: 'Prepare edit preview' }).click()
  await card.getByLabel('Course for this syllabus').selectOption('IT 102')
  await expect(card).toContainText('Variables and assignment')
  await panel.screenshot({ path: `${dir}/10-pdf-section-preview.png`, animations: 'disabled', style: fullCard })
  await card.getByRole('button', { name: 'Apply to open form' }).click()
  await expect(panel).toContainText('Applied to the open form')
  await panel.locator('.pulse-action-done').screenshot({ path: `${dir}/11-section-applied.png`, animations: 'disabled', style: fullCard })
  await say(page, 'Remember that I prefer concise bullet points with examples.')
  await expect(panel.locator('.pulse-context-status')).toContainText('Conversation saved', { timeout: 15000 })
  await panel.getByRole('button', { name: 'Conversations and memory' }).click()
  const history = panel.getByRole('region', { name: 'Conversations, memory and tools' })
  await history.getByText(/Saved preferences/).click()
  await expect(history).toContainText('I prefer concise bullet points with examples.')
  await history.locator('details').first().scrollIntoViewIfNeeded()
  await history.locator('details').nth(0).screenshot({ path: `${dir}/12-private-memory.png`, animations: 'disabled', style: '.connected-pulse{height:calc(100vh - 30px)!important;bottom:10px!important}' })
  await history.getByText(/Installed Pulse skills/).click()
  await history.getByText('Installed Pulse skills & tools', { exact: true }).scrollIntoViewIfNeeded()
  await history.locator('details').nth(1).screenshot({ path: `${dir}/13-installed-tools.png`, animations: 'disabled', style: '.connected-pulse{height:calc(100vh - 30px)!important;bottom:10px!important}' })
})
test('Pulse tools: model proposal is reviewable before saving', async ({ page }) => {
  // Synthetic model output; the editor, validation, source preview and save controls are real.
  await page.route('**/api/ai?action=operator', route => route.fulfill({ json: { patch: { programOutcomes: ['Explain variable declarations using a worked example.', 'Trace a short program and describe its output.'] }, generated: true, requiresConfirmation: true } }))
  const panel = await open(page, '/#/syllabus?tab=builder')
  await page.getByLabel('Course', { exact: true }).selectOption('IT 102')
  await say(page, 'Revise the program outcomes to emphasize worked examples')
  const card = panel.getByRole('region', { name: 'Review content edit' })
  await expect(card).toContainText('Explain variable declarations using a worked example.')
  await panel.screenshot({ path: `${dir}/14-generated-edit-preview.png`, animations: 'disabled', style: fullCard })
})
