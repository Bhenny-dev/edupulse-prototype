import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const migrations = ['20261107073514_account_provider_connections.sql', '20261107084843_atomic_provider_cookie_import.sql', '20261116201500_deepseek_hermes_providers.sql']

test('the DeepSeek and Hermes migration widens the provider list, can be applied again, and still rejects unknown providers', async () => {
  const db = new PGlite()
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated,anon;
      INSERT INTO auth.users VALUES('11111111-1111-4111-8111-111111111111');`)
    for (const file of migrations) await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'))
    await db.exec(await readFile(`supabase/migrations/${migrations[2]}`, 'utf8'))
    await db.query("SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false)")
    await db.exec('SET ROLE authenticated')
    const save = (provider: string) => db.query("SELECT public.edupulse_save_provider($1,$2,'synthetic-revision')", [provider, 'encrypted-synthetic-value-'.repeat(3)])
    await save('openai'); await save('deepseek')
    assert.deepEqual((await db.query('SELECT provider FROM public.edupulse_provider_connections WHERE active')).rows, [{ provider: 'deepseek' }])
    await save('hermes')
    assert.deepEqual((await db.query('SELECT provider FROM public.edupulse_provider_connections WHERE active')).rows, [{ provider: 'hermes' }])
    await assert.rejects(save('unsupported'), { code: '23514' })
    assert.equal((await db.query('SELECT provider FROM public.edupulse_provider_connections')).rows.length, 3, 'earlier providers stay saved')
  } finally { await db.close() }
})
