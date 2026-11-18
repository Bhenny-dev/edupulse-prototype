import { test, expect, type Page } from '@playwright/test'
import { accountSupportUI } from '../account-support-fixture'

async function openPulse(page: Page, role = 'admin') {
  const fixture = await accountSupportUI(page, role)
  await page.goto('/#/dashboard')
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  return { fixture, pulse: page.getByRole('dialog', { name: 'Pulse', exact: true }) }
}
async function say(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill(text)
  await page.getByRole('button', { name: 'Send', exact: true }).click()
}
const enters = (fixture: Awaited<ReturnType<typeof accountSupportUI>>) => fixture.calls.filter(call => call.action === 'support' && call.method === 'POST').map(call => call.operation)

test('the System Admin asks Pulse for a person’s authenticated UI: every account role is searched and the one match opens', async ({ page }) => {
  const { fixture, pulse } = await openPulse(page)
  await say(page, 'can you redirect me to the authenticated ui of sam example?')
  // The app remounts under the opened account; the proof is the account's own page.
  await expect(page.getByRole('button', { name: 'Account menu', exact: true })).toHaveAttribute('title', 'Sam Example')
  await expect(page.getByRole('heading', { name: 'Student Dashboard', exact: true })).toBeVisible()
  // The panel and the conversation continue in the opened view, with the reply that opened it.
  await expect(pulse).toBeVisible()
  await expect(pulse).toContainText('can you redirect me to the authenticated ui of sam example?')
  await expect(pulse).toContainText('Opened Student view of Sam Example.')
  const searched = fixture.calls.filter(call => call.action === 'support' && call.method === 'GET' && call.q === 'sam example').map(call => call.role).sort()
  expect(searched).toEqual(['associate_dean', 'dean', 'instructor', 'student'])
  expect(enters(fixture)).toEqual(['enter'])
})

test('asked from another account’s view (the admin is viewing as a Dean), Pulse still opens a different account', async ({ page }) => {
  const { fixture, pulse } = await openPulse(page)
  await say(page, 'open the account of dana dean demo')
  await expect(page.getByRole('button', { name: 'Account menu', exact: true })).toHaveAttribute('title', 'Dana Dean Demo')
  // No need to reopen Pulse: it stayed open in the Dean view.
  await expect(pulse).toContainText('Opened Dean view of Dana Dean Demo.')
  await say(page, 'can you redirect me to the authenticated ui of sam example?')
  await expect(page.getByRole('button', { name: 'Account menu', exact: true })).toHaveAttribute('title', 'Sam Example')
  await expect(pulse).toContainText('open the account of dana dean demo')
  await expect(pulse).toContainText('Opened Student view of Sam Example.')
  expect(enters(fixture)).toEqual(['enter', 'enter'])
})

test('several accounts fit the name: Pulse lists them, and nothing opens until one is chosen', async ({ page }) => {
  const { fixture, pulse } = await openPulse(page)
  await say(page, 'open the account of demo')
  await expect(pulse).toContainText('3 accounts match “demo”.')
  const panel = (await pulse.boundingBox())!, buttons = await pulse.getByRole('button', { name: /^Open (Rowan|Dana|Casey)/ }).all()
  expect(buttons).toHaveLength(3)
  for (const button of buttons) {
    const box = (await button.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(panel.x)
    expect(box.x + box.width).toBeLessThanOrEqual(panel.x + panel.width)
  }
  expect(enters(fixture)).toEqual([])
  await pulse.getByRole('button', { name: 'Open Dana Dean Demo' }).click()
  await expect(page.getByRole('button', { name: 'Account menu', exact: true })).toHaveAttribute('title', 'Dana Dean Demo')
  await expect(pulse).toContainText('Opened Dean view of Dana Dean Demo.')
  expect(enters(fixture)).toEqual(['enter'])
})

test('an unknown name is reported with what was searched, and the view is not changed', async ({ page }) => {
  const { fixture, pulse } = await openPulse(page)
  await say(page, 'please open the account of zed nobody')
  await expect(pulse).toContainText('No student, instructor, dean or program coordinator account matches “zed nobody”.')
  expect(enters(fixture)).toEqual([])
})

test('a registered student with no account is named as such instead of a bare “not found”', async ({ page }) => {
  const { fixture, pulse } = await openPulse(page)
  fixture.registered(true)
  await say(page, 'open the account of quinn registered')
  await expect(pulse).toContainText('Quinn Registered (SYN-900) is on the registered student list, but no confirmed EduPulse account matches')
  expect(enters(fixture)).toEqual([])
})

test('a signed-in student who asks to open another account is told only the System Admin can, and no directory is read', async ({ page }) => {
  const { fixture, pulse } = await openPulse(page, 'student')
  await say(page, 'redirect me to the account of sam example')
  await expect(pulse).toContainText('limited to the verified System Admin')
  expect(fixture.calls.some(call => call.action === 'support')).toBe(false)
})
