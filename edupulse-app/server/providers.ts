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
      return { provider: connection.provider, model: connection.model, ready, embeddings, message: ready ? 'Model connection verified. Ready for conversation, drafting and document help.' : 'The selected model is no longer available. Choose another model in Settings.' }
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

export async function invokeModel(system: string, prompt: string, signal: AbortSignal, json = false, connection = serverConnection()): Promise<string> {
  const c = config()
  if (!connection) throw new ApiError(503, 'MODEL_UNAVAILABLE', 'Connect a provider or enable the free on-device model in AI settings.')
  if (OPENAI_COMPATIBLE[connection.provider] || connection.provider === 'anthropic') {
    const anthropic = connection.provider === 'anthropic'
    const endpoint = anthropic ? 'https://api.anthropic.com/v1/messages' : OPENAI_COMPATIBLE[connection.provider]!
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(anthropic ? { 'x-api-key': connection.apiKey!, 'anthropic-version': '2023-06-01' } : { Authorization: `Bearer ${connection.apiKey}` }), ...(connection.provider === 'openrouter' ? { 'X-Title': 'EduPulse' } : {}) }
    const body = anthropic
      ? { model: connection.model, system, messages: [{ role: 'user', content: prompt }], max_tokens: json ? 5000 : 1600 }
      : { model: connection.model, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], ...(connection.provider === 'openai' ? { max_completion_tokens: json ? 6000 : 2400 } : { max_tokens: json ? 5000 : 1600 }), ...(json ? { response_format: { type: 'json_object' } } : {}) }
    let response: Response
    try { response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body), signal, redirect: 'error' }) }
    catch (error) { throw transportFailure(error, signal, connection.provider) }
    if (!response.ok) throw providerError(response.status)
    const result = await response.json()
    const text = anthropic ? result.content?.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n') : result.choices?.[0]?.message?.content
    if (typeof text !== 'string' || !text.trim()) throw new ApiError(502, 'EMPTY_RESPONSE', 'The model returned no text. Choose a text model or try again.')
    return text.trim()
  }
  const model = connection.provider === 'ollama'
    // The installed Ollama runner can crash in native schema-constrained sampling.
    // Use its documented JSON mode; the courseware agents still enforce the Zod
    // contract and at most two generations before accepting any draft.
    ? new ChatOllama({ baseUrl: c.ollamaUrl, headers: connection.apiKey ? { Authorization: `Bearer ${connection.apiKey}` } : undefined, model: connection.model, temperature: 0.1, numPredict: json ? 2200 : 1000, numCtx: 4096, numBatch: 128, useMmap: true, keepAlive: '1m', maxRetries: 0, ...(connection.model.startsWith('qwen3') ? { think: false } : {}), ...(json ? { format: 'json' } : {}) })
    : connection.provider === 'gemini' && connection.apiKey
      ? new ChatGoogleGenerativeAI({ apiKey: connection.apiKey, model: connection.model, temperature: 0.1, maxOutputTokens: json ? 5000 : 2000, maxRetries: 0 })
      : null
  if (!model) throw new ApiError(503, 'MODEL_UNAVAILABLE', 'Generation is unavailable. Configure a provider on the server or run the local app with Ollama.')
  let result
  try { result = await model.invoke([new SystemMessage(system), new HumanMessage(prompt)], { signal }) }
  catch (error) { throw transportFailure(error, signal, connection.provider) }
  const text = typeof result.content === 'string' ? result.content : result.content.filter(b => b.type === 'text').map(b => 'text' in b ? b.text : '').join('\n')
  if (!text.trim()) throw new ApiError(502, 'EMPTY_RESPONSE', 'The model returned an empty response. Try again.')
  return text.trim()
}

/** Keep provider transport failures distinct from programming errors and aborts. */
function transportFailure(error: unknown, signal: AbortSignal, provider: Connection['provider']): unknown {
  signal.throwIfAborted()
  if (error instanceof TypeError && /fetch failed/i.test(error.message)) return new ApiError(502, 'PROVIDER_UNAVAILABLE', provider === 'ollama' ? 'The local model runner stopped or could not be reached. Check Ollama and available memory, then try again.' : 'The model provider could not be reached. Check the connection, then try again.')
  return error
}
