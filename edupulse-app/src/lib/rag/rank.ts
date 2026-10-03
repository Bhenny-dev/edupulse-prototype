import type { Evidence } from './types.js'
import { jaccard, terms } from './text.js'

// Calibrated on the v0.4.0 evaluation set (see feature-documentation/versions/v0.4.0/validation).
export const RANKING = { rrfK: 60, keep: 6, perDocument: 3, duplicate: 0.6, relevanceFloor: -9.5, relevanceWindow: 7 }

/** Reciprocal rank fusion over any number of ranked lists of evidence ids. */
export function reciprocalRankFusion(lists: string[][], k = RANKING.rrfK) {
  const scores = new Map<string, number>()
  for (const list of lists) list.forEach((id, index) => scores.set(id, (scores.get(id) || 0) + 1 / (k + index + 1)))
  return scores
}

/** Merges Researcher results: identical passages found by several sub-queries are fused, not repeated. */
export function mergeCandidates(groups: Evidence[][]): Evidence[] {
  const fused = reciprocalRankFusion(groups.map(group => [...group].sort((a, b) => (b.relevance ?? b.rrf) - (a.relevance ?? a.rrf)).map(e => e.id)))
  const byId = new Map<string, Evidence>()
  for (const evidence of groups.flat()) {
    const existing = byId.get(evidence.id)
    if (!existing || (evidence.relevance ?? -Infinity) > (existing.relevance ?? -Infinity)) byId.set(evidence.id, evidence)
  }
  return [...byId.values()].map(e => ({ ...e, rrf: fused.get(e.id) || e.rrf })).sort((a, b) => b.rrf - a.rrf)
}

/** Lexical fallback relevance when no cross-encoder is available. */
export function lexicalRelevance(query: string, text: string) {
  const q = new Set(terms(query)), t = new Set(terms(text))
  if (!q.size) return 0
  let hit = 0
  for (const term of q) if (t.has(term)) hit++
  return hit / q.size
}

/**
 * Ranker agent policy: order by cross-encoder relevance (or fused rank),
 * drop passages far below the best match, remove near-duplicates and cap
 * passages per document so corroboration can draw on several sources.
 */
export function selectEvidence(candidates: Evidence[], keep = RANKING.keep, requiredDocumentIds: string[] = []) {
  const scored = candidates.filter(c => c.origin === 'attachment' || c.relevance === null || c.relevance >= RANKING.relevanceFloor)
  const top = Math.max(...scored.filter(c => c.relevance !== null).map(c => c.relevance!), -Infinity)
  const eligible = scored.filter(c => c.relevance === null || c.relevance >= top - RANKING.relevanceWindow)
    .sort((a, b) => (a.origin === 'attachment' ? -1 : 0) - (b.origin === 'attachment' ? -1 : 0) || (b.relevance ?? -99) - (a.relevance ?? -99) || b.rrf - a.rrf)
  // An explicit two-document comparison needs evidence from both selected
  // documents even when a broad comparison question scores one side poorly.
  const required = [...new Set(requiredDocumentIds)].slice(0, keep).flatMap(id => {
    const best = candidates.filter(c => c.documentId === id).sort((a, b) => (b.relevance ?? -99) - (a.relevance ?? -99) || b.rrf - a.rrf)[0]
    return best ? [best] : []
  })
  const ordered = [...required, ...eligible.filter(c => !required.some(r => r.id === c.id))]
  const selected: Evidence[] = [], perDocument = new Map<string, number>()
  let duplicates = 0
  const belowFloor = Math.max(0, candidates.length - eligible.length - required.filter(c => !eligible.includes(c)).length)
  for (const candidate of ordered) {
    const key = candidate.documentId || candidate.title
    if ((perDocument.get(key) || 0) >= RANKING.perDocument) continue
    // Near-duplicates are dropped within a document only: the same statement in
    // another document is corroboration, not redundancy.
    if (selected.some(s => (s.documentId || s.title) === key && jaccard(s.text, candidate.text) > RANKING.duplicate)) { duplicates++; continue }
    selected.push(candidate); perDocument.set(key, (perDocument.get(key) || 0) + 1)
    if (selected.length >= keep) break
  }
  return { selected, duplicates, belowFloor, documents: perDocument.size, topRelevance: Number.isFinite(top) ? top : null }
}
