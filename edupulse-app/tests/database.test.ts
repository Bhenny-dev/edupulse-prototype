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

test('agentic RAG migration adds owner-scoped hybrid search with validated terms and metadata', async () => {
  const db = new PGlite({ extensions: { vector } })
  const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222'
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated, anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
      INSERT INTO auth.users VALUES ('${a}'), ('${b}');`)
    await db.exec(await readFile('supabase/migrations/20260913112259_connected_ai.sql', 'utf8'))
    // An existing v0.1 document (older embedding model) must survive the migration and stay out of v0.4 search.
    await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub='${a}';`)
    await db.query('SELECT public.edupulse_ingest_document($1,$2,$3::jsonb)', ['Legacy', 'e'.repeat(64), JSON.stringify([{ text: 'Legacy laboratory grading note.', embedding: [0, 1, ...Array(382).fill(0)] }])])
    await db.exec('RESET ROLE;')
    await db.exec(await readFile('supabase/migrations/20261001090000_agentic_rag.sql', 'utf8'))
    const near = [1, ...Array(383).fill(0)], far = [0, 0, 1, ...Array(381).fill(0)]
    const doc = (title: string, hash: string, extra: Record<string, unknown> = {}) => JSON.stringify({ title, content_hash: hash, embedding_model: 'all-minilm-l6-v2-int8', source_type: 'pdf', file_name: `${title}.pdf`, char_count: 120, page_count: 2, quality: { score: 92, grade: 'good' }, ...extra })
    const chunks = JSON.stringify([
      { text: 'Laboratory exercises count for forty percent of the grade.', embedding: near, chunk_index: 0, page: 1, section: 'Grading', flagged: false },
      { text: 'Attendance is recorded during every laboratory session.', embedding: far, chunk_index: 1, page: 2, section: 'Policy', flagged: false },
    ])
    await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub='${a}';`)
    const first = (await db.query<{ id: string }>('SELECT public.edupulse_ingest_document_v2($1::jsonb,$2::jsonb) AS id', [doc('Policy', 'a'.repeat(64)), chunks])).rows[0]!.id
    assert.equal((await db.query<{ id: string }>('SELECT public.edupulse_ingest_document_v2($1::jsonb,$2::jsonb) AS id', [doc('Policy', 'a'.repeat(64)), chunks])).rows[0]!.id, first, 'duplicate content returns the existing document')
    await assert.rejects(db.query('SELECT public.edupulse_ingest_document_v2($1::jsonb,$2::jsonb)', [doc('Bad', 'b'.repeat(64), { source_type: 'exe' }), chunks]), 'unsupported source types are rejected')
    await assert.rejects(db.query('SELECT public.edupulse_ingest_document_v2($1::jsonb,$2::jsonb)', [doc('Empty', 'c'.repeat(64)), '[]']))
    const hybrid = await db.query<{ text: string; page: number; section: string; vector_rank: number | null; keyword_rank: number | null; similarity: number | null }>('SELECT * FROM public.edupulse_hybrid_chunks($1::extensions.vector,$2::text[],10)', [JSON.stringify(near), ['attendance', 'laboratory']])
    const grading = hybrid.rows.find(r => r.page === 1)!, attendance = hybrid.rows.find(r => r.page === 2)!
    assert.equal(grading.vector_rank, 1); assert.equal(grading.section, 'Grading'); assert.ok(attendance.keyword_rank === 1, 'keyword ranking favors the passage containing both terms')
    assert.ok(hybrid.rows.every(r => !/Legacy/.test(r.text)), 'vectors from an earlier embedding model are not compared')
    assert.equal((await db.query('SELECT * FROM public.edupulse_hybrid_chunks($1::extensions.vector,$2::text[],10,$3,$4::uuid[])', [JSON.stringify(near), [], 'all-minilm-l6-v2-int8', [first]])).rows.length, 2)
    await assert.rejects(db.query('SELECT * FROM public.edupulse_hybrid_chunks($1::extensions.vector,$2::text[],10)', [JSON.stringify(near), ["x') | !!(drop"]]), 'non-alphanumeric query terms are rejected before to_tsquery')
    await db.exec(`SET request.jwt.claim.sub='${b}';`)
    assert.equal((await db.query('SELECT * FROM public.edupulse_hybrid_chunks($1::extensions.vector,$2::text[],10)', [JSON.stringify(near), ['laboratory']])).rows.length, 0, 'another account sees nothing')
    await db.exec('RESET ROLE; SET ROLE anon;')
    await assert.rejects(db.query('SELECT * FROM public.edupulse_hybrid_chunks($1::extensions.vector,$2::text[],10)', [JSON.stringify(near), ['laboratory']]))
  } finally { await db.close() }
})
