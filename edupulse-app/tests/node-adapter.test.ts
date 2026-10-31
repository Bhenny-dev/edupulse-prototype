import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer, request, type IncomingMessage } from 'node:http'
import { once } from 'node:events'
import { PassThrough } from 'node:stream'
import { BODY_READ_TIMEOUT_MS, handleNodeRequest, readNodeBody } from '../server/node-adapter.js'
import { allowedMethods, handleRequest } from '../server/http.js'

test('Node transport enforces route methods, byte limits and safe failures over a real socket', { timeout: 10000 }, async t => {
  let calls = 0
  const server = createServer((req, res) => {
    void handleNodeRequest(req, res, async incoming => {
      calls++
      if (incoming.headers.has('x-synthetic-failure')) throw new Error('PRIVATE BODY / provider key')
      return Response.json({ body: await incoming.text(), method: incoming.method })
    })
  })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  t.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) })
  const address = server.address(); assert(address && typeof address !== 'string')
  const send = (path: string, method: string, headers: Record<string, string> = {}, body?: string, leaveOpen = false) => new Promise<{ status: number; headers: IncomingMessage['headers']; body: string }>((resolve, reject) => {
    const client = request({ host: '127.0.0.1', port: address.port, path, method, headers }, response => {
      let text = ''
      response.on('data', chunk => { text += chunk })
      response.on('end', () => { resolve({ status: response.statusCode!, headers: response.headers, body: text }); client.destroy() })
    })
    client.on('error', reject)
    client.setTimeout(3000, () => client.destroy(new Error('Test request timed out')))
    if (body) client.write(body)
    if (!leaveOpen) client.end()
  })
  for (const method of ['TRACE', 'POST', 'OPTIONS']) {
    const result = await send('/api/ai?action=health', method)
    assert.equal(result.status, 405); assert.equal(result.headers.allow, 'GET')
  }
  for (const action of ['missing', '__proto__', 'constructor', 'toString']) {
    assert.equal(allowedMethods(action), undefined)
    assert.equal((await send(`/api/ai?action=${action}`, 'POST')).status, 404)
    assert.equal((await handleRequest(new Request(`http://localhost/api/ai?action=${action}`, { method: 'POST' }))).status, 404)
  }
  assert.equal(calls, 0)
  const oversized = await send('/api/ai?action=chat', 'POST', { 'Transfer-Encoding': 'chunked' }, 'é'.repeat(51_000), true)
  assert.equal(oversized.status, 413); assert.equal(oversized.headers['cache-control'], 'no-store')
  assert.equal(JSON.parse(oversized.body).error.code, 'BODY_TOO_LARGE'); assert.equal(calls, 0)
  const declared = await send('/api/ai?action=chat', 'POST', { 'Content-Length': '100001' }, 'x', true)
  assert.equal(declared.status, 413); assert.equal(calls, 0)
  const valid = await send('/api/ai?action=chat', 'POST', {}, 'Café — unchanged')
  assert.equal(valid.status, 200); assert.equal(JSON.parse(valid.body).body, 'Café — unchanged')
  const failed = await send('/api/ai?action=chat', 'POST', { 'x-synthetic-failure': '1' }, '{}')
  assert.equal(failed.status, 503); assert.doesNotMatch(failed.body, /PRIVATE|provider key/)
  assert.equal(JSON.parse(failed.body).error.code, 'SERVICE_UNAVAILABLE')
})

