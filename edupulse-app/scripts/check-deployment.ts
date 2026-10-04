import { readFile, readdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { handleRequest } from '../server/http.js'

const config = JSON.parse(await readFile('vercel.json', 'utf8'))
assert(config.functions['api/ai.ts'].maxDuration >= 120)
const included = config.functions['api/ai.ts'].includeFiles as string
assert(included.includes('models/**'), 'Pinned ONNX models must be packaged with the API function')
assert(included.includes('ort-wasm-simd-threaded.wasm') && included.includes('ort-wasm-simd-threaded.mjs'), 'The ONNX WebAssembly runtime is loaded by a computed path and must be packaged explicitly')
for (const file of ['models/all-MiniLM-L6-v2/onnx/model_quantized.onnx', 'models/ms-marco-MiniLM-L-6-v2/onnx/model_quantized.onnx', 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm']) await readFile(file).then(() => undefined)
const csp = (config.headers?.[0]?.headers as { key: string; value: string }[] | undefined)?.find(h => h.key === 'Content-Security-Policy')?.value || ''
assert(/script-src 'self' 'wasm-unsafe-eval';/.test(csp) && /frame-ancestors 'none'/.test(csp) && !csp.replace("'wasm-unsafe-eval'", '').includes("'unsafe-eval'"), 'A strict Content-Security-Policy must be served')
const rewrite = new RegExp(`^${config.rewrites[0].source}$`)
assert(!rewrite.test('/api/ai'), 'SPA fallback must not swallow the API')
assert(rewrite.test('/settings'), 'SPA fallback must handle frontend routes')
assert((await readFile('dist/index.html', 'utf8')).includes('/assets/'))
// Preview personas belong to development and the documentation capture build (dist-capture), never to production.
for (const file of (await readdir('dist/assets')).filter(name => name.endsWith('.js'))) assert(!(await readFile(`dist/assets/${file}`, 'utf8')).includes('login-quick-access'), 'The production build must not contain preview sign-in personas')
process.env.VERCEL = '1'
process.env.AI_PROVIDER = 'retrieval'
const health = await handleRequest(new Request('https://edupulse.test/api/ai?action=health'))
assert.equal(health.status, 200)
const response = await handleRequest(new Request('https://edupulse.test/api/ai?action=chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'How do I publish courseware?' }) }))
const result = await response.json()
assert.equal(response.status, 200)
assert.equal(result.mode, 'retrieval')
assert(result.sources.length > 0)
assert.equal(result.verification.unsupported, 0, 'Quoted excerpts must verify against their sources')
assert(result.trace.some((s: { agent: string }) => s.agent === 'Ranker'), 'The agent pipeline must run in the serverless runtime')
const healthBody = await (await handleRequest(new Request('https://edupulse.test/api/ai?action=health'))).json()
assert.equal(healthBody.pipeline.embeddings.state, 'loaded', 'In-process embeddings must load from the packaged model files')
const extract = await handleRequest(new Request('https://edupulse.test/api/ai?action=extract', { method: 'POST', headers: { 'X-File-Name': 'check.md' }, body: '# Deployment check\n\nThe sandbox extracts this Markdown document and reports its quality before indexing.' }))
assert.equal(extract.status, 200, 'Sandboxed extraction must run in the serverless runtime')
const workspace = await handleRequest(new Request('https://edupulse.test/api/ai?action=workspace'))
assert.equal(workspace.status, 200)
assert.deepEqual(await workspace.json(), { revision: 0, data: null, updated_at: null, mode: 'preview' })
const deniedSave = await handleRequest(new Request('https://edupulse.test/api/ai?action=workspace', { method: 'PUT', body: JSON.stringify({ revision: 0, data: { syllabi: [], content: {} } }) }))
assert.equal(deniedSave.status, 403)
if (process.env.DEPLOYMENT_URL) {
  const url = process.env.DEPLOYMENT_URL
  for (const path of ['/', '/api/ai?action=health', '/api/ai?action=workspace']) {
    const res = await fetch(`${url}${path}`, { signal: AbortSignal.timeout(15000) })
    assert.equal(res.status, 200, `${path} status`)
    if (path.includes('api')) assert((res.headers.get('content-type') || '').includes('application/json'))
  }
  console.log(`Live deployment checked: ${url}`)
}
console.log('Deployment checks passed: built assets, API routing, serverless health and public retrieval.')
