import { test } from './fixtures'
import { mkdir } from 'node:fs/promises'
import { providerLoading, recordLoading, directoryLoading, pulseLoading, modalLoading, systemLoading } from '../loading-feedback-fixture'
const root = '../feature-documentation/system-manual/19-loading-and-saved-connections'
for (const [name, run] of [['providers', providerLoading], ['records and popover', recordLoading], ['student directory', directoryLoading], ['Pulse', pulseLoading], ['approved file modal', modalLoading], ['system console', systemLoading]] as const) {
  test(`loading feedback: ${name}`, async ({ page }) => {
    await mkdir(root, { recursive: true })
    await run(page, async (name, selector) => {
      await (selector ? page.locator(selector) : page).screenshot({ path: `${root}/${name}.png`, animations: 'disabled', style: '.app-topbar{position:static !important}.connected-pulse-dock{visibility:hidden !important}' })
    })
  })
}
