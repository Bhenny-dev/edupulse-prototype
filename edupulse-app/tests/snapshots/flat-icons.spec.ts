import { test, expect } from './fixtures'
import { flatIconsUI, expectFlatIcons, iconRoles, iconScene } from '../flat-icons-ui'
const folder = '../feature-documentation/system-manual/53-flat-interface-icons'
for (const role of iconRoles) test(`flat icons for ${role}`, async ({ page }) => {
  await flatIconsUI(page, role)
  await page.goto('/#' + iconScene[role]); await expectFlatIcons(page, true)
  await page.screenshot({ path: `${folder}/${role}.png`, animations: 'disabled' })
  if (role === 'admin' || role === 'student') {
    await page.getByRole('button', { name: 'Dark mode', exact: true }).click(); await expect(page.locator('html')).toHaveClass(/dark-mode/); await expectFlatIcons(page, true)
    await page.screenshot({ path: `${folder}/${role}-dark.png`, animations: 'disabled' })
  }
})

test('flat public feature card icon', async ({ page }) => {
  await page.goto('/#/features')
  await page.getByRole('group', { name: 'Things in the room' }).getByRole('button', { name: 'Records', exact: true }).click()
  const card = page.locator('.ps-card.is-detail').first()
  await expect(card.locator('.ps-card-icon')).toBeVisible()
  await card.scrollIntoViewIfNeeded()
  await card.screenshot({ path: `${folder}/public-features.png`, animations: 'disabled' })
})

test('flat syllabus upload icon', async ({ page }) => {
  await flatIconsUI(page, 'instructor')
  await page.goto('/#/syllabus?tab=builder')
  const zone = page.locator('.upload-zone').first(), icon = zone.locator('.upload-zone-icon')
  await expect(icon).toBeVisible()
  expect(await icon.evaluate(el => ({ image: getComputedStyle(el).backgroundImage, animation: getComputedStyle(el).animationName }))).toEqual({ image: 'none', animation: 'none' })
  await zone.screenshot({ path: `${folder}/upload.png`, animations: 'disabled' })
})
