import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ApiError, chatInput, courseInput, documentInput, referencesInput, researchInput, similarityInput, type Identity } from './contracts.js'
import { config } from './config.js'
import { providerHealth } from './providers.js'
import { MAX_DOCUMENTS, deleteDocument, ingest, listDocuments } from './database.js'
import { runChat, runCourseware, serverDeps } from './graph.js'
import { readWorkspace, saveWorkspace, workspaceInput, WORKSPACE_BYTES } from './workspace.js'
import { connectionCookie, connectionInput, createConnection, discoverModels, publicConnection, readConnection, serverConnection } from './connections.js'
import { extractUpload } from './ingest/prepare.js'
import { SANDBOX_LIMITS } from './ingest/sandbox.js'
import { LIMITS as EXTRACTION_LIMITS, SUPPORTED as EXTRACTION_FORMATS } from './ingest/formats.mjs'
import { research, similarityMatrix } from './rag/search.js'
import { findReferences } from './external/references.js'
import { embedTexts, modelStatus } from './ml/onnx.js'

export const VERSION = '0.4.0'
/** Request body limits per action (bytes). Uploads are raw file bytes. */
export const BODY_LIMITS: Record<string, number> = { workspace: WORKSPACE_BYTES, extract: EXTRACTION_LIMITS.bytes, documents: 1_000_000 }
export const bodyLimit = (action: string | null) => BODY_LIMITS[action || ''] ?? 100_000
const buckets = new Map<string, { count: number; until: number }>()
const active = new Set<string>()

export async function authenticate(request: Request): Promise<Identity> {
  const authorization = request.headers.get('authorization')
  if (authorization) {
    if (!authorization.startsWith('Bearer ') || authorization.length > 8192) throw new ApiError(401, 'INVALID_SESSION', 'Please sign in again.')
    const c = config()
    if (!c.supabaseUrl || !c.supabaseKey) throw new ApiError(503, 'AUTH_UNAVAILABLE', 'Authentication is not configured.')
    const token = authorization.slice(7)
    const client = createClient(c.supabaseUrl, c.supabaseKey, { auth: { persistSession: false }, global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(6000) }) } })
    const { data, error } = await client.auth.getUser(token)
    if (error || !data.user) throw new ApiError(401, 'INVALID_SESSION', 'Your session could not be verified. Please sign in again.')
    const role = data.user.app_metadata.role
    return { id: data.user.id, role: ['instructor', 'admin'].includes(role) ? role : 'student', token, local: false }
  }
  if (!config().hosted && process.env.AI_LOCAL_MODE === 'true') return { id: 'local-workspace', role: 'instructor', local: true }
  return { id: 'public-guest', role: 'guest', local: false }
}

export function enforceOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const url = new URL(request.url)
  if (!config().hosted && process.env.AI_LOCAL_MODE === 'true' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new ApiError(403, 'HOST_REJECTED', 'Local workspace requests must use localhost.')
  if (origin && origin !== url.origin) throw new ApiError(403, 'ORIGIN_REJECTED', 'Cross-origin requests are not allowed.')
}

function json(data: unknown, status = 200, cookie?: string) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(cookie ? { 'Set-Cookie': cookie } : {}) } })
}

/** A display-safe file name: last path segment, no control or reserved characters. */
export function safeFileName(header: string | null) {
  let name = ''
  try { name = decodeURIComponent(header || '') } catch { name = '' }
  // oxlint-disable-next-line no-control-regex -- removing control characters is the purpose of this pattern
  name = name.split(/[\\/]/).pop()!.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '').trim().slice(-255)
  if (!name || !/\.[a-z0-9]{1,8}$/i.test(name)) throw new ApiError(400, 'FILE_NAME_REQUIRED', 'Upload a file with its original name and extension.')
  return name
}

