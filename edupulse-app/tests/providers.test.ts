import test, { type TestContext } from 'node:test'
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
  assert.equal(bodies[1].max_output_tokens, 2624, 'a 1,600-token answer plus a 1,024-token reasoning allowance')
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

const openrouter = (model: string) => ({ provider: 'openrouter' as const, model, apiKey: 'synthetic-only', owner: 'test', id: 'test', expires: Date.now() + 1000 })
// Entries shaped like the public catalogue (https://openrouter.ai/api/v1/models), reduced to the fields EduPulse reads.
const catalogue = { data: [
  { id: 'test/thinks:free', supported_parameters: ['include_reasoning', 'max_tokens', 'reasoning'], reasoning: { mandatory: false } },
  { id: 'test/quiet:free', supported_parameters: ['max_tokens', 'reasoning', 'response_format'], reasoning: { mandatory: false, default_enabled: false } },
  { id: 'test/plain', supported_parameters: ['max_tokens', 'response_format'] },
  { id: 'test/always:free', supported_parameters: ['max_tokens', 'reasoning'], reasoning: { mandatory: true } },
] }
const reply = (content: string, finish = 'stop', reasoningTokens = 0) => () => Response.json({ choices: [{ finish_reason: finish, message: { content } }], usage: { completion_tokens_details: { reasoning_tokens: reasoningTokens } } })
const reasoningLimit = (error: { code?: string; message?: string }) => error.code === 'INCOMPLETE_RESPONSE' && /hidden reasoning/.test(error.message || '')

/** Serves the catalogue and answers chat requests with `replies`, in order. */
function openRouterFixture(t: TestContext, replies: (() => Response)[]) {
  const original = globalThis.fetch, chats: Record<string, unknown>[] = []
  let catalogueReads = 0
  globalThis.fetch = async (url, init) => {
    if (String(url) === 'https://openrouter.ai/api/v1/models') { catalogueReads++; return Response.json(catalogue) }
    chats.push(JSON.parse(String(init?.body)))
    return replies[Math.min(chats.length, replies.length) - 1]!()
  }
  t.after(() => { globalThis.fetch = original })
  return { chats, catalogueReads: () => catalogueReads }
}

test('OpenRouter gives a reasoning model bounded thinking on top of the answer budget, read once from the catalogue', async t => {
  const fixture = openRouterFixture(t, [reply('Hello.')])
  for (const model of ['test/thinks:free', 'test/quiet:free', 'test/plain', 'test/always:free']) assert.equal(await invokeModel('Help.', 'Hi', AbortSignal.timeout(1000), false, openrouter(model), 800), 'Hello.')
  assert.equal(await invokeModel('Return JSON.', 'Draft', AbortSignal.timeout(1000), true, openrouter('test/thinks:free')), 'Hello.')
  const [thinks, quiet, plain, always, draft] = fixture.chats
  assert.equal(thinks!.max_tokens, 1824); assert.deepEqual(thinks!.reasoning, { max_tokens: 1024, exclude: true })
  assert.equal(quiet!.max_tokens, 800); assert.equal(quiet!.reasoning, undefined, 'a model that reasons only on request is not asked to')
  assert.equal(plain!.max_tokens, 800); assert.equal(plain!.reasoning, undefined)
  assert.equal(always!.max_tokens, 1824); assert.deepEqual(always!.reasoning, { max_tokens: 1024, exclude: true })
  assert.equal(draft!.max_tokens, 7048); assert.deepEqual(draft!.reasoning, { max_tokens: 2048, exclude: true })
  assert.deepEqual(draft!.response_format, { type: 'json_object' })
  assert.equal(fixture.catalogueReads(), 1)
})

test('an OpenRouter reply whose thinking used the limit is asked once more with thinking off', async t => {
  const fixture = openRouterFixture(t, [reply('', 'length', 1824), reply('Answer.'), reply('Half an ans', 'length', 1500), reply('Whole answer.'), reply('A long answer that does not fit', 'length', 300)])
  assert.equal(await invokeModel('Help.', 'Hi', AbortSignal.timeout(1000), false, openrouter('test/thinks:free'), 800), 'Answer.')
  assert.equal(fixture.chats[1]!.max_tokens, 800); assert.deepEqual(fixture.chats[1]!.reasoning, { effort: 'none' })
  assert.equal(await invokeModel('Help.', 'Hi', AbortSignal.timeout(1000), false, openrouter('test/thinks:free'), 800), 'Whole answer.', 'reasoning beyond its allowance cut the answer short')
  await assert.rejects(invokeModel('Help.', 'Hi', AbortSignal.timeout(1000), false, openrouter('test/thinks:free'), 800), (error: { code?: string; message?: string }) => error.code === 'INCOMPLETE_RESPONSE' && /output limit before completing/.test(error.message || ''))
  assert.equal(fixture.chats.length, 5, 'an answer that is itself too long is not retried')
})

