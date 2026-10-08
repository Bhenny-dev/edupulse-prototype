import { test, expect } from '@playwright/test'

test('Pulse responds to a greeting and continues a situational exchange without documents', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  const dialog = page.getByRole('dialog', { name: 'Pulse', exact: true })
  for (const [question, name] of [['Hello', '06-general-conversation'], ['What if I feel nervous while presenting to my class?', '07-situational-exchange']]) {
    await page.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill(question)
    const response = page.waitForResponse(r => r.url().includes('action=chat') && r.request().method() === 'POST')
    await page.getByRole('button', { name: 'Send', exact: true }).click()
    const result = await (await response).json()
    expect(result.mode).toBe('generated')
    expect(result.grounding).toBe('general')
    expect(result.sources).toEqual([])
    await expect(dialog.getByText('Pulse · General assistance', { exact: true }).last()).toBeVisible()
    await dialog.screenshot({ path: `../feature-documentation/system-manual/07-pulse-guidance/${name}.png`, animations: 'disabled' })
  }
})
