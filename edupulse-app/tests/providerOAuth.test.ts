import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { providerOAuth } from '../server/domains/providerOAuth.js'
import { readConnection, sealProviderState, unsealProviderState, createConnection } from '../server/connections.js'
import type { Identity } from '../server/contracts.js'
import { clearProviderAuthorization, providerAuthorizationReturn, rememberProviderAuthorization } from '../src/lib/providerOAuth.js'

process.env.VERCEL = '1'
process.env.AI_CONNECTION_SECRET = 'cd'.repeat(32)
const actor: Identity = { id: 'oauth-fixture-owner', role: 'instructor', local: false }
const url = 'https://edupulse.test/api/ai?action=provider-oauth'

test('provider OAuth uses fixed hosts, private PKCE, expiring owner/origin/state checks and redacted credentials', async t => {
  const started = await providerOAuth(new Request(url), actor, { operation: 'start', provider: 'openrouter' })
  const authorization = new URL((started.body as { authorizationUrl: string }).authorizationUrl)
  assert.equal(authorization.origin, 'https://openrouter.ai')
  assert.equal(authorization.searchParams.get('callback_url'), 'https://edupulse.test/auth/provider/openrouter')
  assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256')
  assert.match(started.cookie, /HttpOnly; SameSite=Strict; Max-Age=600; Secure/)
  const encoded = started.cookie.split(';')[0].split('=')[1]
  const pending = unsealProviderState(encoded) as { state: string; verifier: string; expires: number }
  assert(!JSON.stringify(started.body).includes(pending.verifier))
  assert.equal(authorization.searchParams.get('code_challenge'), createHash('sha256').update(pending.verifier).digest('base64url'))
  const command = { operation: 'complete' as const, code: 'synthetic-authorization-code', state: pending.state }
  const request = (cookie = started.cookie, origin = 'https://edupulse.test') => new Request(`${origin}/api/ai?action=provider-oauth`, { headers: { cookie } })
  const transport = globalThis.fetch
  let exchanges = 0
  globalThis.fetch = async (input, init) => {
    if (String(input) === 'https://openrouter.ai/api/v1/auth/keys') {
      exchanges++
      assert.equal(JSON.parse(String(init?.body)).code_verifier, pending.verifier)
      assert.equal(init?.redirect, 'error')
      return exchanges === 1 ? Response.json({ key: 'synthetic-openrouter-private-key' }) : Response.json({ error: 'used code' }, { status: 400 })
    }
    if (String(input) === 'https://openrouter.ai/api/v1/models') return Response.json({ data: [{ id: 'test/model:free', name: 'Synthetic model' }] })
    throw new Error('Unexpected provider destination')
  }
  t.after(() => { globalThis.fetch = transport })
  await assert.rejects(providerOAuth(request(), { ...actor, id: 'other-account' }, command))
  await assert.rejects(providerOAuth(request(), actor, { ...command, state: 'z'.repeat(43) }))
  await assert.rejects(providerOAuth(request(undefined, 'https://other.test'), actor, command))
  await assert.rejects(providerOAuth(request(`__Host-edupulse-provider-oauth=${sealProviderState({ ...pending, expires: 0, owner: actor.id, origin: 'https://edupulse.test' })}`), actor, command))
  assert.equal(exchanges, 0, 'invalid state must never exchange a code')
  const completed = await providerOAuth(request(), actor, command)
  assert(!JSON.stringify(completed.body).includes('synthetic-openrouter-private-key'))
  assert.equal(readConnection(request(completed.cookie), actor)?.provider, 'openrouter')
  await assert.rejects(providerOAuth(request(), actor, command), /could not authorize/)
  await assert.rejects(providerOAuth(new Request(url), { ...actor, role: 'guest' }, { operation: 'start', provider: 'openrouter' }))
})

test('a verified OAuth exchange keeps the protected credential when catalog discovery is temporarily unavailable', async t => {
  const original = globalThis.fetch
  t.after(() => { globalThis.fetch = original })
  const started = await providerOAuth(new Request(url), actor, { operation: 'start', provider: 'openrouter' })
  const state = new URL(started.body.authorizationUrl!).searchParams.get('state')!
  globalThis.fetch = async target => String(target).endsWith('/auth/keys') ? Response.json({ key: 'synthetic-authorized-key' }) : new Response(null, { status: 503 })
  const result = await providerOAuth(new Request(url, { headers: { cookie: started.cookie } }), actor, { operation: 'complete', code: 'synthetic-code', state })
  const saved = readConnection(new Request(url, { headers: { cookie: result.cookie } }), actor)!
  assert.equal(saved.apiKey, 'synthetic-authorized-key')
  assert.equal(saved.model, '')
  assert.match(result.body.warning!, /Refresh models/)
  assert(!JSON.stringify(result.body).includes(saved.apiKey!))
  globalThis.fetch = async () => Response.json({ data: [{ id: 'test/model:free' }] })
  assert.equal((await createConnection({ provider: 'openrouter' }, actor, saved)).connection.model, 'test/model:free')
})

test('provider return detection supports dedicated, legacy and state-marked returns without consuming unrelated sign-in codes', () => {
  const values = new Map<string, string>()
  const storage: Storage = { get length() { return values.size }, clear: () => values.clear(), key: (index: number) => [...values.keys()][index] || null, getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
  const returned = 'https://edupulse.test/?code=synthetic&state=synthetic-state'
  assert.equal(providerAuthorizationReturn(new URL(returned), storage), null)
  rememberProviderAuthorization('https://openrouter.ai/auth?state=synthetic-state', storage)
  assert.equal(providerAuthorizationReturn(new URL(returned), storage)?.code, 'synthetic')
  assert.equal(providerAuthorizationReturn(new URL(returned.replace('synthetic-state', 'other-state')), storage), null)
  clearProviderAuthorization(storage)
  assert.equal(providerAuthorizationReturn(new URL(returned), storage), null)
  assert.equal(providerAuthorizationReturn(new URL('https://edupulse.test/auth/provider/openrouter?code=synthetic&state=synthetic-state'), storage)?.code, 'synthetic')
  assert.equal(providerAuthorizationReturn(new URL(`${returned}&provider_callback=openrouter`), storage)?.code, 'synthetic')
  const blocked = { getItem() { throw new Error('Storage unavailable') }, setItem() { throw new Error('Storage unavailable') } } as unknown as Storage
  assert.doesNotThrow(() => rememberProviderAuthorization('https://openrouter.ai/auth?state=synthetic-state', blocked))
  assert(providerAuthorizationReturn(new URL('https://edupulse.test/auth/provider/openrouter?error=access_denied'), blocked))
  values.set('edupulse-provider-authorization', JSON.stringify({ state: 'synthetic-state', expires: 0 }))
  assert.equal(providerAuthorizationReturn(new URL(returned), storage), null)
})

test('refreshing models preserves the chosen model instead of selecting the alphabetically first model', async t => {
  const transport = globalThis.fetch
  globalThis.fetch = async () => Response.json({ data: [{ id: 'gpt-3.5-turbo' }, { id: 'gpt-4.1-mini' }] })
  t.after(() => { globalThis.fetch = transport })
  const fresh = await createConnection({ provider: 'openai', apiKey: 'synthetic-test-key' }, actor)
  assert.equal(fresh.connection.model, 'gpt-4.1-mini')
  const selected = { ...fresh.connection, model: 'gpt-3.5-turbo' }
  assert.equal((await createConnection({ provider: 'openai' }, actor, selected)).connection.model, 'gpt-3.5-turbo')
})
