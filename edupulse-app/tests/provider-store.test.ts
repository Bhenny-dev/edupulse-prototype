import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { handleRequest } from '../server/http.js'
import { closeLocalDb, localDb } from '../server/database.js'
import { loadProviders, resolveProvider, saveProvider } from '../server/providerStore.js'
import { connectionCookie } from '../server/connections.js'

test('connections and selected models survive sign-out, reopening and provider changes without exposing keys', async t => {
  const names = ['VERCEL', 'AI_LOCAL_MODE', 'AI_VECTOR_STORE', 'AI_DATA_DIR', 'AI_CONNECTION_SECRET', 'AI_PROVIDER'] as const
  const old = Object.fromEntries(names.map(name => [name, process.env[name]])), originalFetch = globalThis.fetch
  delete process.env.VERCEL
  process.env.AI_PROVIDER = 'openai'
  process.env.AI_LOCAL_MODE = 'true'; process.env.AI_VECTOR_STORE = 'local'; process.env.AI_CONNECTION_SECRET = '45'.repeat(32)
  const path = join(await mkdtemp(join(tmpdir(), 'edupulse-provider-store-')), 'db')
  process.env.AI_DATA_DIR = path
  t.after(async () => { globalThis.fetch = originalFetch; await closeLocalDb(); for (const name of names) { if (old[name] === undefined) delete process.env[name]; else process.env[name] = old[name] } })
  const seen: string[] = []
  globalThis.fetch = async (url) => {
    seen.push(String(url))
    if (new URL(String(url)).pathname.endsWith('/models')) return Response.json({ data: String(url).includes('anthropic') ? [{ id: 'claude-synthetic' }] : String(url).includes('openrouter') ? [{ id: 'synthetic/free:free' }] : [{ id: 'gpt-test' }, { id: 'gpt-other' }] })
    if (String(url).endsWith('/messages')) return Response.json({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'OK' }] })
    if (String(url).endsWith('/chat/completions')) return Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'OK' } }] })
    throw new Error('Unexpected provider destination')
  }
  const api = async (method: string, body?: unknown, query = '') => {
    const response = await handleRequest(new Request(`http://localhost/api/ai?action=providers${query}`, { method, ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}) }))
    const value = await response.json(); assert.equal(response.status, 200, JSON.stringify(value)); assert.equal(JSON.stringify(value).includes('synthetic-private-key'), false); return value
  }
  await api('POST', { provider: 'openai', apiKey: 'synthetic-private-key-openai', model: 'gpt-other' })
  await api('POST', { provider: 'anthropic', apiKey: 'synthetic-private-key-claude' })
  const testResponse = await handleRequest(new Request('http://localhost/api/ai?action=provider-test', { method: 'POST', body: '{}' }))
  assert.equal(testResponse.status, 200)
  const tested = (await testResponse.json()).connection.testedAt
  assert.ok(tested)
  await api('DELETE', undefined, '&sessionOnly=true')
  await closeLocalDb()
  const reopened = await api('GET')
  assert.equal(reopened.connection.provider, 'anthropic')
  assert.equal(reopened.connection.expiresAt, null)
  assert.equal(reopened.connection.testedAt, tested)
  assert.equal(reopened.connections.length, 2)
  const selected = await api('POST', { provider: 'openai' })
  assert.equal(selected.connection.model, 'gpt-other', 'saved model is restored without a new key')
  const owner = { id: 'local-workspace', role: 'instructor' as const, local: true }
  assert.equal((await loadProviders({ ...owner, id: 'other-account' })).length, 0)
  const stored = await loadProviders(owner)
  const ciphertext = (await (await localDb()).query<{ ciphertext: string }>('SELECT ciphertext FROM ep_provider_connections')).rows
  assert.ok(ciphertext.every(row => !row.ciphertext.includes('synthetic-private-key')))
  await assert.rejects(saveProvider({ ...owner, id: 'other-account' }, stored[0].connection), { code: 'FORBIDDEN' })
  // A provider cookie from another purpose/account is never a saved credential.
  const legacy = { ...stored[0].connection, provider: 'openrouter' as const, apiKey: 'synthetic-private-key-router', owner: 'legacy-owner', expires: Date.now() + 60000 }
  await resolveProvider(new Request('http://localhost', { headers: { cookie: connectionCookie(legacy) } }), { ...owner, id: 'legacy-owner' })
  assert.equal((await loadProviders({ ...owner, id: 'legacy-owner' }))[0].connection.provider, 'openrouter')
  await api('DELETE', undefined, '&provider=openai')
  const disconnected = await api('GET')
  assert.equal(disconnected.connection, null, 'disconnect does not silently switch to another provider')
  assert.equal(disconnected.connections.length, 1, 'the other saved provider remains available')
  await api('DELETE', undefined, '&provider=anthropic')
  await saveProvider(owner, stored.find(row => row.connection.provider === 'anthropic')!.connection, false)
  assert.equal(await resolveProvider(new Request('http://localhost', { headers: { cookie: connectionCookie(stored[0].connection) } }), owner), undefined, 'old cookies and in-flight verification cannot resurrect disconnected keys')
  assert.equal((await loadProviders(owner)).length, 0)
  await saveProvider(owner, stored[0].connection, true, true)
  assert.equal((await loadProviders(owner)).length, 0, 'an import that began before disconnect must recheck inside the transaction')
  assert.ok(seen.some(url => url === 'https://api.anthropic.com/v1/messages'))
})

