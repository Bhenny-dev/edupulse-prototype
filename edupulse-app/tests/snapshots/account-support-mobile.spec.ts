import { test, expect } from './fixtures'
import { accountSupportUI } from '../account-support-fixture'

test('synthetic mobile account picker fits the screen and keeps filters usable', async ({ page }) => {
  await accountSupportUI(page)
  await page.goto('/#/dashboard')
  await page.getByRole('button', { name: 'Open view', exact: true }).last().click()
  const picker = page.getByRole('dialog', { name: 'Choose student account' })
  await expect(picker.getByRole('button', { name: 'View Alex Sample' })).toBeVisible()
  await expect(picker.getByLabel('Program', { exact: true })).toBeVisible()
  await page.screenshot({ path: '../feature-documentation/system-manual/23-account-support-and-pulse-context/08-mobile-account-picker.png', animations: 'disabled' })
})
