import { test, expect } from '../snapshots/fixtures'
import { flatIconsUI, expectFlatIcons, iconRoles, iconRoutes, iconScene } from '../flat-icons-ui'

for (const role of iconRoles) test(`${role} pages use flat icons in both themes and after reload`, async ({ page }) => {
  test.setTimeout(120000)
  await flatIconsUI(page, role)
  for (const route of iconRoutes[role]) {
    await page.goto('/#' + route)
    await expect(page.locator('.app-topbar')).toBeVisible()
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('main').getByRole('heading').first()).toBeVisible()
    await expectFlatIcons(page)
  }
  await page.goto('/#' + iconScene[role])
  await expectFlatIcons(page, true)
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark-mode/)
  await expectFlatIcons(page, true)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark-mode/)
  await expectFlatIcons(page, true)
  const tile = page.locator('.glass-icon').first()
  const before = await tile.evaluate(el => getComputedStyle(el).transform)
  await tile.hover()
  expect(await tile.evaluate(el => getComputedStyle(el).transform)).toBe(before)
})

test('public information pages use flat icon badges', async ({ page }) => {
  test.setTimeout(120000)
  for (const route of ['/', '/features', '/how-it-works', '/roles', '/pulse', '/impact', '/colleges', '/play', '/faq', '/privacy', '/terms', '/500', '/unknown-page']) {
    await page.goto('/#' + route)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    const objects = page.getByRole('group', { name: 'Things in the room' })
    if (await objects.count()) await objects.getByRole('button').first().click()
    expect(await page.locator('.ps-card-icon,.why-icon,.promise-icon,.goal-icon').evaluateAll(elements => elements.filter(el => getComputedStyle(el).boxShadow !== 'none' || getComputedStyle(el).backgroundImage !== 'none').length)).toBe(0)
  }
})
