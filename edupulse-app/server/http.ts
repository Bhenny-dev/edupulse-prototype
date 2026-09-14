import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ApiError, chatInput, courseInput, documentInput, type Identity } from './contracts.js'
import { config } from './config.js'
import { providerHealth } from './providers.js'
import { deleteDocument, ingest, listDocuments } from './database.js'
import { runChat, runCourseware } from './graph.js'

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

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
}

export async function handleRequest(request: Request): Promise<Response> {
  const requestId = randomUUID()
  let activeId: string | undefined
  try {
    enforceOrigin(request)
    const action = new URL(request.url).searchParams.get('action') || 'health'
    const methods: Record<string, string[]> = { health: ['GET'], chat: ['POST'], courseware: ['POST'], documents: ['GET', 'POST', 'DELETE'] }
    if (!methods[action]) throw new ApiError(404, 'NOT_FOUND', 'Unknown API action.')
    if (!methods[action].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: methods[action].join(', '), 'Cache-Control': 'no-store' } })
    const identity = await authenticate(request)
    if (action === 'health') {
      const health = await providerHealth()
      let database: { ready: boolean; message: string } = { ready: false, message: 'Sign in to check your private library.' }
      if (identity.role !== 'guest') {
        try { const docs = await listDocuments(identity); database = { ready: true, message: `${docs.length} documents in your library.` } }
        catch { database = { ready: false, message: 'Private library is unavailable. Database connection or migration needs attention.' } }
      }
      return json({ version: '0.1.1', ...health, database: { ...database, kind: config().database }, identity: { mode: identity.local ? 'local-workspace' : identity.token ? 'authenticated' : 'public-guide', role: identity.role }, limits: { maxDocuments: 50, maxDocumentCharacters: 60000, maxAttachments: 3, generationAttempts: 2 }, checkedAt: new Date().toISOString() })
    }
    if (action === 'documents' && identity.role === 'guest') throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Sign in to manage private knowledge. Preview access only includes the public guide.')
    if (action === 'documents' && request.method === 'GET') return json({ documents: await listDocuments(identity) })
    if (action === 'courseware' && !['instructor', 'admin'].includes(identity.role)) throw new ApiError(403, 'FORBIDDEN', 'Sign in with an instructor account to generate courseware, or use the local workspace.')
    const now = Date.now()
    for (const [key, value] of buckets) if (value.until < now) buckets.delete(key)
    const key = identity.id
    const bucket = buckets.get(key) || { count: 0, until: now + 60000 }
    if (bucket.count >= 15 || active.has(key)) throw new ApiError(429, 'RATE_LIMIT', 'Please wait for the current request to finish, then retry. Limit: 15 requests per minute.')
    bucket.count++; buckets.set(key, bucket)
    active.add(key); activeId = key
    const bodyText = await request.text()
    if (Buffer.byteLength(bodyText) > 100000) throw new ApiError(413, 'BODY_TOO_LARGE', 'The request exceeds 100 KB. Use a smaller document.')
    let body: unknown
    try { body = JSON.parse(bodyText) } catch { throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.') }
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(config().timeoutMs)])
    if (action === 'documents' && request.method === 'DELETE') {
      const { id } = z.object({ id: z.string().uuid() }).parse(body)
      await deleteDocument(identity, id)
      return json({ deleted: true })
    }
    if (action === 'documents') {
      const { title, text } = documentInput.parse(body)
      return json(await ingest(identity, title, text, signal), 201)
    }
    if (action === 'courseware') return json(await runCourseware(courseInput.parse(body), identity, signal))
    const input = chatInput.parse(body)
    // Guests get the public guide only and cannot use hosted generation or submit private attachments.
    if (identity.role === 'guest') {
      if (input.attachments.length) throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Sign in to send reference attachments.')
      const { keywordSearch } = await import('./knowledge.js')
      return json(await runChat(input, identity, signal, {
        retrieve: async () => ({ sources: keywordSearch(input.message) }),
        generate: async () => { throw new Error('Public guide uses excerpts') },
      }))
    }
    return json(await runChat(input, identity, signal))
  } catch (error) {
    if (error instanceof z.ZodError) return json({ error: { code: 'INVALID_INPUT', message: 'Some input fields are missing, too long, or invalid.', requestId } }, 400)
    if (error instanceof ApiError) return json({ error: { code: error.code, message: error.message, requestId } }, error.status)
    if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) return json({ error: { code: 'TIMEOUT', message: 'The request was stopped or timed out. Try a smaller request.', requestId } }, 504)
    // Provider/database errors may contain credentials or document text. Never return or log raw exceptions.
    console.error(JSON.stringify({ event: 'ai_request_failed', requestId, errorType: error instanceof Error ? error.name : 'Unknown' }))
    return json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'The AI service could not finish this request. Check AI & Knowledge settings and try again.', requestId } }, 503)
  } finally { if (activeId) active.delete(activeId) }
}
