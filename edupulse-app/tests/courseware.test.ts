import test from 'node:test'
import assert from 'node:assert/strict'
import { courseInput, courseOutput } from '../server/contracts.js'
import { answerKeyCheck, draftCoursewareAgents, inventedLinks, keywordUse, outlineCoverage, repairDraft, withReferences } from '../src/lib/rag/courseware.js'
import { buildCourseInput } from '../src/utils/courseInput.js'
import { tableOutline } from '../src/utils/syllabusParser.js'
import type { AgentDeps, Evidence } from '../src/lib/rag/types.js'

const signal = () => AbortSignal.timeout(10000)
const plan = { activities: '', assessments: '', teachingMaterials: [], resources: [] }
const draft = (over: { correctIndex?: number; explanation?: string; material?: string } = {}) => ({
  material: { title: 'Loops in C', sections: [{ heading: 'For loops', body: over.material || 'A for loop repeats statements while a counter stays within a limit, and nested loops trace tables row by row.' }, { heading: 'While loops', body: 'A while loop checks its condition before each pass and stops when the condition becomes false.' }, { heading: 'Worked trace and practice', body: 'A loop combines an initial state, a test and a state update. Start a counter at zero, print its current value and increase it by one while it remains below three. The visible output is zero, one and two; three is never printed because the test is evaluated before the body. Trace the counter and the truth value in separate columns before running the example. Next change the starting value to one and predict the output again. Compare your prediction with the actual result and explain any difference. An update that never moves the state toward the stopping condition may cause repeated execution. During practice, identify the initial value, stopping test and update separately before rewriting the loop.' }] },
  activity: { title: 'Pair-programming laboratory', sections: [{ heading: 'Trace the table', body: 'Pairs trace a nested-loop multiplication table by hand before writing the program in the laboratory.' }, { heading: 'Compare output', body: 'Run the program and compare its output with the trace table, noting each difference.' }] },
  assessment: { title: 'Loop tracing quiz', questions: [
    { text: 'Which structure processes items first in, first out?', options: ['Stack', 'Queue', 'Tree', 'Graph'], correctIndex: over.correctIndex ?? 1, explanation: over.explanation || 'A queue processes items first in, first out.' },
    { text: 'Which loop checks its condition after the body runs?', options: ['for loop', 'while loop', 'do-while loop', 'nested loop'], correctIndex: 2, explanation: 'A do-while loop runs the body first and checks the condition after it.' },
    { text: 'What does a loop counter track in a for loop?', options: ['The number of passes', 'The file size', 'The memory address', 'The compiler version'], correctIndex: 0, explanation: 'The counter tracks the number of passes the loop has made.' },
  ] },
})

// A minimal stand-in for the DOM that mammoth's HTML becomes in the browser.
const cell = (...paragraphs: string[]) => ({ textContent: paragraphs.join(''), querySelectorAll: () => paragraphs.map(textContent => ({ textContent })) })
const row = (...cells: ReturnType<typeof cell>[]) => ({ querySelectorAll: () => cells })
const doc = (...rows: ReturnType<typeof row>[]) => ({ querySelectorAll: () => [{ querySelectorAll: () => rows }] })

test('Word-table outlines keep each paragraph: separate topics, readable outcomes and the resources column', () => {
  const outline = tableOutline(doc(
    row(cell('Week'), cell('Intended Learning Outcomes'), cell('Topics'), cell('TLA'), cell('Assessment'), cell('Resources')),
    row(cell('1'), cell('Define programming.', 'Explain compilers.'), cell('1. What is Programming', '2. Compilers vs Interpreters; Types of languages'), cell('Lecture-discussion'), cell('Short quiz'), cell('Deitel, P.; Deitel, H. (2016). C How to Program', 'https://cs50.harvard.edu/x/')),
  ))
  assert.equal(outline.length, 1)
  assert.deepEqual(outline[0]!.contents, ['What is Programming', 'Compilers vs Interpreters', 'Types of languages'])
  assert.equal(outline[0]!.ilos, 'Define programming.\nExplain compilers.')
  assert.deepEqual(outline[0]!.resources.map(r => r.name), ['Deitel, P.; Deitel, H. (2016). C How to Program', 'https://cs50.harvard.edu/x/'])
  assert.equal(outline[0]!.resources[1]!.url, 'https://cs50.harvard.edu/x/')
})

