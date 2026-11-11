import { test, expect, type Page, type Locator } from './fixtures.js'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

// Captures the System Manual screenshots for feature-documentation/system-manual.
// Captures use the production build. Source-answer scenes retain real extraction,
// embeddings/reranking and local-model or explicitly labelled excerpt responses.
const ROOT = '../feature-documentation/system-manual'
test.describe.configure({ mode: 'serial' })

const problems: string[] = []
async function shot(target: Page | Locator, folder: string, name: string) {
  if (process.env.SNAPSHOT_SCENES && !new RegExp(process.env.SNAPSHOT_SCENES).test(`${folder}/${name}`)) return
  await mkdir(`${ROOT}/${folder}`, { recursive: true })
  // Component shots: the sticky top bar is made static only while capturing, so it never covers the component.
  const component = !('goto' in target)
  await target.screenshot({ path: `${ROOT}/${folder}/${name}.png`, animations: 'disabled', ...(component ? { style: '.app-topbar{position:static !important}' } : {}) })
}
async function signIn(page: Page) {
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`))
  page.on('console', message => { if (message.type() === 'error' && /Content Security Policy|Refused to/.test(message.text())) problems.push(`csp: ${message.text()}`) })
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)
}
async function ask(page: Page, question: string) {
  const dialog = page.getByRole('dialog', { name: 'Pulse', exact: true })
  if (!await dialog.isVisible()) await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  await page.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill(question)
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  const answer = dialog.locator('.connected-pulse-message').last()
  await expect(dialog.getByRole('button', { name: 'Send', exact: true })).toBeVisible({ timeout: 540_000 })
  return answer
}

test('AI pipeline status and free providers', async ({ page }) => {
  await signIn(page)
  await page.goto('/#/settings?tab=ai-provider')
  await expect(page.getByText('Last checked:')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText('Loaded in memory').or(page.getByText('Bundled with the app')).first()).toBeVisible()
  await shot(page.locator('[data-pulse-target="AI pipeline status"]'), '08-ai-connections', '01-pipeline-status')
  await page.getByLabel('AI provider', { exact: true }).selectOption('openrouter')
  await shot(page.locator('[data-pulse-target="AI connection"]'), '08-ai-connections', '02-free-provider-options')
  await page.getByLabel('AI provider', { exact: true }).selectOption('browser')
  await shot(page.locator('[data-pulse-target="AI connection"]'), '08-ai-connections', '03-on-device-model')
})

test('agentic answer with verification, citations and agent timeline', async ({ page, request }) => {
  await page.addInitScript(() => localStorage.setItem('edupulse-inference', 'server'))
  await signIn(page)
  // The removed settings upload scene no longer seeds this source. Keep the
  // retained answer scene independently usable in a fresh local capture workspace.
  const health = await (await request.get('/api/ai?action=health')).json()
  expect(health.identity.mode).toBe('local-workspace')
  const { documents } = await (await request.get('/api/ai?action=documents')).json()
  if (!documents.some((document: { file_name: string }) => document.file_name === 'Blooms_taxonomy.pdf')) {
    const extracted = await request.post('/api/ai?action=extract', { data: await readFile('.data/eval-corpus/Blooms_taxonomy.pdf'), headers: { 'Content-Type': 'application/pdf', 'X-File-Name': 'Blooms_taxonomy.pdf' } })
    expect(extracted.status()).toBe(200)
    const report = await extracted.json()
    const indexed = await request.post('/api/ai?action=documents', { data: { title: "Bloom's taxonomy", text: report.text, sourceType: 'pdf', fileName: 'Blooms_taxonomy.pdf' } })
    expect(indexed.status()).toBe(201)
  }
  const retained = await (await request.get('/api/ai?action=documents')).json()
  const source = retained.documents.find((document: { file_name: string }) => document.file_name === 'Blooms_taxonomy.pdf')
  expect(source?.id).toBeTruthy()
  // Supply the same explicit source scope used by Pulse's retained-file actions.
  // The removed library picker cannot provide that scope to this capture anymore.
  await page.route('**/api/ai?action=chat', route => route.continue({ postData: JSON.stringify({ ...route.request().postDataJSON(), documentIds: [source.id], task: 'summarize', grounding: 'sources' }) }))
  await page.goto('/#/settings?tab=ai-provider')
  const answer = await ask(page, "Using the Bloom's taxonomy document in my knowledge library, who chaired its committee and what are the levels of the revised cognitive domain? Cite that document.")
  await expect(answer.locator('.aa-source').first()).toBeAttached({ timeout: 30_000 })
  await answer.getByText('Verification details', { exact: true }).click()
  await expect(answer.locator('.aa-badges')).toBeVisible()
  const panel = page.getByRole('dialog', { name: 'Pulse', exact: true })
  await shot(panel, '05-ask-pulse', '01-verified-answer')
  const cite = answer.getByRole('button', { name: /Open source \d/ }).first()
  if (await cite.count()) { await cite.click(); await expect(answer.locator('.aa-source.is-open')).toBeVisible() }
  else await answer.getByText(/^Sources \(/).click()
  await shot(panel, '05-ask-pulse', '02-citation-opens-source')
  await answer.getByText(/How Pulse worked on this/).click()
  await answer.locator('.aa-timeline').scrollIntoViewIfNeeded()
  await shot(panel, '05-ask-pulse', '03-agent-timeline')
  if (await answer.getByText('Response actions', { exact: true }).count()) await answer.getByText('Response actions', { exact: true }).click()
  const revise = answer.getByRole('button', { name: 'Request a revision' })
  if (await revise.count()) {
    await revise.click()
    await page.getByRole('textbox', { name: 'Revision request' }).fill('Keep it to two sentences and name the year of the revision.')
    await shot(panel, '05-ask-pulse', '04-revision-request')
    await page.getByRole('button', { name: 'Revise', exact: true }).click()
    await expect(panel.getByRole('button', { name: 'Send', exact: true })).toBeVisible({ timeout: 540_000 })
    await shot(panel, '05-ask-pulse', '05-revised-answer')
  }
})

test('Pulse model proposal: revision controls with labelled synthetic transport', async ({ page }) => {
  await signIn(page)
  await page.goto('/#/settings?tab=ai-provider')
  await page.route('**/api/ai?action=chat', async route => {
    const revised = route.request().postDataJSON().message.startsWith('Revise your previous answer:')
    await route.fulfill({ json: { requestId: crypto.randomUUID(), mode: 'generated', task: 'general', answer: revised ? 'Revised synthetic preview: a variable names a stored value. This response demonstrates the revision controls only.' : 'Synthetic preview for interface validation: a variable names a stored value. This response demonstrates the revision controls only.', sources: [], agents: ['Writer'], trace: [{ agent: 'Writer', action: 'Synthetic UI validation', detail: 'Labelled fixture; no live inference or factual verification is claimed.', status: 'done', ms: 0 }] } })
  })
  const answer = await ask(page, 'Explain a variable briefly')
  await answer.getByText('Response actions', { exact: true }).click()
  await answer.getByRole('button', { name: 'Request a revision', exact: true }).click()
  await page.getByRole('textbox', { name: 'Revision request', exact: true }).fill('Keep this explanation to two sentences.')
  const panel = page.getByRole('dialog', { name: 'Pulse', exact: true })
  await shot(panel, '05-ask-pulse', '04-revision-request')
  await page.getByRole('button', { name: 'Revise', exact: true }).click()
  await expect(panel).toContainText('Revised synthetic preview:')
  await shot(panel, '05-ask-pulse', '05-revised-answer')
})

test('find real references in open catalogs', async ({ page }) => {
  await signIn(page)
  const panel = page.getByRole('dialog', { name: 'Pulse', exact: true })
  const references = await ask(page, 'Find books and readings about data structures for my course.')
  await expect(references.locator('.aa-refs')).toBeVisible()
  await references.evaluate(el => el.scrollIntoView({ block: 'start' }))
  await shot(panel, '06-compare-and-references', '04-open-catalog-references')
})

test('Pulse guidance: drag, focus, perch, section tour and rejection', async ({ page }) => {
  test.setTimeout(60_000)
  await signIn(page)
  await page.goto('/#/syllabus?tab=builder')
  const mascot = page.locator('[data-pulse-ui="mascot"]')
  const control = page.getByRole('combobox', { name: 'Course', exact: true })
  await control.scrollIntoViewIfNeeded()
  let from = (await mascot.boundingBox())!, to = (await control.boundingBox())!
  await page.mouse.move(from.x + 30, from.y + 30); await page.mouse.down()
  await page.mouse.move(to.x + 40, to.y + 15, { steps: 20 })
  await expect(page.locator('.pulse-drag-hint')).toContainText('Help with')
  await shot(page, '07-pulse-guidance', '01-dragging-over-component')
  await page.mouse.up()
  await expect(page.locator('.pulse-focus-heading strong')).toHaveText('Course')
  await page.waitForTimeout(400)
  await shot(page, '07-pulse-guidance', '02-focused-component-brief')
  await page.getByRole('button', { name: 'Exit focused help', exact: true }).click()
  await page.getByRole('button', { name: 'Close Pulse', exact: true }).click()
  const heading = page.locator('[data-section="1"] h3')
  await heading.evaluate(element => window.scrollTo({ top: scrollY + element.getBoundingClientRect().top - 110 }))
  from = (await mascot.boundingBox())!; to = (await heading.boundingBox())!
  await page.mouse.move(from.x + 30, from.y + 30); await page.mouse.down(); await page.mouse.move(to.x + 20, to.y + 10, { steps: 15 }); await page.mouse.up()
  await page.getByRole('button', { name: 'Pulse options', exact: true }).click(); await page.getByRole('button', { name: 'Guide selected component', exact: true }).click()
  await page.getByRole('button', { name: 'Walk me through Course Information', exact: true }).click()
  await expect(page.getByText(/Step 1 of \d+/)).toBeVisible()
  await page.waitForTimeout(400)
  await shot(page, '07-pulse-guidance', '03-section-tour-waits-for-input')
  await control.selectOption('IT 102')
  await page.getByRole('button', { name: 'Next step' }).click()
  await page.waitForTimeout(400)
  await shot(page, '07-pulse-guidance', '04-section-tour-next-control')
  await page.getByRole('button', { name: 'Exit walkthrough' }).click()
  await page.getByRole('button', { name: 'Close Pulse', exact: true }).click()
  from = (await mascot.boundingBox())!
  await page.mouse.move(from.x + 30, from.y + 30); await page.mouse.down(); await page.mouse.move(20, 20, { steps: 15 }); await page.mouse.up()
  await expect(page.locator('.pulse-reject-bubble')).toBeVisible()
  await shot(page, '07-pulse-guidance', '05-drop-rejected-with-reason')
})

test.afterAll(async () => {
  await mkdir(ROOT, { recursive: true })
  await writeFile(`${ROOT}/capture-log.json`, `${JSON.stringify({ capturedAt: new Date().toISOString(), problems }, null, 2)}\n`)
  expect(problems, 'The production build must run without page errors or CSP violations').toEqual([])
})
