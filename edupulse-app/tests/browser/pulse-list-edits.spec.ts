import { test, expect, type Page } from '@playwright/test'

async function open(page: Page, path: string) {
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
const outcomes = (page: Page) => page.locator('[data-pulse-field^="programOutcomes."]')
const values = (page: Page) => outcomes(page).evaluateAll(inputs => inputs.map(input => (input as HTMLInputElement).value))

test('Pulse removes, moves and swaps program outcomes by position without a model, and says what it understood', async ({ page }) => {
  const pulse = await open(page, '/#/syllabus?tab=builder')
  await page.getByRole('combobox', { name: 'Course', exact: true }).selectOption('IT 102')
  for (const [index, text] of ['Outcome A', 'Outcome B', 'Outcome C', 'Outcome D'].entries()) {
    if (index > await outcomes(page).count() - 1) await page.getByRole('button', { name: 'Add Program Outcome', exact: true }).click()
    await outcomes(page).nth(index).fill(text)
  }
  await expect(outcomes(page)).toHaveCount(4)
  await say(page, 'Remove program outcome 2')
  await expect(outcomes(page)).toHaveCount(3)
  await expect.poll(() => values(page)).toEqual(['Outcome A', 'Outcome C', 'Outcome D'])
  await expect(pulse).toContainText('Understood: remove program outcome 2.')
  await say(page, 'Move the last program outcome to the top')
  await expect(outcomes(page).first()).toHaveValue('Outcome D')
  await say(page, 'Swap program outcomes 1 and 3')
  await expect(outcomes(page).first()).toHaveValue('Outcome C')
  await expect(outcomes(page).last()).toHaveValue('Outcome D')
  await say(page, 'Remove program outcome 9')
  await expect(pulse).toContainText('There is no program outcome 9. There are 3 program outcomes. Nothing changed.')
  await expect(outcomes(page)).toHaveCount(3)
})