test('the generation request carries the week plan: activity, assessment, teaching materials and resources', () => {
  const input = buildCourseInput({ courseCode: 'IT 102', courseTitle: 'Programming', courseOutline: [{ week: 3, ilos: 'Trace loops.', contents: ['for loops', { name: 'while loops' }], activities: 'Laboratory', assessments: 'Quiz', teachingMaterials: ['Slides'], resources: [{ name: 'CS50 notes', url: 'https://cs50.harvard.edu/x/' }] }] }, 3)
  assert.deepEqual(input.topics, ['for loops', 'while loops'])
  assert.deepEqual(courseInput.parse(input).plan, { activities: 'Laboratory', assessments: 'Quiz', teachingMaterials: ['Slides'], resources: [{ name: 'CS50 notes', url: 'https://cs50.harvard.edu/x/' }] })
})

test('the answer-key check flags a key that its own explanation contradicts', async () => {
  assert.deepEqual((await answerKeyCheck(draft(), signal())).issues, [])
  const wrong = await answerKeyCheck(draft({ correctIndex: 0 }), signal())
  assert.deepEqual(wrong, { checked: 3, consistent: 2, issues: [{ question: 1, marked: 0, supported: 1 }] })
})

test('references come only from the syllabus and the library; invented links are removed', () => {
  const library: Evidence = { id: 'e1', documentId: 'd1', title: 'Control flow - Wikipedia', text: 'Loops repeat.', page: 4, section: 'Loops', flagged: false, origin: 'private', method: 'hybrid', similarity: 0.5, rrf: 0.03, relevance: 2, query: '' }
  const withPlan = { ...plan, teachingMaterials: ['Week 3 slides'], resources: [{ name: 'CS50 notes', url: 'https://cs50.harvard.edu/x/' }] }
  const invented = draft({ material: 'See https://example.com/loops and https://cs50.harvard.edu/x/notes/1 for nested loops and tracing tables in practice.' })
  assert.deepEqual(inventedLinks(invented, withPlan), ['https://example.com/loops'])
  const result = withReferences(invented, withPlan, [library])
  const refs = result.material.sections.at(-1)!
  assert.equal(refs.heading, 'References')
  assert.equal(refs.body, '1. CS50 notes — https://cs50.harvard.edu/x/\n2. Week 3 slides\n3. Control flow - Wikipedia, p. 4 (Loops) — knowledge-library passage used for this draft')
  assert.match(result.material.sections[0]!.body, /\(link removed: not listed in the syllabus\) and https:\/\/cs50\.harvard\.edu\/x\/notes\/1/)
  assert.match(withReferences(draft(), plan, []).material.sections.at(-1)!.body, /No references are listed/)
})

test('coverage checks every topic and outcome, and whether the activity and assessment follow the plan', async () => {
  const topics = ['for loops', 'while loops', 'do-while loops', 'nested loops', 'loop counters', 'tracing tables', 'queue', 'stack', 'tree', 'graph']
  const coverage = await outlineCoverage({ topics, outcomes: 'Trace nested loops. Compare loop types.', plan: { ...plan, activities: 'Pair-programming laboratory: trace a nested-loop table', assessments: 'Loop tracing quiz' } }, draft(), signal())
  assert.equal(coverage.items.filter(i => i.kind === 'topic').length, 10, 'no topic beyond the first eight is skipped')
  assert.deepEqual(coverage.items.filter(i => i.kind === 'activity' || i.kind === 'assessment').map(i => [i.kind, i.status]), [['activity', 'covered'], ['assessment', 'covered']])
})

