import assert from 'node:assert/strict'
import { handleRequest } from '../server/http.js'
process.env.AI_LOCAL_MODE = 'true'
const invoke = async (action: string, body?: unknown, method = body ? 'POST' : 'GET') => {
  const request = new Request(`${process.env.AI_API_URL || 'http://localhost/api/ai'}?action=${action}`, { method, ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}) })
  const response = process.env.AI_API_URL ? await fetch(request) : await handleRequest(request)
  const json = await response.json()
  assert(response.ok, JSON.stringify(json))
  return json
}
const health = await invoke('health')
assert(health.ready && health.embeddings && health.database.ready, JSON.stringify(health))
console.log(`Provider connected: ${health.provider}/${health.model}; vector database ready.`)
const marker = crypto.randomUUID()
const document = await invoke('documents', { title: `Smoke test ${marker}`, text: `The fictional test course ORBIT-${marker} uses a violet workbook. Learners must review the violet workbook before the weekly lab. This is a synthetic validation fixture, not an institutional policy.` })
try {
  const result = await invoke('chat', { message: `Which workbook is used by the fictional test course ORBIT-${marker}?` })
  assert.equal(result.mode, 'generated', 'Real provider must generate the response in this test')
  assert(result.sources.some((s: { method: string; title: string }) => s.method === 'vector' && s.title.includes(marker)), 'Private fixture must be retrieved semantically')
  assert(/violet/i.test(result.answer), 'Response must use the fixture fact')
  console.log(`Live RAG passed: ${result.mode}, ${result.sources.length} cited passages, ${result.trace.length} graph steps.`)
} finally { await invoke('documents', { id: document.id }, 'DELETE') }
if (process.env.AI_SMOKE_COURSEWARE === 'true') {
  const result = await invoke('courseware', { courseCode: 'TEST101', courseTitle: 'Programming Foundations', week: 1, topics: ['Variables and constants'], outcomes: 'Explain the difference between variables and constants and write examples in JavaScript.', referenceText: 'JavaScript let declares a block-scoped variable that can be reassigned. const declares a block-scoped binding that cannot be reassigned. A const object can still have mutable properties. A variable name should describe its purpose.' })
  assert.equal(result.status, 'draft')
  assert(result.content.assessment.questions.length >= 3)
  console.log('Live courseware generation passed: valid draft materials, activity and assessment.')
}
