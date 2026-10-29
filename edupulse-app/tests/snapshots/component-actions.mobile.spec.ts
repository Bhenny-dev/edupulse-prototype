import { test, expect } from './fixtures'
import { mkdir } from 'node:fs/promises'
import { componentBuilder, exampleFieldModel } from '../pulse-component-fixture'
const root = '../feature-documentation/system-manual/14-pulse-and-outline-workspace'

test('Pulse model proposal: mobile component focus and clean chat', async ({ page }) => {
  await mkdir(root, { recursive: true })
  const field = await componentBuilder(page); await exampleFieldModel(page)
  await page.getByRole('button', { name: 'Open Pulse assistant', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Pulse', exact: true })).toBeVisible()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${root}/12-mobile-clean-pulse.png`, animations: 'disabled' })
  await page.getByRole('button', { name: 'Close Pulse', exact: true }).click()
  await field.focus(); await page.keyboard.press('Alt+p')
  const pulse = page.getByRole('dialog', { name: 'Pulse', exact: true })
  await pulse.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('Improve this field for the selected course')
  await pulse.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(pulse.getByRole('region', { name: 'Review content edit' })).toContainText('Formulate a research question')
  await pulse.locator('.connected-pulse-message').last().evaluate(element => element.scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${root}/13-mobile-field-proposal.png`, animations: 'disabled' })
})

test('mobile Settings tabs and horizontally scrollable outline', async ({ page }) => {
  await mkdir(root, { recursive: true }); await componentBuilder(page)
  const outline = page.getByRole('region', { name: 'Course Outline editor', exact: true })
  await outline.getByRole('combobox', { name: 'Outline week', exact: true }).selectOption('1')
  await outline.evaluate(element => window.scrollTo({ top: scrollY + element.getBoundingClientRect().top - 82, behavior: 'instant' }))
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${root}/14-mobile-outline.png`, animations: 'disabled' })
  await page.goto('/#/settings?tab=keyboard-shortcuts')
  await page.getByRole('navigation', { name: 'Settings sections' }).getByRole('button', { name: 'Keyboard Shortcuts', exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${root}/15-mobile-settings.png`, animations: 'disabled', fullPage: true })
})
