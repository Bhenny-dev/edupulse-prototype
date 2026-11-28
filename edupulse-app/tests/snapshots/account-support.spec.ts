import { managementSupportScene } from '../management-support-ui'
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
  await expect(page.getByRole('button',{name:'Account menu',exact:true})).toHaveAttribute('title','Sam Example')
  await expect(page.getByRole('region', {name: 'No classes in this term'})).toBeVisible()
  await page.screenshot({ path: `${folder}/03-selected-student-view.png`, animations: 'disabled' })
  await page.getByRole('button', {name:'Join Class', exact:true}).click()
  const join = page.getByRole('dialog', {name:'Join Class', exact:true})
  await expect(join).toContainText('sign in to your own student account')
  await expect(join.getByRole('textbox')).toHaveCount(0)
  await page.screenshot({path:`${folder}/20-student-join-guidance.png`, animations:'disabled'})
  await join.getByRole('button', {name:'Close Join Class', exact:true}).click()
  await expect(join).toHaveCount(0)
  await page.getByRole('button',{name:'Account menu',exact:true}).click();await page.getByRole('button',{name:'Switch view',exact:true}).click();await page.locator('.popover-content').getByRole('button',{name:/^System Admin\b/}).click()
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

for (const role of ['dean', 'associate_dean'] as const) test('Admin management records load and reload for ' + role, async ({ page }) => {
  await managementSupportScene(page, role, async name => {
    await page.mouse.move(0, 0)
    await page.screenshot({path: '../feature-documentation/system-manual/36-dean-activity-records/' + name + '.png', animations: 'disabled'})
  })
})
