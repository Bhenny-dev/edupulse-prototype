import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { invokeModel } from '../server/providers.js'

test('OpenAI chat requests use legacy token limits for GPT-3.5 and completion limits for reasoning models', async t => {
  const original = globalThis.fetch, bodies: Record<string, unknown>[] = []
  globalThis.fetch = async (_url, init) => { bodies.push(JSON.parse(String(init?.body))); return Response.json({ choices: [{ message: { content: 'Hello. How can I help with your course?' } }] }) }
  t.after(() => { globalThis.fetch = original })
  for (const model of ['gpt-3.5-turbo', 'o3-mini']) await invokeModel('Help with the current task.', 'yo', AbortSignal.timeout(1000), false, { provider: 'openai', model, apiKey: 'synthetic-only', owner: 'test', id: 'test', expires: Date.now() + 1000 })
  assert.equal(bodies[0].max_tokens, 1600)
  assert.equal(bodies[0].max_completion_tokens, undefined)
  assert.equal(bodies[1].max_completion_tokens, 2400)
  assert.equal(bodies[1].max_tokens, undefined)
})

test('Ollama draft transport requests one non-streaming JSON response and propagates errors', async () => {
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
    assert.equal(bodies[0].stream, false, 'Drafts must not depend on streamed completion markers')
    fail = true
    await assert.rejects(invokeModel('Return JSON.', 'Synthetic transport fixture.', AbortSignal.timeout(5000), true))
    assert.equal(bodies.length, 2, 'The transport must not add hidden retries')
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
})
