import type { ChatInput, CourseInput, Identity } from '../../server/contracts'
import type { AgentDeps, Evidence, Reference } from './rag/types'
import type { AgentAnswer } from './rag/agents'
import { aiPreference, browserAIState, invokeBrowserModel } from './browserAI'

let accessToken: string | undefined
export function setAiAccessToken(token?: string) { accessToken = token }
export class ApiRequestError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message) }
}

type RequestOptions = { raw?: Blob; headers?: Record<string, string> }
// Generation is bounded by the server's own budget (110 s hosted, up to 10 minutes in the local app),
// so the browser waits for the server's answer or its timeout error instead of giving up first.
const LONG_ACTIONS = new Set(['chat', 'courseware', 'references'])
export async function aiRequest<T>(action: string, method = 'GET', body?: unknown, signal?: AbortSignal, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`/api/ai?action=${encodeURIComponent(action)}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : options.raw ? { 'Content-Type': 'application/octet-stream' } : {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...options.headers },
    ...(body ? { body: JSON.stringify(body) } : options.raw ? { body: options.raw } : {}), signal: AbortSignal.any([AbortSignal.timeout(LONG_ACTIONS.has(action) ? 610000 : 125000), ...(signal ? [signal] : [])]),
  })
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The AI API is unavailable. Start the app with npm run dev or check the deployment.')
  const data = await response.json()
  if (!response.ok) throw new ApiRequestError(data.error?.message || `Request failed (${response.status}).`, response.status, data.error?.code)
  return data as T
}

export type ModelState = { model: string; state: string; ready: boolean }
export type AiHealth = {
  version: string; provider: string; model: string | null; ready: boolean; embeddings: boolean; message: string
  database: { ready: boolean; kind: string; message: string }; identity: { mode: string; role: string }; checkedAt: string
  pipeline?: { embeddings: ModelState; reranker: ModelState; vectorStore: string; retrieval: string; extraction: { formats: string[]; maxBytes: number; sandbox: string }; agents: string[] }
}
export type AiAnswer = AgentAnswer
export const getAiHealth = (signal?: AbortSignal) => aiRequest<AiHealth>('health', 'GET', undefined, signal)

export type ExtractionReport = {
  fileName: string; kind: string; mime: string; bytes: number; text: string; truncated: boolean; meta: Record<string, unknown>
  quality: { score: number; grade: string; warnings: string[]; metrics: Record<string, number>; injection: { flagged: boolean; samples: string[] } }
  sandbox: { mode: string; heapLimitMb: number; timeoutMs: number; environment: string; ms: number }
  stages: { name: string; ms: number; detail: string }[]
}
export const UPLOAD_ACCEPT = '.pdf,.docx,.pptx,.html,.htm,.txt,.md,.markdown,.csv'
/** Uploads raw bytes for sandboxed extraction. Nothing is stored until the text is indexed. */
export async function extractDocument(file: File, signal?: AbortSignal) {
  if (file.size > 4_000_000) throw new Error('Files must be 4 MB or smaller.')
  if (!file.size) throw new Error('The file is empty.')
  return aiRequest<ExtractionReport>('extract', 'POST', undefined, signal, { raw: file, headers: { 'X-File-Name': encodeURIComponent(file.name.slice(-255)) } })
}

/** Chat attachments use the same sandboxed extraction as the knowledge library. */
export async function readReferenceFile(file: File): Promise<{ title: string; text: string }> {
  const report = await extractDocument(file)
  return { title: file.name.slice(0, 160), text: report.text.trim() }
}

/** Collects Researcher queries issued in parallel into one context request. */
function batchedSearch(signal: AbortSignal, session: Identity) {
  let pending: { query: string; focus: string; documentIds?: string[]; resolve: (value: { evidence: Evidence[]; warning?: string }) => void; reject: (error: unknown) => void }[] = []
  const search: AgentDeps['search'] = (query, options) => new Promise((resolve, reject) => {
    pending.push({ query, focus: options.focus, documentIds: options.documentIds, resolve, reject })
    if (pending.length > 1) return
    setTimeout(async () => {
      const batch = pending; pending = []
      try {
        const result = await aiRequest<{ results: { evidence: Evidence[]; warning?: string }[]; identity: Identity }>('context', 'POST', { queries: batch.map(b => b.query.slice(0, 1000)).slice(0, 4), focus: batch[0]!.focus.slice(0, 4000), documentIds: batch[0]!.documentIds || [] }, signal)
        Object.assign(session, result.identity)
        batch.forEach((b, i) => b.resolve(result.results[i] || { evidence: [] }))
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 401) { batch.forEach(b => b.reject(error)); return }
        batch.forEach(b => b.resolve({ evidence: [], warning: 'The online knowledge library is unavailable. This answer uses only supplied context and the local model.' }))
      }
    }, 25)
  })
  return search
}

/** Agent dependencies for on-device inference; the session identity is filled in by the server's first reply. */
function browserDeps(signal: AbortSignal, session: Identity, generate = invokeBrowserModel) {
  const deps: AgentDeps = {
    search: batchedSearch(signal, session),
    similarity: async (left, right, abort) => (await aiRequest<{ matrix: number[][] }>('similarity', 'POST', { left: left.slice(0, 24).map(s => s.slice(0, 800)), right: right.slice(0, 12).map(s => s.slice(0, 2000)) }, abort)).matrix,
    references: (topic, abort) => aiRequest<{ references: Reference[]; warning?: string }>('references', 'POST', { topic: topic.slice(0, 200) }, abort),
    generate, provider: 'browser', model: browserAIState().model,
  }
  return deps
}

export async function askPulse(input: Partial<ChatInput> & { message: string }, signal?: AbortSignal): Promise<AiAnswer> {
  if (aiPreference() !== 'browser') return aiRequest<AiAnswer>('chat', 'POST', input, signal)
  if (browserAIState().status !== 'ready') throw new Error('Your on-device model is not ready. Open AI settings to load it or choose a provider.')
  const abort = AbortSignal.any([AbortSignal.timeout(240000), ...(signal ? [signal] : [])])
  const [{ runAgents }, { chatInput }] = await Promise.all([import('./rag/agents'), import('../../server/contracts')])
  // The on-device Guardian runs in this browser, so the displayed role decides which use rules apply;
  // the server replaces this identity with the verified one during the first search.
  const session: Identity = { id: 'device-session', role: input.viewRole || 'guest', local: false }
  return runAgents(chatInput.parse(input), session, abort, browserDeps(abort, session))
}

export type CourseDraft = Awaited<ReturnType<typeof import('./rag/courseware').draftCoursewareAgents>>
export async function generateCourseDraft(input: CourseInput, signal?: AbortSignal): Promise<CourseDraft> {
  if (aiPreference() !== 'browser') return aiRequest<CourseDraft>('courseware', 'POST', input, signal)
  const abort = AbortSignal.any([AbortSignal.timeout(300000), ...(signal ? [signal] : [])])
  const { draftCoursewareAgents } = await import('./rag/courseware')
  const deps = browserDeps(abort, { id: 'device-session', role: 'guest', local: false })
  return draftCoursewareAgents(input, abort, { ...deps, generate: invokeBrowserModel })
}