test('hosted provider storage enforces owner RLS and atomic active-provider selection with invoker rights', async () => {
  const db = new PGlite()
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated,anon;
      INSERT INTO auth.users VALUES('11111111-1111-4111-8111-111111111111'),('22222222-1111-4111-8111-111111111111');`)
    await db.exec(await readFile('supabase/migrations/20261107073514_account_provider_connections.sql', 'utf8'))
    await db.exec(await readFile('supabase/migrations/20261107084843_atomic_provider_cookie_import.sql', 'utf8'))
    const as = async (id: string) => { await db.exec('RESET ROLE'); await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]); await db.exec('SET ROLE authenticated') }
    const save = (provider: string) => db.query("SELECT public.edupulse_save_provider($1,$2,'synthetic-revision')", [provider, 'encrypted-synthetic-value-'.repeat(3)])
    await as('11111111-1111-4111-8111-111111111111')
    await save('openai'); await save('anthropic')
    assert.deepEqual((await db.query('SELECT provider FROM public.edupulse_provider_connections WHERE active')).rows, [{ provider: 'anthropic' }])
    await assert.rejects(save('unsupported'), { code: '23514' })
    assert.deepEqual((await db.query('SELECT provider FROM public.edupulse_provider_connections WHERE active')).rows, [{ provider: 'anthropic' }], 'failed replacement rolls selection back')
    await db.query("SELECT public.edupulse_disconnect_provider('anthropic')")
    await db.query("SELECT public.edupulse_import_provider('anthropic',$1,'stale-revision')", ['encrypted-synthetic-value-'.repeat(3)])
    assert.equal((await db.query("SELECT * FROM public.edupulse_provider_connections WHERE provider='anthropic' AND ciphertext IS NOT NULL")).rows.length, 0, 'import never overwrites a disconnect marker')
    await as('22222222-1111-4111-8111-111111111111')
    assert.equal((await db.query('SELECT * FROM public.edupulse_provider_connections')).rows.length, 0)
    assert.equal((await db.query("DELETE FROM public.edupulse_provider_connections WHERE provider='anthropic' RETURNING *")).rows.length, 0)
    await assert.rejects(db.query("INSERT INTO public.edupulse_provider_connections(owner_id,provider,ciphertext) VALUES('11111111-1111-4111-8111-111111111111','groq',$1)", ['encrypted-test-'.repeat(5)]), { code: '42501' })
    await db.exec('RESET ROLE; SET ROLE anon')
    await assert.rejects(db.query('SELECT * FROM public.edupulse_provider_connections'), { code: '42501' })
    await assert.rejects(save('openai'), { code: '42501' })
    await assert.rejects(db.query("SELECT public.edupulse_disconnect_provider('openai')"), { code: '42501' })
  } finally { await db.close() }
})
