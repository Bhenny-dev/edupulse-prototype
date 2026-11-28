import { managementSupportScene } from '../management-support-ui'
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

for (const role of ['dean', 'associate_dean'] as const) test('Admin management records load and reload for ' + role, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1150 })
  await managementSupportScene(page, role, async name => {
    await page.mouse.move(0, 0)
    await page.screenshot({path: '../feature-documentation/system-manual/36-dean-activity-records/mobile-' + name + '.png', animations: 'disabled'})
  })
})
