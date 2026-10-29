import { test, expect } from './fixtures.js'

test('Workspace buddies: real office, domain conversations and model proposal states', async ({ page }) => {
  const dir = '../feature-documentation/system-manual/11-workspace-buddies'
  await page.route('**/api/ai?action=chat', route => route.fulfill({ json: { requestId: crypto.randomUUID(), mode: 'generated', answer: 'I can help you compare the selected section with your PDF, keeping the wrapped text together. Which week would you like us to check first?', sources: [] } }))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto('/#/syllabus?tab=builder')
  await page.getByLabel('Course', { exact: true }).selectOption('IT 102')
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  await page.getByRole('button', { name: 'Pulse options', exact: true }).click(); await page.getByRole('button', { name: 'Open workspace buddies' }).click()
  const office = page.getByRole('dialog', { name: 'Meet your crew.' })
  await expect(office.locator('canvas')).toBeVisible()
  await office.getByRole('button', { name: /Talk to Luma,/ }).click()
  await office.getByRole('button', { name: 'Your role', exact: true }).click()
  await expect(office.getByRole('log')).toContainText('Which week would you like us to check first?')
  await page.waitForTimeout(400) // one static reduced-motion render
  await office.screenshot({ path: `${dir}/01-meet-the-crew.png`, animations: 'disabled' })
  await office.getByRole('button', { name: 'Close workspace' }).click()
  // Synthetic delayed provider transport; actual UI, tool validation and event states.
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/ai?action=operator', async route => {
    await gate
    await route.fulfill({ json: { patch: { programOutcomes: ['Explain variables with a worked example.'] }, generated: true, requiresConfirmation: true } })
  })
  await page.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('Revise the program outcomes to emphasize worked examples')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.locator('.pulse-loading')).toBeVisible()
  await page.getByRole('dialog', { name: 'Pulse', exact: true }).screenshot({ path: `${dir}/02-contextual-loading.png`, animations: 'disabled' })
  await page.getByRole('button', { name: 'Pulse options', exact: true }).click(); await page.getByRole('button', { name: 'Open workspace buddies' }).click()
  await expect(office).toContainText('1 at work')
  await page.waitForTimeout(400)
  await office.screenshot({ path: `${dir}/03-working-and-review.png`, animations: 'disabled' })
  release()
  await expect(office).toContainText('1 request awaiting your review')
  await office.getByRole('button', { name: 'Close workspace' }).click()
  await expect(page.getByRole('region', { name: 'Review content edit' })).toBeVisible()
})
