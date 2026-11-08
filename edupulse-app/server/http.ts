import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ApiError, chatInput, chatMemoryInput, courseInput, documentInput, referencesInput, researchInput, similarityInput, type Identity } from './contracts.js'
import { config } from './config.js'
import { invokeModel, providerHealth } from './providers.js'
import { MAX_DOCUMENTS, deleteDocument, ingest, listDocuments } from './database.js'
import { runChat, runCourseware, serverDeps, prepareChatContext } from './graph.js'
import { readWorkspace, saveWorkspace, workspaceInput, WORKSPACE_BYTES } from './workspace.js'
import { connectionCookie, connectionInput, createConnection, discoverModels, discoverWorkspaces, workspaceListInput, publicConnection, serverConnection, type Connection } from './connections.js'
import { extractUpload } from './ingest/prepare.js'
import { SANDBOX_LIMITS } from './ingest/sandbox.js'
import { LIMITS as EXTRACTION_LIMITS, SUPPORTED as EXTRACTION_FORMATS } from './ingest/formats.mjs'
import { research, similarityMatrix } from './rag/search.js'
import { findReferences } from './external/references.js'
import { researchCourse, searchWeb } from './external/web.js'
import { embedTexts, modelStatus } from './ml/onnx.js'
import { agentRunRow, failedRunRow, recordAgentRun } from './agentRuns.js'
import { AGENT_ORDER } from '../src/lib/rag/registry.js'
import { canGenerateCourseware } from '../src/lib/access.js'
import { academicCommand, executeAcademic, readAcademic } from './domains/academic.js'
import { readStudents } from './domains/students.js'
import { changeLease } from './requestLimits.js'
import { providerOAuth, providerOAuthInput } from './domains/providerOAuth.js'
import { agentMemory, conversationCommand, conversationRecall, executeConversation, readConversations } from './domains/conversations.js'
import { operatorInput, operatorRequest } from './domains/operator.js'
import { loadProviders, removeProvider, resolveProvider, saveProvider } from './providerStore.js'
import { checkAppropriateUse } from '../src/lib/rag/policy.js'
import { supportAction, supportFilters, supportIdentity } from './domains/support.js'

