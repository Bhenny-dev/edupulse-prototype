import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer, request } from 'node:http'
import type { AddressInfo } from 'node:net'
import { handleNodeRequest, OPERATOR_REQUEST_TIMEOUT_MS } from '../server/node-adapter.js'

test('hosted operator deadline covers body intake and stops dispatched work with a readable response', {timeout:10000}, async t => {
  const hosted = process.env.VERCEL, timeout = AbortSignal.timeout
  process.env.VERCEL = '1'
  // Advance only the operator's production clock; exercise real sockets/body
  // intake and cancellation without waiting 85 seconds in the release gate.
  AbortSignal.timeout = ms => timeout(ms === OPERATOR_REQUEST_TIMEOUT_MS ? 40 : ms)
  let dispatched = 0, stopped = false
  const server = createServer((req, res) => { void handleNodeRequest(req, res, async input => {
    dispatched++
    if (!input.signal.aborted) await new Promise<void>(resolve => input.signal.addEventListener('abort', () => resolve(), { once: true }))
    stopped = input.signal.aborted
    return Response.json({ error: { code: 'TIMEOUT', message: 'Draft step timed out.' } }, { status: 504 })
  }) })
  t.after(async () => {
    AbortSignal.timeout = timeout
    if (hosted === undefined) delete process.env.VERCEL; else process.env.VERCEL = hosted
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()))
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const response = await fetch(`${origin}/api/ai?action=operator`, { method: 'POST', body: '{}' })
  assert.equal(response.status, 504)
  assert.equal((await response.json()).error.code, 'TIMEOUT')
  assert.equal(stopped, true)
  const intake = await new Promise<{ status?: number; body: string }>((resolve, reject) => {
    const pending = request(`${origin}/api/ai?action=operator`, { method: 'POST', headers: { 'Content-Length': '100' } }, res => {
      let body = ''; res.setEncoding('utf8'); res.on('data', part => { body += part }); res.on('end', () => resolve({ status: res.statusCode, body }))
    })
    pending.on('error', reject); pending.write('{')
  })
  assert.equal(intake.status, 408)
  assert.equal(JSON.parse(intake.body).error.code, 'REQUEST_TIMEOUT')
  assert.equal(dispatched, 1, 'a timed-out intake never reaches authentication/model work')
})
