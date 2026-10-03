import { test, expect, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

// Mobile walkthrough (iPhone 13 viewport, Chromium). Output: system-walkthrough/06-mobile.
const DIR = '../feature-documentation/system-walkthrough/06-mobile'
async function shot(page: Page, name: string) { await mkdir(DIR, { recursive: true }); await page.waitForTimeout(400); await page.screenshot({ path: `${DIR}/${name}.png`, animations: 'disabled' }) }

test('mobile walkthrough', async ({ page }) => {
  await page.goto('/')
  await shot(page, '01-landing')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)
  await shot(page, '02-instructor-dashboard')
  await page.getByRole('button', { name: 'Open menu' }).click()
  await shot(page, '03-navigation-menu')
  await page.getByRole('button', { name: 'Close menu' }).click()
  await page.goto('/#/syllabus?tab=builder')
  await shot(page, '04-syllabus-builder')
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  await expect(page.getByRole('dialog', { name: 'Pulse', exact: true })).toBeVisible()
  await shot(page, '05-pulse-panel')
  await page.getByRole('button', { name: 'Close Pulse', exact: true }).click()
  await page.goto('/#/settings?tab=ai-provider')
  await expect(page.getByText('Last checked:')).toBeVisible({ timeout: 60_000 })
  await shot(page, '06-settings-ai-and-knowledge')
})
