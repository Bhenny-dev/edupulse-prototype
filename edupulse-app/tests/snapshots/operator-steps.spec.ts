import { test, expect } from './fixtures'
import { operatorStepsUI } from '../operator-steps-ui'
import { popularCulturePrompt } from '../operator-steps-fixture'

const dir = '../feature-documentation/system-manual/09-pulse-actions'
for (const failed of [false, true]) test(`synthetic bounded syllabus ${failed ? 'connection recovery' : 'complete preview'}`, async ({ page }) => {
  await operatorStepsUI(page, { terminalFailure: failed })
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto('/#/syllabus?tab=builder')
  await page.getByLabel('Course', { exact: true }).selectOption('GE ELEC-PPC')
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  const panel = page.getByRole('dialog', { name: 'Pulse', exact: true })
  await panel.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill(popularCulturePrompt)
  await panel.getByRole('button', { name: 'Send', exact: true }).click()
  if (failed) await expect(panel).toContainText('The connection was interrupted before the server confirmed the request.')
  else {
    const card = panel.getByRole('region', { name: 'Review content edit' })
    await expect(card.getByRole('checkbox')).toHaveCount(7)
    await card.locator('details').filter({ has: page.locator('summary', { hasText: 'Public research sources' }) }).locator('summary').click()
    await card.locator('details.pulse-edit-preview').first().locator('summary').click()
  }
  await panel.screenshot({ path: `${dir}/${failed ? '20-connection-recovery' : '19-bounded-course-preview'}.png`, animations: 'disabled', style: '.connected-pulse{position:relative!important;inset:auto!important;height:auto!important;max-height:none!important;overflow:visible!important}.connected-pulse-feed{overflow:visible!important;flex:none!important;max-height:none!important}' })
})
