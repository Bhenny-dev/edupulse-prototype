import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { handleRequest } from '../server/http.js'
import { closeLocalDb } from '../server/database.js'
import { operatorInput } from '../src/agents/toolPlanner.js'
import { registerEditor, applyEditorProposal, type EditorSnapshot } from '../src/agents/editorTools.js'
import { researchMethodsDraft } from '../tests/syllabus-draft-fixture.js'

// Opt-in live evaluation. Use an isolated local store and the already-installed
// Ollama model; never use hosted account cookies, provider keys or real records.
assert(!process.env.VERCEL && process.env.AI_PROVIDER === 'ollama', 'Run only against local Ollama.')
assert(process.env.AI_DATA_DIR?.includes('harness'), 'Set a dedicated AI_DATA_DIR containing harness.')
process.env.AI_LOCAL_MODE = 'true'
const evidence: Record<string, unknown> = { startedAt: new Date().toISOString(), provider: 'ollama', model: process.env.OLLAMA_MODEL || 'qwen2.5:3b', syntheticInput: true, modelResponsesMocked: false }
const transport = globalThis.fetch
const generations: { request: unknown; response: unknown }[] = []
const recordings: Promise<void>[] = []
globalThis.fetch = async (url, init) => {
  const response = await transport(url, init)
  if (String(url).startsWith(process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434') && String(url).endsWith('/api/chat')) {
    const copy = response.clone()
    recordings.push(copy.text().then(raw => {
      const result = copy.headers.get('content-type')?.includes('application/x-ndjson') ? raw.trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : JSON.parse(raw)
      generations.push({ request: JSON.parse(String(init?.body)).messages, response: result })
    }).catch(error => { generations.push({ request: 'Recording failed', response: String(error) }) }))
  }
  return response
}
async function api(action: string, method = 'GET', body?: unknown) {
  const response = await handleRequest(new Request(`http://localhost/api/ai?action=${action}`, { method, ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}) }))
  const result = await response.json()
  assert(response.ok, `${action}: ${JSON.stringify(result)}`)
  return result
}
try {
  const health = await api('health')
  assert(health.ready, health.message)
  let editor: EditorSnapshot = { instance: 'harness-live-syllabus', label: 'Synthetic Research Methods syllabus', kind: 'syllabus', data: { courseCode: 'IT 104', courseTitle: 'Research Methods', courseDescription: 'Introduction to academic research methods.', programOutcomes: [''], courseOutline: researchMethodsDraft.courseOutline.map(row => ({ week: row.week, ilos: '', contents: [''], activities: '', assessments: [9, 18].includes(row.week) ? row.assessments : '', teachingMaterials: [], assessmentTypes: [], resources: [] })) } }
  const request = operatorInput.parse({ operation: 'revise', viewRole: 'instructor', section: process.env.HARNESS_WHOLE === 'true' ? 'all' : 'programOutcomes', editor, message: process.env.HARNESS_WHOLE === 'true' ? 'Generate a complete syllabus for my selected course, without web research. Keep unknown institutional grading pending and references empty.' : 'Generate four measurable program outcomes for Research Methods without web research.' })
  const started = Date.now(), proposal = await api('operator', 'POST', request)
  assert(proposal.patch && proposal.requiresConfirmation, 'A validated reviewable patch is required.')
  evidence.operator = { durationMs: Date.now() - started, fields: Object.keys(proposal.patch), proposal }
  const prior = await api('workspace')
  const remove = registerEditor(editor.instance, { read: () => editor, apply: data => { editor = { ...editor, data } }, save: async data => {
    const result = await api('workspace', 'PUT', { revision: prior.revision, data: { syllabi: [{ ...data, id: 'harness-generated', status: 'drafted' }], content: {}, registrations: [] } })
    return { ...result, persisted: true }
  } })
  try {
    const receipt = await applyEditorProposal(structuredClone(editor), proposal.patch, 'instructor', true)
    assert.equal(receipt.persisted, true)
    const reloaded = await api('workspace')
    for (const [field, value] of Object.entries(proposal.patch)) assert.deepEqual(reloaded.data.syllabi[0][field], value, `Saved ${field} must survive reload unchanged`)
    assert.equal(reloaded.data.syllabi[0].status, 'drafted')
    evidence.persistence = { revision: reloaded.revision, receipt, reloadedOutcomes: reloaded.data.syllabi[0].programOutcomes }
  } finally { remove() }
  if (process.env.HARNESS_COURSEWARE === 'true') {
    const started = Date.now()
    const draft = await api('courseware', 'POST', { courseCode: 'TEST101', courseTitle: 'Programming Foundations', week: 1, topics: ['Variables', 'Constants', 'Assignment'], outcomes: 'Explain variables and constants and trace an assignment in JavaScript.', referenceText: '', plan: { activities: 'Trace assignments, then write and run a short JavaScript program.', assessments: 'A quiz about variable reassignment and const bindings.', teachingMaterials: [], resources: [] } })
    assert(draft.content.material.sections.length >= 3)
    assert(draft.content.assessment.questions.length >= 3)
    const words = draft.content.material.sections.filter((s: { heading: string }) => s.heading !== 'References').map((s: { body: string }) => s.body).join(' ').split(/\s+/).length
    assert(words >= 150, `Expected a substantive lesson, received ${words} words`)
    const snapshot = await api('workspace')
    const content = Object.fromEntries(['material', 'activity', 'assessment'].map(type => [`harness-${type}`, { syllabusId: 'harness-generated', week: 1, type, status: 'draft', content: draft.content[type] }]))
    await api('workspace', 'PUT', { revision: snapshot.revision, data: { ...snapshot.data, content } })
    const reloaded = await api('workspace')
    assert.deepEqual(reloaded.data.content, content)
    evidence.courseware = { durationMs: Date.now() - started, materialWords: words, persistedItems: Object.keys(reloaded.data.content), ...draft }
  }
  evidence.status = 'passed'
} catch (error) { evidence.status = 'failed'; evidence.error = error instanceof Error ? error.message : String(error); process.exitCode = 1 }
finally {
  evidence.finishedAt = new Date().toISOString()
  globalThis.fetch = transport
  await Promise.all(recordings)
  await mkdir('.data/harness-evidence', { recursive: true })
  await writeFile(`.data/harness-evidence/${process.env.HARNESS_WHOLE === 'true' ? 'whole' : 'live'}.json`, JSON.stringify(evidence, null, 2) + '\n')
  await writeFile(`.data/harness-evidence/${process.env.HARNESS_WHOLE === 'true' ? 'whole' : 'live'}-generations.json`, JSON.stringify(generations, null, 2) + '\n')
  console.log(JSON.stringify({ status: evidence.status, error: evidence.error, finishedAt: evidence.finishedAt }))
  await closeLocalDb()
}
