import { test, expect } from './fixtures'
import { accountSupportUI } from '../account-support-fixture'
const folder = '../feature-documentation/system-manual/23-account-support-and-pulse-context'

test('synthetic account search, filtered selection, student support view and solid dark modal', async ({ page }) => {
  await accountSupportUI(page)
  await page.goto('/#/dashboard')
  await page.getByRole('button', { name: 'Open view', exact: true }).last().click()
  let picker = page.getByRole('dialog', { name: 'Choose student account' })
  await expect(picker.getByRole('button', { name: 'View Alex Sample' })).toBeVisible()
  await picker.screenshot({ path: `${folder}/01-select-account.png`, animations: 'disabled' })
  await picker.getByLabel('Year level', { exact: true }).selectOption('2')
  await picker.getByRole('searchbox', { name: 'Search accounts' }).fill('SYN-002')
  await expect(picker.getByRole('button', { name: 'View Alex Sample' })).toHaveCount(0)
  await expect(picker.getByRole('button', { name: 'View Sam Example' })).toBeVisible()
  await picker.screenshot({ path: `${folder}/02-filtered-account.png`, animations: 'disabled' })
  await picker.getByRole('button', { name: 'View Sam Example' }).click()
  await expect(page.locator('.support-view-banner')).toContainText('Sam Example')
  await expect(page.locator('.academic-sync-status')).toContainText('Records up to date')
  await page.screenshot({ path: `${folder}/03-selected-student-view.png`, animations: 'disabled' })
  await page.getByRole('button', { name: 'Return to System Admin' }).click()
  await page.evaluate(() => localStorage.setItem('edupulse-dark-mode','true'))
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark-mode/)
  await page.getByRole('button', { name: 'Open view', exact: true }).last().click()
  picker = page.getByRole('dialog', { name: 'Choose student account' })
  await expect(picker.getByRole('button', { name: 'View Alex Sample' })).toBeVisible()
  await picker.screenshot({ path: `${folder}/04-dark-account-picker.png`, animations: 'disabled' })
})

test('synthetic Pulse account answer, public reference and mixed-language exchange', async ({ page }) => {
  await accountSupportUI(page, 'instructor')
  await page.goto('/#/dashboard')
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  const panel = page.getByRole('dialog', { name: 'Pulse', exact: true })
  for (const [message, expected, file] of [
    ['What can you tell me about my current account?', 'You have 1 accessible course', '05-authorized-context'],
    ['What is photosynthesis?', 'Photosynthesis converts light energy', '06-public-reference'],
    ['Kumusta, can we talk in mixed Tagalog and English?', 'Maaari tayong mag-usap', '07-mixed-language'],
  ]) {
    await page.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill(message)
    await page.getByRole('button', { name: 'Send', exact: true }).click()
    await expect(panel).toContainText(expected)
    if (file === '05-authorized-context') { await panel.getByText('Sources (1)', { exact: true }).last().click(); await expect(panel).toContainText('Authorized account records') }
    if (file === '06-public-reference') await panel.getByText('Sources (1)', { exact: true }).last().click()
    await panel.screenshot({ path: `${folder}/${file}.png`, animations: 'disabled' })
  }
})

test('workspace navigation handoff keeps Tab and Escape within the office', async ({ page }) => {
  await accountSupportUI(page, 'instructor')
  await page.goto('/#/dashboard')
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  await page.getByRole('button', { name: 'Pulse options', exact: true }).click()
  await page.getByRole('button', { name: 'Open workspace buddies' }).click()
  const office = page.getByRole('dialog', { name: 'Meet your crew.' })
  await expect(office.locator('.buddy-office-viewport[data-assembled]')).toBeVisible()
  await office.getByRole('button', { name: 'Pause office animation' }).click()
  await office.getByLabel('Message Pip', { exact: true }).fill('Open my syllabus builder')
  await office.getByRole('button', { name: 'Send to buddy' }).click()
  await expect(page).toHaveURL(/syllabus\?tab=builder/)
  await expect(office.getByRole('log')).toContainText('tool card in Pulse')
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await page.keyboard.press('Tab')
  await expect.poll(() => office.evaluate(element => element.contains(document.activeElement))).toBe(true)
  await office.screenshot({ path: `${folder}/09-office-keyboard-handoff.png`, animations: 'disabled' })
  await page.keyboard.press('Escape')
  await expect(office).toHaveCount(0)
})
