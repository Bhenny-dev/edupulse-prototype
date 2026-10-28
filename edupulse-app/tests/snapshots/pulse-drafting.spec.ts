import { test, expect } from './fixtures.js'
import { researchMethodsDraft } from '../syllabus-draft-fixture.js'
const dir = '../feature-documentation/system-manual/09-pulse-actions'

test('Pulse model proposal: course-aware complete syllabus draft and research sources', async ({ page }) => {
  await page.route('**/api/ai?action=operator', route => route.fulfill({ json: { patch: researchMethodsDraft, generated: true, requiresConfirmation: true, notes: ['Sample research response for this capture. New teaching content requires instructor review.', 'Official grading rules remain pending institutional confirmation.'], sources: [{ title: 'Research methods — sample retrieved source', url: researchMethodsDraft.onlineReferences[0]!.url }] } }))
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto('/#/syllabus?tab=builder')
  await page.getByLabel('Course', { exact: true }).selectOption('IT 104')
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  const panel = page.getByRole('dialog', { name: 'Pulse', exact: true })
  await panel.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('Generate content for all fields in this syllabus using web research')
  await panel.getByRole('button', { name: 'Send', exact: true }).click()
  const card = panel.getByRole('region', { name: 'Review content edit' })
  await expect(card.getByRole('checkbox')).toHaveCount(7)
  await card.locator('details').filter({ has: page.locator('summary', { hasText: 'Public research sources' }) }).locator('summary').click()
  await card.locator('details.pulse-edit-preview').first().locator('summary').click()
  await panel.screenshot({ path: `${dir}/17-course-aware-syllabus-draft.png`, animations: 'disabled', style: '.connected-pulse{position:relative!important;inset:auto!important;height:auto!important;max-height:none!important;overflow:visible!important}.connected-pulse-feed{overflow:visible!important;flex:none!important;max-height:none!important}' })
})

test('Pulse model proposal: researched learning draft has source links and a draft label', async ({ page }) => {
  await page.route('**/api/ai?action=chat', route => route.fulfill({ json: {
    requestId: crypto.randomUUID(), mode: 'generated', task: 'draft', trace: [],
    answer: 'Sample lesson draft: qualitative interviews\n\nResearch uses systematic investigation to develop knowledge. [1]\n\nProposed activity: write an open-ended interview question, pilot it with a partner, and revise it to avoid leading the participant.',
    sources: [{ id: 'sample-public-research', documentId: 'sample-public-research', citation: 1, title: 'Research — sample public source', url: 'https://en.wikipedia.org/wiki/Research', origin: 'web', method: 'web-search', text: 'Research uses systematic investigation to develop knowledge.', section: 'Public educational excerpt', page: null, flagged: false, relevance: null, similarity: null }],
  } }))
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  const panel = page.getByRole('dialog', { name: 'Pulse', exact: true })
  await panel.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('Write a short lesson about qualitative interviews')
  await panel.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(panel).toContainText('Educational draft · instructor review required')
  await panel.getByRole('button', { name: 'Open source 1' }).click()
  await expect(panel.getByRole('link', { name: 'Open public source' })).toBeVisible()
  await expect(panel).not.toContainText('Grounded 100%')
  await panel.screenshot({ path: `${dir}/18-researched-learning-draft.png`, animations: 'disabled', style: '.connected-pulse{position:relative!important;inset:auto!important;height:auto!important;max-height:none!important;overflow:visible!important}.connected-pulse-feed{overflow:visible!important;flex:none!important;max-height:none!important}' })
})