async function readJson(request: Request, limit: number): Promise<unknown> {
  const text = await request.text()
  if (Buffer.byteLength(text) > limit) throw new ApiError(413, 'BODY_TOO_LARGE', `The request exceeds ${Math.round(limit / 1000)} KB. Use a smaller document.`)
  try { return JSON.parse(text) } catch { throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.') }
}

export async function handleRequest(request: Request): Promise<Response> {
  const requestId = randomUUID()
  let activeId: string | undefined
  let action = 'unknown'
  try {
    enforceOrigin(request)
    action = new URL(request.url).searchParams.get('action') || 'health'
    const methods: Record<string, string[]> = { health: ['GET'], providers: ['GET', 'POST', 'DELETE'], context: ['POST'], similarity: ['POST'], references: ['POST'], extract: ['POST'], chat: ['POST'], courseware: ['POST'], documents: ['GET', 'POST', 'DELETE'], workspace: ['GET', 'PUT'] }
    if (!methods[action]) throw new ApiError(404, 'NOT_FOUND', 'Unknown API action.')
    if (!methods[action].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: methods[action].join(', '), 'Cache-Control': 'no-store' } })
    const identity = await authenticate(request)
    const personalConnection = readConnection(request, identity)
    const connection = personalConnection || serverConnection()
    if (action === 'providers' && request.method === 'DELETE') return json({ connection: null, models: [] }, 200, connectionCookie(null))
    if (action === 'providers' && request.method === 'GET') {
      const models = connection ? await discoverModels(connection.provider, connection.apiKey) : []
      return json({ connection: publicConnection(connection), models })
    }
    if (action === 'workspace') {
      if (request.method === 'GET') return json(await readWorkspace(identity))
      if (!['instructor', 'admin'].includes(identity.role)) throw new ApiError(403, 'FORBIDDEN', 'Sign in as an instructor to save a workspace.')
      return json(await saveWorkspace(identity, workspaceInput.parse(await readJson(request, WORKSPACE_BYTES))))
    }
    if (action === 'health') {
      const [base, models] = await Promise.all([providerHealth(), modelStatus()])
      const health = personalConnection ? { ...await providerHealth(personalConnection), embeddings: base.embeddings } : base
      if (identity.role === 'guest' && !personalConnection) { health.ready = false; health.message = 'Choose free on-device AI or connect your own provider for conversation and drafting. Page guidance is already available.' }
      let database: { ready: boolean; message: string } = { ready: false, message: 'Sign in to check your private library.' }
      if (identity.role !== 'guest') {
        try { const docs = await listDocuments(identity); database = { ready: true, message: `${docs.length} documents in your library.` } }
        catch { database = { ready: false, message: 'Private library is unavailable. Database connection or migration needs attention.' } }
      }
      return json({
        version: VERSION, ...health, connection: publicConnection(connection), database: { ...database, kind: config().database },
        pipeline: { ...models, vectorStore: config().database === 'local' ? 'PGlite + pgvector (HNSW) + Postgres full-text' : 'Supabase pgvector (HNSW) + Postgres full-text', retrieval: 'hybrid (vector + keyword, reciprocal rank fusion) → cross-encoder reranking', extraction: { formats: EXTRACTION_FORMATS, maxBytes: EXTRACTION_LIMITS.bytes, sandbox: `worker thread · ${SANDBOX_LIMITS.heapLimitMb} MB heap · ${SANDBOX_LIMITS.timeoutMs / 1000} s · empty environment` }, agents: ['Planner', 'Researcher', 'Ranker', 'Comparator', 'Writer', 'Verifier', 'Corrector', 'Librarian'] },
        identity: { mode: identity.local ? 'local-workspace' : identity.token ? 'authenticated' : 'public-guide', role: identity.role },
        limits: { maxDocuments: MAX_DOCUMENTS, maxDocumentCharacters: 150_000, maxUploadBytes: EXTRACTION_LIMITS.bytes, maxAttachments: 3, generationAttempts: 2, requestTimeoutMs: config().timeoutMs }, checkedAt: new Date().toISOString(),
      })
    }
    if (action === 'documents' && identity.role === 'guest') throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Sign in to manage private knowledge. Preview access only includes the public guide.')
    if (action === 'documents' && request.method === 'GET') return json({ documents: await listDocuments(identity) })
    if (action === 'courseware' && !['instructor', 'admin'].includes(identity.role) && !(identity.role === 'guest' && personalConnection)) throw new ApiError(403, 'FORBIDDEN', 'Sign in with an instructor account, use the local workspace, or connect your own provider for preview drafts.')
    const now = Date.now()
    for (const [key, value] of buckets) if (value.until < now) buckets.delete(key)
    const key = `${identity.id}:${personalConnection?.id || 'default'}`
    const bucket = buckets.get(key) || { count: 0, until: now + 60000 }
    if (bucket.count >= 20 || active.has(key)) throw new ApiError(429, 'RATE_LIMIT', 'Please wait for the current request to finish, then retry. Limit: 20 requests per minute.')
    bucket.count++; buckets.set(key, bucket)
    active.add(key); activeId = key
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(config().timeoutMs)])
    if (action === 'extract') {
      // Raw bytes go straight to the sandbox; nothing is stored until the user reviews and indexes the text.
      const fileName = safeFileName(request.headers.get('x-file-name'))
      const bytes = new Uint8Array(await request.arrayBuffer())
      if (bytes.length > EXTRACTION_LIMITS.bytes) throw new ApiError(413, 'FILE_TOO_LARGE', 'Files must be 4 MB or smaller.')
      return json(await extractUpload(bytes, fileName, signal))
    }
    const body = await readJson(request, bodyLimit(action))
    if (action === 'providers') {
      if (identity.role === 'student') throw new ApiError(403, 'FORBIDDEN', 'Provider configuration is available to instructors.')
      const input = connectionInput.parse(body)
      if (input.provider === 'ollama' && identity.role === 'guest' && config().hosted) throw new ApiError(403, 'FORBIDDEN', 'Use on-device AI or your own hosted provider in preview.')
      const result = await createConnection(input, identity, personalConnection)
      return json({ connection: publicConnection(result.connection), models: result.models }, 200, connectionCookie(result.connection))
    }
    if (action === 'context') {
      const input = researchInput.parse(body)
      return json({ ...await research(identity, input.queries, input.focus, input.documentIds, signal), identity: { id: identity.id, role: identity.role, local: identity.local } })
    }
    if (action === 'similarity') {
      const input = similarityInput.parse(body)
      return json({ matrix: await similarityMatrix(input.left, input.right, signal) })
    }
    if (action === 'references') {
      const { topic } = referencesInput.parse(body)
      return json(await findReferences(topic, signal, embedTexts))
    }
    if (action === 'documents' && request.method === 'DELETE') {
      const { id } = z.object({ id: z.string().uuid() }).parse(body)
      await deleteDocument(identity, id)
      return json({ deleted: true })
    }
    if (action === 'documents') return json(await ingest(identity, documentInput.parse(body), signal), 201)
    if (action === 'courseware') return json(await runCourseware(courseInput.parse(body), identity, signal, undefined, connection, Boolean(personalConnection)))
    const input = chatInput.parse(body)
    // Guests get the public guide only and cannot use hosted generation or submit private attachments.
    if (identity.role === 'guest' && !personalConnection) {
      if (input.attachments.length) throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Sign in to send reference attachments.')
      return json(await runChat(input, identity, signal, serverDeps(identity, undefined)))
    }
    return json(await runChat(input, identity, signal, undefined, connection))
  } catch (error) {
    if (error instanceof z.ZodError) return json({ error: { code: 'INVALID_INPUT', message: 'Some input fields are missing, too long, or invalid.', requestId } }, 400)
    if (error instanceof ApiError) return json({ error: { code: error.code, message: error.message, requestId } }, error.status)
    if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) return json({ error: { code: 'TIMEOUT', message: 'The request was stopped or timed out. Try a smaller request.', requestId } }, 504)
    // Provider/database errors may contain credentials or document text. Never return or log raw exceptions.
    console.error(JSON.stringify({ event: 'ai_request_failed', requestId, action, errorType: error instanceof Error ? error.name : 'Unknown' }))
    return json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'The AI service could not finish this request. Check AI & Knowledge settings and try again.', requestId } }, 503)
  } finally { if (activeId) active.delete(activeId) }
}
