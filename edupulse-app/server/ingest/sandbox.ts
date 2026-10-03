import { Worker } from 'node:worker_threads'
import { ApiError } from '../contracts.js'
import { ExtractionError, extractDocument } from './formats.mjs'

export type Extracted = Awaited<ReturnType<typeof extractDocument>>
export type SandboxInfo = { mode: 'isolated-worker'; heapLimitMb: number; timeoutMs: number; environment: 'empty'; ms: number }

export const SANDBOX_LIMITS = { heapLimitMb: 256, timeoutMs: 30_000, concurrent: 2 }
const moduleUrl = new URL('./formats.mjs', import.meta.url).href
// Evaluated worker source: no separate entry file has to be traced by the
// serverless bundler; it imports the same audited extractor module.
const source = `
const { parentPort, workerData } = require('node:worker_threads')
import(workerData.module).then(async ({ extractDocument }) => {
  try { parentPort.postMessage({ ok: true, result: await extractDocument(new Uint8Array(workerData.bytes), workerData.fileName) }) }
  catch (error) {
    // Only the extractor's own messages are returned; library errors may quote document content.
    const known = error && error.name === 'ExtractionError' ? error.code : null
    const code = known || (error && error.name === 'PasswordException' ? 'ENCRYPTED' : error && /InvalidPDF|FormatError|UnexpectedResponse/.test(error.name) ? 'INVALID_PDF' : 'EXTRACTION_FAILED')
    parentPort.postMessage({ ok: false, code, message: known ? error.message : '' })
  }
}, () => parentPort.postMessage({ ok: false, code: 'SANDBOX_UNAVAILABLE', message: '' }))
`
const messages: Record<string, string> = {
  ENCRYPTED: 'Password-protected documents cannot be read. Save an unprotected copy first.',
  INVALID_PDF: 'The PDF is damaged or uses an unsupported structure.',
  EXTRACTION_FAILED: 'The document could not be read. Export it again as PDF, DOCX or plain text.',
  RESOURCE_LIMIT: 'Reading this document exceeded the sandbox memory limit. Split it into smaller files.',
  TIMEOUT: 'Reading this document took longer than 30 seconds and was stopped. Split it into smaller files.',
  SANDBOX_UNAVAILABLE: 'The document sandbox could not start. Try again later.',
}

let running = 0
const waiting: (() => void)[] = []
async function slot<T>(task: () => Promise<T>): Promise<T> {
  if (running >= SANDBOX_LIMITS.concurrent) await new Promise<void>(resolve => waiting.push(resolve))
  running++
  try { return await task() } finally { running--; waiting.shift()?.() }
}

function inWorker(bytes: Uint8Array, fileName: string, signal: AbortSignal): Promise<Extracted> {
  return new Promise((resolve, reject) => {
    const copy = bytes.slice().buffer
    const worker = new Worker(source, {
      eval: true, env: {}, execArgv: [], stdout: true, stderr: true,
      workerData: { bytes: copy, fileName, module: moduleUrl }, transferList: [copy],
      resourceLimits: { maxOldGenerationSizeMb: SANDBOX_LIMITS.heapLimitMb, maxYoungGenerationSizeMb: 48, codeRangeSizeMb: 64, stackSizeMb: 4 },
    })
    // Parser diagnostics may contain document text; they are discarded, never logged.
    worker.stdout.resume(); worker.stderr.resume()
    let settled = false
    const finish = (fn: () => void) => { if (settled) return; settled = true; clearTimeout(timer); signal.removeEventListener('abort', abort); void worker.terminate(); fn() }
    const timer = setTimeout(() => finish(() => reject(new ExtractionError('TIMEOUT', messages.TIMEOUT!))), SANDBOX_LIMITS.timeoutMs)
    const abort = () => finish(() => reject(signal.reason))
    signal.addEventListener('abort', abort, { once: true })
    worker.on('message', (message: { ok: boolean; result?: Extracted; code?: string; message?: string }) => finish(() => {
      if (message.ok) resolve(message.result!)
      else reject(new ExtractionError(message.code || 'EXTRACTION_FAILED', message.message || messages[message.code || ''] || messages.EXTRACTION_FAILED!))
    }))
    worker.on('error', (error: NodeJS.ErrnoException) => finish(() => reject(error.code === 'ERR_WORKER_OUT_OF_MEMORY' ? new ExtractionError('RESOURCE_LIMIT', messages.RESOURCE_LIMIT!) : error)))
    worker.on('exit', code => finish(() => reject(new ExtractionError('EXTRACTION_FAILED', code ? messages.RESOURCE_LIMIT! : messages.EXTRACTION_FAILED!))))
  })
}

/** Extracts untrusted bytes in an isolated worker; reports the isolation actually used. */
export async function sandboxedExtract(bytes: Uint8Array, fileName: string, signal: AbortSignal): Promise<{ extracted: Extracted; sandbox: SandboxInfo }> {
  const started = performance.now()
  const info = (): SandboxInfo => ({ mode: 'isolated-worker', heapLimitMb: SANDBOX_LIMITS.heapLimitMb, timeoutMs: SANDBOX_LIMITS.timeoutMs, environment: 'empty', ms: Math.round(performance.now() - started) })
  try {
    return await slot(async () => {
      try { return { extracted: await inWorker(bytes, fileName, signal), sandbox: info() } }
      catch (error) {
        // Untrusted files must never be parsed in the API process if isolation fails.
        if ((error instanceof ExtractionError && error.code === 'SANDBOX_UNAVAILABLE') || (error as NodeJS.ErrnoException).code === 'ERR_WORKER_INIT_FAILED')
          throw new ExtractionError('SANDBOX_UNAVAILABLE', messages.SANDBOX_UNAVAILABLE!)
        throw error
      }
    })
  } catch (error) {
    signal.throwIfAborted()
    if (error instanceof ExtractionError) throw new ApiError(error.code === 'FILE_TOO_LARGE' ? 413 : 422, error.code, error.message)
    throw new ApiError(422, 'EXTRACTION_FAILED', messages.EXTRACTION_FAILED!)
  }
}
