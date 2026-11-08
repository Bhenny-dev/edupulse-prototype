import { test, expect } from '@playwright/test'
import { accountSupportUI, supportAccounts } from '../account-support-fixture'

test('admin searches and selects an actual account, keeps the admin token and exits cleanly', async ({ page }) => {
  const fixture = await accountSupportUI(page)
  await page.goto('/#/dashboard')
  await page.getByRole('button', { name: 'Open view', exact: true }).last().click()
  const picker = page.getByRole('dialog', { name: 'Choose student account' })
  await expect(picker).toBeVisible()
  await expect(picker.getByRole('button', { name: 'View Alex Sample' })).toBeVisible()
  await picker.getByLabel('Year level', { exact: true }).selectOption('2')
  await expect(picker.getByRole('button', { name: 'View Alex Sample' })).toHaveCount(0)
  await picker.getByRole('searchbox', { name: 'Search accounts' }).fill('SYN-002')
  await picker.getByRole('button', { name: 'View Sam Example' }).click()
  await expect(picker).toHaveCount(0)
  await expect(page.locator('.support-view-banner')).toContainText('Sam Example')
  await expect.poll(() => fixture.calls.some(call => call.action === 'academic' && call.subject === supportAccounts[1].id)).toBe(true)
  const token = fixture.calls.find(call => call.subject)?.authorization?.slice(7).split('.')[1]
  expect(JSON.parse(Buffer.from(token!, 'base64url').toString()).sub).toBe('fe67b9d2-719b-4b10-91cd-76031ab115fe')
  expect(fixture.calls.some(call => ['respond','submit','start'].includes(call.operation || ''))).toBe(false)
  await page.getByRole('button', { name: 'Return to System Admin' }).click()
  await expect(page.locator('.support-view-banner')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'System Admin', exact: true })).toBeVisible()
})

test('account lookup failure offers retry and an unavailable selection never changes the view', async ({ page }) => {
  const fixture = await accountSupportUI(page)
  await page.goto('/#/dashboard')
  await page.getByRole('button', { name: 'Open view', exact: true }).last().click()
  const picker = page.getByRole('dialog', { name: 'Choose student account' })
  await expect(picker.getByRole('button', { name: 'View Alex Sample' })).toBeVisible()
  fixture.failEnter(true)
  await picker.getByRole('button', { name: 'View Alex Sample' }).click()
  await expect(picker.getByRole('alert')).toContainText('no longer available')
  await expect(page.locator('.support-view-banner')).toHaveCount(0)
  await picker.getByRole('button', { name: 'Close account selection' }).click()
  await expect(page.getByRole('heading', { name: 'System Admin', exact: true })).toBeVisible()
})
