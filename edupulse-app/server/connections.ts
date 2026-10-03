import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { z } from 'zod'
import { ApiError, type Identity } from './contracts.js'
import { config } from './config.js'

export const providerNames = ['ollama', 'gemini', 'openai', 'groq', 'anthropic', 'openrouter', 'huggingface'] as const
export type ProviderName = typeof providerNames[number]
export type Connection = { provider: ProviderName; model: string; apiKey?: string; owner: string; expires: number; id: string }
export type ModelPreset = { id: string; name: string; free?: boolean }
export const connectionInput = z.object({ provider: z.enum(providerNames), apiKey: z.string().trim().min(8).max(1024).optional(), model: z.string().min(1).max(200).optional() }).strict()
const payload = connectionInput.extend({ model: z.string().min(1).max(200), owner: z.string(), expires: z.number(), id: z.string() })
const TTL = 7 * 24 * 60 * 60
const cookieName = () => config().hosted ? '__Host-edupulse-ai' : 'edupulse-ai'

function encryptionKey(): Buffer {
  const configured = process.env.AI_CONNECTION_SECRET
  if (configured && /^[a-f0-9]{64}$/i.test(configured)) return Buffer.from(configured, 'hex')
  if (config().hosted) throw new ApiError(503, 'CONNECTION_STORAGE_UNAVAILABLE', 'Provider connections are temporarily unavailable. The server connection secret needs configuration.')
  const path = `${config().localPath}.connection-secret`
  mkdirSync(dirname(path), { recursive: true })
  try { writeFileSync(path, randomBytes(32), { flag: 'wx', mode: 0o600 }) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error }
  const key = readFileSync(path)
  if (key.length !== 32) throw new ApiError(503, 'CONNECTION_STORAGE_UNAVAILABLE', 'The local connection secret is invalid.')
  return key
}

export function connectionCookie(connection: Connection | null): string {
  let value = ''
  if (connection) {
    const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', encryptionKey(), nonce)
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(connection), 'utf8'), cipher.final()])
    value = Buffer.concat([nonce, cipher.getAuthTag(), encrypted]).toString('base64url')
  }
  return `${cookieName()}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${connection ? TTL : 0}${config().hosted ? '; Secure' : ''}`
}

