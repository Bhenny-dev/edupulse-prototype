import { test, expect } from '../snapshots/fixtures'
import { classroomSupportUI, expectClassColumns } from '../classroom-support-ui'

for (const support of [false, true]) test(`class codes and the announcements feed fit their columns (${support ? 'Admin support' : 'instructor'})`, async ({ page, isMobile }) => {
  test.setTimeout(60000)
  const fixture = await classroomSupportUI(page, support)
  await page.goto('/#/dashboard?course=IT%20201&tab=announcements')
  const code = page.getByLabel('Class code of block BSIT-2A: P 4 Q 8 R S T')
  await expect(code).toBeVisible()
  for (const width of isMobile ? [390, 640] : [1920, 1440, 1024, 900]) {
    await page.setViewportSize({ width, height: 900 })
    await expectClassColumns(page)
  }
  await page.getByRole('button', { name: 'Display the class code of block BSIT-2A', exact: true }).click()
  const display = page.getByRole('dialog', { name: 'Class code display, IT 201 block BSIT-2A', exact: true })
  await expect(display).toContainText('P4Q8RST')
  await page.reload()
  await expect(display).toContainText('P4Q8RST')
  expect(fixture.writes).toEqual([])
  await page.getByRole('button', { name: 'Class code actions for block BSIT-2A', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Replace code', exact: true }).click()
  await page.reload()
  const confirmation = page.getByRole('dialog', { name: 'Replace class code', exact: true })
  await expect(confirmation).toBeVisible()
  expect(fixture.writes).toEqual([])
  await confirmation.getByRole('button', { name: 'Replace code', exact: true }).click()
  await expect(display).toContainText('H3J5KMN')
  expect(fixture.writes).toHaveLength(1)
  await page.reload()
  await expect(display).toContainText('H3J5KMN')
  expect(fixture.writes).toHaveLength(1)
  await page.keyboard.press('Escape')
  fixture.records.classCodes = []
  await page.reload()
  await expect(page.getByRole('button', { name: 'Create code', exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Class code unavailable')).toBeVisible({ timeout: 15000 })
  await expectClassColumns(page)
})
