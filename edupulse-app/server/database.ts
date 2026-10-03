import { createHash, randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { PGlite } from '@electric-sql/pglite'
import { config } from './config.js'
import { ApiError, type Identity } from './contracts.js'
import { embedTexts } from './ml/onnx.js'
import { EMBEDDING_MODEL_ID } from './ml/models.js'
import { chunkDocument, cleanText, evaluateQuality, type Quality, type Stage } from './ingest/prepare.js'

let localPromise: Promise<PGlite> | undefined
export const MAX_DOCUMENTS = 50
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
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS embedding_model text NOT NULL DEFAULT 'all-minilm';
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'text';
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS char_count integer NOT NULL DEFAULT 0;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS page_count integer;
ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS quality jsonb NOT NULL DEFAULT '{}';
ALTER TABLE ai_chunks ADD COLUMN IF NOT EXISTS chunk_index integer NOT NULL DEFAULT 0;
ALTER TABLE ai_chunks ADD COLUMN IF NOT EXISTS page integer;
ALTER TABLE ai_chunks ADD COLUMN IF NOT EXISTS section text;
ALTER TABLE ai_chunks ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false;
ALTER TABLE ai_chunks ADD COLUMN IF NOT EXISTS tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED;
CREATE INDEX IF NOT EXISTS ai_chunks_document_idx ON ai_chunks(document_id);
CREATE INDEX IF NOT EXISTS ai_documents_owner_idx ON ai_documents(owner_id);
CREATE INDEX IF NOT EXISTS ai_chunks_tsv_idx ON ai_chunks USING gin(tsv);
CREATE INDEX IF NOT EXISTS ai_chunks_embedding_idx ON ai_chunks USING hnsw (embedding vector_cosine_ops);
-- The public product guide now lives in memory; earlier versions seeded it here.
DELETE FROM ai_documents WHERE owner_id = 'public-guide';
CREATE TABLE IF NOT EXISTS ep_workspaces (
 owner_id text PRIMARY KEY, revision integer NOT NULL CHECK(revision > 0),
 data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
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

/** Release scripts close PGlite so their process exits after validation. */
export async function closeLocalDb() {
  if (!localPromise) return
  const database = await localPromise
  localPromise = undefined
  await database.close()
}

export function userDb(identity: Identity) {
  const c = config()
  if (!c.supabaseUrl || !c.supabaseKey) throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Supabase is not configured on the server.')
  return createClient(c.supabaseUrl, c.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: identity.token ? { Authorization: `Bearer ${identity.token}` } : {}, fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(15000) }) },
  })
}

let reindexPromise: Promise<void> | undefined
/** Re-embeds local documents created by an earlier embedding model so one vector space is searched. */
async function reindexLocal(signal: AbortSignal) {
  if (reindexPromise) return reindexPromise
  const pg = await localDb()
  const stale = (await pg.query<{ id: string; title: string }>('SELECT id, title FROM ai_documents WHERE embedding_model <> $1', [EMBEDDING_MODEL_ID])).rows
  if (!stale.length) return
  reindexPromise = (async () => {
    for (const doc of stale) {
      const chunks = (await pg.query<{ id: string; text: string }>('SELECT id, text FROM ai_chunks WHERE document_id=$1 ORDER BY chunk_index', [doc.id])).rows
      const vectors = await embedTexts(chunks.map(c => `${doc.title}\n${c.text}`), signal)
      await pg.transaction(async tx => {
        for (const [i, chunk] of chunks.entries()) await tx.query('UPDATE ai_chunks SET embedding=$2::vector WHERE id=$1', [chunk.id, JSON.stringify(vectors[i])])
        await tx.query('UPDATE ai_documents SET embedding_model=$2 WHERE id=$1', [doc.id, EMBEDDING_MODEL_ID])
      })
    }
  })().finally(() => { reindexPromise = undefined })
  return reindexPromise
}

export type IngestInput = { title: string; text: string; sourceType?: string; fileName?: string }
export type IngestReport = { id: string; duplicate: boolean; chunks: number; embeddingModel: string; quality: Quality; stages: Stage[]; pages: number; sections: number; flaggedChunks: number }

