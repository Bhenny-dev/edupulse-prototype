import test from 'node:test'
import assert from 'node:assert/strict'
import { canGenerateCourseware, canUseSamplePerformance, canViewPerformance } from '../src/lib/access.js'
import { pageFor } from '../src/agents/operator.js'
import { handleRequest } from '../server/http.js'

test('AUTH-001: performance navigation denies academic management and admin console views', () => {
  for (const role of ['associate_dean', 'admin', 'guest', 'unknown']) {
    assert.equal(canViewPerformance(role), false)
    assert.equal(pageFor('open performance', role)?.denied, true)
  }
  for (const role of ['dean', 'instructor', 'student']) {
    assert.equal(canViewPerformance(role), true)
    assert.equal(pageFor('open performance', role)?.path, '/performance')
  }
})

test('DATA-001: authenticated accounts never consume sample performance', () => {
  assert.equal(canUseSamplePerformance({ demo: true }), true)
  for (const user of [null, {}, { authenticated: true }, { demo: true, authenticated: true }]) {
    assert.equal(canUseSamplePerformance(user), false)
  }
})

test('AUTH-002: courseware author capability preserves instructor and owner identity', () => {
  for (const role of ['instructor', 'admin']) assert.equal(canGenerateCourseware(role), true)
  for (const role of ['dean', 'associate_dean', 'student', 'guest']) assert.equal(canGenerateCourseware(role), false)
})

test('AUTH-002: forged courseware calls are denied before validation or model invocation', async t => {
  const previous = { fetch: globalThis.fetch, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_PUBLISHABLE_KEY }
  t.after(() => {
    globalThis.fetch = previous.fetch
    for (const [name, value] of Object.entries({ SUPABASE_URL: previous.url, SUPABASE_PUBLISHABLE_KEY: previous.key })) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value
    }
  })
  process.env.SUPABASE_URL = 'https://auth.example.com'
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test'
  for (const role of ['dean', 'associate_dean', 'student']) {
    let calls = 0
    globalThis.fetch = async () => { calls++; return Response.json({ id: role, email: `${role}@example.com`, app_metadata: { role } }) }
    const response = await handleRequest(new Request('http://localhost/api/ai?action=courseware', {
      method: 'POST', headers: { Authorization: 'Bearer test-session', 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'instructor', viewRole: 'instructor', userId: 'another-owner' }),
    }))
    assert.equal(response.status, 403)
    assert.equal((await response.json()).error.code, 'FORBIDDEN')
    assert.equal(calls, 1, 'only the verified identity lookup runs')
  }
})
