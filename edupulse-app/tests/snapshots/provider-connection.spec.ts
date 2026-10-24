import { test, expect } from './fixtures.js'
import { mkdir } from 'node:fs/promises'
import { providerFixture } from '../browser/provider-fixture.js'

test('provider connection: clearly saved credential, synchronized status and recoverable replacement', async ({ page }) => {
  await providerFixture(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto('/#/settings?tab=ai-provider')
  await page.getByLabel('AI provider', { exact: true }).selectOption('openai')
  await page.getByLabel('Provider API key', { exact: true }).fill('synthetic-provider-key-for-ui')
  await page.getByRole('button', { name: 'Connect and load models', exact: true }).click()
  await expect(page.locator('[data-pulse-target="AI pipeline status"]')).toContainText('Model connection verified.')
  await expect(page.getByLabel('Saved provider credential')).toBeVisible()
  await mkdir('../feature-documentation/system-manual/08-ai-connections', { recursive: true })
  await page.locator('[data-pulse-target="AI connection"]').screenshot({ path: '../feature-documentation/system-manual/08-ai-connections/04-saved-provider-credential.png', animations: 'disabled', style: '.app-topbar{position:static !important}' })
  await page.getByRole('button', { name: 'Replace API key', exact: true }).click()
  await page.getByLabel('Provider API key', { exact: true }).fill('synthetic-rejected-key')
  await page.getByRole('button', { name: 'Connect and load models', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('rejected')
  await page.locator('[data-pulse-target="AI connection"]').screenshot({ path: '../feature-documentation/system-manual/08-ai-connections/05-provider-replacement-error.png', animations: 'disabled', style: '.app-topbar{position:static !important}' })
})
