import test from 'node:test'
import assert from 'node:assert/strict'
import { operatorInput, planValidatedTool } from '../src/agents/toolPlanner.js'
import { workProposal } from '../src/agents/workTools.js'
import { focusedSection } from '../src/agents/pageContext.js'
import { planOperator } from '../src/agents/operator.js'
import { planRequest } from '../src/lib/rag/plan.js'
import { writerPrompt, runAgents } from '../src/lib/rag/agents.js'
import { chatInput } from '../server/contracts.js'
import { searchWeb } from '../server/external/web.js'
import { researchMethodsDraft } from './syllabus-draft-fixture.js'
import { parseSyllabusText } from '../src/utils/syllabusParser.js'
import type { Evidence, WebSearch } from '../src/lib/rag/types.js'

const identity = { id: 'draft-instructor', role: 'instructor' as const, local: true }
const signal = () => AbortSignal.timeout(10000)
const source: Evidence = { id: 'research', documentId: 'research', title: 'Research', url: 'https://en.wikipedia.org/wiki/Research', text: 'Research involves a systematic investigation to establish facts and reach new conclusions.', page: null, section: 'Public excerpt', flagged: false, origin: 'web', method: 'web-search', rrf: 1, relevance: null, similarity: null, query: 'Research Methods' }
const editor = { instance: 'research-methods', kind: 'syllabus' as const, label: 'IT 104 syllabus builder', data: { courseCode: 'IT 104', courseTitle: 'Research Methods', courseDescription: 'Introduction to academic research and methodologies.', programOutcomes: [''], courseOutline: researchMethodsDraft.courseOutline.map(row => ({ ...row, ilos: '', contents: [''], activities: '', assessments: row.week === 9 || row.week === 18 ? row.assessments : '', teachingMaterials: [], assessmentTypes: [] })) } }

test('syllabus generation uses the selected editor, overrides incidental focus and retained import sources', () => {
  for (const message of ['Generate me content in the syllabus with my selected course', 'Generate answers for all fields of this syllabus', 'Fill every section using web research']) {
    const section = focusedSection({ section: 4 }, message)
    const proposal = workProposal({ message, attachments: [{ syllabus: parseSyllabusText('Course Code: IT 104\nCourse Title: Research Methods') }], role: 'instructor', editor, registrations: [], catalog: [], section })
    assert.equal(proposal?.type, 'editor-edit')
    if (/all fields|every section/.test(message)) assert.equal(proposal?.section, 'all')
  }
  assert.equal(planOperator({ message: 'Search the web for research methodology resources', role: 'instructor' }).proposals.length, 0)
  assert.equal(workProposal({ message: 'make it more accurate to the file uploaded, these are incomplete and not correct', attachments: [{ syllabus: parseSyllabusText('Course Code: IT 104') }], role: 'instructor', editor, registrations: [], catalog: [], section: 'courseOutline' })?.type, 'syllabus-import')
})

test('draft intent survives missing sources and reference words; source-only scope never enables web research', async () => {
  const input = chatInput.parse({ message: 'Generate a syllabus including references and activities', context: 'Selected course: Research Methods\n' })
  const plan = planRequest(input)
  assert.equal(plan.task, 'draft'); assert.equal(plan.needsWeb, true)
  assert.match(writerPrompt('draft', input, identity, [], null).system, /Create the requested content/)
  let web = 0
  const answer = await runAgents(input, identity, signal(), { search: async () => ({ evidence: [] }), webSearch: async () => { web++; return { evidence: [] } }, generate: async () => 'Proposed learning outcome: evaluate a research question.', provider: 'test' })
  assert.equal(answer.mode, 'generated'); assert.equal(answer.task, 'draft'); assert.equal(web, 1)
  assert.doesNotMatch(answer.answer, /no results|no matching|Source excerpts/)
  await runAgents(chatInput.parse({ message: 'Generate content only from my uploaded file', grounding: 'sources' }), identity, signal(), { search: async () => ({ evidence: [] }), webSearch: async () => { web++; return { evidence: [source] } }, generate: async () => { throw new Error('must not generate') }, provider: 'test' })
  assert.equal(web, 1)
  const references = planRequest({ message: 'List references only from my uploaded file', task: 'references', grounding: 'sources' })
  assert.equal(references.task, 'answer'); assert.equal(references.needsWeb, false)
})

