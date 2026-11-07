import test from 'node:test'
import assert from 'node:assert/strict'
import { invokeModel } from '../server/providers.js'
import { discoverModels } from '../server/connections.js'
import { openaiRequestError } from '../server/openaiErrors.js'
import { ApiError } from '../server/contracts.js'
import { handleRequest } from '../server/http.js'
import { connectionCookie } from '../server/connections.js'
import { pageFor } from '../src/agents/operator.js'

test('first-request OpenAI 429 billing causes and throttling remain distinct, safe and never auto-retried', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original })
  for (const [code, phrase, expected] of [
    ['credit_balance_exhausted', 'credit balance', 'PROVIDER_CREDITS'],
    ['project_spend_limit_exceeded', 'project', 'PROVIDER_CREDITS'],
    ['organization_spend_limit_exceeded', 'organization', 'PROVIDER_CREDITS'],
    ['organization_usage_limit_exceeded', 'approved API usage', 'PROVIDER_CREDITS'],
    ['insufficient_quota', 'billing', 'PROVIDER_CREDITS'],
    ['slow_down', '60 seconds', 'PROVIDER_QUOTA'],
    ['rate_limit_exceeded', '60 seconds', 'PROVIDER_QUOTA'],
  ]) {
    let calls = 0
    globalThis.fetch = async url => { calls++; assert.equal(String(url), calls === 1 ? 'https://api.openai.com/v1/responses' : 'https://api.openai.com/v1/models'); return Response.json({ error: { code, type: expected === 'PROVIDER_CREDITS' ? 'insufficient_quota' : 'rate_limit_error', message: 'PRIVATE ACCOUNT, PROJECT AND API KEY' } }, { status: 429, headers: { 'retry-after': '60' } }) }
    const check = (error: unknown) => error instanceof ApiError && error.code === expected && error.message.includes(phrase!) && !error.message.includes('PRIVATE') && error.retryAfterSeconds === (expected === 'PROVIDER_QUOTA' ? 60 : undefined)
    await assert.rejects(invokeModel('Help the user.', 'Explain variables.', AbortSignal.timeout(1000), false, { provider: 'openai', model: 'gpt-5.6-sol', apiKey: 'synthetic-only', owner: 'fixture', id: 'fixture', expires: Date.now() + 10000 }), check)
    assert.equal(calls, 1, 'there is no paid inference retry or automatic model switch')
    await assert.rejects(discoverModels('openai', 'synthetic-only'), check)
    assert.equal(calls, 2)
  }
  assert.equal(openaiRequestError(429, '', 'insufficient_quota')?.code, 'PROVIDER_CREDITS')
  assert.equal(openaiRequestError(429, '', '', 'private-header')?.retryAfterSeconds, undefined)
  assert.equal(openaiRequestError(503, 'server_is_overloaded', '', '5')?.code, 'PROVIDER_UNAVAILABLE')
})

test('quota delivery carries safe Retry-After guidance and retains the saved credential', async t => {
  const original = globalThis.fetch, oldSecret = process.env.AI_CONNECTION_SECRET, oldHosted = process.env.VERCEL
  process.env.AI_CONNECTION_SECRET = '67'.repeat(32); process.env.VERCEL = '1'
  t.after(() => { globalThis.fetch = original; for (const [name, value] of Object.entries({ AI_CONNECTION_SECRET: oldSecret, VERCEL: oldHosted })) { if (value === undefined) delete process.env[name]; else process.env[name] = value } })
  let calls = 0
  globalThis.fetch = async () => { calls++; return Response.json({ error: { code: 'slow_down', type: 'rate_limit_error', message: 'PRIVATE PROVIDER DETAILS' } }, { status: 429, headers: { 'Retry-After': '30' } }) }
  const saved = { provider: 'openai' as const, model: 'gpt-5.6-sol', owner: 'public-guest', apiKey: 'synthetic-private-key', id: 'fixture', expires: Date.now() + 60000 }
  const response = await handleRequest(new Request('https://edupulse.test/api/ai?action=provider-test', { method: 'POST', headers: { cookie: connectionCookie(saved), 'Content-Type': 'application/json' }, body: '{}' }))
  const body = await response.json()
  assert.equal(response.status, 429); assert.equal(response.headers.get('Retry-After'), '30')
  assert.equal(body.error.code, 'PROVIDER_QUOTA'); assert.equal(body.error.retryAfterSeconds, 30)
  assert.equal(calls, 1); assert(!JSON.stringify(body).includes('PRIVATE')); assert(!JSON.stringify(body).includes(saved.apiKey))
  assert(response.headers.get('set-cookie')?.includes('Max-Age=604800'), 'the failure retains a protected credential, not a disconnect cookie')
})

test('Tagalog and mixed navigation keeps assigned-role restrictions', () => {
  assert.equal(pageFor('paki buksan ang syllabus', 'instructor')?.path, '/syllabus?tab=mine')
  assert.equal(pageFor('pumunta sa records', 'student')?.denied, true)
  assert.equal(pageFor('ipakita ang dean dashboard', 'instructor')?.denied, true)
})
