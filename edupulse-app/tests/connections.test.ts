import test from 'node:test'
import assert from 'node:assert/strict'
import { connectionCookie, connectionInput, discoverModels, readConnection, type Connection } from '../server/connections.js'
import { handleRequest } from '../server/http.js'
import { invokeModel } from '../server/providers.js'
import type { Identity } from '../server/contracts.js'

process.env.AI_CONNECTION_SECRET = 'ab'.repeat(32)
process.env.VERCEL = '1'
process.env.AI_PROVIDER = 'retrieval'
const identity: Identity = { id: 'private-instructor', role: 'instructor', local: false }
const connection: Connection = { provider: 'openai', model: 'gpt-test', apiKey: 'fake-provider-key-for-test', owner: identity.id, expires: Date.now() + 60000, id: 'test-session' }

test('provider credentials are encrypted, authenticated, expiring and bound to their owner', () => {
  const cookie = connectionCookie(connection)
  assert(cookie.includes('HttpOnly')); assert(cookie.includes('Secure')); assert(cookie.includes('SameSite=Strict'))
  assert(!cookie.includes(connection.apiKey!))
  const request = (value: string) => new Request('https://edupulse.test/api/ai', { headers: { cookie: value } })
  assert.equal(readConnection(request(cookie), identity)?.apiKey, connection.apiKey)
  assert.equal(readConnection(request(cookie), { ...identity, id: 'another-account' }), undefined)
  assert.equal(readConnection(request(connectionCookie({ ...connection, expires: 0 })), identity), undefined)
  const token = cookie.split(';')[0]!
  assert.equal(readConnection(request(`${token.slice(0, -5)}xxxxx`), identity), undefined)
  assert(!connectionInput.safeParse({ provider: 'openai', apiKey: 'valid-test-key', baseUrl: 'http://169.254.169.254' }).success)
})

test('model discovery uses fixed provider endpoints and supported generation models', async () => {
  const seen: string[] = []
  const transport: typeof fetch = async url => {
    seen.push(String(url))
    return Response.json({ models: [{ name: 'models/gemini-test', displayName: 'Test generation', supportedGenerationMethods: ['generateContent'] }, { name: 'models/text-embedding', supportedGenerationMethods: ['embedContent'] }, { name: 'models/gemini-tts', supportedGenerationMethods: ['generateContent'] }] })
  }
  assert.deepEqual(await discoverModels('gemini', 'test-key', undefined, transport), [{ id: 'gemini-test', name: 'Test generation' }])
  assert(seen.every(url => url.startsWith('https://generativelanguage.googleapis.com/')))
  await assert.rejects(discoverModels('groq', 'test-key', undefined, async () => new Response('sensitive provider detail', { status: 401 })), error => error instanceof Error && !error.message.includes('sensitive'))
})

test('OpenRouter and Hugging Face discovery lists free text models first from fixed endpoints', async () => {
  const seen: string[] = []
  const openrouter = await discoverModels('openrouter', 'test-key', undefined, async url => { seen.push(String(url)); return Response.json({ data: [
    { id: 'paid/model', name: 'Paid model', architecture: { output_modalities: ['text'] }, pricing: { prompt: '0.000001', completion: '0.000002' } },
    { id: 'open/model:free', name: 'Open model', architecture: { output_modalities: ['text'] }, pricing: { prompt: '0', completion: '0' } },
    { id: 'image/model', name: 'Image model', architecture: { output_modalities: ['image'] } },
  ] }) })
  assert.deepEqual(openrouter.map(m => [m.id, m.free]), [['open/model:free', true], ['paid/model', false]])
  assert.match(openrouter[0]!.name, /\(free\)/)
  const huggingface = await discoverModels('huggingface', 'hf_test', undefined, async url => { seen.push(String(url)); return Response.json({ data: [{ id: 'Qwen/Paid', providers: [{ is_free: false, status: 'live' }] }, { id: 'Qwen/Free', providers: [{ is_free: true, status: 'live' }] }] }) })
  assert.equal(huggingface[0]!.id, 'Qwen/Free')
  assert.deepEqual(seen, ['https://openrouter.ai/api/v1/models', 'https://router.huggingface.co/v1/models'])
})

test('personal connection discovers and switches models, powers guest drafts, and never borrows server credentials', async t => {
  const previousFetch = globalThis.fetch
  const requestedKeys: string[] = []
  globalThis.fetch = async (url, init) => {
    const target = String(url)
    if (target === 'https://api.openai.com/v1/models') return Response.json({ data: [{ id: 'gpt-test' }, { id: 'gpt-other' }, { id: 'text-embedding-test' }] })
    if (target === 'https://api.openai.com/v1/chat/completions') {
      requestedKeys.push(new Headers(init?.headers).get('authorization') || '')
      return Response.json({ choices: [{ message: { content: 'A loop repeats a group of instructions until its stopping condition is met.' } }] })
    }
    throw new Error('Unexpected external request')
  }
  t.after(() => { globalThis.fetch = previousFetch })
  const request = (action: string, body?: unknown, cookie?: string, method = 'POST') => new Request(`https://edupulse.test/api/ai?action=${action}`, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const result = await handleRequest(request('providers', { provider: 'openai', apiKey: 'own-fake-key-123', model: 'gpt-test' }))
  assert.equal(result.status, 200)
  const cookie = result.headers.get('set-cookie')!
  const resultText = await result.text(); assert(!resultText.includes('own-fake-key')); assert(!resultText.includes('apiKey'))
  const changed = await handleRequest(request('providers', { provider: 'openai', model: 'gpt-other' }, cookie))
  assert.equal(changed.status, 200); assert.equal((await changed.json()).connection.model, 'gpt-other')
  assert.equal((await handleRequest(request('providers', { provider: 'openai', model: 'not-returned' }, cookie))).status, 400)
  const answer = await handleRequest(request('chat', { message: 'Explain iteration in plain language.' }, cookie))
  assert.equal(answer.status, 200); assert.equal((await answer.json()).mode, 'generated')
  assert.deepEqual(requestedKeys, ['Bearer own-fake-key-123'])
  await Promise.all([
    invokeModel('Explain', 'One', AbortSignal.timeout(1000), false, { ...connection, apiKey: 'first-key' }),
    invokeModel('Explain', 'Two', AbortSignal.timeout(1000), false, { ...connection, apiKey: 'second-key' }),
  ])
  assert(requestedKeys.includes('Bearer first-key')); assert(requestedKeys.includes('Bearer second-key'))
  assert.equal(process.env.AI_PROVIDER, 'retrieval')
  const disconnected = await handleRequest(request('providers', undefined, cookie, 'DELETE'))
  assert(disconnected.headers.get('set-cookie')?.includes('Max-Age=0'))
  const denied = await handleRequest(request('courseware', { role: 'instructor' }))
  assert.equal(denied.status, 403)
})
