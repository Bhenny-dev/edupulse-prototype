import { expect, type Page } from '@playwright/test'
import { academicUI } from './academic-ui-fixture'
import { providerFixture } from './browser/provider-fixture'
export type Shot = (name: string) => Promise<void>
const noShot: Shot = async () => {}
export async function voiceUI(page: Page, options: { recording?: boolean, playback?: boolean, denied?: boolean, holdPermission?: boolean } = {}) {
  const provider = await providerFixture(page, { identity: { mode: 'authenticated', role: 'instructor' }, database: { ready: false, kind: 'supabase', message: 'Synthetic UI fixture' } }); provider.authorize('openai')
  await academicUI(page, async () => ({ json: {} }))
  await page.route('**/api/ai?*', route => {
    const action = new URL(route.request().url()).searchParams.get('action')
    if (action === 'conversations') return route.fulfill({ json: { threads: [], memories: [], automaticMemory: true, mode: 'cloud', saved: true } })
    if (action === 'operator') return route.fulfill({ json: { plan: { tool: 'chat' } } })
    return route.fallback()
  })
  await page.addInitScript(options => {
    const state = { starts: 0, stops: 0, released: 0, recorders: [] as any[], speech: null as any, spoken: [] as string[], allow: null as any }
    Object.assign(window, { syntheticSpeech: state })
    const stream = { getTracks: () => [{ stop: () => { state.released++ } }] }
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { async getUserMedia() {
      state.starts++
      if (options.denied) throw new DOMException('Denied', 'NotAllowedError')
      if (options.holdPermission) await new Promise(resolve => { state.allow = resolve })
      return stream
    } } })
    class Recorder {
      state = 'inactive'; mimeType = 'audio/webm;codecs=opus'; onstop: any; ondataavailable: any; onerror: any
      static isTypeSupported(type: string) { return type.startsWith('audio/webm') }
      constructor() { state.recorders.push(this) }
      start() { this.state = 'recording' }
      stop() { this.state = 'inactive'; state.stops++; queueMicrotask(() => { this.ondataavailable?.({ data: new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3])], { type: this.mimeType }) }); this.onstop?.() }) }
    }
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: options.recording === false ? undefined : Recorder })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class { text: string; constructor(text: string) { this.text = text } } })
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: options.playback === false ? undefined : { speak(speech: any) { state.speech = speech; state.spoken.push(speech.text) }, cancel() { state.speech?.onend?.(); state.speech = null } } })
  }, options)
  let calls = 0, transcriptions = 0, quota = false, transcript = 'Explain ang variables sa Tagalog at English', held = false, release: (() => void) | undefined
  await page.route('**/api/ai?action=transcribe', async route => {
    transcriptions++
    expect(route.request().headers()['x-audio-type']).toContain('audio/webm')
    expect(route.request().postDataBuffer()?.subarray(0, 4)).toEqual(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
    if (held) await new Promise<void>(resolve => { release = resolve })
    if (quota) return route.fulfill({ status: 429, json: { error: { code: 'PROVIDER_CREDITS', message: 'Your OpenAI API credit balance is exhausted. Check API billing and add credits.' } } }).catch(() => {})
    return route.fulfill({ json: { text: transcript } }).catch(() => {})
  })
  await page.route(/\/api\/ai\?action=(?:chat|system-chat)$/, route => {
    calls++
    return route.fulfill({ json: { requestId: `synthetic-voice-${calls}`, mode: 'generated', answer: 'Ang variable ay may pangalan at value. Review your example before using it.', grounding: 'general', sources: [], agents: [] } })
  })
  await page.goto('/#/dashboard')
  await page.getByRole('button', { name: 'Open Pulse assistant', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Pulse', exact: true })
  await expect(dialog.getByRole('button', { name: 'Voice input', exact: true })).toBeVisible()
  await expect(dialog.getByRole('combobox')).toHaveCount(0)
  expect(await page.evaluate(() => (window as any).syntheticSpeech.starts)).toBe(0)
  return { dialog, calls: () => calls, transcriptions: () => transcriptions, say: (text: string) => { transcript = text }, quota: () => { quota = true }, hold: () => { held = true }, release: () => { held = false; release?.() } }
}
export async function reviewVoice(page: Page, shot = noShot) {
  const fixture = await voiceUI(page), { dialog } = fixture
  await shot('01-voice-controls')
  await dialog.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('My question:')
  await dialog.getByRole('button', { name: 'Voice input', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Stop recording', exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Send', exact: true })).toBeDisabled()
  await shot('02-listening-tagalog-english')
  expect(fixture.calls()).toBe(0); expect(fixture.transcriptions()).toBe(0)
  await dialog.getByRole('button', { name: 'Stop recording', exact: true }).click()
  await expect(dialog.getByRole('textbox', { name: 'Ask Pulse', exact: true })).toHaveValue('My question: Explain ang variables sa Tagalog at English')
  expect(fixture.calls()).toBe(0); expect(fixture.transcriptions()).toBe(1)
  expect(await page.evaluate(() => (window as any).syntheticSpeech.released)).toBeGreaterThan(0)
  await shot('03-review-transcript')
  await dialog.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(dialog).toContainText('Ang variable ay may pangalan')
  expect(fixture.calls()).toBe(1)
  return fixture
}
export async function pendingVoice(page: Page, shot = noShot) {
  const fixture = await voiceUI(page), { dialog } = fixture
  fixture.hold()
  await dialog.getByRole('button', { name: 'Voice input', exact: true }).click()
  await dialog.getByRole('button', { name: 'Stop recording', exact: true }).click()
  await expect.poll(fixture.transcriptions).toBe(1)
  await expect(dialog).toContainText('Transcribing your voice message')
  await shot('04-transcribing')
  fixture.release()
  await expect(dialog.getByRole('textbox', { name: 'Ask Pulse', exact: true })).toHaveValue('Explain ang variables sa Tagalog at English')
  fixture.quota()
  await dialog.getByRole('button', { name: 'Voice input', exact: true }).click()
  await dialog.getByRole('button', { name: 'Stop recording', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('credit balance is exhausted')
  await expect(dialog.getByRole('textbox', { name: 'Ask Pulse', exact: true })).toHaveValue('Explain ang variables sa Tagalog at English')
  expect(fixture.calls()).toBe(0)
  await shot('05-openai-credit-error')
  return fixture
}
export async function permissionVoice(page: Page, shot = noShot) {
  const fixture = await voiceUI(page, { denied: true }), { dialog } = fixture
  await dialog.getByRole('button', { name: 'Voice input', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Microphone access was denied')
  expect(fixture.transcriptions()).toBe(0)
  await shot('07-microphone-denied')
}
export async function readReplyVoice(page: Page, shot = noShot) {
  const fixture = await voiceUI(page, { recording: false }), { dialog } = fixture
  await dialog.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('Explain variables in Tagalog and English')
  await dialog.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(dialog).toContainText('Ang variable ay may pangalan')
  expect(await page.evaluate(() => (window as any).syntheticSpeech.spoken)).toEqual([])
  await shot('09-reply-read-aloud')
  await dialog.getByRole('button', { name: 'Read aloud', exact: true }).click()
  await expect(dialog.locator('.pulse-read-aloud', { hasText: 'Stop reading' })).toBeVisible()
  expect(await page.evaluate(() => (window as any).syntheticSpeech.starts)).toBe(0)
  await shot('10-reading-reply')
  await dialog.locator('.pulse-voice-toggle').click()
  await expect(dialog.getByRole('button', { name: 'Read aloud', exact: true })).toBeVisible()
  expect(await page.evaluate(() => (window as any).syntheticSpeech.speech)).toBeNull()
  expect(fixture.calls()).toBe(1)
  return fixture
}
