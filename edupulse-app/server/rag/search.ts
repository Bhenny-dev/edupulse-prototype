import { ApiError, type Identity } from '../contracts.js'
import { searchPrivate } from '../database.js'
import { publicKnowledge } from '../knowledge.js'
import { cosine, embedTexts, rerankScores } from '../ml/onnx.js'
import type { Evidence } from '../../src/lib/rag/types.js'
import { lexicalRelevance, reciprocalRankFusion } from '../../src/lib/rag/rank.js'
import { searchTerms } from '../../src/lib/rag/text.js'

let guideIndex: Promise<{ id: string; title: string; text: string; vector: number[] }[]> | undefined
/** The public product guide is small and identical for everyone, so it is embedded once in memory. */
function publicGuide(signal: AbortSignal) {
  guideIndex ??= embedTexts(publicKnowledge.map(d => `${d.title}\n${d.text}`), signal)
    .then(vectors => publicKnowledge.map((d, i) => ({ ...d, vector: vectors[i]! })))
    .catch(error => { guideIndex = undefined; throw error })
  return guideIndex
}

const toEvidence = (partial: Omit<Evidence, 'rrf' | 'relevance' | 'query'>, query: string): Evidence => ({ ...partial, rrf: 0, relevance: null, query })

/**
 * Hybrid retrieval for one query: pgvector cosine + Postgres full-text for
 * private documents, semantic + lexical for the product guide, fused with
 * reciprocal rank fusion. Returns candidates for the Ranker.
 */
export async function hybridSearch(identity: Identity, query: string, options: { k?: number; documentIds?: string[] }, signal: AbortSignal): Promise<{ evidence: Evidence[]; warning?: string }> {
  const k = options.k ?? 16, terms = searchTerms(query)
  const [embedding] = await embedTexts([query], signal)
  const warnings: string[] = []
  const privateHits: Awaited<ReturnType<typeof searchPrivate>> = []
  // Search each side of an explicit comparison independently. A global top-k
  // query can otherwise return only passages from the more frequent document.
  const scopes = options.documentIds?.length === 2 ? options.documentIds.map(id => [id]) : [options.documentIds]
  for (const ids of scopes) {
    try { privateHits.push(...await searchPrivate(identity, embedding!, terms, scopes.length === 2 ? Math.max(4, Math.ceil(k / 2)) : k, ids, signal)) }
    catch (error) {
      signal.throwIfAborted()
      warnings.push(error instanceof ApiError ? error.message : 'Private knowledge search is unavailable; the product guide was searched.')
    }
  }
  const candidates = new Map<string, Evidence>()
  for (const hit of privateHits) candidates.set(hit.id, toEvidence({ id: hit.id, documentId: hit.document_id, title: hit.title, text: hit.text, page: hit.page, section: hit.section, flagged: hit.flagged, origin: 'private', method: hit.vector_rank && hit.keyword_rank ? 'hybrid' : hit.vector_rank ? 'vector' : 'keyword', similarity: hit.similarity === null ? null : Number(Number(hit.similarity).toFixed(4)) }, query))
  const guide = options.documentIds?.length ? [] : await publicGuide(signal)
  const guideScored = guide.map(d => ({ d, similarity: cosine(embedding!, d.vector), lexical: lexicalRelevance(query, `${d.title} ${d.text}`) }))
  for (const { d, similarity, lexical } of guideScored) {
    if (similarity < 0.2 && lexical < 0.3) continue
    candidates.set(d.id, toEvidence({ id: d.id, documentId: d.id, title: d.title, text: d.text, page: null, section: null, flagged: false, origin: 'public-guide', method: similarity >= 0.2 && lexical >= 0.3 ? 'hybrid' : similarity >= 0.2 ? 'vector' : 'keyword', similarity: Number(similarity.toFixed(4)) }, query))
  }
  // Vector similarities share one embedding space, so private and guide passages form one list.
  const vectorList = [...candidates.values()].filter(c => c.similarity !== null && (c.origin === 'public-guide' ? c.similarity >= 0.2 : privateHits.find(h => h.id === c.id)?.vector_rank)).sort((a, b) => b.similarity! - a.similarity!).map(c => c.id)
  const privateKeyword = privateHits.filter(h => h.keyword_rank).sort((a, b) => a.keyword_rank! - b.keyword_rank!).map(h => h.id)
  const guideKeyword = guideScored.filter(g => g.lexical >= 0.3).sort((a, b) => b.lexical - a.lexical).map(g => g.d.id)
  const fused = reciprocalRankFusion([vectorList, privateKeyword, guideKeyword])
  const ranked = [...candidates.values()].map(c => ({ ...c, rrf: Number((fused.get(c.id) || 0).toFixed(5)) })).sort((a, b) => b.rrf - a.rrf)
  const pinned = options.documentIds?.length === 2 ? options.documentIds.flatMap(id => ranked.find(e => e.documentId === id) || []) : []
  const evidence = [...pinned, ...ranked.filter(e => !pinned.some(p => p.id === e.id))].slice(0, k)
  return { evidence, warning: [...new Set(warnings)].join(' ') || undefined }
}

export async function rerank(query: string, passages: string[], signal: AbortSignal) {
  return rerankScores(query, passages, signal)
}

/** Cosine similarity matrix used by the Verifier and Comparator agents. */
export async function similarityMatrix(left: string[], right: string[], signal: AbortSignal) {
  const vectors = await embedTexts([...left, ...right], signal)
  return left.map((_, i) => right.map((__, j) => Number(cosine(vectors[i]!, vectors[left.length + j]!).toFixed(4))))
}

/**
 * Researcher + Ranker service for browser inference: runs each query's hybrid
 * search and scores the union with the cross-encoder against the main question.
 */
export async function research(identity: Identity, queries: string[], focus: string, documentIds: string[] | undefined, signal: AbortSignal) {
  const results = await Promise.all(queries.map(q => hybridSearch(identity, q, { k: 12, documentIds }, signal)))
  const unique = new Map<string, Evidence>()
  for (const result of results) for (const e of result.evidence) unique.set(e.id, e)
  const list = [...unique.values()]
  const scores = list.length ? await rerankScores(focus, list.map(e => `${e.title}${e.page ? ` · p. ${e.page}` : ''}${e.section ? ` · ${e.section}` : ''}\n${e.text}`.slice(0, 1600)), signal) : []
  const relevance = new Map(list.map((e, i) => [e.id, Number(scores[i]!.toFixed(3))]))
  return { results: results.map(r => ({ evidence: r.evidence.map(e => ({ ...e, relevance: relevance.get(e.id) ?? null })), warning: r.warning })) }
}
