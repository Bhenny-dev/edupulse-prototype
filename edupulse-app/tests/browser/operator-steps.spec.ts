import { test, expect } from '@playwright/test'
import { operatorStepsUI } from '../operator-steps-ui'
import { popularCulturePrompt, popularCultureDraft } from '../operator-steps-fixture'

async function openCourse(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto('/#/syllabus?tab=builder')
  await page.getByRole('combobox', { name: 'Course', exact: true }).selectOption('GE ELEC-PPC')
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  const panel = page.getByRole('dialog', { name: 'Pulse', exact: true })
  await panel.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill(popularCulturePrompt)
  await panel.getByRole('button', { name: 'Send', exact: true }).click()
  return panel
}

test('reported popular-culture request retries its bounded step and shows one complete review before applying', async ({ page }) => {
  const fixture = await operatorStepsUI(page, { hold: true })
  const panel = await openCourse(page)
  await expect.poll(() => fixture.requests.length).toBe(3)
  expect(fixture.requests.every(request => request.staged && request.editor.data.courseTitle === 'Philippine Popular Culture')).toBe(true)
  expect(fixture.requests[1]?.continuation).toBe(fixture.requests[2]?.continuation)
  await expect(panel.getByRole('region', { name: 'Review content edit' })).toHaveCount(0)
  await expect(page.getByPlaceholder('Contents...', { exact: true }).first()).toHaveValue('')
  fixture.release()
  const card = panel.getByRole('region', { name: 'Review content edit' })
  await expect(card.getByRole('checkbox')).toHaveCount(7)
  await card.locator('details.pulse-edit-preview').filter({ hasText: 'Course outline' }).locator('summary').click()
  await expect(card).toContainText('Week 18')
  await expect(card).toContainText('Critical cultural analysis portfolio')
  await card.getByRole('button', { name: 'Apply to open form' }).click()
  await expect(panel).toContainText('Applied to the open form')
  await panel.getByRole('button', { name: 'Close Pulse', exact: true }).click()
  await expect(page.getByPlaceholder('Contents...', { exact: true }).first()).toHaveValue(popularCultureDraft.courseOutline[0]!.contents[0]!)
  await expect(page.getByPlaceholder('Auto-fills from curriculum', { exact: true })).toHaveValue('Philippine Popular Culture')
})

test('a repeated connection failure keeps the prompt and editor with an actionable error', async ({ page }) => {
  const fixture = await operatorStepsUI(page, { terminalFailure: true })
  const panel = await openCourse(page)
  await expect(panel).toContainText('The connection was interrupted before the server confirmed the request.')
  await expect(panel).not.toContainText('Failed to fetch')
  await expect(panel.getByRole('textbox', { name: 'Ask Pulse', exact: true })).toHaveValue(popularCulturePrompt)
  await expect(page.getByPlaceholder('Contents...', { exact: true }).first()).toHaveValue('')
  await expect(panel.getByRole('region', { name: 'Review content edit' })).toHaveCount(0)
  expect(fixture.requests).toHaveLength(3)
})