test('the courseware graph searches every topic, revises a wrong answer key and adds syllabus references', async () => {
  const queries: string[] = [], prompts: { topics: string[]; plannedActivity: string; correction: string }[] = []
  const responses = [draft({ correctIndex: 0 }), draft()]
  const deps: AgentDeps & { generate: NonNullable<AgentDeps['generate']> } = {
    search: async query => { queries.push(query); return { evidence: [] } }, provider: 'test',
    generate: async (_system, prompt) => { prompts.push(JSON.parse(prompt)); return JSON.stringify(responses.shift()) },
  }
  const topics = Array.from({ length: 14 }, (_, i) => `topic number ${i + 1} on loops`)
  const result = await draftCoursewareAgents({ courseCode: 'IT 102', courseTitle: 'Programming', week: 7, topics, outcomes: 'Trace nested loops.', referenceText: '', plan: { ...plan, activities: 'Pair-programming laboratory', resources: [{ name: 'CS50 notes', url: 'https://cs50.harvard.edu/x/' }] } }, signal(), deps)
  for (const topic of topics) assert.ok(queries.some(q => q.includes(topic)), `${topic} searched`)
  assert.equal(prompts[0]!.topics.length, 14); assert.equal(prompts[0]!.plannedActivity, 'Pair-programming laboratory')
  assert.match(prompts[1]!.correction, /Question 1: the explanation supports option 1 but correctIndex is 0/)
  assert.deepEqual(result.answerKey.issues, [])
  assert.match(result.content.material.sections.at(-1)!.body, /CS50 notes — https:\/\/cs50\.harvard\.edu\/x\//)
  assert.doesNotMatch(result.warning || '', /first 12/)
  assert.equal(result.coverage.items.filter(i => i.kind === 'topic').length, 14)
})

test('empty-library courseware researches the teaching topic, keeps provenance and honors source-only mode', async () => {
  const source: Evidence = { id: 'public-loops', documentId: 'public-loops', title: 'Loop reference', text: 'A for loop repeats statements while a counter stays within a limit.', url: 'https://example.edu/loops', page: null, section: 'Search excerpt', flagged: false, origin: 'web', method: 'web-search', similarity: null, rrf: 1, relevance: 3, query: 'loops' }
  let calls = 0
  const input = { courseCode: 'TEST', courseTitle: 'Programming', week: 1, topics: ['for loops'], outcomes: 'Explain for loops.', referenceText: 'PRIVATE CONTEXT DO NOT SEND TO SEARCH', plan }
  const deps = { provider: 'test', search: async () => ({ evidence: [] }), webSearch: async (query: string) => { calls++; assert.match(query, /Programming.*for loops/); assert.doesNotMatch(query, /PRIVATE/); return { evidence: [source] } }, generate: async () => JSON.stringify(draft()) }
  const result = await draftCoursewareAgents(input, signal(), deps)
  assert.equal(calls, 1); assert.equal(result.sources[0]?.origin, 'web')
  assert.match(result.content.material.sections.at(-1)!.body, /public research passage.*https:\/\/example.edu\/loops/)
  await draftCoursewareAgents({ ...input, research: 'sources' }, signal(), deps)
  assert.equal(calls, 1)
})

test('courseware writer receives the original teaching instruction on each attempt without sending it to public search', async () => {
  const request = 'Generate the lesson in Filipino with two worked examples for my confidential tutoring group.'
  const prompts: { currentRequest: string }[] = []
  await draftCoursewareAgents({ courseCode: 'TEST', courseTitle: 'Programming', week: 1, topics: ['for loops'], outcomes: 'Explain for loops.', referenceText: '', request, plan }, signal(), {
    provider: 'test', search: async () => ({ evidence: [] }),
    webSearch: async query => { assert.doesNotMatch(query, /confidential|Filipino|worked examples/); return { evidence: [] } },
    generate: async (system, prompt) => {
      assert.match(system, /currentRequest is the instructor instruction/)
      prompts.push(JSON.parse(prompt))
      return JSON.stringify(prompts.length === 1 ? draft({ correctIndex: 0 }) : draft())
    },
  })
  assert.equal(prompts.length, 2)
  assert.ok(prompts.every(prompt => prompt.currentRequest === request))
})

test('courseware enforces request source restrictions even when the API research flag is omitted', async () => {
  const input = { courseCode: 'TEST', courseTitle: 'Programming', week: 1, topics: ['for loops'], outcomes: 'Explain for loops.', referenceText: 'Source detail. '.repeat(100) + 'FINAL SUPPLIED SYLLABUS DETAIL', plan }
  let searches = 0, generations = 0
  const deps = {
    provider: 'test', search: async () => { searches++; return { evidence: [] } },
    webSearch: async () => { assert.fail('Restricted requests must not search the web') },
    generate: async (system: string, prompt: string) => {
      generations++
      if (/syllabus|outline/.test(JSON.parse(prompt).currentRequest)) {
        assert.match(system, /supplied syllabus only/)
        assert.match(JSON.parse(prompt).courseContext, /FINAL SUPPLIED SYLLABUS DETAIL$/)
        assert.deepEqual(JSON.parse(prompt).retrievedReferences, [])
      }
      return JSON.stringify(draft())
    },
  }
  await draftCoursewareAgents({ ...input, request: 'Generate a lesson without web research' }, signal(), deps)
  assert.equal(searches, 1, 'no-web still permits authorized library retrieval')
  for (const request of ['Generate a lesson only from the syllabus', 'Generate a lesson using only the selected outline']) {
    const result = await draftCoursewareAgents({ ...input, request }, signal(), deps)
    assert.deepEqual(result.sources, [])
  }
  assert.equal(searches, 1, 'syllabus-only must not retrieve other private documents')
  const before = generations
  for (const request of ['Generate a lesson only from my uploaded file', 'Generate a lesson based on the attached document']) await assert.rejects(draftCoursewareAgents({ ...input, request }, signal(), deps), { code: 'SOURCE_REQUIRED' })
  assert.equal(searches, 1)
  assert.equal(generations, before, 'missing requested attachments must fail before generation')
})

test('syllabus source links do not authorize lookalike hosts or adjacent paths', () => {
  const result = inventedLinks(draft({ material: 'Read https://trusted.edu.evil.test/notes and https://trusted.edu/notes-evil for for loops.' }), { ...plan, resources: [{ name: 'Source', url: 'https://trusted.edu/notes' }] })
  assert.equal(result.length, 2)
})

test('an irrelevant library candidate does not suppress public topic research', async () => {
  const unrelated: Evidence = { id: 'unrelated', documentId: 'unrelated', title: 'Unrelated record', text: 'A calendar lists dates and holidays.', origin: 'private', method: 'hybrid', page: null, section: null, flagged: false, similarity: 0.1, rrf: 0.03, relevance: null, query: '' }
  let searches = 0
  const result = await draftCoursewareAgents({ courseCode: 'TEST', courseTitle: 'Programming', week: 1, topics: ['for loops'], outcomes: 'Trace for loops.', referenceText: '', plan }, signal(), { provider: 'test', search: async () => ({ evidence: [unrelated] }), rerank: async (_query, passages) => passages.map(() => -20), webSearch: async () => { searches++; return { evidence: [] } }, generate: async () => JSON.stringify(draft()) })
  assert.equal(searches, 1)
  assert.equal(result.sources.length, 0)
})

test('a valid JSON shell with tiny lesson bodies is repaired and then rejected without a usable draft', async () => {
  const shell = draft()
  shell.material.sections = [{ heading: 'Overview', body: 'Variables store values for use in a program.' }, { heading: 'Practice', body: 'Write some code that uses a variable.' }]
  let calls = 0
  await assert.rejects(draftCoursewareAgents({ courseCode: 'TEST', courseTitle: 'Programming', week: 1, topics: ['variables'], outcomes: 'Explain variables.', referenceText: '', plan }, signal(), { provider: 'test', search: async () => ({ evidence: [] }), generate: async () => { calls++; return JSON.stringify(shell) } }), { code: 'INVALID_GENERATION' })
  assert.equal(calls, 2)
})

test('mechanical repairs fix extra questions, letter keys and option labels, and invent nothing', () => {
  const raw = draft() as unknown as { assessment: { questions: Record<string, unknown>[] } }
  const extra = { text: 'Which keyword ends a loop early in C?', options: ['A) break', 'B) continue', 'C) return', 'D) goto'], correctIndex: 'A', explanation: 'The break keyword ends the loop early.' }
  raw.assessment.questions.push(extra, { ...extra }, { ...extra })
  const { value, repairs } = repairDraft(raw)
  const parsed = courseOutput.parse(value)
  assert.equal(parsed.assessment.questions.length, 5)
  assert.deepEqual(parsed.assessment.questions[3]!.options, ['break', 'continue', 'return', 'goto'])
  assert.equal(parsed.assessment.questions[3]!.correctIndex, 0)
  assert.ok(repairs.includes('kept the first 5 of 6 questions'))
  // A key that names no option, and options labeled out of order, are left for the schema check to reject.
  const unclear = repairDraft({ assessment: { questions: [{ correctIndex: 'E', options: ['B) one', 'A) two', 'C) three', 'D) four'] }] } }).value as { assessment: { questions: { correctIndex: unknown; options: string[] }[] } }
  assert.equal(unclear.assessment.questions[0]!.correctIndex, 'E'); assert.equal(unclear.assessment.questions[0]!.options[0], 'B) one')
})

test('keyword topics such as "for" and "do-while" are checked, and count only where the draft uses them as keywords', async () => {
  assert.equal(keywordUse('nested loops'), null)
  assert.ok(keywordUse('for')!.test('A for loop repeats a block.')); assert.ok(keywordUse('do-while')!.test('Write a do while loop.'))
  assert.ok(keywordUse('while')!.test('while (count < 10)')); assert.ok(keywordUse('for')!.test('The keyword for starts the loop.'))
  assert.equal(keywordUse('for')!.test('For example, a counter tracks progress.'), false)
  const coverage = await outlineCoverage({ topics: ['for', 'while', 'do-while', 'break/continue'], outcomes: 'Use loop structures to implement iterative solutions.' }, draft(), signal())
  assert.deepEqual(coverage.items.filter(i => i.kind === 'topic').map(i => [i.text, i.status]), [['for', 'covered'], ['while', 'covered'], ['do-while', 'covered'], ['break/continue', 'missing']])
})

test('a reference list written by the model is replaced, and no section is dropped to make room', () => {
  const eight = draft()
  eight.material.sections = Array.from({ length: 7 }, (_, i) => ({ heading: `Part ${i + 1}`, body: 'A for loop repeats statements while a counter stays within a limit.' }))
  eight.material.sections.push({ heading: 'References', body: 'Smith, J. (2019). Loops Made Easy. https://example.com/loops' })
  const result = withReferences(eight, { ...plan, teachingMaterials: ['Week 3 slides'] }, [])
  assert.deepEqual(result.material.sections.map(s => s.heading), ['Part 1', 'Part 2', 'Part 3', 'Part 4', 'Part 5', 'Part 6', 'Part 7', 'References'])
  assert.equal(result.material.sections.at(-1)!.body, '1. Week 3 slides')
  const full = draft(); full.material.sections = Array.from({ length: 8 }, (_, i) => ({ heading: `Part ${i + 1}`, body: 'A while loop checks its condition before every pass.' }))
  assert.equal(withReferences(full, plan, []).material.sections.length, 9)
})