test('body intake preserves parsed and split bytes and releases listeners on completion, timeout and disconnect', async () => {
  const input = (body?: unknown) => Object.assign(new PassThrough(), { headers: {}, complete: false, ...(body === undefined ? {} : { body }) }) as unknown as IncomingMessage
  for (const value of [Buffer.from('binary bytes'), new Uint8Array([0, 255]), { title: 'Café' }, 'plain text']) {
    const expected = typeof value === 'string' ? Buffer.from(value) : value instanceof Uint8Array ? Buffer.from(value) : Buffer.from(JSON.stringify(value))
    assert.deepEqual(await readNodeBody(input(value), 100, AbortSignal.timeout(1000)), expected)
  }
  await assert.rejects(readNodeBody(input('é'.repeat(6)), 10, AbortSignal.timeout(1000)), { code: 'BODY_TOO_LARGE' })
  const split = input(), bytes = Buffer.from('Café')
  const body = readNodeBody(split, 20, AbortSignal.timeout(1000))
  const writable = split as unknown as PassThrough
  writable.write(bytes.subarray(0, 4)); writable.end(bytes.subarray(4))
  assert.equal((await body).toString(), 'Café')
  assert.equal(split.listenerCount('data'), 0)
  const stalled = input(), abort = new AbortController()
  const pending = readNodeBody(stalled, 100, abort.signal)
  abort.abort(new DOMException('Intake deadline', 'TimeoutError'))
  await assert.rejects(pending, { name: 'TimeoutError' })
  for (const event of ['data', 'end', 'error', 'close']) assert.equal(stalled.listenerCount(event), 0)
  const dropped = input(), disconnected = readNodeBody(dropped, 100, AbortSignal.timeout(1000))
  dropped.destroy()
  await assert.rejects(disconnected, { code: 'REQUEST_INCOMPLETE' })
})

test('disconnecting the HTTP client cancels active downstream work', { timeout: 10000 }, async t => {
  let entered!: () => void, cancelled!: () => void
  let calls = 0
  const started = new Promise<void>(resolve => { entered = resolve })
  const stopped = new Promise<void>(resolve => { cancelled = resolve })
  const server = createServer((req, res) => {
    void handleNodeRequest(req, res, async incoming => {
      calls++
      entered()
      await new Promise<void>(resolve => incoming.signal.addEventListener('abort', () => { cancelled(); resolve() }, { once: true }))
      return Response.json({ discarded: true })
    })
  })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  t.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) })
  const address = server.address(); assert(address && typeof address !== 'string')
  const client = request({ host: '127.0.0.1', port: address.port, path: '/api/ai?action=chat', method: 'POST' })
  client.on('error', () => {})
  client.end('{}'); await started; client.destroy(); await stopped
  // A disconnect during upload must finish intake without starting downstream work.
  let received!: () => void, closed!: () => void
  const receiving = new Promise<void>(resolve => { received = resolve })
  const dropped = new Promise<void>(resolve => { closed = resolve })
  server.once('request', req => { received(); req.once('close', closed) })
  const partial = request({ host: '127.0.0.1', port: address.port, path: '/api/ai?action=chat', method: 'POST', headers: { 'Content-Length': '20' } })
  partial.on('error', () => {})
  partial.write('{'); await receiving; partial.destroy(); await dropped
  assert.equal(calls, 1)
})

test('an unfinished upload receives a safe 408 within the body deadline without dispatching', { timeout: BODY_READ_TIMEOUT_MS + 10000 }, async t => {
  let calls = 0
  const server = createServer((req, res) => {
    void handleNodeRequest(req, res, async () => { calls++; return Response.json({ unexpected: true }) })
  })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  t.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) })
  const address = server.address(); assert(address && typeof address !== 'string')
  const started = Date.now()
  const result = await new Promise<{ status: number; body: string; cache: string | undefined }>((resolve, reject) => {
    const client = request({ host: '127.0.0.1', port: address.port, path: '/api/ai?action=chat', method: 'POST', headers: { 'Content-Length': '20' } }, response => {
      let body = ''
      response.on('data', chunk => { body += chunk })
      response.on('end', () => { resolve({ status: response.statusCode!, body, cache: response.headers['cache-control'] }); client.destroy() })
    })
    client.on('error', reject)
    client.setTimeout(BODY_READ_TIMEOUT_MS + 5000, () => client.destroy(new Error('No intake timeout response')))
    client.write('{')
  })
  assert.equal(result.status, 408); assert.equal(result.cache, 'no-store')
  assert.equal(JSON.parse(result.body).error.code, 'REQUEST_TIMEOUT')
  assert.ok(JSON.parse(result.body).error.requestId)
  assert.equal(calls, 0)
  assert.ok(Date.now() - started >= BODY_READ_TIMEOUT_MS - 100)
})
