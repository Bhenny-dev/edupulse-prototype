import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { operatorInput, planValidatedTool, type PlannerExecution } from '../src/agents/toolPlanner.js'
import { scheduledSyllabusDraft } from '../src/agents/draftValidation.js'
import { operatorRequest } from '../server/domains/operator.js'
import { connectionCookie, sealProviderState, unsealProviderState, type Connection } from '../server/connections.js'
import { rememberReasoning } from '../server/reasoning.js'
import { handleRequest } from '../server/http.js'
import { closeLocalDb } from '../server/database.js'
import { requestOperator } from '../src/lib/operatorClient.js'
import { ApiRequestError, aiRequest, setAiAccessToken } from '../src/lib/aiClient.js'
import { popularCultureDraft, popularCultureEditor, popularCulturePrompt, popularCultureStage } from './operator-steps-fixture.js'

const identity = { id: 'local-workspace', role: 'instructor' as const, local: true }
const input = () => operatorInput.parse({ operation: 'revise', viewRole: 'instructor', message: popularCulturePrompt, editor: popularCultureEditor, section: 'all', staged: true })

test('reported prompt completes all weeks across bounded steps, shares research and never exposes partial patches', async () => {
  let execution: PlannerExecution = { initialize: true }, lookups = 0, calls = 0, repaired = false
  assert.equal(scheduledSyllabusDraft(input()), true)
  for (let step = 0; step < 20; step++) {
    let perRequest = 0
    const result = await planValidatedTool(input(), identity, AbortSignal.timeout(10000), async (_system, prompt) => {
      calls++; perRequest++
      const task = JSON.parse(prompt)
      assert.equal(task.originalRequest, popularCulturePrompt)
      assert.equal(task.editor.data.courseTitle, 'Philippine Popular Culture')
      assert.equal(task.continuation, undefined, 'protected transport state is not model input')
      if (task.requestedFields.includes('courseOutline')) assert.ok(task.editor.data.courseOutline.length <= 2)
      if (calls === 4 && !repaired) { repaired = true; return '{malformed' }
      return JSON.stringify(popularCultureStage(prompt))
    }, 26000, async () => { lookups++; return { evidence: [] } }, execution)
    assert.ok(perRequest <= 1, 'one model attempt per request, including repair')
    if ('pending' in result && result.pending) {
      assert.equal('patch' in result, false)
      execution = { initialize: false, ...result.pending }
    } else {
      assert.equal(lookups, 1)
      assert.equal(calls, 10, 'core, eight outline batches and one repair; no bibliography call without sources')
      assert.ok('patch' in result && result.patch)
      assert.ok('courseOutline' in result.patch)
      assert.deepEqual(result.patch.courseOutline, popularCultureDraft.courseOutline)
      assert.equal(result.requiresConfirmation, true)
      assert.deepEqual(popularCultureEditor.data.programOutcomes, [''])
      return
    }
  }
  assert.fail('Draft never completed')
})

