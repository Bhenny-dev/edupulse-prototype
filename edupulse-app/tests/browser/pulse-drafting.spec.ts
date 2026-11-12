import { test, expect } from '@playwright/test'
import { researchMethodsDraft } from '../syllabus-draft-fixture'

test('selected Research Methods course generates readable all-field proposal without a populated library', async ({ page }) => {
  const requests: { operation: string; section: string; editor: { data: { courseTitle: string } } }[] = []
  await page.route('**/api/ai?action=operator', async route => {
    requests.push(route.request().postDataJSON())
    await route.fulfill({ json: { patch: researchMethodsDraft, generated: true, requiresConfirmation: true, notes: ['Synthetic research fixture; instructor review required.'], sources: [{ title: 'Research methods â€” sample retrieved source', url: researchMethodsDraft.onlineReferences[0]!.url }] } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto('/#/syllabus?tab=builder')
  await page.getByRole('combobox', { name: 'Course', exact: true }).selectOption('IT 104')
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  const panel = page.getByRole('dialog', { name: 'Pulse', exact: true })
  await panel.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('Generate content for all fields in this syllabus using web research')
  await panel.getByRole('button', { name: 'Send', exact: true }).click()
  const card = panel.getByRole('region', { name: 'Syllabus next actions' }).last()
  await card.getByRole('button',{name:'Review changes',exact:true}).click()
  await expect(card).toContainText('Draft fields updated')
  await expect(card.getByRole('checkbox')).toHaveCount(0)
  expect(requests[0]?.operation).toBe('revise')
  expect(requests[0]?.editor.data.courseTitle).toBe('Research Methods')
  expect(requests[0]?.section).toBe('all')
  await expect(card).toContainText('Research questions and evidence')
  await expect(card).not.toContainText('retain every existing section ID')
  await expect(card).not.toContainText('Grounded 100%')
  await expect(panel).toContainText('Draft fields updated')
  await panel.getByRole('button', { name: 'Close Pulse', exact: true }).click()
  await expect(page.getByPlaceholder('Contents...', { exact: true }).first()).toHaveValue('Research questions and evidence')
})