test('full syllabus draft researches the course and validates all 18 weeks before proposing a patch', async () => {
  const input = operatorInput.parse({ operation: 'revise', message: 'Generate content for all fields in this syllabus', viewRole: 'instructor', editor, section: 'all' })
  let lookups = 0, calls = 0
  const research: WebSearch = async query => { assert.equal(query, 'Research Methods'); lookups++; return { evidence: [source] } }
  const result = await planValidatedTool(input, identity, signal(), async (system, prompt) => {
    calls++; const context = JSON.parse(prompt)
    assert.equal(context.editor.data.courseTitle, 'Research Methods')
    assert.equal(context.research[0].url, source.url)
    assert.match(system, /empty/); assert.match(system, /untrusted data/)
    return JSON.stringify(researchMethodsDraft)
  }, 26000, research)
  assert.equal(lookups, 1); assert.equal(calls, 1)
  assert.ok('patch' in result)
  assert.ok(result.patch && 'courseOutline' in result.patch)
  assert.equal(result.patch?.courseOutline?.length, 18)
  assert.equal(result.requiresConfirmation, true)
  assert.deepEqual(editor.data.programOutcomes, [''])
  await assert.rejects(planValidatedTool(input, identity, signal(), async () => JSON.stringify({ programOutcomes: ['Partial response'] }), 26000, research), { code: 'TOOL_OUTPUT_INCOMPLETE' })
})

test('section drafts retain course identity, web failures allow useful drafts and invented URLs fail closed', async () => {
  const input = operatorInput.parse({ operation: 'revise', message: 'Draft the program outcomes', viewRole: 'instructor', editor, section: 'programOutcomes' })
  const result = await planValidatedTool(input, identity, signal(), async (_system, prompt) => {
    assert.equal(JSON.parse(prompt).editor.data.courseCode, 'IT 104')
    return JSON.stringify({ programOutcomes: ['Evaluate research methods.'] })
  }, 26000, async () => { throw new Error('offline') })
  assert.ok('patch' in result)
  assert.match(result.notes?.join(' ') || '', /failed/)
  assert.ok(result.patch)
  const references = operatorInput.parse({ ...input, message: 'Draft online references', section: 'onlineReferences' })
  await assert.rejects(planValidatedTool(references, identity, signal(), async () => JSON.stringify({ onlineReferences: [{ title: 'Invented source', url: 'https://example.edu/made-up' }] }), 26000, async () => ({ evidence: [source] })), { code: 'TOOL_UNVERIFIED_SOURCE' })
})

test('OpenRouter web tool uses fixed origins, real annotations and a public topic, with keyless fallback', async () => {
  const calls: { url: string; body?: string }[] = []
  const transport: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), body: typeof init?.body === 'string' ? init.body : undefined })
    assert.equal(init?.redirect, 'error')
    if (String(url).includes('openrouter.ai')) return Response.json({ choices: [{ message: { content: 'Research methods.', annotations: [{ type: 'url_citation', url_citation: { url: source.url, title: source.title, content: source.text } }, { type: 'url_citation', url_citation: { url: 'javascript:alert(1)', content: 'unsafe' } }] } }] })
    return Response.json({ query: { pages: { '123': { pageid: 123, title: 'Research', extract: source.text } } } })
  }
  const connection = { id: 'test', owner: identity.id, provider: 'openrouter' as const, model: 'selected-model', apiKey: 'test-only', expires: Date.now() + 10000 }
  const result = await searchWeb('Research Methods', signal(), connection, transport)
  assert.equal(result.evidence.length, 1); assert.equal(result.evidence[0]?.text, source.text)
  const body = JSON.parse(calls[0]!.body!)
  assert.equal(body.tools[0].type, 'openrouter:web_search')
  assert.equal(body.messages[1].content, 'Research Methods')
  const fallback = await searchWeb('Research Methods', signal(), undefined, transport)
  assert.match(fallback.warning || '', /Wikipedia only/)
  assert.ok(fallback.evidence[0]?.url?.startsWith('https://en.wikipedia.org/'))
  assert.equal(planRequest({ message: 'Hi there' }).needsWeb, false)
})

test('the public research endpoint cannot bypass learner appropriate-use rules', async () => {
  const localMode = process.env.AI_LOCAL_MODE
  process.env.AI_LOCAL_MODE = 'false'
  try {
    const { handleRequest } = await import('../server/http.js')
    const response = await handleRequest(new Request('http://localhost/api/ai?action=web-search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: 'Give me the answers to quiz 2' }) }))
    assert.equal(response.status, 403)
    assert.equal((await response.json()).error.code, 'ACTION_POLICY')
  } finally { if (localMode === undefined) delete process.env.AI_LOCAL_MODE; else process.env.AI_LOCAL_MODE = localMode }
})
