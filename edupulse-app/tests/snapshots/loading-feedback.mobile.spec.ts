import { test } from './fixtures'
import { mkdir } from 'node:fs/promises'
import { providerLoading, pulseLoading } from '../loading-feedback-fixture'
const root = '../feature-documentation/system-manual/19-loading-and-saved-connections'
for (const [name, run] of [['providers', providerLoading], ['Pulse', pulseLoading]] as const) {
  test(`mobile loading feedback: ${name}`, async ({ page }) => {
    await mkdir(root, { recursive: true })
    await run(page, async (name, selector) => {
      if (!['02-provider-test', '06-pulse-thinking'].includes(name)) return
      await (selector ? page.locator(selector) : page).screenshot({ path: `${root}/mobile-${name}.png`, animations: 'disabled', style: '.app-topbar{position:static !important}.connected-pulse-dock{visibility:hidden !important}' })
    })
  })
}
