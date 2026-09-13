import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite-pgvector'

test('Supabase migration enforces account isolation, vector search and atomic ingestion', async () => {
  const db = new PGlite({ extensions: { vector } })
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated, anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
      INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');`)
    await db.exec(await readFile('supabase/migrations/20260913112259_connected_ai.sql', 'utf8'))
    const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222'
    const embedding = [1, ...Array(383).fill(0)]
    const chunks = JSON.stringify([{ text: 'Private reference for account A.', embedding }])
    await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub='${a}';`)
    const first = await db.query<{ id: string }>('SELECT public.edupulse_ingest_document($1,$2,$3::jsonb) AS id', ['Private A', 'a'.repeat(64), chunks])
    assert(first.rows[0].id)
    const duplicate = await db.query<{ id: string }>('SELECT public.edupulse_ingest_document($1,$2,$3::jsonb) AS id', ['Private A', 'a'.repeat(64), chunks])
    assert.equal(duplicate.rows[0].id, first.rows[0].id)
    const matches = await db.query('SELECT * FROM public.edupulse_match_chunks($1::extensions.vector,5,0.25)', [JSON.stringify(embedding)])
    assert.equal(matches.rows.length, 1)
    await assert.rejects(db.query('SELECT public.edupulse_ingest_document($1,$2,$3::jsonb)', ['Broken', 'b'.repeat(64), JSON.stringify([{ text: 'Bad vector', embedding: [1, 2] }])]))
    assert.equal((await db.query('SELECT * FROM public.edupulse_ai_documents')).rows.length, 1, 'Failed ingestion rolls back the parent document')
    await db.exec(`SET request.jwt.claim.sub='${b}';`)
    assert.equal((await db.query('SELECT * FROM public.edupulse_ai_documents')).rows.length, 0)
    assert.equal((await db.query('SELECT * FROM public.edupulse_match_chunks($1::extensions.vector,5,0)', [JSON.stringify(embedding)])).rows.length, 0)
    await assert.rejects(db.query('INSERT INTO public.edupulse_ai_documents(owner_id,title,content_hash) VALUES($1,$2,$3)', [a, 'Spoof', 'c'.repeat(64)]))
    await db.query('DELETE FROM public.edupulse_ai_documents WHERE id=$1', [first.rows[0].id])
    await db.exec(`SET request.jwt.claim.sub='${a}';`)
    assert.equal((await db.query('SELECT * FROM public.edupulse_ai_documents')).rows.length, 1, 'Other owner cannot delete the row')
    await db.query('DELETE FROM public.edupulse_ai_documents WHERE id=$1', [first.rows[0].id])
    assert.equal((await db.query('SELECT * FROM public.edupulse_ai_chunks')).rows.length, 0)
    await db.exec('RESET ROLE; SET ROLE anon;')
    await assert.rejects(db.query('SELECT * FROM public.edupulse_ai_documents'))
    await assert.rejects(db.query('SELECT public.edupulse_ingest_document($1,$2,$3::jsonb)', ['Anon', 'd'.repeat(64), chunks]))
  } finally { await db.close() }
})