test('a model that must think, or refuses to stop, reports the reasoning limit instead of retrying again', async t => {
  const refusal = () => Response.json({ error: { code: 400, message: 'Reasoning is mandatory for this endpoint and cannot be disabled.' } }, { status: 400 })
  const fixture = openRouterFixture(t, [reply('', 'length', 1824), reply('', 'length', 1824), refusal])
  await assert.rejects(invokeModel('Help.', 'Hi', AbortSignal.timeout(1000), false, openrouter('test/always:free'), 800), reasoningLimit)
  assert.equal(fixture.chats.length, 1)
  await assert.rejects(invokeModel('Help.', 'Hi', AbortSignal.timeout(1000), false, openrouter('test/unlisted'), 800), reasoningLimit)
  assert.deepEqual(fixture.chats[1]!.reasoning, { max_tokens: 1024, exclude: true }, 'a model the catalogue does not list is treated as reasoning')
  assert.equal(fixture.chats.length, 3); assert.deepEqual(fixture.chats[2]!.reasoning, { effort: 'none' })
})

test('OpenAI reasoning models keep the answer budget and name a reasoning limit without retrying', async t => {
  const original = globalThis.fetch, bodies: Record<string, unknown>[] = []
  let starved = false
  globalThis.fetch = async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body)))
    return Response.json(starved ? { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output: [{ type: 'reasoning', summary: [] }], usage: { output_tokens_details: { reasoning_tokens: 1824 } } } : { output: [{ type: 'message', content: [{ type: 'output_text', text: 'Hello.' }] }] })
  }
  t.after(() => { globalThis.fetch = original })
  const connection = { provider: 'openai' as const, model: 'gpt-5-mini', apiKey: 'synthetic-only', owner: 'test', id: 'test', expires: Date.now() + 1000 }
  assert.equal(await invokeModel('Help.', 'Hi', AbortSignal.timeout(1000), false, connection, 800), 'Hello.')
  assert.equal(bodies[0]!.max_output_tokens, 1824)
  starved = true
  await assert.rejects(invokeModel('Help.', 'Hi', AbortSignal.timeout(1000), false, connection, 800), reasoningLimit)
  assert.equal(bodies.length, 2)
})

test('Gemini thinking gets room on top of the answer budget', async t => {
  const original = globalThis.fetch, configs: { maxOutputTokens?: number }[] = []
  globalThis.fetch = async (_url, init) => { configs.push(JSON.parse(String(init?.body)).generationConfig); return Response.json({ candidates: [{ content: { role: 'model', parts: [{ text: 'Hello.' }] }, finishReason: 'STOP', index: 0 }] }) }
  t.after(() => { globalThis.fetch = original })
  const connection = { provider: 'gemini' as const, model: 'gemini-2.5-flash', apiKey: 'synthetic-only', owner: 'test', id: 'test', expires: Date.now() + 1000 }
  assert.equal(await invokeModel('Be brief.', 'Hi', AbortSignal.timeout(1000), false, connection, 800), 'Hello.')
  assert.equal(await invokeModel('Be brief.', 'Hi', AbortSignal.timeout(1000), false, connection), 'Hello.')
  assert.deepEqual(configs.map(config => config.maxOutputTokens), [1824, 3024])
})

test('Ollama context windows hold the whole prompt, so the instructions at its start are never cut', async t => {
  const original = globalThis.fetch, options: { num_ctx?: number }[] = []
  globalThis.fetch = async (_url, init) => {
    options.push(JSON.parse(String(init?.body)).options)
    return new Response(JSON.stringify({ model: 'test', message: { role: 'assistant', content: '{"ok":true}' }, done: true, done_reason: 'stop' }) + '\n', { headers: { 'Content-Type': 'application/x-ndjson' } })
  }
  t.after(() => { globalThis.fetch = original })
  const connection = { provider: 'ollama' as const, model: 'test', owner: 'test', id: 'test', expires: Date.now() + 1000 }
  for (const [prompt, json, budget] of [['Short.', true, undefined], ['x'.repeat(15000), true, undefined], ['x'.repeat(30000), true, 1800], ['x'.repeat(60000), true, 5000], ['Short.', false, 800], ['x'.repeat(20000), false, 800]] as const) await invokeModel('Return JSON.', prompt, AbortSignal.timeout(1000), json, connection, budget)
  assert.deepEqual(options.map(option => option.num_ctx), [4096, 8192, 16384, 32768, 4096, 8192])
})
