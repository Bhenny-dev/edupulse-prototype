import { ChatOllama } from '@langchain/ollama'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { config } from './config.js'
import { ApiError } from './contracts.js'
import { discoverModels, providerError, serverConnection, type Connection } from './connections.js'
import { modelStatus } from './ml/onnx.js'

// OpenAI-compatible chat endpoints. Fixed URLs: clients never choose where keys are sent.
const OPENAI_COMPATIBLE: Record<string, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  huggingface: 'https://router.huggingface.co/v1/chat/completions',
}

export async function providerHealth(connection?: Connection) {
  const embeddings = (await modelStatus()).embeddings.ready
  if (connection) {
    try {
      const models = await discoverModels(connection.provider, connection.apiKey)
      const ready = models.some(m => m.id === connection.model || m.id === `${connection.model}:latest`)
      return { provider: connection.provider, model: connection.model, ready, embeddings, message: ready ? connection.testedAt ? 'The selected model answered a generation request. Provider limits can still change; retest if a prompt fails.' : 'Credential saved and model listed. Generation has not been tested. Use Test selected model to check inference access and quota.' : connection.model ? 'The selected model is no longer available. Choose another model in Settings.' : 'Credential saved. Choose a model or use Refresh models to finish setup.' }
    } catch (error) { return { provider: connection.provider, model: connection.model, ready: false, embeddings, message: error instanceof ApiError ? error.message : 'The provider could not be reached. Check the connection in Settings.' } }
  }
  const c = config()
  if (c.provider === 'retrieval') return { provider: 'retrieval', model: null, ready: false, embeddings, message: 'Source search is available. No generation provider is configured.' }
  if (c.provider === 'gemini') {
    if (!process.env.GEMINI_API_KEY) return { provider: 'gemini', model: c.geminiModel, ready: false, embeddings, message: 'GEMINI_API_KEY is missing on the server.' }
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.geminiModel)}`, { headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY }, signal: AbortSignal.timeout(5000) })
      return { provider: 'gemini', model: c.geminiModel, ready: response.ok, embeddings, message: response.ok ? 'Provider connection verified; generation is subject to account quota.' : `Provider check failed (${response.status}).` }
    } catch { return { provider: 'gemini', model: c.geminiModel, ready: false, embeddings, message: 'Hosted provider could not be reached.' } }
  }
  if (c.provider !== 'ollama') return { provider: c.provider, model: null, ready: false, embeddings, message: 'Unsupported AI_PROVIDER. Use ollama, gemini, or retrieval.' }
  try {
    const response = await fetch(`${c.ollamaUrl}/api/tags`, { headers: process.env.OLLAMA_API_KEY ? { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` } : undefined, signal: AbortSignal.timeout(4000) })
    if (!response.ok) throw new Error('Unavailable')
    const data = await response.json() as { models: { name: string; remote_host?: string }[] }
    const has = (name: string) => data.models.some(m => (m.name === name || m.name === `${name}:latest`) && !m.remote_host)
    return { provider: 'ollama', model: c.model, ready: has(c.model), embeddings, message: has(c.model) ? 'Local model connected. No paid API key required.' : 'The configured local model is not installed. Run npm run ai:setup.' }
  } catch { return { provider: 'ollama', model: c.model, ready: false, embeddings, message: 'Ollama is unreachable. Start Ollama on the API server, then check again.' } }
}