export const VERSION = '0.4.0'
/** Request body limits per action (bytes). Uploads are raw file bytes. */
export const BODY_LIMITS: Record<string, number> = { workspace: WORKSPACE_BYTES, extract: EXTRACTION_LIMITS.bytes, documents: 1_000_000, conversations: 200_000, operator: 330_000 }
export const bodyLimit = (action: string | null) => BODY_LIMITS[action || ''] ?? 100_000
const ACTION_METHODS: Record<string, string[]> = { 'chat-context': ['POST'], 'chat-memory': ['POST'], support: ['GET', 'POST'], health: ['GET'], providers: ['GET', 'POST', 'DELETE'], 'provider-oauth': ['POST'], 'provider-test': ['POST'], 'provider-workspaces': ['POST'], conversations: ['GET', 'POST'], operator: ['POST'], context: ['POST'], similarity: ['POST'], references: ['POST'], 'web-search': ['POST'], extract: ['POST'], chat: ['POST'], courseware: ['POST'], documents: ['GET', 'POST', 'DELETE'], workspace: ['GET', 'PUT'], academic: ['GET', 'POST'], students: ['GET'] }
export const allowedMethods = (action: string) => Object.hasOwn(ACTION_METHODS, action) ? ACTION_METHODS[action] : undefined
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
    const role = data.user.app_metadata?.role
    if (!['admin', 'dean', 'associate_dean', 'instructor', 'student'].includes(role) ||
        (role === 'admin' && (data.user.email?.toLowerCase() !== 'riverabenlor461@gmail.com' ||
          !data.user.app_metadata?.providers?.includes('google')))) {
      throw new ApiError(403, 'ROLE_NOT_ASSIGNED', 'This account has no EduPulse role. Contact the administrator.')
    }
    return { id: data.user.id, role, token, local: false, name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] }
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
  let leaseIdentity: Identity | undefined
  let usedPersonalConnection: Connection | undefined
  let authenticatedIdentity: Identity | undefined
  let action = 'unknown'
  try {
    enforceOrigin(request)
    action = new URL(request.url).searchParams.get('action') || 'health'
    const methods = allowedMethods(action)
    if (!methods) throw new ApiError(404, 'NOT_FOUND', 'Unknown API action.')
    if (!methods.includes(request.method)) return new Response(null, { status: 405, headers: { Allow: methods.join(', '), 'Cache-Control': 'no-store' } })
    const identity = await authenticate(request)
    authenticatedIdentity = identity
    if (action === 'support') {
      if (request.method === 'GET') return json(await supportAction(identity, 'accounts', supportFilters.parse(Object.fromEntries(new URL(request.url).searchParams))))
      const command = z.object({ id: z.string().uuid(), operation: z.enum(['enter','leave']) }).parse(await readJson(request, 2000))
      const subject = await supportIdentity(identity, command.id)
      return json(await supportAction(subject, command.operation))
    }
    const effective = ['academic','workspace','chat','chat-context','chat-memory','courseware','operator','context','web-search','students'].includes(action) ? await supportIdentity(identity, request.headers.get('X-EduPulse-Subject')) : identity
    if (action === 'chat-context') return json({ ...await prepareChatContext(chatInput.parse(await readJson(request, bodyLimit(action))), identity, effective), identity: { id: effective.id, role: effective.role, local: effective.local } })
    if (action === 'chat-memory') {
      if (identity.role === 'guest') throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Sign in to save private agent handoffs.')
      const input = chatMemoryInput.parse(await readJson(request, 18000))
      await agentMemory(identity, input.conversationId, effective.id, { ...input.result, answer: `On-device reported outcome (untrusted prior conversation, not a verified action): ${input.result.answer}` })
      return json({ processed: true })
    }
    // Deny unsupported account roles before reading any AI credentials/store.
    if (action === 'courseware' && effective.role !== 'guest' && !canGenerateCourseware(effective.role)) throw new ApiError(403, 'FORBIDDEN', 'Courseware generation requires an instructor account or the system admin instructor view. Preview drafts require your own provider connection.')
    if (action === 'students') return json(await readStudents(effective,new URL(request.url)))
    if (action === 'conversations') {
      const url = new URL(request.url), query = url.searchParams.get('q')
      if (query && query.length > 4000) throw new ApiError(400, 'INVALID_INPUT', 'Use a shorter conversation search.')
      return request.method === 'GET' ? json(query ? await conversationRecall(identity, query, url.searchParams.get('id') || undefined) : await readConversations(identity, url.searchParams.get('id'))) : json(await executeConversation(identity, conversationCommand.parse(await readJson(request, bodyLimit(action)))))
    }
    if (action === 'academic') return request.method === 'GET' ? json(await readAcademic(effective)) : json(await executeAcademic(effective, academicCommand.parse(await readJson(request, 5000))))
    if (action === 'workspace') {
      if (request.method === 'GET') {
        const known = new URL(request.url).searchParams.get('known')
        return json(await readWorkspace(effective, known !== null && /^\d{1,9}$/.test(known) ? Number(known) : undefined))
      }
      if (!['instructor', 'admin', 'dean', 'associate_dean'].includes(effective.role)) throw new ApiError(403, 'FORBIDDEN', 'Sign in with an academic account to save a workspace.')
      return json(await saveWorkspace(effective, workspaceInput.parse(await readJson(request, WORKSPACE_BYTES))))
    }
    if (action === 'providers' && request.method === 'DELETE' && new URL(request.url).searchParams.get('sessionOnly') === 'true') return json({ connection: null, models: [] }, 200, connectionCookie(null))
    const personalConnection = await resolveProvider(request, identity)
    usedPersonalConnection = personalConnection
    // Server credentials are reserved for the local workspace. Hosted users
    // must connect their own key, bound to their verified Supabase account.
    const connection = personalConnection || (identity.local ? serverConnection() : undefined)
    if (action === 'providers' && request.method === 'DELETE') {
      const query = new URL(request.url).searchParams
      if (query.get('sessionOnly') !== 'true') await removeProvider(identity, query.has('provider') ? connectionInput.shape.provider.parse(query.get('provider')) : personalConnection?.provider)
      return json({ connection: null, models: [] }, 200, connectionCookie(null))
    }
    if (action === 'providers' && request.method === 'GET') {
      try {
        const models = connection ? await discoverModels(connection.provider, connection.apiKey, undefined, undefined, connection.workspaceId) : []
        return json({ connection: publicConnection(connection), models, connections: (await loadProviders(identity)).map(row => ({ ...publicConnection(row.connection), active: row.active })) })
      } catch (error) {
        return json({ connection: publicConnection(connection), models: [], connections: (await loadProviders(identity)).map(row => ({ ...publicConnection(row.connection), active: row.active })), warning: error instanceof ApiError ? error.message : 'The saved credential is retained. Models could not be loaded; retry Refresh models.' })
      }
    }
    if (action === 'health') {
      const models = await modelStatus()
      const health = connection ? await providerHealth(connection) : {
        provider: 'none', model: null, ready: false, embeddings: models.embeddings.ready,
        message: 'Connect your own provider key in AI & Knowledge, or use on-device AI.',
      }
      let database: { ready: boolean; message: string } = { ready: false, message: 'Sign in to check your private library.' }
      if (identity.role !== 'guest') {
        try { const docs = await listDocuments(identity); database = { ready: true, message: `${docs.length} documents in your library.` } }
        catch { database = { ready: false, message: 'Private library is unavailable. Database connection or migration needs attention.' } }
      }
      return json({
        version: VERSION, ...health, connection: publicConnection(connection), database: { ...database, kind: config().database },
        pipeline: { ...models, vectorStore: config().database === 'local' ? 'PGlite + pgvector (HNSW) + Postgres full-text' : 'Supabase pgvector (HNSW) + Postgres full-text', retrieval: 'hybrid (vector + keyword, reciprocal rank fusion) → cross-encoder reranking', extraction: { formats: EXTRACTION_FORMATS, maxBytes: EXTRACTION_LIMITS.bytes, sandbox: `worker thread · ${SANDBOX_LIMITS.heapLimitMb} MB heap · ${SANDBOX_LIMITS.timeoutMs / 1000} s · empty environment` }, agents: AGENT_ORDER },
        identity: { mode: identity.local ? 'local-workspace' : identity.token ? 'authenticated' : 'public-guide', role: identity.role },
        limits: { maxDocuments: MAX_DOCUMENTS, maxDocumentCharacters: 150_000, maxUploadBytes: EXTRACTION_LIMITS.bytes, maxAttachments: 3, generationAttempts: 2, requestTimeoutMs: config().timeoutMs }, checkedAt: new Date().toISOString(),
      })
    }
    if (action === 'documents' && identity.role === 'guest') throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Sign in to manage private knowledge. Preview access only includes the public guide.')
    if (action === 'documents' && request.method === 'GET') return json({ documents: await listDocuments(identity) })
    if (action === 'courseware' && !canGenerateCourseware(identity.role) && !(identity.role === 'guest' && personalConnection)) throw new ApiError(403, 'FORBIDDEN', 'Courseware generation requires an instructor account or the system admin instructor view. Preview drafts require your own provider connection.')
    const now = Date.now()
    for (const [key, value] of buckets) if (value.until < now) buckets.delete(key)
    const key = `${identity.id}:${personalConnection?.id || 'default'}`
    request.signal.throwIfAborted()
    const bucket = buckets.get(key) || { count: 0, until: now + 60000 }
    if (config().hosted && identity.token) {
      await changeLease(identity, requestId); leaseIdentity = identity
    } else {
      if (bucket.count >= 20 || active.has(key)) throw new ApiError(429, 'RATE_LIMIT', 'Please wait for the current request to finish, then retry. Limit: 20 requests per minute.')
      bucket.count++; buckets.set(key, bucket)
      active.add(key); activeId = key
    }
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(config().timeoutMs)])
    if (action === 'extract') {
      // Raw bytes go straight to the sandbox; nothing is stored until the user reviews and indexes the text.
      const fileName = safeFileName(request.headers.get('x-file-name'))
      const bytes = new Uint8Array(await request.arrayBuffer())
      if (bytes.length > EXTRACTION_LIMITS.bytes) throw new ApiError(413, 'FILE_TOO_LARGE', 'Files must be 4 MB or smaller.')
      return json(await extractUpload(bytes, fileName, signal))
    }
    const body = await readJson(request, bodyLimit(action))
    if (action === 'operator') {
      const stepSignal = config().hosted ? AbortSignal.any([signal, AbortSignal.timeout(70000)]) : signal
      const result = await operatorRequest(operatorInput.parse(body), effective, connection, stepSignal)
      return json(result, 200, personalConnection && 'generated' in result && result.generated ? connectionCookie(await saveProvider(identity, { ...personalConnection, testedAt: Date.now() }, false)) : undefined)
    }
    if (action === 'provider-test') {
      z.object({}).strict().parse(body)
      if (!connection) throw new ApiError(400, 'CONNECTION_REQUIRED', 'Save a provider connection and select a model before testing.')
      await invokeModel('This is a connection test. Reply briefly.', 'Reply with exactly OK.', signal, false, connection, 2048)
      const verified = await saveProvider(identity, { ...connection, testedAt: Date.now() }, false)
      return json({ tested: true, connection: publicConnection(verified), checkedAt: new Date(verified.testedAt!).toISOString() }, 200, personalConnection ? connectionCookie(verified) : undefined)
    }
    if (action === 'provider-oauth') {
      const result = await providerOAuth(request, identity, providerOAuthInput.parse(body))
      return json(result.body, 200, result.cookie)
    }
    if (action === 'provider-workspaces') {
      const input = workspaceListInput.parse(body)
      const apiKey = input.apiKey || (await loadProviders(identity)).find(row => row.connection.provider === 'anthropic')?.connection.apiKey || (personalConnection?.provider === 'anthropic' ? personalConnection.apiKey : undefined)
      return json({ workspaces: await discoverWorkspaces(apiKey, signal) })
    }
    if (action === 'providers') {
      const input = connectionInput.parse(body)
      if (input.provider === 'ollama' && identity.role === 'guest' && config().hosted) throw new ApiError(403, 'FORBIDDEN', 'Use on-device AI or your own hosted provider in preview.')
      const saved = (await loadProviders(identity)).find(row => row.connection.provider === input.provider)?.connection
      const result = await createConnection(input, identity, saved || personalConnection)
      result.connection = await saveProvider(identity, result.connection)
      return json({ connection: publicConnection(result.connection), models: result.models }, 200, connectionCookie(result.connection))
    }
    if (action === 'context') {
      const input = researchInput.parse(body)
      return json({ ...await research(identity, input.queries, input.focus, input.documentIds, signal), identity: { id: effective.id, role: effective.role, local: effective.local } })
    }
    if (action === 'similarity') {
      const input = similarityInput.parse(body)
      return json({ matrix: await similarityMatrix(input.left, input.right, signal) })
    }
    if (action === 'references') {
      const { topic } = referencesInput.parse(body)
      return json(await findReferences(topic, signal, embedTexts))
    }
    if (action === 'web-search') {
      const { topic, bibliography } = referencesInput.extend({ bibliography: z.boolean().default(false) }).strict().parse(body)
      const decision = checkAppropriateUse(topic, effective.role)
      if (!decision.allowed) throw new ApiError(403, 'ACTION_POLICY', decision.guidance)
      return json(await (bibliography ? researchCourse : searchWeb)(topic, signal, connection))
    }
    if (action === 'documents' && request.method === 'DELETE') {
      const { id } = z.object({ id: z.string().uuid() }).parse(body)
      await deleteDocument(identity, id)
      return json({ deleted: true })
    }
    if (action === 'documents') return json(await ingest(identity, documentInput.parse(body), signal), 201)
    // Every agent run is recorded for the System Admin console (FR-AGENT-03), including failures.
    const workflow = action === 'courseware' ? 'courseware' as const : 'chat' as const, started = Date.now()
    try {
      let result
      if (workflow === 'courseware') result = { ...await runCourseware(courseInput.parse(body), effective, signal, undefined, connection, Boolean(personalConnection)), mode: 'courseware', task: 'courseware' }
      else {
        const input = chatInput.parse(body)
        // Guests get the public guide only and cannot use hosted generation or submit private attachments.
        if (identity.role === 'guest' && !personalConnection && input.attachments.length) throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Sign in to send reference attachments.')
        result = identity.role === 'guest' && !personalConnection ? await runChat(input, identity, signal, serverDeps(identity, undefined)) : await runChat(input, identity, signal, undefined, connection, effective)
      }
      await recordAgentRun(identity, agentRunRow(identity, workflow, result, Date.now() - started))
      return json(result, 200, personalConnection && ['generated', 'courseware'].includes(result.mode) ? connectionCookie(await saveProvider(identity, { ...personalConnection, testedAt: Date.now() }, false)) : undefined)
    } catch (error) {
      if (!(error instanceof z.ZodError)) await recordAgentRun(identity, failedRunRow(identity, workflow, Date.now() - started))
      throw error
    }
  } catch (error) {
    if (error instanceof z.ZodError) return json({ error: { code: 'INVALID_INPUT', message: 'Some input fields are missing, too long, or invalid.', requestId } }, 400)
    if (error instanceof ApiError) {
      const invalidateTest = usedPersonalConnection && ['chat', 'courseware', 'operator', 'provider-test'].includes(action) && ['MODEL_NOT_AVAILABLE', 'MODEL_INCOMPATIBLE', 'PROVIDER_AUTH', 'PROVIDER_CREDITS', 'PROVIDER_QUOTA', 'PROVIDER_WORKSPACE_REQUIRED', 'EMPTY_RESPONSE'].includes(error.code)
      if (invalidateTest) {
        // A provider failure keeps its encrypted credential, but removes the
        // earlier verification after the next account reopen as well.
        if (authenticatedIdentity) await saveProvider(authenticatedIdentity, { ...usedPersonalConnection!, testedAt: undefined }, false).catch(() => undefined)
      }
      const response = json({ error: { code: error.code, message: error.message, requestId, ...(error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {}) } }, error.status, invalidateTest ? connectionCookie({ ...usedPersonalConnection!, testedAt: undefined }) : undefined)
      if (error.retryAfterSeconds) response.headers.set('Retry-After', String(error.retryAfterSeconds))
      return response
    }
    if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) return json({ error: { code: 'TIMEOUT', message: 'The request was stopped or timed out. Try a smaller request.', requestId } }, 504)
    // Provider/database errors may contain credentials or document text. Never return or log raw exceptions.
    console.error(JSON.stringify({ event: 'ai_request_failed', requestId, action, errorType: error instanceof Error ? error.name : 'Unknown' }))
    return json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'The AI service could not finish this request. Check AI & Knowledge settings and try again.', requestId } }, 503)
  } finally {
    if (activeId) active.delete(activeId)
    if (leaseIdentity) await changeLease(leaseIdentity, requestId, true).catch(() => console.error(JSON.stringify({ event: 'lease_release_failed', requestId })))
  }
}
