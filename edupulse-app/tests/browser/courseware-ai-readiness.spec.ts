import { test, expect, type Page } from '@playwright/test'

const settingsTab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Settings sections' }).getByRole('button', { name, exact: true })

// The browser suite runs the API without a model (AI_PROVIDER=retrieval), so courseware
// generation is refused with MODEL_UNAVAILABLE: the builder must say so before and after a try.
test('the courseware builder says when Pulse AI is not set up and keeps a failed generation on the page', async ({ page, request }) => {
  // The preview workspace is shared across tests: start from one active sample syllabus.
  const { DEFAULT_SYLLABI } = await import(new URL('../../src/data/mockData.js', import.meta.url).href)
  const current = await (await request.get('/api/ai?action=workspace')).json()
  const seeded = await request.put('/api/ai?action=workspace', { data: { revision: current.revision, data: { syllabi: [{ ...DEFAULT_SYLLABI[0], sample: true }], content: {}, registrations: [] } } })
  expect(seeded.status()).toBe(200)
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await expect(page).toHaveURL(/#\/dashboard/)
  await page.goto('/#/courseware')
  await page.getByRole('button', { name: 'Start Generating', exact: true }).first().click()
  await expect(page).toHaveURL(/tab=builder/)

  // Before any try: a calm notice with the way to set it up.
  const notice = page.locator('.cw-ai-notice')
  await expect(notice).toHaveAttribute('role', 'status')
  await expect(notice).toContainText('Pulse AI is not set up yet')

  // A refused generation stays on the page as an alert, with the server's reason.
  await page.getByRole('button', { name: 'Generate', exact: true }).first().click()
  const alert = page.getByRole('alert').filter({ hasText: 'Generation did not finish' })
  await expect(alert).toContainText('Connect a provider')
  await page.waitForTimeout(6000) // longer than a toast stays
  await expect(alert).toBeVisible()

  // Dismiss returns to the notice; Set up Pulse AI opens the AI settings.
  await alert.getByRole('button', { name: 'Dismiss' }).click()
  await expect(alert).toHaveCount(0)
  await expect(notice).toContainText('Pulse AI is not set up yet')
  await notice.getByRole('button', { name: 'Set up Pulse AI' }).click()
  await expect(page).toHaveURL(/settings\?tab=ai-provider/)
  await expect(settingsTab(page, 'AI & Knowledge')).toHaveAttribute('aria-pressed', 'true')
})

test('an unknown Settings tab in the address opens Account instead of an empty page', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await expect(page).toHaveURL(/#\/dashboard/)
  await page.goto('/#/settings?tab=ai')
  await expect(settingsTab(page, 'Account')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible()
})