export async function invokeModel(system: string, prompt: string, signal: AbortSignal, json = false, connection = serverConnection(), testBudget?: number): Promise<string> {
  const c = config()
  if (!connection) throw new ApiError(503, 'MODEL_UNAVAILABLE', 'Connect a provider or enable the free on-device model in AI settings.')
  if (!connection.model) throw new ApiError(400, 'MODEL_SELECTION_REQUIRED', 'Your credential is saved. Choose an available model in AI & Knowledge before sending a prompt.')
  if (OPENAI_COMPATIBLE[connection.provider] || connection.provider === 'anthropic') {
    const anthropic = connection.provider === 'anthropic'
    const responses = connection.provider === 'openai' && !/^(?:gpt-(?:3\.5|4(?:\.|o|-|$))|chatgpt-4o)/.test(connection.model)
    const endpoint = anthropic ? 'https://api.anthropic.com/v1/messages' : responses ? 'https://api.openai.com/v1/responses' : OPENAI_COMPATIBLE[connection.provider]!
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(anthropic ? { 'x-api-key': connection.apiKey!, 'anthropic-version': '2023-06-01' } : { Authorization: `Bearer ${connection.apiKey}` }), ...(connection.provider === 'openrouter' ? { 'X-Title': 'EduPulse' } : {}) }
    const body = anthropic
      ? { model: connection.model, system, messages: [{ role: 'user', content: prompt }], max_tokens: testBudget || (json ? 5000 : 1600) }
      : responses ? { model: connection.model, instructions: system, input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }], max_output_tokens: testBudget || (json ? 6000 : 2400), store: false, ...(json ? { text: { format: { type: 'json_object' } } } : {}) }
      : { model: connection.model, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], max_tokens: testBudget || (json ? 5000 : 1600), ...(json ? { response_format: { type: 'json_object' } } : {}) }
    let response: Response
    try { response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body), signal, redirect: 'error' }) }
    catch (error) { throw transportFailure(error, signal, connection.provider) }
    if (!response.ok) throw await modelResponseError(response, connection.model)
    const result = await response.json()
    if (result.status === 'incomplete' || result.choices?.[0]?.finish_reason === 'length' || result.stop_reason === 'max_tokens') throw new ApiError(502, 'INCOMPLETE_RESPONSE', 'The model reached its output limit before completing the response. Nothing was applied; request a smaller section or choose another model.')
    const text = anthropic ? result.content?.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n') : responses ? result.output?.filter((item: { type: string }) => item.type === 'message').flatMap((item: { content?: { type: string; text?: string }[] }) => item.content || []).filter((part: { type: string }) => part.type === 'output_text').map((part: { text: string }) => part.text).join('\n') : result.choices?.[0]?.message?.content
    if (typeof text !== 'string' || !text.trim()) throw new ApiError(502, 'EMPTY_RESPONSE', 'The model returned no text. Choose a text model or try again.')
    return text.trim()
  }
  if (connection.provider === 'ollama' && json) {
    // Read tokens as they arrive so long local drafts do not wait for HTTP
    // headers until generation ends. Only a complete draft reaches the graph.
    let response: Response
    try {
      response = await fetch(`${c.ollamaUrl}/api/chat`, {
        method: 'POST', redirect: 'error', signal,
        headers: { 'Content-Type': 'application/json', ...(connection.apiKey ? { Authorization: `Bearer ${connection.apiKey}` } : {}) },
        body: JSON.stringify({ model: connection.model, stream: true, format: 'json', keep_alive: '1m', ...(connection.model.startsWith('qwen3') ? { think: false } : {}), messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], options: { temperature: 0.1, num_predict: testBudget || 2200, num_ctx: testBudget && testBudget > 4096 ? 16384 : 4096, num_batch: 128, use_mmap: true } }),
      })
    } catch (error) { throw transportFailure(error, signal, connection.provider) }
    if (!response.ok) throw providerError(response.status)
    return readOllamaDraft(response, signal)
  }
  const model = connection.provider === 'ollama'
    ? new ChatOllama({ baseUrl: c.ollamaUrl, headers: connection.apiKey ? { Authorization: `Bearer ${connection.apiKey}` } : undefined, model: connection.model, temperature: 0.1, numPredict: testBudget || 1000, numCtx: 4096, numBatch: 128, useMmap: true, keepAlive: '5m', maxRetries: 0, ...(connection.model.startsWith('qwen3') ? { think: false } : {}) })
    : connection.provider === 'gemini' && connection.apiKey
      ? new ChatGoogleGenerativeAI({ apiKey: connection.apiKey, model: connection.model, temperature: 0.1, maxOutputTokens: testBudget || (json ? 5000 : 2000), maxRetries: 0 })
      : null
  if (!model) throw new ApiError(503, 'MODEL_UNAVAILABLE', 'Generation is unavailable. Configure a provider on the server or run the local app with Ollama.')
  let result
  try { result = await model.invoke([new SystemMessage(system), new HumanMessage(prompt)], { signal }) }
  catch (error) { throw transportFailure(error, signal, connection.provider) }
  const text = typeof result.content === 'string' ? result.content : result.content.filter(b => b.type === 'text').map(b => 'text' in b ? b.text : '').join('\n')
  if (!text.trim()) throw new ApiError(502, 'EMPTY_RESPONSE', 'The model returned an empty response. Try again.')
  return text.trim()
}

