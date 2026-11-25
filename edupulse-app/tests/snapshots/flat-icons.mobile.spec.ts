import { test } from './fixtures'
import { flatIconsUI, expectFlatIcons, iconScene } from '../flat-icons-ui'
for (const role of ['dean', 'student'] as const) test(`flat icons for ${role} on phone`, async ({ page }) => {
  await flatIconsUI(page, role)
  await page.goto('/#' + iconScene[role]); await expectFlatIcons(page, true)
  await page.locator('.kpi-grid').first().scrollIntoViewIfNeeded()
  await page.screenshot({ path: `../feature-documentation/system-manual/53-flat-interface-icons/${role}-phone.png`, animations: 'disabled' })
})
