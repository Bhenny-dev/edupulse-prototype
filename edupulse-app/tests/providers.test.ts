import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { invokeModel } from '../server/providers.js'

test('OpenAI routes legacy chat models to Chat Completions and modern models to stateless Responses', async t => {
  const original = globalThis.fetch, bodies: Record<string, unknown>[] = []
  const urls: string[] = []
  globalThis.fetch = async (url, init) => { urls.push(String(url)); bodies.push(JSON.parse(String(init?.body))); return Response.json(String(url).endsWith('/responses') ? { output: [{ type: 'reasoning', summary: [] }, { type: 'message', content: [{ type: 'output_text', text: 'Hello.' }] }] } : { choices: [{ message: { content: 'Hello.' } }] }) }
  t.after(() => { globalThis.fetch = original })
  for (const model of ['gpt-3.5-turbo', 'o3-mini', 'gpt-5-mini']) assert.equal(await invokeModel('Help with the current task.', 'yo', AbortSignal.timeout(1000), model === 'gpt-5-mini', { provider: 'openai', model, apiKey: 'synthetic-only', owner: 'test', id: 'test', expires: Date.now() + 1000 }), 'Hello.')
  assert.deepEqual(urls, ['https://api.openai.com/v1/chat/completions', 'https://api.openai.com/v1/responses', 'https://api.openai.com/v1/responses'])
  assert.equal(bodies[0].max_tokens, 1600)
  assert.equal(bodies[0].max_completion_tokens, undefined)
  assert.equal(bodies[1].max_output_tokens, 2400)
  assert.equal(bodies[1].max_tokens, undefined)
  assert.equal(bodies[1].store, false)
  assert.deepEqual(bodies[2].text, { format: { type: 'json_object' } })
})

test('model access, compatibility and API credit errors are actionable without exposing provider bodies', async t => {
  const original = globalThis.fetch
  t.after(() => { globalThis.fetch = original })
  for (const [status, providerCode, expected] of [[404, 'model_not_found', 'MODEL_NOT_AVAILABLE'], [400, 'unsupported_parameter', 'MODEL_INCOMPATIBLE'], [429, 'insufficient_quota', 'PROVIDER_CREDITS'], [401, 'invalid_api_key', 'PROVIDER_AUTH']] as const) {
    globalThis.fetch = async () => Response.json({ error: { code: providerCode, message: 'PRIVATE KEY AND ACCOUNT DETAILS' } }, { status })
    await assert.rejects(invokeModel('Test', 'OK', AbortSignal.timeout(1000), false, { provider: 'openai', model: 'gpt-test', apiKey: 'synthetic-only', owner: 'test', id: 'test', expires: Date.now() + 1000 }), (error: { code?: string; message?: string }) => error.code === expected && !error.message?.includes('PRIVATE'))
  }
})

test('Ollama draft transport assembles streamed JSON and propagates errors', async () => {
  const bodies: Record<string, unknown>[] = []
  let fail = false
  const server = createServer(async (request, response) => {
    let raw = ''
    for await (const chunk of request) raw += chunk
    bodies.push(JSON.parse(raw))
    if (fail) { response.writeHead(503, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ error: 'Test model is unavailable' })); return }
    response.writeHead(200, { 'Content-Type': 'application/x-ndjson' })
    response.end(JSON.stringify({ model: 'test-model', created_at: new Date().toISOString(), message: { role: 'assistant', content: '{"test":true}' }, done: true, done_reason: 'stop' }) + '\n')
  })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const address = server.address()
  assert(address && typeof address !== 'string')
  process.env.AI_PROVIDER = 'ollama'; process.env.OLLAMA_BASE_URL = `http://127.0.0.1:${address.port}`
  try {
    assert.deepEqual(JSON.parse(await invokeModel('Return JSON.', 'Synthetic transport fixture.', AbortSignal.timeout(5000), true)), { test: true })
    assert.equal(bodies[0].format, 'json', 'Avoid the runner crash caused by native schema sampling')
    assert.equal(bodies[0].stream, true, 'Read tokens while long local drafts are generating')
    fail = true
    await assert.rejects(invokeModel('Return JSON.', 'Synthetic transport fixture.', AbortSignal.timeout(5000), true))
    assert.equal(bodies.length, 2, 'The transport must not add hidden retries')
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
})

test('Ollama length stop is rejected even if the runner reports done', async t => {
  const original = globalThis.fetch
  t.after(() => { globalThis.fetch = original })
  globalThis.fetch = async () => Response.json({ done: true, done_reason: 'length', message: { content: '{"programOutcomes":[]}' } })
  await assert.rejects(invokeModel('Return JSON.', 'Draft outcomes.', AbortSignal.timeout(1000), true, { provider: 'ollama', model: 'test', id: 'test', owner: 'test', expires: Date.now() + 1000 }), { code: 'INCOMPLETE_RESPONSE' })
})

test('Ollama frames tolerate split UTF-8 and lines but reject missing, malformed or oversized completions', async t => {
  const original = globalThis.fetch
  t.after(() => { globalThis.fetch = original })
  const connection = { provider: 'ollama' as const, model: 'test', id: 'test', owner: 'test', expires: Date.now() + 1000 }
  const streamed = (raw: string, bytewise = false) => {
    const bytes = new TextEncoder().encode(raw)
    return new Response(new ReadableStream({ start(controller) {
      if (bytewise) for (const byte of bytes) controller.enqueue(Uint8Array.of(byte))
      else controller.enqueue(bytes)
      controller.close()
    } }), { headers: { 'Content-Type': 'application/x-ndjson' } })
  }
  globalThis.fetch = async () => streamed(JSON.stringify({ message: { content: '{"title":"Café' }, done: false }) + '\n' + JSON.stringify({ message: { content: '"}' }, done: true, done_reason: 'stop' }), true)
  assert.deepEqual(JSON.parse(await invokeModel('JSON', 'Draft', AbortSignal.timeout(1000), true, connection)), { title: 'Café' })
  for (const raw of [
    JSON.stringify({ message: { content: '{}' }, done: false }) + '\n',
    '{broken\n',
    JSON.stringify({ error: 'private runner details' }) + '\n',
    JSON.stringify({ message: { content: '{}' }, done: true, done_reason: 'length' }) + '\n',
    JSON.stringify({ message: { content: 'a'.repeat(512_001) }, done: true }) + '\n',
  ]) {
    globalThis.fetch = async () => streamed(raw)
    await assert.rejects(invokeModel('JSON', 'Draft', AbortSignal.timeout(1000), true, connection), { code: 'INCOMPLETE_RESPONSE' })
  }
})

test('cancelling a local draft interrupts a pending stream and releases it', async t => {
  const original = globalThis.fetch, abort = new AbortController()
  let cancelled = false
  t.after(() => { globalThis.fetch = original })
  globalThis.fetch = async () => new Response(new ReadableStream({ cancel() { cancelled = true } }), { headers: { 'Content-Type': 'application/x-ndjson' } })
  const promise = invokeModel('JSON', 'Draft', abort.signal, true, { provider: 'ollama', model: 'test', id: 'test', owner: 'test', expires: Date.now() + 1000 })
  setTimeout(() => abort.abort(), 10)
  await assert.rejects(promise, { name: 'AbortError' })
  assert.equal(cancelled, true)
})