async function readOllamaDraft(response: Response, signal: AbortSignal): Promise<string> {
  let text = '', done = false
  const incomplete = () => new ApiError(502, 'INCOMPLETE_RESPONSE', 'The local model could not finish the draft. Check Ollama and available memory, then retry.')
  const accept = (frame: { done?: boolean; done_reason?: string; error?: unknown; message?: { content?: unknown } }) => {
    if (!frame || done || frame.error || frame.done_reason === 'length') throw incomplete()
    const part = frame.message?.content
    if (part !== undefined && typeof part !== 'string') throw incomplete()
    text += part || ''
    if (text.length > 512_000) throw incomplete()
    done = frame.done === true
  }
  try {
    if (response.headers.get('content-type')?.includes('application/x-ndjson')) {
      if (!response.body) throw incomplete()
      const reader = response.body.getReader(), decoder = new TextDecoder()
      let pending = ''
      const abort = () => { void reader.cancel().catch(() => {}) }
      signal.addEventListener('abort', abort, { once: true })
      try {
        while (true) {
          signal.throwIfAborted()
          const chunk = await reader.read()
          signal.throwIfAborted()
          pending += decoder.decode(chunk.value, { stream: !chunk.done })
          let newline: number
          while ((newline = pending.indexOf('\n')) !== -1) {
            const line = pending.slice(0, newline).trim(); pending = pending.slice(newline + 1)
            if (line) accept(JSON.parse(line))
          }
          if (pending.length > 512_000) throw incomplete()
          if (chunk.done) break
        }
        if (pending.trim()) accept(JSON.parse(pending))
      } finally {
        signal.removeEventListener('abort', abort)
        await reader.cancel().catch(() => {})
        reader.releaseLock()
      }
    } else accept(await response.json())
    signal.throwIfAborted()
  } catch (error) {
    signal.throwIfAborted()
    if (error instanceof ApiError) throw error
    throw incomplete()
  }
  if (!done) throw incomplete()
  if (!text.trim()) throw new ApiError(502, 'EMPTY_RESPONSE', 'The local model returned no draft text. Try again or choose another model.')
  return text.trim()
}

/** Return only bounded, actionable categories; provider bodies can contain private account details. */
async function modelResponseError(response: Response, model: string): Promise<ApiError> {
  let code = ''
  try { const body = JSON.parse((await response.text()).slice(0, 8192)); if (typeof body.error?.code === 'string') code = body.error.code } catch { /* Non-JSON provider errors still have an HTTP category. */ }
  if (response.status === 404 || code === 'model_not_found') return new ApiError(400, 'MODEL_NOT_AVAILABLE', `The selected model (${model}) is unavailable for this account or API route. Refresh models, choose another model and use Test selected model.`)
  if (code === 'insufficient_quota') return new ApiError(429, 'PROVIDER_CREDITS', 'The provider account has no available API credits or quota. Check API billing or choose another connection; a consumer chat subscription is separate.')
  if (response.status === 400) return new ApiError(400, 'MODEL_INCOMPATIBLE', 'The selected model rejected the required text or JSON request. Choose another text model and test it before retrying.')
  return providerError(response.status)
}

/** Keep provider transport failures distinct from programming errors and aborts. */
function transportFailure(error: unknown, signal: AbortSignal, provider: Connection['provider']): unknown {
  signal.throwIfAborted()
  if (error instanceof TypeError && /fetch failed/i.test(error.message)) return new ApiError(502, 'PROVIDER_UNAVAILABLE', provider === 'ollama' ? 'The local model runner stopped or could not be reached. Check Ollama and available memory, then try again.' : 'The model provider could not be reached. Check the connection, then try again.')
  return error
}
