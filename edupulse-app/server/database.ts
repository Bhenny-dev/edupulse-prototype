import { createHash, randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { PGlite } from '@electric-sql/pglite'
import { config } from './config.js'
import { ApiError, type Identity, type Source } from './contracts.js'
import { embed } from './providers.js'
import { publicKnowledge, splitDocument, keywordSearch } from './knowledge.js'

let localPromise: Promise<PGlite> | undefined
export const localSchema = `
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS ai_documents (
 id text PRIMARY KEY, owner_id text NOT NULL, title text NOT NULL, content_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(owner_id, content_hash)
);
CREATE TABLE IF NOT EXISTS ai_chunks (
 id text PRIMARY KEY, document_id text NOT NULL REFERENCES ai_documents(id) ON DELETE CASCADE,
 text text NOT NULL, embedding vector(384) NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_chunks_document_idx ON ai_chunks(document_id);
CREATE INDEX IF NOT EXISTS ai_documents_owner_idx ON ai_documents(owner_id);
`
export async function localDb() {
  if (config().hosted) throw new ApiError(503, 'LOCAL_STORE_DISABLED', 'Local storage is unavailable on serverless hosting.')
  localPromise ??= (async () => {
    const { PGlite: Pg } = await import('@electric-sql/pglite')
    const { vector } = await import('@electric-sql/pglite-pgvector')
    await mkdir(dirname(config().localPath), { recursive: true })
    const pg = new Pg(config().localPath, { extensions: { vector } })
    await pg.exec(localSchema)
    return pg
  })().catch(error => { localPromise = undefined; throw error })
  return localPromise
}

export function userDb(identity: Identity) {
  const c = config()
  if (!c.supabaseUrl || !c.supabaseKey) throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Supabase is not configured on the server.')
  return createClient(c.supabaseUrl, c.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: identity.token ? { Authorization: `Bearer ${identity.token}` } : {}, fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(8000) }) },
  })
}

export async function ingest(identity: Identity, title: string, text: string, signal: AbortSignal) {
  const hash = createHash('sha256').update(`${title}\n${text}`).digest('hex')
  const documents = await listDocuments(identity)
  const existing = documents.find(d => d.content_hash === hash)
  if (existing) return { id: existing.id, duplicate: true, chunks: 0 }
  if (documents.length >= 50) throw new ApiError(429, 'DOCUMENT_LIMIT', 'This knowledge library is limited to 50 documents. Delete unused documents first.')
  const chunks = await splitDocument(title, text)
  const vectors = await embed(chunks.map(c => c.pageContent), signal)
  let id: string = randomUUID()
  if (config().database === 'local') {
    const pg = await localDb()
    await pg.transaction(async tx => {
      await tx.query('INSERT INTO ai_documents(id, owner_id, title, content_hash) VALUES ($1,$2,$3,$4)', [id, identity.id, title, hash])
      for (const [i, chunk] of chunks.entries()) await tx.query('INSERT INTO ai_chunks(id, document_id, text, embedding) VALUES ($1,$2,$3,$4::vector)', [randomUUID(), id, chunk.pageContent, JSON.stringify(vectors[i])])
    })
  } else {
    const { data, error } = await userDb(identity).rpc('edupulse_ingest_document', { doc_title: title, doc_hash: hash, chunks: chunks.map((c, i) => ({ text: c.pageContent, embedding: vectors[i] })) })
    if (error) throw new ApiError(503, 'DATABASE_WRITE_FAILED', 'Private knowledge could not be saved. Check the Supabase migration and connection.')
    id = String(data)
  }
  return { id, duplicate: false, chunks: chunks.length }
}

type DocumentRow = { id: string; title: string; content_hash: string; created_at: string }
export async function listDocuments(identity: Identity): Promise<DocumentRow[]> {
  if (config().database === 'local') {
    return (await (await localDb()).query<DocumentRow>('SELECT id, title, content_hash, created_at FROM ai_documents WHERE owner_id=$1 ORDER BY created_at DESC', [identity.id])).rows
  }
  const { data, error } = await userDb(identity).from('edupulse_ai_documents').select('id,title,content_hash,created_at').order('created_at', { ascending: false }).limit(50)
  if (error) throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Private knowledge is unavailable. Check the Supabase connection and apply the AI migration.')
  return data || []
}

export async function deleteDocument(identity: Identity, id: string) {
  if (config().database === 'local') {
    await (await localDb()).query('DELETE FROM ai_documents WHERE id=$1 AND owner_id=$2', [id, identity.id])
  } else {
    const { error } = await userDb(identity).from('edupulse_ai_documents').delete().eq('id', id)
    if (error) throw new ApiError(503, 'DATABASE_WRITE_FAILED', 'The document could not be deleted.')
  }
}

let seedPromise: Promise<void> | undefined
async function seedLocal(signal: AbortSignal) {
  seedPromise ??= (async () => {
    const identity: Identity = { id: 'public-guide', role: 'guest', local: true }
    for (const d of publicKnowledge) await ingest(identity, d.title, d.text, signal)
  })().catch(error => { seedPromise = undefined; throw error })
  return seedPromise
}

export async function retrieve(identity: Identity, query: string, signal: AbortSignal): Promise<{ sources: Source[]; warning?: string }> {
  try {
    if (config().database === 'local') await seedLocal(signal)
    const [embedding] = await embed([query], signal)
    if (config().database === 'local') {
      const { rows } = await (await localDb()).query<Source>(
        `SELECT c.id, d.title, c.text, 1-(c.embedding <=> $1::vector) AS score, 'vector' AS method
         FROM ai_chunks c JOIN ai_documents d ON d.id=c.document_id
         WHERE d.owner_id IN ($2, 'public-guide') AND 1-(c.embedding <=> $1::vector) >= 0.25
         ORDER BY c.embedding <=> $1::vector LIMIT 5`, [JSON.stringify(embedding), identity.id])
      return { sources: rows }
    }
    if (identity.token) {
      const { data, error } = await userDb(identity).rpc('edupulse_match_chunks', { query_embedding: embedding, match_count: 5, match_threshold: 0.25 })
      if (error) throw error
      return { sources: [...(data || []).map((d: Source) => ({ ...d, method: 'vector' as const })), ...keywordSearch(query, 2)].slice(0, 6) }
    }
    return { sources: keywordSearch(query), warning: 'Public guide keyword search; sign in to retrieve private knowledge.' }
  } catch {
    signal.throwIfAborted()
    return { sources: keywordSearch(query), warning: 'Semantic search is unavailable. These results come from keyword search of the public product guide only.' }
  }
}
