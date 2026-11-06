import { test, expect } from './fixtures'
import { workspaceRecoveryUI, causeWorkspaceSaveFailure } from '../workspace-recovery-fixture'

const dir = '../feature-documentation/system-manual/14-pulse-and-outline-workspace'
test('synthetic page stays clear after a failed save and recovery lives in Settings', async ({ page }) => {
  await workspaceRecoveryUI(page)
  await causeWorkspaceSaveFailure(page)
  await expect(page.getByTestId('workspace-save-state')).toContainText('Cloud save failed')
  await expect(page.locator('.workspace-status')).toHaveCount(0)
  await expect(page.locator('.toast')).toHaveCount(0, { timeout: 10000 })
  await page.mouse.move(2, 400)
  await page.screenshot({ path: `${dir}/11-no-save-banner.png`, fullPage: true, animations: 'disabled' })
  await page.goto('/#/settings?tab=privacy')
  await expect(page.getByRole('region', { name: 'Workspace save recovery' })).toBeVisible()
  await page.mouse.move(2, 400)
  await page.screenshot({ path: `${dir}/12-save-recovery-settings.png`, fullPage: true, animations: 'disabled' })
})

test('synthetic conflict recovery stays in Settings until a backup is exported', async ({ page }) => {
  await workspaceRecoveryUI(page, true)
  await causeWorkspaceSaveFailure(page)
  await expect(page.getByTestId('workspace-save-state')).toContainText('newer workspace')
  await page.goto('/#/settings?tab=privacy')
  await expect(page.getByRole('button', { name: 'Load latest after export' })).toBeDisabled()
  await expect(page.locator('.toast')).toHaveCount(0, { timeout: 10000 })
  await page.mouse.move(2, 400)
  await page.screenshot({ path: `${dir}/13-conflict-recovery-settings.png`, fullPage: true, animations: 'disabled' })
})