export function readConnection(request: Request, identity: Identity): Connection | undefined {
  const value = request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName()}=`))?.slice(cookieName().length + 1)
  if (!value) return undefined
  try {
    if (value.length > 3500) return undefined
    const bytes = Buffer.from(value, 'base64url'), decipher = createDecipheriv('aes-256-gcm', encryptionKey(), bytes.subarray(0, 12))
    decipher.setAuthTag(bytes.subarray(12, 28))
    const data = payload.parse(JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8')))
    if (data.owner !== identity.id || data.expires <= Date.now()) return undefined
    return data
  } catch { return undefined }
}

export function serverConnection(): Connection | undefined {
  const c = config(), provider = c.provider as ProviderName
  if (!providerNames.includes(provider)) return undefined
  const keys: Partial<Record<ProviderName, string | undefined>> = { gemini: process.env.GEMINI_API_KEY, openai: process.env.OPENAI_API_KEY, groq: process.env.GROQ_API_KEY, anthropic: process.env.ANTHROPIC_API_KEY, ollama: process.env.OLLAMA_API_KEY, openrouter: process.env.OPENROUTER_API_KEY, huggingface: process.env.HF_TOKEN }
  const models: Record<ProviderName, string> = { ollama: c.model, gemini: c.geminiModel, openai: process.env.OPENAI_MODEL || '', groq: process.env.GROQ_MODEL || '', anthropic: process.env.ANTHROPIC_MODEL || '', openrouter: process.env.OPENROUTER_MODEL || '', huggingface: process.env.HF_MODEL || '' }
  if (provider !== 'ollama' && !keys[provider]) return undefined
  return { provider, model: models[provider], apiKey: keys[provider], owner: 'server', expires: Number.MAX_SAFE_INTEGER, id: 'server' }
}

export function providerError(status: number): ApiError {
  if (status === 401 || status === 403) return new ApiError(400, 'PROVIDER_AUTH', 'The provider rejected this key or model permission. Check your key and account access.')
  if (status === 429) return new ApiError(429, 'PROVIDER_QUOTA', 'This provider has reached its quota or rate limit. Try later or select another connection.')
  return new ApiError(502, 'PROVIDER_UNAVAILABLE', `The provider could not complete the request (${status}). Check its model availability and try again.`)
}

export async function discoverModels(provider: ProviderName, apiKey?: string, signal = AbortSignal.timeout(12000), transport: typeof fetch = fetch): Promise<ModelPreset[]> {
  if (provider !== 'ollama' && !apiKey) throw new ApiError(400, 'KEY_REQUIRED', 'Enter an API key to load this provider’s models.')
  if (provider === 'ollama' && config().hosted && !process.env.OLLAMA_BASE_URL) throw new ApiError(400, 'LOCAL_SERVER_REQUIRED', 'Ollama runs with the downloaded local app. Use the built-in browser model on this hosted site, or connect a hosted provider.')
  const urls: Record<ProviderName, string> = { ollama: `${config().ollamaUrl}/api/tags`, gemini: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', openai: 'https://api.openai.com/v1/models', groq: 'https://api.groq.com/openai/v1/models', anthropic: 'https://api.anthropic.com/v1/models?limit=1000', openrouter: 'https://openrouter.ai/api/v1/models', huggingface: 'https://router.huggingface.co/v1/models' }
  const headers: Record<string, string> = provider === 'gemini' ? { 'x-goog-api-key': apiKey! } : provider === 'anthropic' ? { 'x-api-key': apiKey!, 'anthropic-version': '2023-06-01' } : apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
  let response: Response
  try { response = await transport(urls[provider], { headers, signal, redirect: 'error' }) }
  catch (error) {
    signal.throwIfAborted()
    if (error instanceof TypeError && /fetch failed/i.test(error.message)) throw new ApiError(502, 'PROVIDER_UNAVAILABLE', 'The model provider could not be reached. Check the connection, then try again.')
    throw error
  }
  if (!response.ok) throw providerError(response.status)
  const data = await response.json()
  let models: ModelPreset[] = []
  if (provider === 'ollama') models = (data.models || []).filter((m: { name: string; remote_host?: string }) => !m.remote_host && !/embed|minilm|nomic|bge/i.test(m.name)).map((m: { name: string }) => ({ id: m.name, name: m.name }))
  else if (provider === 'gemini') models = (data.models || []).filter((m: { name: string; supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent') && !/image|tts|robotics/i.test(m.name)).map((m: { name: string; displayName?: string }) => ({ id: m.name.replace(/^models\//, ''), name: m.displayName || m.name }))
  else if (provider === 'openrouter' || provider === 'huggingface') {
    type Listed = { id: string; name?: string; architecture?: { output_modalities?: string[] }; pricing?: { prompt?: string; completion?: string }; providers?: { is_free?: boolean; status?: string }[] }
    models = (data.data || []).filter((m: Listed) => !m.architecture?.output_modalities || m.architecture.output_modalities.includes('text')).map((m: Listed) => {
      // Free tiers: OpenRouter ":free" variants with zero pricing; Hugging Face providers flagged is_free.
      const free = provider === 'openrouter' ? m.id.endsWith(':free') || (m.pricing?.prompt === '0' && m.pricing?.completion === '0') : Boolean(m.providers?.some(p => p.is_free && p.status !== 'error'))
      return { id: m.id, name: `${m.name || m.id}${free && !/\(free\)/i.test(m.name || '') ? ' (free)' : ''}`, free }
    })
  }
  else models = (data.data || []).filter((m: { id: string; active?: boolean }) => provider === 'anthropic' || (provider === 'openai' ? /^(gpt-|chatgpt-|o\d)/.test(m.id) && !/audio|realtime|transcri|image|search|instruct/.test(m.id) : m.active !== false && !/whisper|tts|guard|orpheus/.test(m.id))).map((m: { id: string; display_name?: string }) => ({ id: m.id, name: m.display_name || m.id }))
  models = models.filter(m => typeof m.id === 'string' && m.id.length <= 200).sort((a, b) => Number(Boolean(b.free)) - Number(Boolean(a.free)) || a.name.localeCompare(b.name)).slice(0, 500)
  if (!models.length) throw new ApiError(400, 'NO_MODELS', 'No supported text-generation models are available for this connection.')
  return models
}

export async function createConnection(input: z.infer<typeof connectionInput>, identity: Identity, previous?: Connection) {
  // A browser can supply its own key, never extract or borrow the server's hosted key.
  const apiKey = input.apiKey || (previous?.provider === input.provider ? previous.apiKey : undefined) || (input.provider === 'ollama' ? process.env.OLLAMA_API_KEY : undefined)
  const models = await discoverModels(input.provider, apiKey)
  const model = input.model || (input.provider === 'ollama' && models.some(m => m.id === config().model || m.id === `${config().model}:latest`) ? models.find(m => m.id === config().model || m.id === `${config().model}:latest`)!.id : models[0]!.id)
  if (!models.some(m => m.id === model)) throw new ApiError(400, 'MODEL_NOT_AVAILABLE', 'Choose a model returned by the connected provider.')
  const connection: Connection = { provider: input.provider, model, apiKey, owner: identity.id, id: previous?.id || randomBytes(12).toString('hex'), expires: Date.now() + TTL * 1000 }
  return { connection, models }
}

export const publicConnection = (connection?: Connection) => connection ? { provider: connection.provider, model: connection.model, expiresAt: connection.expires === Number.MAX_SAFE_INTEGER ? null : new Date(connection.expires).toISOString(), source: connection.owner === 'server' ? 'server' : 'personal' } : null
