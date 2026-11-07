import test from 'node:test'
import assert from 'node:assert/strict'
import { connectionCookie, connectionInput, discoverModels, discoverWorkspaces, readConnection, type Connection } from '../server/connections.js'
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

test('the admin connection stays usable in role previews but cannot be reused by another account or a guest', () => {
  const admin: Identity = { id: 'verified-owner-account', role: 'admin', local: false }
  const cookie = connectionCookie({ ...connection, owner: admin.id })
  const request = new Request('https://edupulse.test/api/ai', { headers: { cookie } })
  for (const role of ['admin', 'dean', 'associate_dean', 'instructor', 'student'] as const) {
    // The server identity stays admin; viewRole is a UI hint, never a credential owner.
    assert.equal(readConnection(request, admin)?.owner, admin.id, role)
    assert.equal(readConnection(request, { id: `other-${role}`, role, local: false }), undefined)
  }
  assert.equal(readConnection(request, { id: 'public-guest', role: 'guest', local: false }), undefined)
})

test('a hosted visitor never inherits a server-wide OpenAI key', async () => {
  process.env.AI_PROVIDER = 'openai'
  process.env.OPENAI_API_KEY = 'server-key-must-stay-private'
  try {
    const response = await handleRequest(new Request('https://edupulse.test/api/ai?action=providers'))
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { connection: null, models: [], connections: [] })
  } finally {
    process.env.AI_PROVIDER = 'retrieval'
    delete process.env.OPENAI_API_KEY
  }
})

test('a generation test uses the saved credential, records success and clears verification after a model-access failure', async t => {
  const original = globalThis.fetch
  t.after(() => { globalThis.fetch = original })
  let unavailable = false
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://api.openai.com/v1/responses')
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer fake-provider-key-for-test')
    const body = JSON.parse(String(init?.body))
    assert.equal(body.model, connection.model)
    assert.equal(body.max_output_tokens, 3072, 'a 2,048-token answer plus the reasoning allowance of a Responses model')
    return unavailable ? Response.json({ error: { code: 'model_not_found', message: 'Private provider detail' } }, { status: 404 }) : Response.json({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'OK' }] }] })
  }
  const actor = { id: 'public-guest', role: 'guest' as const, local: false }
  const saved = { ...connection, owner: actor.id }
  const request = (cookie: string, body: unknown = {}) => new Request('https://edupulse.test/api/ai?action=provider-test', { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const verified = await handleRequest(request(connectionCookie(saved)))
  assert.equal(verified.status, 200)
  const verifiedCookie = verified.headers.get('set-cookie')!
  assert(readConnection(request(verifiedCookie), actor)?.testedAt)
  const publicResult = await verified.json()
  assert(publicResult.tested && publicResult.connection.testedAt)
  assert(!JSON.stringify(publicResult).includes(saved.apiKey!))
  unavailable = true
  const failed = await handleRequest(request(verifiedCookie))
  assert.equal(failed.status, 400)
  assert.equal((await failed.json()).error.code, 'MODEL_NOT_AVAILABLE')
  const retained = readConnection(request(failed.headers.get('set-cookie')!), actor)!
  assert.equal(retained.testedAt, undefined)
  assert.equal(retained.apiKey, saved.apiKey)
  assert.equal((await handleRequest(request(verifiedCookie, { model: 'override-is-rejected' }))).status, 400)
})

test('catalog outages retain public saved-connection metadata and model discovery excludes expired or specialized OpenAI models', async t => {
  const original = globalThis.fetch
  t.after(() => { globalThis.fetch = original })
  const models = await discoverModels('openai', 'synthetic-key', undefined, async () => Response.json({ data: [
    { id: 'gpt-5-mini' }, { id: 'o3-mini' }, { id: 'gpt-4o-realtime-preview' }, { id: 'gpt-image-1' }, { id: 'gpt-expired', shutdown_date: '2020-01-01T00:00:00Z' },
  ] }))
  assert.deepEqual(models.map(m => m.id), ['gpt-5-mini', 'o3-mini'])
  globalThis.fetch = async () => new Response('private provider data', { status: 503 })
  const cookie = connectionCookie({ ...connection, owner: 'public-guest' })
  const response = await handleRequest(new Request('https://edupulse.test/api/ai?action=providers', { headers: { cookie } }))
  const body = await response.json()
  assert.equal(body.connection.model, connection.model)
  assert.match(body.warning, /provider/i)
  assert.deepEqual(body.models, [])
  assert(!JSON.stringify(body).includes(connection.apiKey!))
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
    if (target === 'https://api.openai.com/v1/responses') {
      requestedKeys.push(new Headers(init?.headers).get('authorization') || '')
      return Response.json({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'A loop repeats a group of instructions until its stopping condition is met.' }] }] })
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


