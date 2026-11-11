import { expect, type Page } from '@playwright/test'
import { providerFixture } from './browser/provider-fixture'
import { academicUI } from './academic-ui-fixture'
import { directoryFixture } from './student-directory-fixture'
import { restorationUI } from './role-restoration-fixture'
import { makePdf } from './fixtures'

export type Capture = (name: string, selector?: string) => Promise<void>
const noCapture: Capture = async () => {}
function gate() { let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve }); return { pending, release } }
async function preview(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
}
export async function providerLoading(page: Page, capture = noCapture) {
  await providerFixture(page)
  await academicUI(page, async () => ({ json: {} }))
  const initial = gate()
  await page.route('**/api/ai?action=*', async route => {
    if (['providers', 'health'].includes(new URL(route.request().url()).searchParams.get('action') || '') && route.request().method() === 'GET') await initial.pending
    return route.fallback()
  })
  try {
    await page.goto('/#/settings?tab=ai-provider')
    await expect(page.getByRole('region', { name: 'Loading saved AI connections…' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Checking AI services…' })).toBeVisible()
    await capture('01-provider-loading', '[data-pulse-target="AI connection"]')
  } finally { initial.release() }
  await page.getByRole('button', { name: 'Connect OpenAI API', exact: true }).click()
  await page.getByLabel('Provider API key', { exact: true }).fill('synthetic-provider-key-for-ui')
  await page.getByRole('button', { name: 'Connect and load models', exact: true }).click()
  await expect(page.getByLabel('Saved provider credential')).toBeVisible()
  const test = gate()
  await page.route('**/api/ai?action=provider-test', async route => { await test.pending; return route.fallback() })
  try {
    await page.getByRole('button', { name: 'Test selected model', exact: true }).click()
    const button = page.getByRole('button', { name: 'Test selected model', exact: true })
    await expect(button).toBeDisabled()
    await expect(button.locator('.loading-spinner')).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Testing selected model' })).toBeVisible()
    await capture('02-provider-test', '[data-pulse-target="AI connection"]')
  } finally { test.release() }
  await expect(page.getByRole('button', { name: 'Test selected model', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Connect Claude API', exact: true }).click()
  await page.getByLabel('Provider API key', { exact: true }).fill('synthetic-provider-key-claude')
  await page.getByRole('button', { name: 'Connect and load models', exact: true }).click()
  await expect(page.getByText('Saved to your account:', { exact: false })).toContainText('openai, anthropic (active)')
  await page.reload()
  await expect(page.getByLabel('AI provider', { exact: true })).toHaveValue('anthropic')
  await expect(page.getByLabel('Saved provider credential')).toBeVisible()
  await capture('03-saved-connections', '[data-pulse-target="AI connection"]')
  await page.getByRole('button', { name: 'Connect OpenAI API', exact: true }).click()
  await page.getByRole('button', { name: 'Use saved connection', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Refresh models', exact: true })).toBeEnabled()
  await expect(page.getByText('ChatGPT plan', { exact: true })).toBeVisible()
  await page.getByText('Connection details', { exact: true }).click()
  await expect(page.getByRole('link', { name: 'ChatGPT connection requirements' })).toHaveAttribute('href', 'https://developers.openai.com/siwc/token-sharing-open-source')
}
export async function recordLoading(page: Page, capture = noCapture) {
  const held = gate()
  await academicUI(page, async () => { await held.pending; return { json: { courses: [], publications: [], enrollments: [], attempts: [], accesses: [] } } })
  try {
    await page.goto('/#/dashboard')
    await expect(page.getByRole('region', { name: 'Loading academic records' })).toBeVisible()
    await page.getByRole('button', { name: 'Notifications', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Loading notifications…' })).toBeVisible()
    await capture('04-notification-loading')
  } finally { held.release() }
  await expect(page.getByRole('region', { name: 'Loading notifications…' })).toHaveCount(0)
}
export async function directoryLoading(page: Page, capture = noCapture) {
  await directoryFixture(page)
  const held = gate(), requested = gate()
  await page.route(url => url.pathname === '/api/ai' && url.searchParams.get('action') === 'students', async route => { requested.release(); await held.pending; return route.fallback() })
  try {
    await page.goto('/#/syllabus?tab=register')
    await page.getByRole('button', { name: 'Choose students', exact: true }).click()
    await requested.pending
    await expect(page.getByRole('region', { name: 'Official student directory' }).getByRole('region', { name: 'Loading students…' })).toBeVisible()
    await capture('05-directory-loading', '[aria-label="Official student directory"]')
  } finally { held.release() }
  await expect(page.getByText('Riley Demo', { exact: true })).toBeVisible()
}
export async function pulseLoading(page: Page, capture = noCapture) {
  await providerFixture(page); await preview(page)
  await page.goto('/#/settings?tab=ai-provider')
  await page.getByRole('button', { name: 'Connect OpenAI API', exact: true }).click()
  await page.getByLabel('Provider API key', { exact: true }).fill('synthetic-provider-key-for-ui')
  await page.getByRole('button', { name: 'Connect and load models', exact: true }).click()
  await expect(page.getByLabel('Saved provider credential')).toBeVisible()
  await page.goto('/#/dashboard')
  const held = gate()
  await page.route('**/api/ai?action=chat', async route => {
    await held.pending
    return route.fulfill({ json: { requestId: 'synthetic-loading-reply', answer: 'Synthetic reply after the pending request.', mode: 'generated', grounding: 'general', sources: [], agents: [], citations: [] } })
  })
  await page.getByRole('button', { name: 'Open Pulse assistant', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Pulse', exact: true })
  try {
    await page.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('Explain how a variable stores a value.')
    await page.getByRole('button', { name: 'Send', exact: true }).click()
    await expect(dialog.locator('.loading-dots')).toBeVisible()
    await expect(dialog.getByRole('status').filter({ hasText: 'Thinking' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Stop response', exact: true })).toBeEnabled()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await dialog.locator('.loading-dots i').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none')
    await capture('06-pulse-thinking', '[data-pulse-ui="panel"]')
    await page.evaluate(() => document.documentElement.classList.add('dark-mode'))
    await capture('07-pulse-thinking-dark', '[data-pulse-ui="panel"]')
  } finally { held.release() }
  await expect(dialog).toContainText('Synthetic reply after the pending request.')
  await expect(dialog.locator('.loading-dots')).toHaveCount(0)
}
export async function modalLoading(page: Page, capture = noCapture) {
  const fixture = await restorationUI(page)
  fixture.setWorkspace({ syllabi: [{ id: 'synthetic-syllabus', courseCode: 'IT 102', courseTitle: 'Computer Programming 1', instructorId: 'fe67b9d2-719b-4b10-91cd-76031ab115fe', status: 'downloaded_for_approval', courseOutline: [] }], content: {}, registrations: [] })
  // Hold native file reading, then run the real checksum/parser on a real PDF.
  await page.addInitScript(() => {
    const original = File.prototype.arrayBuffer
    let release!: () => void
    const pending = new Promise<void>(resolve => { release = resolve })
    Object.assign(window, { releaseSyntheticFile: release })
    File.prototype.arrayBuffer = async function () { if (this.name === 'synthetic-approved.pdf') await pending; return original.call(this) }
  })
  await page.goto('/#/syllabus?tab=mine')
  await page.getByRole('button', { name: 'Upload Approved File', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Upload approved syllabus', exact: true })
  await dialog.getByRole('checkbox').check()
  const pdf = makePdf([['Section 1: Course Information', 'Course Code: IT 102', 'Course Title: Computer Programming 1', 'Section 5: Course Outline', 'Week 1', 'ILOs: Explain variable declarations.', 'Topics: Variables and assignment']])
  try {
    await dialog.getByLabel('Approved DOCX or PDF', { exact: true }).setInputFiles({ name: 'synthetic-approved.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf) })
    await expect(dialog.getByRole('status')).toContainText('Reading approved file')
    await expect(dialog.locator('.loading-spinner')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
    await capture('08-approved-file-loading', '[role="dialog"][aria-label="Upload approved syllabus"]')
  } finally { await page.evaluate(() => (window as unknown as { releaseSyntheticFile: () => void }).releaseSyntheticFile()) }
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Extract Outline', exact: true })).toBeVisible()
}
export async function systemLoading(page: Page, capture = noCapture) {
  await providerFixture(page)
  await academicUI(page, async () => ({ json: {} }), 'admin')
  const held = gate()
  await page.route('https://*.supabase.co/rest/v1/rpc/**', async route => {
    await held.pending
    return route.fulfill({ json: route.request().url().endsWith('edupulse_admin_overview') ? { accounts: [], appEvents: [], authEvents: [] } : { totals: { runs: 0, declined: 0, failed: 0, avgMs: 0 }, byAgent: [], byRule: [], recent: [] } })
  })
  try {
    await page.goto('/#/dashboard')
    await expect(page.getByRole('region', { name: 'Loading system overview' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Loading role coverage' })).toBeVisible()
    await capture('09-system-loading')
  } finally { held.release() }
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled()
}
