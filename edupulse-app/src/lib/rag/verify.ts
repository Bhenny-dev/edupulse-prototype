import type { Claim, Comparison, Evidence, Similarity, Verification } from './types.js'
import { consistencyCap, lexicalSupport, sentences, terms } from './text.js'

// Calibrated on the labeled claims in the v0.4.0 evaluation set.
export const SUPPORT = { supported: 0.55, partial: 0.35, corroborate: 0.5, semanticLow: 0.25, semanticHigh: 0.75 }
const semanticScale = (cos: number) => Math.max(0, Math.min(1, (cos - SUPPORT.semanticLow) / (SUPPORT.semanticHigh - SUPPORT.semanticLow)))

/**
 * Blended support matrix: semantic similarity (when available) and lexical
 * term recall. Symmetric mode averages recall in both directions for alignment.
 */
export async function supportMatrix(claims: string[], passages: string[], signal: AbortSignal, similarity?: Similarity, symmetric = false) {
  let semantic: number[][] | null = null
  if (similarity && claims.length && passages.length) {
    try { semantic = await similarity(claims, passages, signal) } catch { signal.throwIfAborted(); semantic = null }
  }
  const matrix = claims.map((claim, i) => passages.map((passage, j) => {
    const lexical = symmetric ? (lexicalSupport(claim, passage) + lexicalSupport(passage, claim)) / 2 : lexicalSupport(claim, passage)
    const blended = semantic ? 0.55 * semanticScale(semantic[i]![j]!) + 0.45 * lexical : lexical
    // Claims (not symmetric alignment) must also agree on numbers, names and absolutes.
    return symmetric ? blended : Math.min(blended, consistencyCap(claim, passage))
  }))
  return { matrix, method: semantic ? 'semantic+lexical' as const : 'lexical' as const }
}

export const citationsIn = (text: string) => [...text.matchAll(/\[(\d{1,2})\]/g)].map(m => Number(m[1]))

export function validateCitations(answer: string, sourceCount: number) {
  const refs = citationsIn(answer)
  return refs.length > 0 && refs.every(n => n >= 1 && n <= sourceCount) && answer.length <= 12000
}

/** Claims worth checking: declarative sentences with enough content terms. */
export function extractClaims(answer: string) {
  return sentences(answer).filter(s => !/[?:]$/.test(s) && !/^source excerpts/i.test(s) && terms(s.replace(/\[\d+\]/g, '')).length >= 3).slice(0, 24)
}

/**
 * Verifier agent: checks each claim against its cited passages and all other
 * evidence. A claim is corroborated when distinct documents support it.
 */
export async function verifyAnswer(answer: string, evidence: Evidence[], signal: AbortSignal, similarity?: Similarity): Promise<Verification> {
  const claimTexts = extractClaims(answer)
  const invalidCitations = [...new Set(citationsIn(answer).filter(n => n < 1 || n > evidence.length))]
  if (!evidence.length) {
    return { claims: claimTexts.map(text => ({ text, citations: citationsIn(text), status: 'general', support: 0, bestSource: null, corroboratedBy: 0 })), method: 'lexical', groundedness: null, citationAccuracy: null, supported: 0, unsupported: 0, corroborated: 0, invalidCitations }
  }
  const { matrix, method } = await supportMatrix(claimTexts.map(c => c.replace(/\[\d+\]/g, '')), evidence.map(e => e.text), signal, similarity)
  const claims: Claim[] = claimTexts.map((text, i) => {
    const row = matrix[i]!, citations = citationsIn(text).filter(n => n >= 1 && n <= evidence.length)
    const best = row.reduce((b, score, j) => score > row[b]! ? j : b, 0)
    const cited = citations.length ? Math.max(...citations.map(n => row[n - 1]!)) : 0
    const documents = new Set(row.map((score, j) => score >= SUPPORT.corroborate ? (evidence[j]!.documentId || evidence[j]!.title) : null).filter(Boolean))
    let status: Claim['status']
    if (citations.length) status = cited >= SUPPORT.supported ? 'supported' : cited >= SUPPORT.partial ? 'partial' : row[best]! >= SUPPORT.supported ? 'miscited' : 'unsupported'
    else status = row[best]! >= SUPPORT.supported ? 'uncited' : 'general'
    return { text, citations, status, support: Number((citations.length ? cited : row[best]!).toFixed(3)), bestSource: row[best]! >= SUPPORT.partial ? best + 1 : null, corroboratedBy: documents.size }
  })
  const cited = claims.filter(c => c.citations.length)
  const grounded = claims.filter(c => ['supported', 'uncited', 'partial'].includes(c.status))
  return {
    claims, method, invalidCitations,
    groundedness: claims.length ? Number((grounded.length / claims.length).toFixed(3)) : null,
    citationAccuracy: cited.length ? Number((cited.filter(c => c.status === 'supported').length / cited.length).toFixed(3)) : null,
    supported: claims.filter(c => ['supported', 'uncited'].includes(c.status)).length,
    unsupported: claims.filter(c => ['unsupported', 'miscited'].includes(c.status)).length,
    corroborated: claims.filter(c => c.corroboratedBy >= 2).length,
  }
}

