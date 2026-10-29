import { test, expect } from './fixtures'
import { mkdir } from 'node:fs/promises'
import { componentBuilder, exampleFieldModel, fileTransfer } from '../pulse-component-fixture'

const root = '../feature-documentation/system-manual/14-pulse-and-outline-workspace'
test.beforeEach(async () => { await mkdir(root, { recursive: true }) })

test('Pulse model proposal: clean chat, selected-field preview and preserved neighboring outcomes', async ({ page }) => {
  const field = await componentBuilder(page); await exampleFieldModel(page)
  await page.getByRole('button', { name: 'Open Pulse assistant', exact: true }).click()
  let pulse = page.getByRole('dialog', { name: 'Pulse', exact: true })
  await expect(pulse.getByRole('textbox', { name: 'Ask Pulse', exact: true })).toBeInViewport()
  await page.waitForTimeout(400)
  await pulse.screenshot({ path: `${root}/01-clean-pulse.png`, animations: 'disabled' })
  await pulse.getByRole('button', { name: 'Close Pulse', exact: true }).click()
  await field.focus(); await page.keyboard.press('Alt+p')
  pulse = page.getByRole('dialog', { name: 'Pulse', exact: true })
  await pulse.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('Draft this field using the selected Research Methods course')
  await pulse.getByRole('button', { name: 'Send', exact: true }).click()
  const card = pulse.getByRole('region', { name: 'Review content edit', exact: true })
  await expect(card).toContainText('Formulate a research question')
  await pulse.screenshot({ path: `${root}/02-component-edit-preview.png`, animations: 'disabled', style: '.connected-pulse{position:relative!important;inset:auto!important;height:auto!important;max-height:none!important;overflow:visible!important}.connected-pulse-feed{overflow:visible!important;flex:none!important;max-height:none!important}' })
  await card.getByRole('button', { name: 'Apply to open form', exact: true }).click()
  await expect(field).toHaveValue('Formulate a research question and justify an appropriate method.')
  await pulse.getByRole('button', { name: 'Close Pulse', exact: true }).click()
  await page.locator('[data-section="4"]').screenshot({ path: `${root}/03-field-applied.png`, animations: 'disabled' })
})

test('Pulse native file drop preserves the unsent prompt and shows the extracted attachment', async ({ page }) => {
  await componentBuilder(page)
  await page.getByRole('button', { name: 'Open Pulse assistant', exact: true }).click()
  const pulse = page.getByRole('dialog', { name: 'Pulse', exact: true })
  await pulse.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('Use these notes to draft an activity for the selected course')
  await page.waitForTimeout(400)
  const transfer = await fileTransfer(page, [{ name: 'research-notes.txt', text: 'Research questions guide the choice of methods. An interview activity should use open questions and explain participant consent.' }])
  await pulse.dispatchEvent('dragenter', { dataTransfer: transfer })
  await expect(pulse.getByText('Drop files to attach', { exact: true })).toBeVisible()
  await pulse.screenshot({ path: `${root}/04-file-drop.png`, animations: 'disabled' })
  await pulse.dispatchEvent('drop', { dataTransfer: transfer })
  await expect(pulse.locator('.connected-pulse-attachments')).toContainText('research-notes.txt')
  await pulse.screenshot({ path: `${root}/05-attached-files.png`, animations: 'disabled' })
})

test('wide outline: full workspace, a selected week and solid dark surfaces', async ({ page }) => {
  await componentBuilder(page)
  await page.locator('[data-pulse-field="courseOutline.0.ilos"]').fill('Formulate a research question and identify suitable evidence.')
  await page.locator('[data-pulse-field="courseOutline.0.contents.0"]').fill('Research questions and evidence')
  await page.locator('[data-pulse-field="courseOutline.0.activities"]').fill('Compare example questions and justify an appropriate method.')
  await page.locator('[data-pulse-field="courseOutline.1.ilos"]').fill('Explain ethical treatment of research participants.')
  const outline = page.getByRole('region', { name: 'Course Outline editor', exact: true })
  await outline.getByRole('button', { name: 'Expand outline', exact: true }).click()
  await page.waitForTimeout(400)
  await outline.screenshot({ path: `${root}/06-wide-outline.png`, animations: 'disabled' })
  await outline.getByRole('combobox', { name: 'Outline week', exact: true }).selectOption('2')
  await outline.screenshot({ path: `${root}/07-filtered-outline-week.png`, animations: 'disabled' })
  await page.getByTitle('Dark mode', { exact: true }).click()
  await outline.screenshot({ path: `${root}/11-dark-outline.png`, animations: 'disabled' })
})

test('Settings: help, keyboard shortcuts and workspace backup', async ({ page }) => {
  await componentBuilder(page)
  for (const [tab, image] of [['help', '08-settings-help'], ['keyboard-shortcuts', '09-settings-keyboard-shortcuts'], ['privacy', '10-backup-settings']]) {
    await page.goto(`/#/settings?tab=${tab}`)
    if (tab === 'keyboard-shortcuts') await page.getByText('Planned shortcuts', { exact: true }).click()
    await page.screenshot({ path: `${root}/${image}.png`, animations: 'disabled', fullPage: true })
  }
})

test('dark Pulse keeps a refused file attachment readable', async ({ page }) => {
  await componentBuilder(page)
  await page.getByTitle('Dark mode', { exact: true }).click()
  await page.getByRole('button', { name: 'Open Pulse assistant', exact: true }).click()
  const pulse = page.getByRole('dialog', { name: 'Pulse', exact: true })
  const transfer = await fileTransfer(page, [{ name: 'unsupported.exe', text: 'Synthetic invalid file for attachment validation.' }])
  await pulse.dispatchEvent('drop', { dataTransfer: transfer })
  await expect(pulse.getByRole('alert')).toBeVisible()
  await page.waitForTimeout(400)
  await pulse.screenshot({ path: `${root}/16-dark-file-error.png`, animations: 'disabled' })
})