/** Clean → evaluate → chunk → embed → index. Text is the reviewed extraction or pasted text. */
export async function ingest(identity: Identity, input: IngestInput, signal: AbortSignal): Promise<IngestReport> {
  const stages: Stage[] = []
  const timed = async <T>(name: string, fn: () => Promise<T> | T, detail: (value: T) => string) => { const started = performance.now(); const value = await fn(); stages.push({ name, ms: Math.round(performance.now() - started), detail: detail(value) }); return value }
  const { text } = await timed('clean', () => cleanText(input.text), r => `${r.text.length.toLocaleString()} characters after normalization.`)
  const pages = [...text.matchAll(/^\[\[(?:Page|Slide) (\d+)\]\]$/gm)].length
  const quality = await timed('evaluate', () => evaluateQuality(text), q => `Quality ${q.score}/100 (${q.grade}).`)
  if (quality.grade === 'unusable' || text.length < 40) throw new ApiError(422, 'NO_READABLE_TEXT', `This text is not usable for retrieval. ${quality.warnings[0] || ''}`.trim())
  const hash = createHash('sha256').update(`${input.title}\n${text}`).digest('hex')
  const documents = await listDocuments(identity)
  const existing = documents.find(d => d.content_hash === hash)
  if (existing) return { id: existing.id, duplicate: true, chunks: 0, embeddingModel: EMBEDDING_MODEL_ID, quality, stages, pages, sections: 0, flaggedChunks: 0 }
  if (documents.length >= MAX_DOCUMENTS) throw new ApiError(429, 'DOCUMENT_LIMIT', 'This knowledge library is limited to 50 documents. Delete unused documents first.')
  const chunks = await timed('chunk', () => chunkDocument(input.title, text), c => `${c.length} passages with page/section metadata (900-character window, 120 overlap).`)
  const vectors = await timed('embed', () => embedTexts(chunks.map(c => c.embedText), signal), v => `${v.length} vectors · ${EMBEDDING_MODEL_ID} · 384 dimensions.`)
  signal.throwIfAborted()
  const sourceType = input.sourceType || 'text', meta = { score: quality.score, grade: quality.grade, warnings: quality.warnings.slice(0, 6), words: quality.metrics.words, injectionFlagged: quality.injection.flagged }
  let id: string = randomUUID()
  await timed('index', async () => {
    if (config().database === 'local') {
      const pg = await localDb()
      await pg.transaction(async tx => {
        await tx.query('INSERT INTO ai_documents(id, owner_id, title, content_hash, embedding_model, source_type, file_name, char_count, page_count, quality) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [id, identity.id, input.title, hash, EMBEDDING_MODEL_ID, sourceType, input.fileName || null, text.length, pages || null, JSON.stringify(meta)])
        for (const [i, chunk] of chunks.entries()) await tx.query('INSERT INTO ai_chunks(id, document_id, text, embedding, chunk_index, page, section, flagged) VALUES ($1,$2,$3,$4::vector,$5,$6,$7,$8)', [randomUUID(), id, chunk.text, JSON.stringify(vectors[i]), chunk.index, chunk.page, chunk.section, chunk.flagged])
      })
    } else {
      const { data, error } = await userDb(identity).rpc('edupulse_ingest_document_v2', {
        doc: { title: input.title, content_hash: hash, embedding_model: EMBEDDING_MODEL_ID, source_type: sourceType, file_name: input.fileName || null, char_count: text.length, page_count: pages || null, quality: meta },
        chunks: chunks.map((c, i) => ({ text: c.text, embedding: vectors[i], chunk_index: c.index, page: c.page, section: c.section?.slice(0, 200) ?? null, flagged: c.flagged })),
      })
      if (error) throw new ApiError(503, 'DATABASE_WRITE_FAILED', 'Private knowledge could not be saved. Check the Supabase migration and connection.')
      id = String(data)
    }
  }, () => `Stored in ${config().database === 'local' ? 'local PGlite + pgvector' : 'Supabase pgvector'} with HNSW and full-text indexes.`)
  return { id, duplicate: false, chunks: chunks.length, embeddingModel: EMBEDDING_MODEL_ID, quality, stages, pages, sections: new Set(chunks.map(c => c.section).filter(Boolean)).size, flaggedChunks: chunks.filter(c => c.flagged).length }
}

export type DocumentRow = { id: string; title: string; content_hash: string; created_at: string; source_type: string; file_name: string | null; char_count: number; page_count: number | null; quality: Record<string, unknown>; chunks: number }
export async function listDocuments(identity: Identity): Promise<DocumentRow[]> {
  if (config().database === 'local') {
    return (await (await localDb()).query<DocumentRow>(`SELECT d.id, d.title, d.content_hash, d.created_at, d.source_type, d.file_name, d.char_count, d.page_count, d.quality, count(c.id)::int AS chunks
      FROM ai_documents d LEFT JOIN ai_chunks c ON c.document_id=d.id WHERE d.owner_id=$1 GROUP BY d.id ORDER BY d.created_at DESC`, [identity.id])).rows
  }
  const { data, error } = await userDb(identity).from('edupulse_ai_documents').select('id,title,content_hash,created_at,source_type,file_name,char_count,page_count,quality,edupulse_ai_chunks(count)').order('created_at', { ascending: false }).limit(MAX_DOCUMENTS)
  if (error) throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Private knowledge is unavailable. Check the Supabase connection and apply the AI migrations.')
  return (data || []).map(({ edupulse_ai_chunks: count, ...row }: Record<string, unknown>) => ({ ...row, chunks: Number((count as { count: number }[] | undefined)?.[0]?.count || 0) }) as DocumentRow)
}

export async function deleteDocument(identity: Identity, id: string) {
  if (config().database === 'local') {
    await (await localDb()).query('DELETE FROM ai_documents WHERE id=$1 AND owner_id=$2', [id, identity.id])
  } else {
    const { error } = await userDb(identity).from('edupulse_ai_documents').delete().eq('id', id)
    if (error) throw new ApiError(503, 'DATABASE_WRITE_FAILED', 'The document could not be deleted.')
  }
}

export type ChunkHit = { id: string; document_id: string; title: string; text: string; page: number | null; section: string | null; flagged: boolean; similarity: number | null; vector_rank: number | null; keyword_rank: number | null }
const localHybrid = `
WITH scope AS (
  SELECT c.id, c.document_id, d.title, c.text, c.page, c.section, c.flagged, c.embedding, c.tsv
  FROM ai_chunks c JOIN ai_documents d ON d.id = c.document_id
  WHERE d.owner_id = $2 AND d.embedding_model = $3 AND ($5::text[] IS NULL OR d.id = ANY($5::text[]))
), semantic AS (
  SELECT id, 1 - (embedding <=> $1::vector) AS similarity, row_number() OVER (ORDER BY embedding <=> $1::vector) AS rank
  FROM scope ORDER BY embedding <=> $1::vector LIMIT $6
), keyword AS (
  SELECT id, row_number() OVER (ORDER BY ts_rank_cd(tsv, q) DESC) AS rank
  FROM scope, to_tsquery('english', $4) q WHERE $4 <> '' AND tsv @@ q ORDER BY ts_rank_cd(tsv, q) DESC LIMIT $6
)
SELECT s.id, s.document_id, s.title, s.text, s.page, s.section, s.flagged, sem.similarity, sem.rank::int AS vector_rank, kw.rank::int AS keyword_rank
FROM scope s LEFT JOIN semantic sem ON sem.id = s.id LEFT JOIN keyword kw ON kw.id = s.id
WHERE sem.id IS NOT NULL OR kw.id IS NOT NULL`

/**
 * Private hybrid search: cosine similarity over pgvector plus Postgres
 * full-text ranking (OR of safe query terms). Both ranks are returned so the
 * caller can fuse them with reciprocal rank fusion.
 */
export async function searchPrivate(identity: Identity, embedding: number[], terms: string[], k: number, documentIds: string[] | undefined, signal: AbortSignal): Promise<ChunkHit[]> {
  if (identity.role === 'guest') return []
  const tsquery = terms.filter(t => /^[a-z0-9]{2,40}$/.test(t)).join(' | ')
  if (config().database === 'local') {
    await reindexLocal(signal)
    return (await (await localDb()).query<ChunkHit>(localHybrid, [JSON.stringify(embedding), identity.id, EMBEDDING_MODEL_ID, tsquery, documentIds?.length ? documentIds : null, k])).rows
  }
  if (!identity.token) return []
  const { data, error } = await userDb(identity).rpc('edupulse_hybrid_chunks', { query_embedding: embedding, query_terms: tsquery ? tsquery.split(' | ') : [], match_count: k, model: EMBEDDING_MODEL_ID, document_ids: documentIds?.length ? documentIds : null })
  if (error) throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Private knowledge search is unavailable. Apply the agentic RAG migration.')
  return data || []
}