/**
 * Corrector agent, deterministic part: replaces wrong or out-of-range citation
 * numbers with the best-supporting passage and adds missing citations. It
 * never adds content; unsupported statements go back to the Writer.
 */
export function correctCitations(answer: string, verification: Verification, sourceCount: number) {
  let text = answer, fixes = 0
  for (const claim of verification.claims) {
    let replacement = claim.text
    if (claim.status === 'miscited' && claim.bestSource) replacement = replacement.replace(/\s*\[\d{1,2}\]/g, '').replace(/([.!?]?)$/, ` [${claim.bestSource}]$1`)
    else if (claim.status === 'uncited' && claim.bestSource) replacement = replacement.replace(/([.!?]?)$/, ` [${claim.bestSource}]$1`)
    if (replacement !== claim.text && text.includes(claim.text)) { text = text.replace(claim.text, replacement); fixes++ }
  }
  const stripped = text.replace(/\s*\[(\d{1,2})\]/g, (match, n) => Number(n) >= 1 && Number(n) <= sourceCount ? match : (fixes++, ''))
  return { text: stripped, fixes }
}

/**
 * Comparator agent: aligns statements from two sources (documents, or an
 * outline and a generated draft). Coverage and alignment only; this is not
 * authorship or plagiarism detection (FR-CW-18, NFR-AI-08).
 */
export async function alignStatements(left: string[], right: string[], signal: AbortSignal, similarity?: Similarity, titles = { left: 'First source', right: 'Second source' }): Promise<Comparison> {
  const { matrix, method } = await supportMatrix(left, right, signal, similarity, true)
  const pairs = matrix.flatMap((row, i) => row.map((score, j) => ({ i, j, score }))).sort((a, b) => b.score - a.score)
  const usedLeft = new Set<number>(), usedRight = new Set<number>()
  const shared: Comparison['shared'] = [], related: Comparison['related'] = []
  for (const pair of pairs) {
    if (pair.score < SUPPORT.partial || usedLeft.has(pair.i) || usedRight.has(pair.j)) continue
    usedLeft.add(pair.i); usedRight.add(pair.j)
    ;(pair.score >= SUPPORT.supported ? shared : related).push({ left: left[pair.i]!, right: right[pair.j]!, score: Number(pair.score.toFixed(3)) })
  }
  const coverage = left.length ? (shared.length + 0.5 * related.length) / left.length : 0
  return { leftTitle: titles.left, rightTitle: titles.right, shared, related, onlyLeft: left.filter((_, i) => !usedLeft.has(i)), onlyRight: right.filter((_, j) => !usedRight.has(j)), coverage: Number(Math.min(1, coverage).toFixed(3)), method }
}
