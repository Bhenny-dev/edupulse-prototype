import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { handleRequest } from '../server/http.js'
import { closeLocalDb } from '../server/database.js'
import { runCourseware } from '../server/graph.js'
import { registerEditor, applyEditorProposal, type EditorSnapshot } from '../src/agents/editorTools.js'
import { validateDraft } from '../src/agents/draftValidation.js'

test('provider response crosses the real API, editor adapter and revision save, then survives reload', async t => {
  const originalFetch = globalThis.fetch
  const names = ['AI_LOCAL_MODE', 'AI_PROVIDER', 'AI_DATA_DIR', 'AI_VECTOR_STORE', 'VERCEL'] as const
  const old = Object.fromEntries(names.map(name => [name, process.env[name]]))
  delete process.env.VERCEL
  process.env.AI_LOCAL_MODE = 'true'; process.env.AI_PROVIDER = 'ollama'; process.env.AI_VECTOR_STORE = 'local'
  process.env.AI_DATA_DIR = join(await mkdtemp(join(tmpdir(), 'edupulse-harness-')), 'db')
  t.after(async () => { globalThis.fetch = originalFetch; await closeLocalDb(); for (const name of names) { if (old[name] === undefined) delete process.env[name]; else process.env[name] = old[name] } })
  let calls = 0
  globalThis.fetch = async (_url, init) => {
    calls++
    const request = JSON.parse(String(init?.body))
    assert.equal(request.stream, true)
    return Response.json({ done: true, done_reason: 'stop', message: { content: JSON.stringify({ operation: 'replace', path: '/programOutcomes', value: ['Evaluate competing research designs using explicit criteria.'] }) } })
  }
  const api = async (action: string, method = 'GET', body?: unknown) => {
    const response = await handleRequest(new Request(`http://localhost/api/ai?action=${action}`, { method, ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}) }))
    const result = await response.json(); assert(response.ok, JSON.stringify(result)); return result
  }
  const editor: EditorSnapshot = { instance: 'harness-editor', kind: 'syllabus', label: 'Research Methods', data: { courseCode: 'IT 104', courseTitle: 'Research Methods', programOutcomes: [''], coursePolicy: ['Preserve this supplied policy.'] } }
  const before = await api('workspace')
  const result = await api('operator', 'POST', { operation: 'revise', viewRole: 'instructor', message: 'Draft program outcomes without web research.', editor, section: 'programOutcomes' })
  assert.equal(calls, 1)
  assert.equal((await api('workspace')).revision, before.revision, 'Generation alone must not save')
  const remove = registerEditor(editor.instance, { read: () => editor, apply: () => assert.fail('A save must use the persistence adapter'), save: async data => {
    const saved = await api('workspace', 'PUT', { revision: before.revision, data: { syllabi: [{ ...data, id: 'generated-test', status: 'drafted' }], registrations: [], content: {} } })
    return { ...saved, persisted: true }
  } })
  try {
    const receipt = await applyEditorProposal(editor, result.patch, 'instructor', true)
    assert.equal(receipt.persisted, true)
    const loaded = await api('workspace')
    assert.equal(loaded.revision, before.revision + 1)
    assert.deepEqual(loaded.data.syllabi[0].programOutcomes, result.patch.programOutcomes)
    assert.deepEqual(loaded.data.syllabi[0].coursePolicy, editor.data.coursePolicy)
    assert.equal(loaded.data.syllabi[0].status, 'drafted')
    await assert.rejects(applyEditorProposal(editor, result.patch, 'student', true))
  } finally { remove() }
})

test('model envelopes cannot execute nested paths, identity changes or removal operations', () => {
  const input = { editor: { instance: 'test', kind: 'syllabus' as const, label: 'Test', data: {} }, message: 'Revise outcomes', section: 'programOutcomes', context: '' }
  for (const raw of [{ op: 'remove', path: '/programOutcomes', value: [] }, { op: 'replace', path: '/__proto__', value: {} }, { op: 'replace', path: '/courseOutline/0/week', value: 99 }, { patch: { courseCode: 'forged' } }]) assert.ok('error' in validateDraft(raw, input, ''))
})

test('direct courseware service retains the same authoring roles as the HTTP endpoint', async () => {
  for (const role of ['dean', 'associate_dean', 'student', 'guest'] as const) await assert.rejects(runCourseware({ courseCode: 'TEST', courseTitle: 'Test', week: 1, topics: ['Variables'], outcomes: 'Explain variables', referenceText: '' }, { id: 'role-test', role, local: false }, AbortSignal.timeout(1000), async () => assert.fail('Denied roles must not reach the model')), { code: 'FORBIDDEN' })
})
