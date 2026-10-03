import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto('/#/syllabus?tab=builder')
})

test('mascot follows the cursor, distinguishes a click from dragging, and focuses the dropped component', async ({ page }) => {
  const mascot = page.getByRole('button', { name: 'Open Pulse assistant' })
  await page.mouse.move(5, 200)
  await expect.poll(() => page.locator('.pulse-character').evaluate(el => (el as HTMLElement).style.getPropertyValue('--look-x'))).not.toBe('0px')
  const firstLook = await page.locator('.pulse-character').evaluate(el => (el as HTMLElement).style.getPropertyValue('--look-y'))
  await page.mouse.move(200, 10)
  await expect.poll(() => page.locator('.pulse-character').evaluate(el => (el as HTMLElement).style.getPropertyValue('--look-y'))).not.toBe(firstLook)
  await mascot.click()
  await expect(page.getByRole('dialog', { name: 'Pulse', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Close Pulse', exact: true }).click()
  const control = page.getByLabel('Course', { exact: true })
  await control.scrollIntoViewIfNeeded()
  const a = (await mascot.boundingBox())!, b = (await control.boundingBox())!
  await page.mouse.move(a.x + 30, a.y + 30); await page.mouse.down()
  await page.mouse.move(b.x + 30, b.y + 15, { steps: 15 }); await page.mouse.up()
  await expect(page.getByText('What would you like to do here?', { exact: true })).toBeVisible()
  await expect(page.locator('.pulse-focus-heading')).toContainText('Course')
  await expect(page.locator('.pulse-spotlight')).toBeVisible()
  await expect(page.locator('.pulse-brief')).toContainText('dropdown')
  await expect(page.locator('.pulse-brief')).toContainText('Nothing selected yet')
  if (test.info().project.name === 'desktop') {
    // The dock's accessible name becomes "Close Pulse assistant" while the panel is open,
    // and Pulse hops (260 ms) from the drop point to its perch beside the field.
    await expect.poll(async () => {
      const dock = (await page.locator('[data-pulse-ui="mascot"]').boundingBox())!, target = (await control.boundingBox())!
      return dock.x >= target.x + target.width - 1 || dock.x + dock.width <= target.x + 1
    }).toBe(true)
  }
  await page.getByRole('button', { name: 'Exit focused help', exact: true }).click()
  await expect(page.locator('.pulse-spotlight')).toHaveCount(0)
})

test('guiding a whole page keeps the panel clear of the perched mascot', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'The panel is a bottom sheet on narrow screens.')
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  await page.getByRole('button', { name: 'Guide this page', exact: true }).click()
  await expect(page.locator('.pulse-focus-heading')).toBeVisible()
  await expect.poll(async () => {
    const m = (await page.locator('[data-pulse-ui="mascot"]').boundingBox())!, p = (await page.locator('[data-pulse-ui="panel"]').boundingBox())!
    return m.x + m.width <= p.x || p.x + p.width <= m.x || m.y + m.height <= p.y || p.y + p.height <= m.y
  }).toBe(true)
})

test('section tour reads visible controls and waits for input', async ({ page }) => {
  const mascot = page.getByRole('button', { name: 'Open Pulse assistant' })
  const heading = page.locator('[data-section="1"] h3')
  await heading.scrollIntoViewIfNeeded()
  const from = (await mascot.boundingBox())!, to = (await heading.boundingBox())!
  await page.mouse.move(from.x + 30, from.y + 30)
  await page.mouse.down()
  await page.mouse.move(to.x + 20, to.y + 10, { steps: 15 })
  await page.mouse.up()
  await expect(page.locator('.pulse-focus-heading')).toContainText('Course Information')
  await page.getByRole('button', { name: 'Walk me through Course Information', exact: true }).click()
  await expect(page.getByText(/Step 1 of \d+/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next step' })).toBeDisabled()
  await page.getByLabel('Course', { exact: true }).selectOption('IT 102')
  await page.getByRole('button', { name: 'Next step' }).click()
  await expect(page.getByText(/Step 2 of \d+/)).toBeVisible()
  // Course Title auto-fills from the selected course; the step must describe its current state.
  await expect(page.locator('.pulse-step p').first()).toContainText('Filled')
  await expect(page.locator('.pulse-step strong')).not.toContainText('*')
})

test('keyboard walkthrough waits for real input and save, then completes', async ({ page }) => {
  test.setTimeout(60000)
  await page.getByLabel('Course', { exact: true }).focus()
  await page.keyboard.press('Alt+p')
  await page.getByRole('button', { name: 'Build a new syllabus', exact: true }).click()
  await expect(page.getByText('Step 1 of 6 · Build a new syllabus')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next step', exact: true })).toBeDisabled()
  await page.getByLabel('Course', { exact: true }).selectOption('IT 102')
  await page.getByRole('button', { name: 'Next step', exact: true }).click()
  await page.getByRole('button', { name: 'Next step', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Next step', exact: true })).toBeDisabled()
  await page.getByPlaceholder('Learning outcome...', { exact: true }).first().fill('Explain bounded loops and demonstrate a stopping condition.')
  await page.getByPlaceholder('Topic...', { exact: true }).first().fill('Bounded loops')
  await page.getByRole('button', { name: 'Next step', exact: true }).click()
  await page.getByRole('button', { name: 'Next step', exact: true }).click()
  await page.getByRole('button', { name: 'Next step', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Finish walkthrough', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Save as Drafted', exact: true }).click()
  await page.getByRole('button', { name: 'Finish walkthrough', exact: true }).click()
  await expect(page.getByText('Task recorded. Walkthrough complete.', { exact: true })).toBeVisible()
  await expect(page.locator('.pulse-spotlight')).toHaveCount(0)
})

test('invalid drop returns to the dock and reduced motion disables cursor animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const mascot = page.getByRole('button', { name: 'Open Pulse assistant' })
  const a = (await mascot.boundingBox())!
  await page.mouse.move(a.x + 30, a.y + 30); await page.mouse.down(); await page.mouse.move(15, 10, { steps: 10 }); await page.mouse.up()
  await expect(page.getByRole('dialog', { name: 'Pulse', exact: true })).toHaveCount(0)
  await expect(mascot).not.toHaveAttribute('style', /left: \d/)
  expect(await page.locator('.pulse-pupils').evaluate(el => getComputedStyle(el).transform)).toBe('none')
  expect(await page.locator('.pulse-eye-blink').evaluate(el => getComputedStyle(el).animationName)).toBe('none')
})

test('touch drag opens focused guidance on a form control', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile')
  const control = page.getByLabel('Course', { exact: true })
  await control.scrollIntoViewIfNeeded()
  const mascot = page.getByRole('button', { name: 'Open Pulse assistant' })
  const from = (await mascot.boundingBox())!, to = (await control.boundingBox())!
  const client = await page.context().newCDPSession(page)
  const point = (x: number, y: number) => [{ x, y, id: 1 }]
  const startX = from.x + 30, startY = from.y + 30, endX = to.x + 30, endY = to.y + 15
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(startX, startY) })
  for (let i = 1; i <= 10; i++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(startX + (endX - startX) * i / 10, startY + (endY - startY) * i / 10) })
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(page.locator('.pulse-focus-heading')).toContainText('Course')
  await expect(page.getByRole('button', { name: 'Build a new syllabus', exact: true })).toBeVisible()
})

test('provider settings expose real connections, model discovery and local download controls', async ({ page }) => {
  await page.goto('/#/settings?tab=ai-provider')
  await expect(page.getByRole('heading', { name: 'Pulse AI connection', exact: true })).toBeVisible()
  await expect(page.getByLabel('On-device model')).toBeVisible()
  await expect(page.getByText(/about 1 GB/)).toBeVisible()
  await page.getByLabel('AI provider', { exact: true }).selectOption('openai')
  await expect(page.getByLabel('Provider API key')).toHaveAttribute('type', 'password')
  await expect(page.getByRole('button', { name: 'Connect and load models' })).toBeDisabled()
  await page.getByLabel('AI provider', { exact: true }).selectOption('ollama')
  const catalog = await page.request.get('/api/ai?action=providers')
  expect(catalog.status()).toBe(200)
  expect(JSON.stringify(await catalog.json())).not.toContain('apiKey')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
})
