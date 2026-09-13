import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { config } from './config.js'
import { ApiError, courseOutput } from './contracts.js'
import { z } from 'zod'

// Large string-length grammar ranges can exhaust older Ollama runners. Enforce
// those limits with Zod after generation; constrain the wire structure here.
function generationSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(generationSchema)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !['minLength', 'maxLength', '$schema'].includes(key)).map(([key, child]) => [key, generationSchema(child)]))
  return value
}
const courseFormat = generationSchema(z.toJSONSchema(courseOutput)) as Record<string, unknown>
const ollamaHeaders = (): Record<string, string> | undefined => process.env.OLLAMA_API_KEY ? { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` } : undefined

export async function providerHealth() {
  const c = config()
  let embeddings = false
  if (c.provider !== 'ollama' && (!c.hosted || process.env.OLLAMA_BASE_URL)) {
    try {
      const response = await fetch(`${c.ollamaUrl}/api/tags`, { headers: ollamaHeaders(), signal: AbortSignal.timeout(4000) })
      if (response.ok) {
        const data = await response.json() as { models: { name: string; remote_host?: string }[] }
        embeddings = data.models.some(m => [c.embeddingModel, `${c.embeddingModel}:latest`].includes(m.name) && !m.remote_host)
      }
    } catch { /* Generation and embeddings have independent connection status. */ }
  }
  if (c.provider === 'retrieval') return { provider: 'retrieval', model: null, ready: false, embeddings, message: 'Source search is available. No generation provider is configured.' }
  if (c.provider === 'gemini') {
    if (!process.env.GEMINI_API_KEY) return { provider: 'gemini', model: c.geminiModel, ready: false, embeddings, message: 'GEMINI_API_KEY is missing on the server.' }
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.geminiModel)}`, {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY }, signal: AbortSignal.timeout(5000),
      })
      return { provider: 'gemini', model: c.geminiModel, ready: response.ok, embeddings, message: response.ok ? 'Provider connection verified; generation is subject to account quota.' : `Provider check failed (${response.status}).` }
    } catch { return { provider: 'gemini', model: c.geminiModel, ready: false, embeddings, message: 'Hosted provider could not be reached.' } }
  }
  if (c.provider !== 'ollama') return { provider: c.provider, model: null, ready: false, embeddings: false, message: 'Unsupported AI_PROVIDER. Use ollama, gemini, or retrieval.' }
  try {
    const response = await fetch(`${c.ollamaUrl}/api/tags`, { headers: ollamaHeaders(), signal: AbortSignal.timeout(4000) })
    if (!response.ok) throw new Error('Unavailable')
    const data = await response.json() as { models: { name: string; remote_host?: string }[] }
    const has = (name: string) => data.models.some(m => (m.name === name || m.name === `${name}:latest`) && !m.remote_host)
    return { provider: 'ollama', model: c.model, ready: has(c.model), embeddings: has(c.embeddingModel), message: has(c.model) ? 'Local model connected. No paid API key required.' : 'The configured local model is not installed. Run npm run ai:setup.' }
  } catch { return { provider: 'ollama', model: c.model, ready: false, embeddings: false, message: 'Ollama is unreachable. Start Ollama on the API server, then check again.' } }
}

export async function invokeModel(system: string, prompt: string, signal: AbortSignal, json = false): Promise<string> {
  const c = config()
  const model = c.provider === 'ollama'
    ? new ChatOllama({ baseUrl: c.ollamaUrl, headers: ollamaHeaders(), model: c.model, temperature: 0.1, numPredict: json ? 2200 : 800, numCtx: 4096, maxRetries: 0, ...(c.model.startsWith('qwen3') ? { think: false } : {}), ...(json ? { format: courseFormat } : {}) })
    : c.provider === 'gemini' && process.env.GEMINI_API_KEY
      ? new ChatGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY, model: c.geminiModel, temperature: 0.1, maxOutputTokens: json ? 5000 : 1500, maxRetries: 0 })
      : null
  if (!model) throw new ApiError(503, 'MODEL_UNAVAILABLE', 'Generation is unavailable. Configure a provider on the server or run the local app with Ollama.')
  const result = await model.invoke([new SystemMessage(system), new HumanMessage(prompt)], { signal })
  const text = typeof result.content === 'string' ? result.content : result.content.filter(b => b.type === 'text').map(b => 'text' in b ? b.text : '').join('\n')
  if (!text.trim()) throw new ApiError(502, 'EMPTY_RESPONSE', 'The model returned an empty response. Try again.')
  return text.trim()
}

export async function embed(texts: string[], signal: AbortSignal): Promise<number[][]> {
  const c = config()
  // One embedding model per collection. Never compare Gemini/gte vectors with MiniLM vectors.
  if (c.hosted && !process.env.OLLAMA_BASE_URL) throw new ApiError(503, 'EMBEDDINGS_UNAVAILABLE', 'Semantic embeddings require a reachable Ollama embedding endpoint.')
  const embeddings = new OllamaEmbeddings({ baseUrl: c.ollamaUrl, headers: ollamaHeaders(), model: c.embeddingModel, maxRetries: 0, truncate: true, fetch: (url, init) => fetch(url, { ...init, signal }) })
  const vectors = await embeddings.embedDocuments(texts)
  if (vectors.some(v => v.length !== 384 || v.some(n => !Number.isFinite(n)))) throw new ApiError(502, 'INVALID_EMBEDDING', 'Embedding dimensions do not match the collection.')
  return vectors
}