test('Claude workspace discovery is read-only, includes Default, paginates and never exposes the key', async () => {
  const calls: URL[] = []
  const workspaces = await discoverWorkspaces('synthetic-claude-key', undefined, async (url, init) => {
    const target = new URL(String(url)); calls.push(target)
    assert.equal(target.origin + target.pathname, 'https://api.anthropic.com/v1/organizations/workspaces')
    assert.equal(target.searchParams.get('include_default'), 'true')
    assert.equal(new Headers(init?.headers).get('x-api-key'), 'synthetic-claude-key')
    assert.equal(init?.redirect, 'error')
    return target.searchParams.has('after_id') ? Response.json({ data: [{ id: 'wrkspc_team', name: 'Teaching', archived_at: null }], has_more: false }) : Response.json({ data: [{ id: 'wrkspc_default', name: 'Default', archived_at: null }, { id: 'wrkspc_old', name: 'Archived', archived_at: '2020-01-01' }], has_more: true, last_id: 'wrkspc_old' })
  })
  assert.equal(calls.length, 2)
  assert.deepEqual(workspaces, [{ id: 'wrkspc_default', name: 'Default' }, { id: 'wrkspc_team', name: 'Teaching' }])
  await assert.rejects(discoverWorkspaces('synthetic-claude-key', undefined, async () => new Response('sensitive key detail', { status: 403 })), e => e instanceof Error && /Keep your existing key permissions/.test(e.message) && !e.message.includes('sensitive'))
})

test('Claude workspace changes retain the key and model, clear verification, and reach both native APIs', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original })
  const actor = { id: 'public-guest', role: 'guest' as const, local: false }
  const saved: Connection = { ...connection, provider: 'anthropic', model: 'synthetic-claude', owner: actor.id, testedAt: Date.now() }
  const seen: { url: string; workspace: string | null }[] = []
  globalThis.fetch = async (url, init) => {
    const headers = new Headers(init?.headers)
    assert.equal(headers.get('x-api-key'), saved.apiKey)
    seen.push({ url: String(url), workspace: headers.get('anthropic-workspace-id') })
    return String(url).includes('/models') ? Response.json({ data: [{ id: saved.model }] }) : Response.json({ content: [{ type: 'text', text: 'OK' }] })
  }
  const request = (action: string, cookie: string, body?: unknown) => new Request(`https://edupulse.test/api/ai?action=${action}`, { method: body ? 'POST' : 'GET', headers: { cookie, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const response = await handleRequest(request('providers', connectionCookie(saved), { provider: 'anthropic', workspaceId: 'wrkspc_teaching' }))
  assert.equal(response.status, 200)
  const cookie = response.headers.get('set-cookie')!
  const restored = readConnection(request('providers', cookie), actor)!
  assert.equal(restored.apiKey, saved.apiKey); assert.equal(restored.model, saved.model)
  assert.equal(restored.workspaceId, 'wrkspc_teaching'); assert.equal(restored.testedAt, undefined)
  const result = await response.json()
  assert.equal(result.connection.workspaceId, 'wrkspc_teaching'); assert(!JSON.stringify(result).includes(saved.apiKey!))
  assert.equal((await handleRequest(request('provider-test', cookie, {}))).status, 200)
  assert(seen.every(call => call.workspace === 'wrkspc_teaching'))
  assert(seen.some(call => call.url.endsWith('/v1/messages')))
  const invalid = await handleRequest(request('providers', cookie, { provider: 'anthropic', workspaceId: 'https://untrusted.test' }))
  assert.equal(invalid.status, 400)
  // Clearing workspace supports scoped credentials; it never silently selects a listed workspace.
  const cleared = await handleRequest(request('providers', cookie, { provider: 'anthropic', workspaceId: '' }))
  assert.equal(cleared.status, 200)
  assert.equal((await cleared.json()).connection.workspaceId, undefined)
  globalThis.fetch = async () => Response.json({ error: { message: 'Workspace wrkspc_other not found. Private provider detail.' } }, { status: 404 })
  const rejected = await handleRequest(request('providers', cookie, { provider: 'anthropic', workspaceId: 'wrkspc_other' }))
  assert.equal(rejected.status, 400)
  assert.equal((await rejected.json()).error.code, 'PROVIDER_WORKSPACE_REQUIRED')
  assert.equal(rejected.headers.get('set-cookie'), null, 'a denied workspace must not replace the previous connection')
  assert.equal(readConnection(request('providers', cookie), actor)?.workspaceId, 'wrkspc_teaching')
})

test('a Claude workspace error retains credentials and is distinct from a model or credit error', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original })
  globalThis.fetch = async () => Response.json({ error: { type: 'invalid_request_error', message: 'This API key is not scoped to a workspace, so this request must include the anthropic-workspace-id header. sensitive account detail' } }, { status: 400 })
  await assert.rejects(discoverModels('anthropic', 'synthetic-key'), e => e instanceof Error && /Choose your Claude workspace/.test(e.message) && !e.message.includes('sensitive'))
  await assert.rejects(invokeModel('system', 'hello', AbortSignal.timeout(1000), false, { ...connection, provider: 'anthropic' }), e => e instanceof Error && 'code' in e && e.code === 'PROVIDER_WORKSPACE_REQUIRED')
  const noKey = await handleRequest(new Request('https://edupulse.test/api/ai?action=provider-workspaces', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }))
  assert.equal(noKey.status, 400); assert.equal((await noKey.json()).error.code, 'KEY_REQUIRED')
})