test('encrypted steps cross client, real API, model adapter and final validation despite an interrupted response', async t => {
  const oldFetch = globalThis.fetch, names = ['VERCEL', 'AI_LOCAL_MODE', 'AI_VECTOR_STORE', 'AI_DATA_DIR', 'AI_CONNECTION_SECRET'] as const
  const old = Object.fromEntries(names.map(name => [name, process.env[name]]))
  delete process.env.VERCEL
  process.env.AI_LOCAL_MODE = 'true'; process.env.AI_VECTOR_STORE = 'local'; process.env.AI_CONNECTION_SECRET = '1'.repeat(64)
  process.env.AI_DATA_DIR = join(await mkdtemp(join(tmpdir(), 'edupulse-steps-')), 'db')
  t.after(async () => { globalThis.fetch = oldFetch; setAiAccessToken(); await closeLocalDb(); for (const name of names) { if (old[name] === undefined) delete process.env[name]; else process.env[name] = old[name] } })
  const connection: Connection = { provider: 'openrouter', model: 'synthetic-free-model:free', apiKey: 'synthetic-key-only', owner: identity.id, id: 'test-connection', expires: Date.now() + 60000 }
  rememberReasoning([{ id: connection.model, supported_parameters: [] }])
  let generations = 0, researches = 0, requests = 0, interrupted = false
  let firstCheckpoint = '', interruptionCheckpoint = ''
  globalThis.fetch = async (url, init) => {
    const address = String(url)
    if (address.startsWith('/api/ai?')) {
      requests++
      const body = JSON.parse(String(init?.body))
      if (requests === 4 && !interrupted) { interrupted = true; interruptionCheckpoint = body.continuation; throw new TypeError('Failed to fetch') }
      if (requests === 5) assert.equal(body.continuation, interruptionCheckpoint, 'retry resumes the same unfinished step')
      const response = await handleRequest(new Request(`http://localhost${address}`, { ...init, headers: { ...init?.headers, Cookie: connectionCookie(connection) } }))
      const value = await response.clone().json()
      if (value.pending) { assert.equal('patch' in value, false); assert.equal(value.continuation.includes('Philippine'), false); firstCheckpoint ||= value.continuation }
      return response
    }
    if (address.startsWith('https://openrouter.ai/api/v1/chat/completions')) {
      const body = JSON.parse(String(init?.body))
      if (body.tools) { researches++; return Response.json({ choices: [{ message: { content: 'Sample cultural context.', annotations: [{ type: 'url_citation', url_citation: { title: 'Sample retrieved cultural source', url: 'https://ncca.gov.ph/', content: 'Synthetic research passage about Philippine popular culture.' } }] } }] }) }
      generations++
      const task = JSON.parse(body.messages[1].content)
      assert.equal(task.editor.data.courseCode, 'GE ELEC-PPC')
      assert.equal(task.research[0].url, 'https://ncca.gov.ph/')
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(popularCultureStage(body.messages[1].content)) } }] })
    }
    if (address.startsWith('https://openlibrary.org/')) return Response.json({ docs: [] })
    if (address.startsWith('https://api.openalex.org/')) return Response.json({ results: [] })
    if (address.startsWith('https://en.wikipedia.org/')) return Response.json({ pages: [] })
    throw new Error('Unexpected transport destination')
  }
  const result = await requestOperator(input(), AbortSignal.timeout(30000))
  assert.deepEqual(result?.patch?.courseOutline, popularCultureDraft.courseOutline)
  assert.equal(result?.requiresConfirmation, true)
  assert.equal(generations, 10); assert.equal(researches, 1); assert.equal(requests, 12)
  assert.deepEqual((await (await handleRequest(new Request('http://localhost/api/ai?action=workspace'))).json()).data, null, 'generation alone never saves')
  const resume = { ...input(), continuation: firstCheckpoint }
  await assert.rejects(operatorRequest(resume, { ...identity, id: 'different-user' }, connection, AbortSignal.timeout(1000)), { code: 'DRAFT_STATE_EXPIRED' })
  await assert.rejects(operatorRequest({ ...resume, message: 'Complete a different syllabus' }, identity, connection, AbortSignal.timeout(1000)), { code: 'DRAFT_STATE_EXPIRED' })
  await assert.rejects(operatorRequest(resume, identity, { ...connection, model: 'another-model' }, AbortSignal.timeout(1000)), { code: 'DRAFT_STATE_EXPIRED' })
  await assert.rejects(operatorRequest({ ...resume, continuation: firstCheckpoint.slice(0, -4) + 'AAAA' }, identity, connection, AbortSignal.timeout(1000)), { code: 'DRAFT_STATE_INVALID' })
  const expired = unsealProviderState(firstCheckpoint, 220000) as Record<string, unknown>
  await assert.rejects(operatorRequest({ ...resume, continuation: sealProviderState({ ...expired, expires: 0 }) }, identity, connection, AbortSignal.timeout(1000)), { code: 'DRAFT_STATE_EXPIRED' })
  await assert.rejects(operatorRequest(input(), { ...identity, role: 'student', local: false }, connection, AbortSignal.timeout(1000)), { code: 'FORBIDDEN' })
})

test('outline-only drafting batches all teaching weeks and retains exam slots without changing other fields', async () => {
  const task = operatorInput.parse({ ...input(), section: 'courseOutline', message: 'Complete the course outline without web research' })
  let execution: PlannerExecution = { initialize: true }, calls = 0
  for (let step = 0; step < 12; step++) {
    const result = await planValidatedTool(task, identity, AbortSignal.timeout(10000), async (_system, prompt) => {
      calls++; assert.deepEqual(JSON.parse(prompt).requestedFields, ['courseOutline'])
      return JSON.stringify(popularCultureStage(prompt))
    }, 26000, async () => { throw new Error('Web must remain disabled') }, execution)
    if ('pending' in result && result.pending) execution = { initialize: false, ...result.pending }
    else {
      assert.ok('patch' in result && result.patch && 'courseOutline' in result.patch)
      assert.deepEqual(Object.keys(result.patch), ['courseOutline'])
      assert.deepEqual(result.patch.courseOutline, popularCultureDraft.courseOutline)
      assert.equal(calls, 8)
      return
    }
  }
  assert.fail('Outline never completed')
})

test('transport errors are actionable and cancellation does not restart a request', async t => {
  const old = globalThis.fetch
  t.after(() => { globalThis.fetch = old })
  let calls = 0
  globalThis.fetch = async () => { calls++; throw new TypeError('Failed to fetch') }
  await assert.rejects(aiRequest('operator', 'POST', {}), (error: unknown) => error instanceof ApiRequestError && error.code === 'NETWORK_ERROR' && !error.message.includes('Failed to fetch'))
  const controller = new AbortController(); controller.abort()
  await assert.rejects(requestOperator(input(), controller.signal))
  assert.equal(calls, 1, 'cancelled draft sends no further request')
  const during = new AbortController()
  calls = 0
  globalThis.fetch = async () => { calls++; during.abort(); return Response.json({ pending: true, continuation: 'must-not-resume' }) }
  await assert.rejects(requestOperator(input(), during.signal))
  assert.equal(calls, 1, 'cancellation while receiving a step prevents the next step and retry')
})
