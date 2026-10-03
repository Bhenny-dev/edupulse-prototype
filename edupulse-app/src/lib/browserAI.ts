import type { WebWorkerMLCEngine } from '@mlc-ai/web-llm'

export const browserPresets = [
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen 2.5 · 1.5B — balanced', download: 'about 1 GB', memory: 'about 1.7 GB GPU memory' },
  { id: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC', name: 'Qwen 2.5 · 0.5B — lighter', download: 'about 400 MB', memory: 'about 1.1 GB GPU memory' },
]
type State = { status: 'idle' | 'loading' | 'ready' | 'error'; model: string; progress: number; message: string }
let state: State = { status: 'idle', model: '', progress: 0, message: '' }
let engine: WebWorkerMLCEngine | undefined, worker: Worker | undefined, loading: AbortController | undefined, generating = false
const listeners = new Set<() => void>()
export const subscribeBrowserAI = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export const browserAIState = () => state
function update(value: Partial<State>) { state = { ...state, ...value }; listeners.forEach(fn => fn()) }
export function aiPreference(): string { try { return localStorage.getItem('edupulse-inference') || 'server' } catch { return 'server' } }
export function setAiPreference(value: 'server' | 'browser') { try { localStorage.setItem('edupulse-inference', value) } catch { /* Device storage is optional. */ } window.dispatchEvent(new Event('edupulse-ai-change')) }

export async function browserCapability() {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: { has(name: string): boolean } } | null> } }).gpu
  if (!gpu) return { supported: false, halfPrecision: false, message: 'This browser does not provide WebGPU. Use current Chrome/Edge with graphics acceleration, the downloaded app with Ollama, or a provider API.' }
  const adapter = await gpu.requestAdapter()
  return { supported: Boolean(adapter), halfPrecision: Boolean(adapter?.features.has('shader-f16')), message: adapter ? 'WebGPU available. Models run on this device after download.' : 'No compatible graphics adapter was found. Use Ollama or a provider connection.' }
}

export function stopBrowserAI() {
  loading?.abort(); loading = undefined
  engine?.interruptGenerate(); worker?.terminate(); worker = undefined; engine = undefined; generating = false
  update({ status: 'idle', progress: 0, message: 'Local model stopped. Downloaded weights remain cached.' })
}

export async function startBrowserAI(model = browserPresets[0]!.id) {
  if (generating) throw new Error('Stop the current response before switching models.')
  if (!browserPresets.some(p => p.id === model)) throw new Error('Choose a supported on-device model.')
  stopBrowserAI()
  const controller = new AbortController(); loading = controller
  update({ status: 'loading', model, progress: 0, message: 'Checking this device…' })
  try {
    const capability = await browserCapability()
    if (!capability.supported) throw new Error(capability.message)
    if (model.includes('q4f16') && !capability.halfPrecision) throw new Error('Choose the lighter model; this graphics adapter does not support 16-bit shaders.')
    const { WebWorkerMLCEngine } = await import('@mlc-ai/web-llm')
    controller.signal.throwIfAborted()
    worker = new Worker(new URL('./browserAI.worker.ts', import.meta.url), { type: 'module' })
    const candidate = new WebWorkerMLCEngine(worker, { initProgressCallback: progress => { if (!controller.signal.aborted) update({ progress: progress.progress, message: progress.text }) } })
    engine = candidate
    await Promise.race([
      candidate.reload(model, { context_window_size: 4096 }),
      new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(new DOMException('Model loading cancelled', 'AbortError')), { once: true })),
    ])
    controller.signal.throwIfAborted()
    try { localStorage.setItem('edupulse-browser-model', model) } catch { /* Inference does not require preference storage. */ }
    setAiPreference('browser')
    update({ status: 'ready', progress: 1, message: 'On-device AI ready for conversation, drafting and document help.' })
  } catch (error) {
    if (controller.signal.aborted) return
    worker?.terminate(); worker = undefined; engine = undefined
    update({ status: 'error', message: error instanceof Error ? error.message.slice(0, 350) : 'The model could not load. Check your connection and available GPU memory.' })
    throw new Error(state.message)
  } finally { if (loading === controller) loading = undefined }
}

export async function resumeBrowserAI() {
  if (aiPreference() !== 'browser' || state.status === 'loading' || state.status === 'ready') return
  const model = (() => { try { return localStorage.getItem('edupulse-browser-model') } catch { return null } })()
  if (!model || !browserPresets.some(p => p.id === model)) return
  try {
    const { hasModelInCache } = await import('@mlc-ai/web-llm')
    if (await hasModelInCache(model)) await startBrowserAI(model)
    else update({ model, message: 'The saved model is no longer cached. Download it again in AI settings.' })
  } catch { /* The status card reports load failures without breaking application startup. */ }
}

export async function removeBrowserModel() {
  const model = state.model
  stopBrowserAI(); setAiPreference('server')
  if (model) { const { deleteModelAllInfoInCache } = await import('@mlc-ai/web-llm'); await deleteModelAllInfoInCache(model) }
  try { localStorage.removeItem('edupulse-browser-model') } catch { /* Optional preferences. */ }
  update({ model: '', message: 'Downloaded model removed from this browser.' })
}

export async function invokeBrowserModel(system: string, prompt: string, signal: AbortSignal, json = false) {
  if (!engine || state.status !== 'ready') throw new Error('Enable the on-device model in AI settings and wait for it to finish loading.')
  if (generating) throw new Error('Wait for the current local response to finish, or stop it before starting another.')
  signal.throwIfAborted(); generating = true
  const current = engine
  const abort = () => current.interruptGenerate()
  signal.addEventListener('abort', abort, { once: true })
  try {
    const response = await current.chat.completions.create({ messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], temperature: 0.2, max_tokens: json ? 2200 : 1000, ...(json ? { response_format: { type: 'json_object' as const } } : {}) })
    signal.throwIfAborted()
    const text = response.choices[0]?.message.content?.trim()
    if (!text) throw new Error('The local model returned no text. Try a smaller prompt or the balanced model.')
    return text
  } finally { signal.removeEventListener('abort', abort); generating = false; await current.resetChat().catch(() => {}) }
}
