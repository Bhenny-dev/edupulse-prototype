import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleRequest } from './http.js'

export async function handleNodeRequest(req: IncomingMessage, res: ServerResponse) {
  const controller = new AbortController()
  res.on('close', () => { if (!res.writableEnded) controller.abort() })
  const body: Buffer[] = []
  let size = 0
  // Vercel may already parse JSON before dispatching the function.
  const parsed = (req as IncomingMessage & { body?: unknown }).body
  if (parsed !== undefined) {
    const chunk = Buffer.from(typeof parsed === 'string' ? parsed : JSON.stringify(parsed))
    size = chunk.length; body.push(chunk)
  } else {
    for await (const chunk of req) {
      size += Buffer.byteLength(chunk)
      if (size > 100000) break
      body.push(Buffer.from(chunk))
    }
  }
  if (size > 100000) { res.writeHead(413, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: { code: 'BODY_TOO_LARGE', message: 'Request exceeds 100 KB.' } })); return }
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(',') : value)
  const protocol = process.env.VERCEL ? 'https' : 'http'
  const request = new Request(`${protocol}://${req.headers.host || 'localhost'}${req.url}`, { method: req.method, headers, signal: controller.signal, ...(body.length && !['GET', 'HEAD'].includes(req.method || 'GET') ? { body: Buffer.concat(body) } : {}) })
  const result = await handleRequest(request)
  res.writeHead(result.status, Object.fromEntries(result.headers.entries()))
  res.end(Buffer.from(await result.arrayBuffer()))
}
