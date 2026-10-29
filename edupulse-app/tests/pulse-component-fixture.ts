import { expect, type Page, type Locator } from '@playwright/test'

export async function componentBuilder(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto('/#/syllabus?tab=builder')
  await page.getByLabel('Course', { exact: true }).selectOption('IT 104')
  const first = page.locator('[data-pulse-field="programOutcomes.0"]')
  await first.fill('Original first outcome')
  if (await page.locator('[data-pulse-field="programOutcomes.1"]').count() === 0) await page.getByRole('button', { name: 'Add Program Outcome', exact: true }).click()
  await page.locator('[data-pulse-field="programOutcomes.1"]').fill('Keep this neighboring outcome')
  return first
}

export async function focusComponent(page: Page, field: Locator, touch = false) {
  await field.scrollIntoViewIfNeeded()
  const mascot = page.locator('[data-pulse-ui="mascot"]')
  const a = (await mascot.boundingBox())!, b = (await field.boundingBox())!
  const x = a.x + a.width / 2, y = a.y + a.height / 2, endX = b.x + Math.min(30, b.width / 2), endY = b.y + b.height / 2
  if (touch) {
    const session = await page.context().newCDPSession(page)
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
    for (let i = 1; i <= 12; i++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (endX - x) * i / 12, y: y + (endY - y) * i / 12, id: 1 }] })
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await session.detach()
  } else {
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(endX, endY, { steps: 15 }); await page.mouse.up()
  }
  const pulse = page.getByRole('dialog', { name: 'Pulse', exact: true })
  await expect(pulse.locator('.pulse-focus-heading')).toBeVisible()
  return pulse
}

export async function exampleFieldModel(page: Page) {
  const requests: { section: string; context: string; editor: { data: { programOutcomes: string[] } } }[] = []
  await page.route('**/api/ai?action=operator', async route => {
    const input = route.request().postDataJSON(); requests.push(input)
    await route.fulfill({ json: { patch: { programOutcomes: input.editor.data.programOutcomes.map((_: string, i: number) => i ? 'Unrelated replacement must not apply' : 'Formulate a research question and justify an appropriate method.') }, generated: true, requiresConfirmation: true, notes: ['Synthetic model proposal for UI validation; instructor review required.'] } })
  })
  return requests
}

export async function fileTransfer(page: Page, files: { name: string; text: string; type?: string }[]) {
  return page.evaluateHandle(items => { const transfer = new DataTransfer(); for (const file of items) transfer.items.add(new File([file.text], file.name, { type: file.type || 'text/plain' })); return transfer }, files)
}
