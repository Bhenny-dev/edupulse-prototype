import test from 'node:test'
import assert from 'node:assert/strict'
import { discoverModels, type Connection } from '../server/connections.js'
import { handleRequest } from '../server/http.js'
import { invokeModel } from '../server/providers.js'
import type { Identity } from '../server/contracts.js'

process.env.AI_CONNECTION_SECRET = 'ab'.repeat(32)
process.env.VERCEL = '1'
process.env.AI_PROVIDER = 'retrieval'
const identity: Identity = { id: 'private-instructor', role: 'instructor', local: false }
const connect = (provider: Connection['provider'], model: string, apiKey: string): Connection => ({ provider, model, apiKey, owner: identity.id, expires: Date.now() + 60000, id: `${provider}-test` })

test('DeepSeek checks the key when models load, hides retired names and lists current ones', async () => {
  const seen: { url: string; auth: string | null }[] = []
  const models = await discoverModels('deepseek', 'sk-deepseek-test', undefined, async (url, init) => { seen.push({ url: String(url), auth: new Headers(init?.headers).get('authorization') }); return Response.json({ object: 'list', data: [{ id: 'deepseek-chat' }, { id: 'deepseek-reasoner' }, { id: 'deepseek-v4-pro' }, { id: 'deepseek-flash' }] }) })
  assert.deepEqual(seen, [{ url: 'https://api.deepseek.com/models', auth: 'Bearer sk-deepseek-test' }])
  assert.deepEqual(models.map(m => m.id), ['deepseek-flash', 'deepseek-v4-pro'])
  await assert.rejects(discoverModels('deepseek', 'wrong-key-123', undefined, async () => new Response('{"error":{"message":"Authentication Fails, sensitive detail"}}', { status: 401 })), (error: Error & { code?: string }) => error.code === 'PROVIDER_AUTH' && !error.message.includes('sensitive'))
  await assert.rejects(discoverModels('deepseek', 'sk-deepseek-test', undefined, async () => new Response('{}', { status: 402 })), (error: Error & { code?: string }) => error.code === 'PROVIDER_CREDITS')
})

test('DeepSeek answers with thinking off, names JSON in JSON mode and tries one empty reply again', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original })
  const bodies: { thinking?: unknown; response_format?: unknown; temperature?: number; max_tokens: number; messages: { content: string }[] }[] = []
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://api.deepseek.com/chat/completions')
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer sk-deepseek-test')
    bodies.push(JSON.parse(String(init?.body)))
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: bodies.length === 1 ? '' : '{"ok":true}' } }] })
  }
  const deepseek = connect('deepseek', 'deepseek-flash', 'sk-deepseek-test')
  assert.equal(await invokeModel('Create the draft.', 'Topic: loops', AbortSignal.timeout(5000), true, deepseek), '{"ok":true}')
  assert.equal(bodies.length, 2, 'one empty JSON reply is asked for again')
  assert.deepEqual(bodies[0]!.thinking, { type: 'disabled' })
  assert.deepEqual(bodies[0]!.response_format, { type: 'json_object' })
  assert.equal(bodies[0]!.temperature, 0.2)
  assert.equal(bodies[0]!.max_tokens, 5000)
  assert.match(bodies[0]!.messages[0]!.content, /json/i, 'DeepSeek JSON mode needs the word json in the request')
  await invokeModel('Reply as JSON.', 'Topic: loops', AbortSignal.timeout(5000), true, deepseek)
  assert.equal(bodies[2]!.messages[0]!.content, 'Reply as JSON.', 'a request that already names JSON is left as written')
  await invokeModel('Answer plainly.', 'What is a loop?', AbortSignal.timeout(5000), false, deepseek)
  const plain = bodies.at(-1)!
  assert.deepEqual(plain.thinking, { type: 'disabled' }); assert.equal(plain.response_format, undefined); assert.equal(plain.temperature, undefined); assert.equal(plain.max_tokens, 1600)
})

