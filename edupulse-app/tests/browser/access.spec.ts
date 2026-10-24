import { test, expect } from '@playwright/test'

for (const persona of ['Assoc. Dean', 'System Admin']) {
  test(`AUTH-001: ${persona} cannot open the performance route or navigate there through Pulse`, async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: persona, exact: true }).click()
    await page.goto('/#/performance?tab=scores')
    await expect(page).toHaveURL(/dashboard/)
    await expect(page.getByTestId('performance-provenance')).toHaveCount(0)
    await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
    await page.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('open performance')
    await page.getByRole('button', { name: 'Send', exact: true }).click()
    await expect(page.getByText('Performance is not available for your role.', { exact: true })).toBeVisible()
    await expect(page).toHaveURL(/dashboard/)
  })
}

test('DATA-001: sample performance is explicitly labelled in preview', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Student', exact: true }).click()
  await page.goto('/#/performance')
  await expect(page.getByTestId('performance-provenance')).toContainText('Sample performance data')
  await expect(page.getByRole('button', { name: 'Export Report', exact: true })).toBeVisible()
})

test('Dean can open Performance without a stale or missing Pulse target crashing the page', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'Dean', exact: true }).click()
  await page.goto('/#/performance')
  await expect(page.getByRole('heading', { name: 'Performance', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})
