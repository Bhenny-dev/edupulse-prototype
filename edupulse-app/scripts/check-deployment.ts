import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { handleRequest } from '../server/http.js'

const config = JSON.parse(await readFile('vercel.json', 'utf8'))
assert(config.functions['api/ai.ts'].maxDuration >= 120)
const rewrite = new RegExp(`^${config.rewrites[0].source}$`)
assert(!rewrite.test('/api/ai'), 'SPA fallback must not swallow the API')
assert(rewrite.test('/settings'), 'SPA fallback must handle frontend routes')
assert((await readFile('dist/index.html', 'utf8')).includes('/assets/'))
process.env.VERCEL = '1'
process.env.AI_PROVIDER = 'retrieval'
const health = await handleRequest(new Request('https://edupulse.test/api/ai?action=health'))
assert.equal(health.status, 200)
const response = await handleRequest(new Request('https://edupulse.test/api/ai?action=chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'How do I publish courseware?' }) }))
const result = await response.json()
assert.equal(response.status, 200)
assert.equal(result.mode, 'retrieval')
assert(result.sources.length > 0)
if (process.env.DEPLOYMENT_URL) {
  const url = process.env.DEPLOYMENT_URL
  for (const path of ['/', '/api/ai?action=health']) {
    const res = await fetch(`${url}${path}`, { signal: AbortSignal.timeout(15000) })
    assert.equal(res.status, 200, `${path} status`)
    if (path.includes('api')) assert((res.headers.get('content-type') || '').includes('application/json'))
  }
  console.log(`Live deployment checked: ${url}`)
}
console.log('Deployment checks passed: built assets, API routing, serverless health and public retrieval.')
