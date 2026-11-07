import { expect, type Page } from '@playwright/test'
import { academicUI } from './academic-ui-fixture'
import { providerFixture } from './browser/provider-fixture'

export type Shot = (name: string) => Promise<void>
const noShot: Shot = async () => {}
export async function voiceUI(page: Page, unsupported = false) {
  const provider = await providerFixture(page, { identity: { mode: 'authenticated', role: 'instructor' }, database: { ready: false, kind: 'supabase', message: 'Synthetic UI fixture' } }); provider.authorize('openai')
  await academicUI(page, async () => ({ json: {} }))
  await page.route('**/api/ai?*', route => {
    const action = new URL(route.request().url()).searchParams.get('action')
    if (action === 'conversations') return route.fulfill({ json: { threads: [], memories: [], automaticMemory: true, mode: 'cloud', saved: true } })
    if (action === 'operator') return route.fulfill({ json: { plan: { tool: 'chat' } } })
    return route.fallback()
  })
  await page.addInitScript(({ unsupported }) => {
    const state = { engines: [] as any[], starts: 0, aborts: 0, speech: null as any, spoken: [] as string[] }
    Object.assign(window, { syntheticSpeech: state })
    class Recognition {
      onstart: any; onend: any; onresult: any; onerror: any; lang = ''; continuous = false; interimResults = false
      constructor() { state.engines.push(this) }
      start() { state.starts++; queueMicrotask(() => this.onstart?.()) }
      stop() { this.onend?.() }
      abort() { state.aborts++; this.onend?.() }
    }
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: unsupported ? undefined : Recognition })
    Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: undefined })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class { text: string; constructor(text: string) { this.text = text } } })
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak(speech: any) { state.speech = speech; state.spoken.push(speech.text) }, cancel() { state.speech?.onend?.(); state.speech = null } } })
  }, { unsupported })
  let calls = 0, quota = false
  await page.route('**/api/ai?action=chat', route => {
    calls++
    if (quota) return route.fulfill({ status: 429, json: { error: { code: 'PROVIDER_CREDITS', message: 'Your OpenAI API credit balance is exhausted. Check API billing and add credits; reconnecting the same key will not restore credits.' } } })
    return route.fulfill({ json: { requestId: `synthetic-voice-${calls}`, mode: 'generated', answer: 'Ang variable ay may pangalan at value. Review your example before using it.', grounding: 'general', sources: [], agents: [] } })
  })
  await page.goto('/#/dashboard')
  await page.getByRole('button', { name: 'Open Pulse assistant', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Pulse', exact: true })
  expect(await page.evaluate(() => (window as any).syntheticSpeech.starts)).toBe(0)
  await expect(dialog.getByRole('region', { name: 'Voice controls' })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Pulse options', exact: true }).click()
  await dialog.getByRole('button', { name: 'Voice input', exact: true }).click()
  await expect(dialog.getByRole('region', { name: 'Voice controls' })).toBeVisible()
  return { dialog, calls: () => calls, quota: () => { quota = true } }
}
export async function heard(page: Page, text: string, final = true) {
  await page.evaluate(({ text, final }) => {
    const state = (window as any).syntheticSpeech, engine = state.engines.at(-1)
    engine.onresult?.({ results: [Object.assign([{ transcript: text }], { isFinal: final })] })
    if (final) void engine.onend?.()
  }, { text, final })
}
export async function reviewVoice(page: Page, shot = noShot) {
  const fixture = await voiceUI(page), { dialog } = fixture
  await expect(dialog).toContainText('Microphone off')
  await shot('01-voice-controls')
  await dialog.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('My question:')
  await dialog.getByRole('button', { name: 'Start listening', exact: true }).click()
  await heard(page, 'Explain ang variables sa Tagalog at English', false)
  await expect(dialog.getByLabel('Live voice transcript')).toContainText('Tagalog at English')
  expect(fixture.calls()).toBe(0)
  await expect(dialog.getByRole('button', { name: 'Send', exact: true })).toBeDisabled()
  await shot('02-listening-tagalog-english')
  await heard(page, 'Explain ang variables sa Tagalog at English')
  await expect(dialog.getByRole('textbox', { name: 'Ask Pulse', exact: true })).toHaveValue('My question: Explain ang variables sa Tagalog at English')
  expect(fixture.calls()).toBe(0)
  await shot('03-review-transcript')
  await dialog.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(dialog).toContainText('Ang variable ay may pangalan')
  expect(fixture.calls()).toBe(1)
  return fixture
}
export async function conversationVoice(page: Page, shot = noShot) {
  const fixture = await voiceUI(page), { dialog } = fixture
  await dialog.getByLabel('Voice mode').selectOption('conversation')
  await dialog.getByLabel('Read replies aloud').check()
  await dialog.getByRole('button', { name: 'Start listening', exact: true }).click()
  await heard(page, 'Explain ang variables sa Tagalog at English')
  await expect(dialog).toContainText('Reading reply…')
  expect(fixture.calls()).toBe(1)
  await shot('04-conversation-reading')
  await page.evaluate(() => (window as any).syntheticSpeech.speech.onend())
  await expect(dialog).toContainText('Listening…')
  expect(await page.evaluate(() => (window as any).syntheticSpeech.starts)).toBe(2)
  await heard(page, 'buksan ang syllabus')
  await expect(page).toHaveURL(/syllabus/)
  expect(fixture.calls(), 'deterministic Tagalog navigation does not invoke the paid model').toBe(1)
  await expect(dialog).toContainText('Listening…')
  await heard(page, 'itigil ang boses')
  await expect(dialog).toContainText('Microphone off')
  await dialog.getByRole('button', { name: 'Start listening', exact: true }).click()
  fixture.quota()
  await heard(page, 'Explain a networking concept')
  await expect(dialog.getByRole('alert')).toContainText('credit balance is exhausted')
  await expect(dialog.getByRole('textbox', { name: 'Ask Pulse', exact: true })).toHaveValue('Explain a networking concept')
  await expect(dialog).toContainText('Microphone off')
  expect(fixture.calls(), 'failed billing does not restart a voice request').toBe(2)
  await shot('05-openai-credit-error')
  return fixture
}
export async function languageVoice(page: Page, shot = noShot) {
  const { dialog } = await voiceUI(page)
  for (const language of ['ilo-PH', 'kne-PH']) {
    await dialog.getByLabel('Speech language').selectOption(language)
    await dialog.getByRole('button', { name: 'Start listening', exact: true }).click()
    expect(await page.evaluate(() => (window as any).syntheticSpeech.engines.at(-1).lang)).toBe(language)
    await page.evaluate(() => (window as any).syntheticSpeech.engines.at(-1).onerror({ error: 'language-not-supported' }))
    await expect(dialog.getByRole('alert')).toContainText('does not support the selected language')
  }
  await shot('06-experimental-language')
  await dialog.getByLabel('Speech language').selectOption('en-PH')
  await dialog.getByRole('button', { name: 'Start listening', exact: true }).click()
  await page.evaluate(() => (window as any).syntheticSpeech.engines.at(-1).onerror({ error: 'not-allowed' }))
  await expect(dialog.getByRole('alert')).toContainText('Microphone access was denied')
  await shot('07-microphone-denied')
  await dialog.getByRole('button', { name: 'Start listening', exact: true }).click()
  const count = await page.evaluate(() => (window as any).syntheticSpeech.aborts)
  await dialog.getByRole('button', { name: 'Close Pulse', exact: true }).click()
  expect(await page.evaluate(() => (window as any).syntheticSpeech.aborts)).toBe(count + 1)
}
