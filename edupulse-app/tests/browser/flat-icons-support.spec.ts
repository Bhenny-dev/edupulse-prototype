import { test, expect } from '../snapshots/fixtures'
import { adminReloadUI } from '../admin-reload-fixture'
import { expectFlatIcons, iconScene } from '../flat-icons-ui'

for (const role of ['dean', 'associate_dean', 'instructor', 'student'] as const) test(`Admin ${role} support retains flat icons on reload`, async ({ page }) => {
  test.setTimeout(60000)
  const fixture = await adminReloadUI(page, role)
  await page.goto('/#' + iconScene[role])
  await expectFlatIcons(page, true)
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark-mode/)
  await page.reload(); await expectFlatIcons(page, true)
  expect(fixture.calls.filter(call => call.action === 'support' && call.method === 'POST')).toEqual([])
})

test('shared icon glyphs retain at least 3:1 contrast in both themes', async ({ page }) => {
  const { flatIconsUI } = await import('../flat-icons-ui')
  await flatIconsUI(page, 'admin')
  await page.goto('/#/dashboard'); await expectFlatIcons(page, true)
  for (const dark of [false, true]) {
    if (dark) { await page.getByRole('button', { name: 'Dark mode', exact: true }).click(); await expect(page.locator('html')).toHaveClass(/dark-mode/) }
    const contrast = await page.locator('.glass-icon').evaluateAll(elements => {
      const ctx = document.createElement('canvas').getContext('2d')!
      const luminance = (color: string) => {
        ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1)
        const values = Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3).map(v => { const x = v / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4 })
        return values[0] * .2126 + values[1] * .7152 + values[2] * .0722
      }
      return elements.map(el => { const s = getComputedStyle(el), ink = luminance(s.color), bg = luminance(s.backgroundColor); return (Math.max(ink, bg) + .05) / (Math.min(ink, bg) + .05) })
    })
    for (const ratio of contrast) expect(ratio).toBeGreaterThanOrEqual(3)
  }
})
