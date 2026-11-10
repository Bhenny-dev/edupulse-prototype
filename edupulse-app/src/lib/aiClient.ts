import type { ChatInput, CourseInput, Identity } from '../../server/contracts'
import type { AgentDeps, Evidence, Reference } from './rag/types'
import type { AgentAnswer } from './rag/agents'
import { aiPreference, browserAIState, invokeBrowserModel } from './browserAI'

let accessToken: string | undefined
let sessionVersion = 0
let supportSubject: string | undefined
export function setAiSubject(id?: string) { if (id !== supportSubject) sessionVersion++; supportSubject = id }
export function setAiAccessToken(token?: string) { if (token !== accessToken) sessionVersion++; accessToken = token }
export const aiSessionVersion = () => sessionVersion
export class ApiRequestError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message) }
}

type RequestOptions = { raw?: Blob; headers?: Record<string, string>; query?: Record<string, string> }
// Generation is bounded by the server's own budget (110 s hosted, up to 10 minutes in the local app),
// so the browser waits for the server's answer or its timeout error instead of giving up first.
const LONG_ACTIONS = new Set(['chat', 'courseware', 'references', 'operator', 'provider-test'])
export async function aiRequest<T>(action: string, method = 'GET', body?: unknown, signal?: AbortSignal, options: RequestOptions = {}): Promise<T> {
  const requestToken = accessToken, version = sessionVersion
  const abort = AbortSignal.any([AbortSignal.timeout(LONG_ACTIONS.has(action) ? 610000 : 125000), ...(signal ? [signal] : [])])
  const transportError = (error: unknown): never => {
    if (signal?.aborted) throw error
    if (abort.aborted) throw new ApiRequestError('The server did not confirm this request before it timed out. Retry when the connection is available.', 504, 'TIMEOUT')
    throw new ApiRequestError('The connection was interrupted before the server confirmed the request. Check your connection and retry.', 0, 'NETWORK_ERROR')
  }
  const response = await fetch(`/api/ai?${new URLSearchParams({ ...options.query, action })}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : options.raw ? { 'Content-Type': 'application/octet-stream' } : {}), ...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {}), ...(supportSubject ? { 'X-EduPulse-Subject': supportSubject } : {}), ...options.headers },
    ...(body ? { body: JSON.stringify(body) } : options.raw ? { body: options.raw } : {}), signal: abort,
  }).catch(transportError)
  if (!response.headers.get('content-type')?.includes('application/json')) throw new ApiRequestError(response.status === 504 ? 'The server stopped this request before it finished. Check the saved state before retrying.' : 'The AI API did not return a usable response. Check the deployment and retry.', response.status || 502, response.status === 504 ? 'TIMEOUT' : 'INVALID_RESPONSE')
  const data = await response.json().catch(error => { if (error instanceof SyntaxError) throw new ApiRequestError('The AI API returned an unreadable response. Check the deployment and retry.', 502, 'INVALID_RESPONSE'); return transportError(error) })
  if (typeof window !== 'undefined' && requestToken === accessToken && ['chat', 'courseware', 'operator'].includes(action) && ((!data.pending && response.ok) || ['MODEL_NOT_AVAILABLE', 'MODEL_INCOMPATIBLE', 'PROVIDER_AUTH', 'PROVIDER_CREDITS', 'PROVIDER_QUOTA', 'PROVIDER_WORKSPACE_REQUIRED', 'EMPTY_RESPONSE'].includes(data.error?.code))) window.dispatchEvent(new Event('edupulse-ai-change'))
  if (version !== sessionVersion) throw new ApiRequestError('The account view changed. The previous response was discarded.', 409, 'SESSION_CHANGED')
  if (!response.ok) throw new ApiRequestError(data.error?.message || `Request failed (${response.status}).`, response.status, data.error?.code)
  if (typeof window !== 'undefined' && requestToken === accessToken && ((action === 'workspace' && method === 'PUT') || (action === 'academic' && method === 'POST'))) window.dispatchEvent(new CustomEvent('edupulse-records-change', { detail: { action, operation: (body as { operation?: string })?.operation } }))
  return data as T
}

export type ModelState = { model: string; state: string; ready: boolean }
export type AiHealth = {
  version: string; provider: string; model: string | null; ready: boolean; embeddings: boolean; message: string
  database: { ready: boolean; kind: string; message: string }; identity: { mode: string; role: string }; checkedAt: string
  connection?: { provider: string; model: string; source: string; expiresAt: string | null; testedAt?: string; workspaceId?: string } | null
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
export const UPLOAD_ACCEPT = '.pdf,.docx,.pptx,.xlsx,.html,.htm,.txt,.md,.markdown,.csv'
/** Uploads raw bytes for sandboxed extraction. Nothing is stored until the text is indexed. */
export async function extractDocument(file: File, signal?: AbortSignal) {
  if (file.size > 4_000_000) throw new Error('Files must be 4 MB or smaller.')
  if (!file.size) throw new Error('The file is empty.')
  return aiRequest<ExtractionReport>('extract', 'POST', undefined, signal, { raw: file, headers: { 'X-File-Name': encodeURIComponent(file.name.slice(-255)) } })
}

/** Knowledge-library source type for an extraction (a workbook is indexed as its comma-separated rows). */
export const sourceTypeFor = (kind: string) => kind === 'xlsx' ? 'csv' : ['pdf', 'docx', 'pptx', 'html', 'markdown', 'csv'].includes(kind) ? kind : 'text'
export type ReferenceFile = { title: string; text: string; fileName: string; kind: string; sourceType: string; raw?: string; syllabus?: ReturnType<typeof import('../utils/syllabusParser.js').parseSyllabusText>; scannedPages?: number }
/** Chat attachments use the same sandboxed extraction as the knowledge library. */
export async function readReferenceFile(file: File, onProgress: (message: string) => void = () => {}): Promise<ReferenceFile> {
  const report = await extractDocument(file)
  let text = report.text.trim(), scannedPages = 0
  let pdfLayout: Awaited<ReturnType<typeof import('../utils/pdfSyllabus.js').readPdfSyllabus>> | undefined
  let outline: import('../utils/syllabusParser.js').OutlineRow[] = []
  if (report.kind === 'pdf') {
    const { readPdfSyllabus } = await import('../utils/pdfSyllabus.js')
    const layout = await readPdfSyllabus(file, onProgress)
    pdfLayout = layout
    text = layout.text; scannedPages = layout.scannedPages; outline = layout.outline
  }
  const { parseSyllabusText } = await import('../utils/syllabusParser.js')
  const looksLikeSyllabus = /\b(?:course\s+(?:code|outline|information)|program outcomes)\b/i.test(text) && (/syllab/i.test(file.name) || /course\s+outline|intended\s+learning\s+outcomes/i.test(text))
  let syllabus = looksLikeSyllabus ? parseSyllabusText(text, outline) : undefined
  if (syllabus && pdfLayout) {
    if (pdfLayout.policies) syllabus.sections[5].parsed = pdfLayout.policies
    if (pdfLayout.institutionalContext) syllabus.sections[2].parsed.institutionalContext = pdfLayout.institutionalContext
    syllabus.provenance = pdfLayout.provenance
    syllabus.warnings = pdfLayout.warnings
  }
  if (syllabus && report.kind === 'docx' && file.size <= 2_000_000) {
    const { parseSyllabusFile } = await import('../utils/syllabusParser.js')
    syllabus = await parseSyllabusFile(file, onProgress)
  }
  // Plain-text tables are also kept exactly as written, so class lists keep their columns and tabs.
  const raw = report.kind === 'csv' || report.kind === 'text' ? (await file.text()).slice(0, 400_000) : undefined
  return { title: file.name.slice(0, 160), text: text.slice(0, 150000), fileName: file.name.slice(-255), kind: report.kind, sourceType: sourceTypeFor(report.kind), raw, syllabus, scannedPages }
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
    webSearch: (topic, abort) => aiRequest('web-search', 'POST', { topic: topic.slice(0, 200) }, abort),
    generate, provider: 'browser', model: browserAIState().model,
  }
  return deps
}

export async function askPulse(input: Partial<ChatInput> & { message: string }, signal?: AbortSignal): Promise<AiAnswer> {
  if (aiPreference() !== 'browser') return aiRequest<AiAnswer>('chat', 'POST', input, signal)
  const abort = AbortSignal.any([AbortSignal.timeout(240000), ...(signal ? [signal] : [])])
  const [{ runAgents }, { chatInput }, { contextualDeps }] = await Promise.all([import('./rag/agents'), import('../../server/contracts'), import('./rag/context')])
  const session: Identity = { id: 'device-session', role: input.viewRole || 'guest', local: false }
  let prepared: import('./rag/context').PreparedChatContext = { input: chatInput.parse(input), evidence: [], warnings: [], privateContext: true }
  let onlineContext = false
  let fallbackAnswer:AiAnswer|undefined
  try {
    const response = await aiRequest<import('./rag/context').PreparedChatContext & { identity: Identity; answer?: AiAnswer; fallbackAnswer?:AiAnswer }>('chat-context', 'POST', prepared.input, abort)
    if (response.answer) return response.answer
    fallbackAnswer=response.fallbackAnswer
    Object.assign(session, response.identity); prepared = response; onlineContext = true
  } catch (error) {
    if (abort.aborted || error instanceof ApiRequestError && [401,403].includes(error.status)) throw error
    prepared.warnings.push('Online account context and memory are unavailable. This reply uses only supplied context and the on-device model.')
    prepared.input.context = `Live account records and memory are unavailable; do not invent records or claim recall.\n${prepared.input.context}`.slice(0, 6000)
  }
  if (browserAIState().status !== 'ready') {
    if(fallbackAnswer)return fallbackAnswer
    throw new Error('Your on-device model is not ready. Open AI settings to load it or choose a provider.')
  }
  const result = await runAgents(prepared.input, session, abort, contextualDeps(prepared, browserDeps(abort, session)))
  if (onlineContext && prepared.input.conversationId && session.role !== 'guest' && result.mode !== 'declined') {
    try { await aiRequest('chat-memory', 'POST', { conversationId: prepared.input.conversationId, result: { task: result.task, mode: result.mode, answer: result.answer.slice(0,1200), sources: result.sources.slice(0,12).map(source => ({ id: source.id.slice(0,200), title: source.title.slice(0,160), ...(source.url ? { url: source.url } : {}) })), trace: result.trace.slice(0,16).map(stage => ({ agent: stage.agent, node: stage.node, status: stage.status })) } }, abort) }
    catch { prepared.warnings.push('The on-device agent handoff was not saved. The response remains available in this conversation.') }
  }
  return { ...result, warning: [...new Set([result.warning, ...prepared.warnings].filter(Boolean))].join(' ') || null }

}

export type CourseDraft = Awaited<ReturnType<typeof import('./rag/courseware').draftCoursewareAgents>>
export async function syllabusSources<T={sources:import('../../server/sources/contracts').SourceStatus[]}>(operation:Record<string,unknown>,signal?:AbortSignal) {
  return aiRequest<T>('syllabus-sources','POST',operation,signal)
}
export type ImportedReference={reference:import('../../server/sources/contracts').SourceReference;snapshot:import('../../server/sources/contracts').SourceSummary|null;missing:string[];message?:string;titleOrigin?:string;reused?:boolean}
export const importSyllabusReference=(operation:Record<string,unknown>,signal?:AbortSignal)=>syllabusSources<ImportedReference>(operation,signal)
export const indexSyllabusReference=(id:string,course?:string,signal?:AbortSignal)=>syllabusSources<{indexed:true;documentId:string;duplicate:boolean;chunks:number;embeddingModel:string}>({operation:'index',id,...(course?{course}:{})},signal)
export async function prepareSyllabusSources(references:import('./rag/syllabusReferences').SyllabusReference[],signal?:AbortSignal,refresh=false,readLinks=true) {
  if(!references.length)return []
  let sources=(await syllabusSources({operation:'list',references},signal)).sources
  const pending=sources.filter(source=>source.reference.url&&(refresh||!source.snapshot))
  if(readLinks)for(let i=0;i<pending.length;i+=3){
    signal?.throwIfAborted()
    const result=await syllabusSources({operation:'read',references:pending.slice(i,i+3).map(source=>source.reference),refresh},signal)
    const byKey=new Map(result.sources.map(source=>[source.key,source]));sources=sources.map(source=>byKey.get(source.key)||source)
  }
  return sources
}
export async function downloadRetainedSource(id:string) {
 const result=await aiRequest<{name:string;mime:string;base64:string;sha256:string}>('syllabus-sources','POST',{operation:'open',id})
 const bytes=Uint8Array.from(atob(result.base64),char=>char.charCodeAt(0))
 const sha=await crypto.subtle.digest('SHA-256',bytes);if([...new Uint8Array(sha)].map(byte=>byte.toString(16).padStart(2,'0')).join('')!==result.sha256)throw new Error('The retained file checksum did not match. Download was stopped.')
 const {downloadBlob}=await import('../utils/syllabusFiles');downloadBlob(new Blob([bytes],{type:result.mime}),result.name)
}
export async function generateCoursewareParts(input:CourseInput,signal?:AbortSignal,types?:('material'|'activity'|'assessment')[],options:{completed?:import('./rag/courseware').StepResult[];onPart?:(results:import('./rag/courseware').StepResult[])=>Promise<void>;onProgress?:(completed:number,total:number,key:string)=>void}={}) {
  const [{coursewarePlan,COURSEWARE_PLAN_VERSION},{draftCoursewareStep,assembleCourseware}]=await Promise.all([import('./rag/coursewarePlan'),import('./rag/courseware')])
  const results:Awaited<ReturnType<typeof draftCoursewareStep>>[]=[...(options.completed||[])]
  const plan=coursewarePlan(input).filter(part=>!types||types.includes(part.type))
  let failed:unknown
  let sourceWarning=''
  if(input.syllabusReferences?.length&&plan.some(part=>!results.some(result=>result.step.key===part.key))){
    options.onProgress?.(results.length,plan.length,'sources')
    try{const sources=await prepareSyllabusSources(input.syllabusReferences.map(ref=>({url:'',authors:'',year:'',publisher:'',...ref})),signal,false,input.research!=='sources');if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('edupulse-sources-updated',{detail:{sources,sessionVersion:aiSessionVersion()}}));if(sources.some(source=>!source.snapshot))sourceWarning='Some syllabus references could not be read. Only actual retrieved passages can support citations.'}
    catch(error){signal?.throwIfAborted();sourceWarning='Syllabus source retention was unavailable. No unread book or linked-page contents are claimed.'}
  }
  for(const part of plan) {
    signal?.throwIfAborted()
    if(results.some(result=>result.step.key===part.key))continue
    options.onProgress?.(results.length,plan.length,part.key)
    const scoped={...input,planVersion:COURSEWARE_PLAN_VERSION,stepKey:part.key}
    try {
      if(aiPreference()!=='browser')results.push({...await aiRequest<Awaited<ReturnType<typeof draftCoursewareStep>>>('courseware','POST',scoped,signal),step:part})
      else {
        const abort=AbortSignal.any([AbortSignal.timeout(180000),...(signal?[signal]:[])])
        const deps=browserDeps(abort,{id:'device-session',role:'guest',local:false})
        results.push(await draftCoursewareStep(scoped,abort,{...deps,generate:invokeBrowserModel,sourceEvidence:(references,focus,signal)=>aiRequest('syllabus-sources','POST',{operation:'evidence',references,focus},signal)}))
      }
    } catch(error) {
      signal?.throwIfAborted()
      // Only model-content failures can move on to another independently planned part.
      // Auth, quota, network, timeout and save failures stop further spending immediately.
      if(!options.onPart||!['INVALID_GENERATION','MODEL_TOKEN_LIMIT','INCOMPLETE_COURSEWARE'].includes((error as {code?:string}).code||''))throw error
      failed=error;continue
    }
    // Wait for durable acknowledgement before spending inference on the next part.
    signal?.throwIfAborted()
    await options.onPart?.([...results])
  }
  if(failed)throw failed
  const assembled=assembleCourseware(input,results,types)
  if(sourceWarning){assembled.warning=[assembled.warning,sourceWarning].filter(Boolean).join(' ');for(const review of Object.values(assembled.reviews))if(review)review.warning=[review.warning,sourceWarning].filter(Boolean).join(' ')}
  return assembled
}
export async function generateCourseDraft(input:CourseInput,signal?:AbortSignal):Promise<CourseDraft> {
  const result=await generateCoursewareParts(input,signal)
  if(!result.content.material)throw new Error('The complete lesson did not finish. Existing courseware was preserved.')
  return {...result,content:{...result.content,material:result.content.material}}
}
