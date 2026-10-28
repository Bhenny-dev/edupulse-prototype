import { test, expect } from '@playwright/test'
import { researchMethodsDraft } from '../syllabus-draft-fixture'

test('selected Research Methods course generates readable all-field proposal without a populated library', async ({ page }) => {
  const requests: { operation: string; section: string; editor: { data: { courseTitle: string } } }[] = []
  await page.route('**/api/ai?action=operator', async route => {
    requests.push(route.request().postDataJSON())
    await route.fulfill({ json: { patch: researchMethodsDraft, generated: true, requiresConfirmation: true, notes: ['Synthetic research fixture; instructor review required.'], sources: [{ title: 'Research methods — sample retrieved source', url: researchMethodsDraft.onlineReferences[0]!.url }] } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto('/#/syllabus?tab=builder')
  await page.getByLabel('Course', { exact: true }).selectOption('IT 104')
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  const panel = page.getByRole('dialog', { name: 'Pulse', exact: true })
  await panel.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('Generate content for all fields in this syllabus using web research')
  await panel.getByRole('button', { name: 'Send', exact: true }).click()
  const card = panel.getByRole('region', { name: 'Review content edit' })
  await expect(card).toContainText('IT 104 syllabus builder')
  await expect(card.getByRole('checkbox')).toHaveCount(7)
  expect(requests[0]?.operation).toBe('revise')
  expect(requests[0]?.editor.data.courseTitle).toBe('Research Methods')
  expect(requests[0]?.section).toBe('all')
  await card.locator('details.pulse-edit-preview').filter({ hasText: 'Course outline' }).locator('summary').click()
  await expect(card).toContainText('Teaching materials: Case Studies')
  await expect(card).toContainText('Week 18')
  await expect(card).not.toContainText('Grounded 100%')
  await card.getByRole('button', { name: 'Apply to open form' }).click()
  await expect(panel).toContainText('Applied to the open form')
  await panel.getByRole('button', { name: 'Close Pulse', exact: true }).click()
  await expect(page.getByPlaceholder('Topic...', { exact: true }).first()).toHaveValue('Research questions and evidence')
})
