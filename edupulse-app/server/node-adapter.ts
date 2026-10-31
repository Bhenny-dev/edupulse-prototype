import type { IncomingMessage, ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import { allowedMethods, bodyLimit, handleRequest } from './http.js'
import { ApiError } from './contracts.js'

export const BODY_READ_TIMEOUT_MS = 30_000
const tooLarge = (limit: number) => new ApiError(413, 'BODY_TOO_LARGE', `Request exceeds ${limit.toLocaleString()} bytes.`)

/** Bound bytes and elapsed intake time before authentication or model work starts. */
export async function readNodeBody(req: IncomingMessage, limit: number, signal: AbortSignal): Promise<Buffer> {
  signal.throwIfAborted()
  if (Number(req.headers['content-length']) > limit) throw tooLarge(limit)
  // Vercel may already parse JSON, or pass upload bytes unchanged.
  const parsed = (req as IncomingMessage & { body?: unknown }).body
  if (parsed !== undefined) {
    const bytes = Buffer.isBuffer(parsed) ? parsed : parsed instanceof Uint8Array ? Buffer.from(parsed) : Buffer.from(typeof parsed === 'string' ? parsed : JSON.stringify(parsed))
    if (bytes.length > limit) throw tooLarge(limit)
    return bytes
  }
  if (req.readableEnded) return Buffer.alloc(0)
  if (req.destroyed) throw new ApiError(400, 'REQUEST_INCOMPLETE', 'The request ended before its body was received.')
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    const finish = (error?: unknown) => {
      req.off('data', data); req.off('end', end); req.off('error', fail); req.off('close', close)
      signal.removeEventListener('abort', abort)
      if (error) { req.pause(); reject(error) } else resolve(Buffer.concat(chunks, size))
    }
    const data = (chunk: Buffer | string) => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += bytes.length
      if (size > limit) finish(tooLarge(limit))
      else chunks.push(bytes)
    }
    const end = () => finish()
    const fail = () => finish(new ApiError(400, 'REQUEST_INCOMPLETE', 'The request ended before its body was received.'))
    const close = () => { if (!req.complete) fail() }
    const abort = () => finish(signal.reason)
    req.on('data', data); req.once('end', end); req.once('error', fail); req.once('close', close)
    signal.addEventListener('abort', abort, { once: true })
  })
}

export async function handleNodeRequest(req: IncomingMessage, res: ServerResponse, dispatch = handleRequest) {
  const controller = new AbortController()
  const disconnected = () => { if (!res.writableEnded) controller.abort() }
  res.once('close', disconnected)
  let dispatched = false
  try {
    const action = new URL(req.url || '/', 'http://localhost').searchParams.get('action') || 'health'
    const methods = allowedMethods(action), method = req.method || 'GET'
    // Fetch's Request rejects TRACE/CONNECT before the application can return 405.
    if (!methods) throw new ApiError(404, 'NOT_FOUND', 'Unknown API action.')
    if (!methods.includes(method)) {
      if (!req.complete) { res.setHeader('Connection', 'close'); req.resume() }
      res.writeHead(405, { Allow: methods.join(', '), 'Cache-Control': 'no-store' }); res.end(); return
    }
    const body = await readNodeBody(req, bodyLimit(action), AbortSignal.any([controller.signal, AbortSignal.timeout(BODY_READ_TIMEOUT_MS)]))
    controller.signal.throwIfAborted()
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(',') : value)
    const protocol = process.env.VERCEL ? 'https' : 'http'
    const request = new Request(`${protocol}://${req.headers.host || 'localhost'}${req.url || '/'}`, { method, headers, signal: controller.signal, ...(body.length && !['GET', 'HEAD'].includes(method) ? { body: new Uint8Array(body) } : {}) })
    dispatched = true
    const result = await dispatch(request)
    const bytes = Buffer.from(await result.arrayBuffer())
    if (res.destroyed) return
    res.writeHead(result.status, Object.fromEntries(result.headers.entries())); res.end(bytes)
  } catch (error) {
    if (res.destroyed || res.writableEnded) return
    const failure = error instanceof ApiError ? error : error instanceof Error && error.name === 'TimeoutError'
      ? new ApiError(408, 'REQUEST_TIMEOUT', 'The request body took too long to arrive. Retry the upload.')
      : new ApiError(dispatched ? 503 : 400, dispatched ? 'SERVICE_UNAVAILABLE' : 'INVALID_REQUEST', dispatched ? 'The service could not finish this request. Try again.' : 'The request could not be read. Check its format and retry.')
    if (!req.complete) { res.setHeader('Connection', 'close'); req.resume() }
    res.writeHead(failure.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    res.end(JSON.stringify({ error: { code: failure.code, message: failure.message, requestId: randomUUID() } }))
  } finally { res.off('close', disconnected) }
}
