export type Task = 'answer' | 'summarize' | 'compare' | 'draft' | 'references' | 'general'
export type AgentName = 'Planner' | 'Researcher' | 'Ranker' | 'Comparator' | 'Writer' | 'Verifier' | 'Corrector' | 'Librarian'

export type Evidence = {
  id: string; documentId: string | null; title: string; text: string
  page: number | null; section: string | null; flagged: boolean
  origin: 'private' | 'public-guide' | 'attachment'
  method: 'hybrid' | 'vector' | 'keyword' | 'provided'
  similarity: number | null; rrf: number; relevance: number | null; query: string
}
export type CitedEvidence = Evidence & { citation: number }

export type Plan = { task: Task; queries: string[]; needsEvidence: boolean; rationale: string; topic: string; revision: boolean }

export type ClaimStatus = 'supported' | 'partial' | 'unsupported' | 'miscited' | 'uncited' | 'general'
export type Claim = { text: string; citations: number[]; status: ClaimStatus; support: number; bestSource: number | null; corroboratedBy: number }
export type Verification = {
  claims: Claim[]; method: 'semantic+lexical' | 'lexical'
  groundedness: number | null; citationAccuracy: number | null
  supported: number; unsupported: number; corroborated: number; invalidCitations: number[]
}

export type AlignmentPair = { left: string; right: string; score: number }
export type Comparison = { leftTitle: string; rightTitle: string; shared: AlignmentPair[]; related: AlignmentPair[]; onlyLeft: string[]; onlyRight: string[]; coverage: number; method: 'semantic+lexical' | 'lexical' }

export type Reference = { title: string; authors: string[]; year: number | null; venue: string; url: string; source: 'Open Library' | 'OpenAlex' | 'Wikipedia'; identifier: string; relevance: number | null; summary: string }

export type AgentStep = { agent: AgentName; node: string; action: string; detail: string; ms: number; status: 'done' | 'skipped' | 'fallback' | 'revised' }

export type Generate = (system: string, prompt: string, signal: AbortSignal, json?: boolean) => Promise<string>
export type Similarity = (left: string[], right: string[], signal: AbortSignal) => Promise<number[][]>
export type AgentDeps = {
  search: (query: string, options: { focus: string; documentIds?: string[] }, signal: AbortSignal) => Promise<{ evidence: Evidence[]; warning?: string }>
  rerank?: (query: string, passages: string[], signal: AbortSignal) => Promise<number[]>
  similarity?: Similarity
  references?: (topic: string, signal: AbortSignal) => Promise<{ references: Reference[]; warning?: string }>
  generate?: Generate
  provider: string
  model?: string | null
}