test('Hermes lists only chat models from the Nous Portal, hides retired Hermes models and puts Hermes first', async () => {
  const seen: string[] = []
  const text = { architecture: { output_modalities: ['text'] } }
  const models = await discoverModels('hermes', 'portal-key-123', undefined, async url => { seen.push(String(url)); return Response.json({ data: [
    { id: 'nousresearch/hermes-4-405b', name: 'Hermes 4 405B', ...text },
    { id: 'nousresearch/hermes-5', name: 'Hermes 5', ...text, pricing: { prompt: '0.000001', completion: '0.000002' } },
    { id: 'anthropic/claude-sonnet-5.5', name: 'Claude Sonnet 5.5', ...text },
    { id: 'anthropic/claude-sonnet-5.5:batch', name: 'Claude Sonnet 5.5 (batch)', ...text },
    { id: '~unbiased/pareto-latest', name: 'Pareto latest', ...text },
    { id: 'cohere/embed-5-pro', name: 'Embed 5 Pro', architecture: { output_modalities: ['embeddings'] } },
    { id: 'google/gemini-nano-banana-2.1', name: 'Nano Banana', architecture: { output_modalities: ['text', 'image'] } },
    { id: 'old/model', name: 'Old model', ...text, expiration_date: '2020-01-01' },
    { id: 'open/model:free', name: 'Open model', ...text, pricing: { prompt: '0', completion: '0' } },
  ] }) })
  assert.deepEqual(seen, ['https://inference-api.nousresearch.com/v1/models'])
  assert.deepEqual(models.map(m => m.id), ['nousresearch/hermes-5', 'open/model:free', 'anthropic/claude-sonnet-5.5'])
})

test('a Hermes connection is saved only when the Portal accepts the key, because its model list is public', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original })
  let keyAccepted = false
  const chat: { max_tokens: number }[] = []
  globalThis.fetch = async (url, init) => {
    const target = String(url)
    if (target === 'https://inference-api.nousresearch.com/v1/models') return Response.json({ data: [{ id: 'nousresearch/hermes-5', architecture: { output_modalities: ['text'] } }] })
    if (target === 'https://inference-api.nousresearch.com/v1/chat/completions') {
      chat.push(JSON.parse(String(init?.body)))
      return keyAccepted ? Response.json({ choices: [{ finish_reason: 'length', message: { content: 'H' } }] }) : Response.json({ error: { message: 'invalid, blocked or out of funds' } }, { status: 401 })
    }
    throw new Error('Unexpected external request')
  }
  const request = (body: unknown, cookie?: string) => new Request('https://edupulse.test/api/ai?action=providers', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) })
  const rejected = await handleRequest(request({ provider: 'hermes', apiKey: 'wrong-portal-key' }))
  assert.equal(rejected.status, 400); assert.equal((await rejected.json()).error.code, 'PROVIDER_AUTH')
  assert.equal(rejected.headers.get('set-cookie'), null, 'a rejected key is not saved')
  keyAccepted = true
  const accepted = await handleRequest(request({ provider: 'hermes', apiKey: 'portal-key-123' }))
  assert.equal(accepted.status, 200)
  assert.equal((await accepted.json()).connection.model, 'nousresearch/hermes-5')
  assert.deepEqual(chat.map(c => c.max_tokens), [1, 1], 'each new key is tried with a one-token request')
  const cookie = accepted.headers.get('set-cookie')!
  assert.equal((await handleRequest(request({ provider: 'hermes', model: 'nousresearch/hermes-5' }, cookie))).status, 200)
  assert.equal(chat.length, 2, 'choosing a model reuses the saved key without another request')
})

test('Hermes answers through the Portal with headroom for models that reason', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original })
  const bodies: Record<string, unknown>[] = []
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://inference-api.nousresearch.com/v1/chat/completions')
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer portal-key-123')
    bodies.push(JSON.parse(String(init?.body)))
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'A loop repeats steps.' } }] })
  }
  const hermes = connect('hermes', 'nousresearch/hermes-5', 'portal-key-123')
  assert.equal(await invokeModel('Answer plainly.', 'What is a loop?', AbortSignal.timeout(5000), false, hermes), 'A loop repeats steps.')
  assert.equal(bodies[0]!.max_tokens, 1600 + 1024)
  assert.equal(bodies[0]!.reasoning, undefined); assert.equal(bodies[0]!.thinking, undefined)
})
