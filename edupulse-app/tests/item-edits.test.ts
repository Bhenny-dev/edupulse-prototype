import test from 'node:test'
import assert from 'node:assert/strict'
import { operatorInput, planValidatedTool } from '../src/agents/toolPlanner.js'
import { applyDirect } from '../src/agents/itemEdits.js'
import { parseFrame } from '../src/agents/requestFrame.js'
import { sectionFor, workProposal } from '../src/agents/workTools.js'

const question = (n: number) => ({ id: `q${n}`, text: `Question ${n}?`, type: 'multiple_choice', options: ['A', 'B', 'C', 'D'].map(label => ({ label, text: `${label} ${n}` })), correctIndex: 0, explanation: `Because ${n}.`, topic: 'Loops' })
const assessment = (count = 5) => ({ instance: 'assessment-1', kind: 'content' as const, label: 'Loops quiz', data: { title: 'Loops quiz', questions: Array.from({ length: count }, (_, i) => question(i + 1)) } })
const syllabus = (courseCode = 'CIT 101') => ({ instance: 'syllabus-1', kind: 'syllabus' as const, label: 'Syllabus', data: { courseCode, courseTitle: 'Programming', courseDescription: 'Basics.', programOutcomes: ['Apply a', 'Apply b', 'Apply c'], courseRequirements: ['Attend', 'Submit'], coursePolicy: ['Late work', 'Honesty'], courseOutline: [{ week: 1, ilos: 'x', contents: ['y'] }] } })
const identity = { id: 'instructor-1', role: 'instructor' as const, local: false }
const run = async (message: string, editor: ReturnType<typeof assessment> | ReturnType<typeof syllabus>, replies: string[] = [], extra: Record<string, unknown> = {}) => {
  const calls: { system: string; prompt: string }[] = []
  const generate = async (system: string, prompt: string) => { calls.push({ system, prompt }); const reply = replies[calls.length - 1]; if (reply === undefined) throw new Error('No model call was expected here.'); return reply }
  const input = operatorInput.parse({ operation: 'revise', message, viewRole: 'instructor', editor, ...extra })
  const result = await planValidatedTool(input, identity, AbortSignal.timeout(5000), generate) as Record<string, any>
  return { result, calls }
}
const ids = (result: Record<string, any>) => (result.patch.questions as { id: string }[]).map(item => item.id)

test('remove, move and swap are carried out by code, keep every id and answer, and never call a model', async () => {
  const removed = await run('remove question 3', assessment())
  assert.deepEqual(ids(removed.result), ['q1', 'q2', 'q4', 'q5'])
  assert.deepEqual([removed.result.generated, removed.result.structural, removed.result.requiresConfirmation, removed.calls.length], [false, true, true, 0])
  assert.equal(removed.result.notes[0], 'Understood: remove question 3.')
  assert.deepEqual(removed.result.patch.questions[0], assessment().data.questions[0], 'untouched questions are identical')
  assert.deepEqual(ids((await run('delete questions 2 and 4', assessment())).result), ['q1', 'q3', 'q5'])
  assert.deepEqual(ids((await run('move the last question to the top', assessment())).result), ['q5', 'q1', 'q2', 'q3', 'q4'])
  assert.deepEqual(ids((await run('move question 2 after question 4', assessment())).result), ['q1', 'q3', 'q4', 'q2', 'q5'])
  assert.deepEqual(ids((await run('swap questions 2 and 5', assessment())).result), ['q1', 'q5', 'q3', 'q4', 'q2'])
  assert.deepEqual(applyDirect((parseFrame('remove question 1', assessment()) as any).frame, [1, 2, 3]), [2, 3])
})

test('an item that is not there, or the last one of a quiz, is explained and nothing changes', async () => {
  const missing = await run('remove question 9', assessment())
  assert.equal(missing.result.clarification, 'There is no question 9. There are 5 questions. Nothing changed.')
  assert.equal(missing.calls.length, 0)
  assert.match((await run('remove all questions', assessment(3))).result.clarification, /needs at least one question/)
  assert.match((await run('remove the question', assessment())).result.clarification, /Which question should I remove/)
})

test('added questions are written by the model against a strict contract and inserted at the stated position', async () => {
  const items = [{ text: 'A for loop repeats a block.', type: 'true_false', options: ['True', 'False'], correctIndex: 0, explanation: 'It repeats.' }, { text: 'A while loop never stops.', type: 'true_false', options: ['True', 'False'], correctIndex: 1, explanation: 'It stops when its condition fails.' }]
  const { result, calls } = await run('add 2 true or false questions about loops after question 3', assessment(), [JSON.stringify({ items })])
  assert.deepEqual(ids(result), ['q1', 'q2', 'q3', 'q6', 'q7', 'q4', 'q5'], 'new ids never collide with existing ones')
  assert.deepEqual([result.generated, result.structural, result.requiresConfirmation], [true, true, true])
  assert.equal(result.notes[0], 'Understood: add 2 true or false questions about loops after question 3.')
  assert.deepEqual(result.patch.questions[3].options, [{ label: 'A', text: 'True' }, { label: 'B', text: 'False' }])
  assert.deepEqual(result.patch.questions.filter((_: unknown, i: number) => ![3, 4].includes(i)), assessment().data.questions, 'the existing questions are unchanged')
  const prompt = JSON.parse(calls[0]!.prompt)
  assert.deepEqual(prompt.insertion, { count: 2, position: 4, after: { position: 3, text: 'Question 3?' }, before: { position: 4, text: 'Question 4?' } })
  assert.deepEqual(prompt.requirements, { format: 'true or false', topic: 'loops' })
  assert.equal(prompt.sequence.length, 5)
  assert.match(calls[0]!.system, /exactly 2 new items/)
  assert.doesNotMatch(calls[0]!.prompt, /"id"/, 'the model is never shown or asked for an id')
})

test('a reply that misses a requirement is repaired once with the exact gap, then rejected', async () => {
  const wrong = JSON.stringify({ items: [{ text: 'Pick one.', type: 'multiple_choice', options: ['a', 'b', 'c', 'd'], correctIndex: 0, explanation: 'x' }] })
  const right = JSON.stringify({ items: [{ text: 'Loops repeat.', type: 'true_false', options: ['True', 'False'], correctIndex: 0, explanation: 'x' }] })
  const repaired = await run('add a true or false question', assessment(), [wrong, right])
  assert.equal(repaired.calls.length, 2)
  assert.match(repaired.calls[1]!.system, /Repair the previous attempt: question 6: use the true or false format/)
  assert.equal(ids(repaired.result).at(-1), 'q6')
  await assert.rejects(run('add a true or false question', assessment(), [wrong, wrong]), (error: Error & { code?: string }) => error.code === 'TOOL_OUTPUT_INVALID' && /Nothing changed/.test(error.message))
  const prose = await run('add a question', assessment(), ['Sure, here you go!', right.replace('true_false', 'true_false')])
  assert.equal(prose.calls.length, 2, 'a reply without JSON gets one repair attempt')
})

test('a rewrite returns new wording for the named questions only, and ids and types stay', async () => {
  const value = { text: 'Which loop fits an unknown count?', type: 'multiple_choice', options: ['for', 'while', 'do', 'each'], correctIndex: 1, explanation: 'A while loop tests a condition.' }
  const { result, calls } = await run('make question 2 harder', assessment(), [JSON.stringify({ edits: [{ target: 1, value }] })])
  assert.deepEqual([result.generated, result.structural], [true, false])
  assert.equal(result.notes[0], 'Understood: rewrite question 2 (harder).')
  assert.deepEqual(ids(result), ['q1', 'q2', 'q3', 'q4', 'q5'])
  assert.equal(result.patch.questions[1].text, 'Which loop fits an unknown count?')
  assert.equal(result.patch.questions[1].topic, 'Loops', 'the topic of the old question is kept')
  assert.deepEqual(result.patch.questions.filter((_: unknown, i: number) => i !== 1), assessment().data.questions.filter((_, i) => i !== 1))
  const prompt = JSON.parse(calls[0]!.prompt)
  assert.deepEqual(prompt.targets.map((target: { target: number; position: number }) => [target.target, target.position]), [[1, 2]])
  assert.equal(prompt.targets[0].current.text, 'Question 2?'); assert.equal('id' in prompt.targets[0].current, false)
  assert.deepEqual(prompt.requirements, { qualities: ['harder'] })
  const withId = await run('make question 2 harder', assessment(), [JSON.stringify({ edits: [{ target: 1, value: { ...value, id: 'q9' } }] }), JSON.stringify({ edits: [{ target: 1, value }] })])
  assert.equal(withId.calls.length, 2); assert.match(withId.calls[1]!.system, /Unrecognized key/)
  const retyped = { ...value, type: 'true_false', options: ['True', 'False'], correctIndex: 0 }
  await assert.rejects(run('make question 2 harder', assessment(), [JSON.stringify({ edits: [{ target: 1, value: retyped }] }), JSON.stringify({ edits: [{ target: 1, value: retyped }] })]), /keep the multiple_choice type/)
  const same = { ...value, text: 'Question 4?' }
  await assert.rejects(run('make question 2 harder', assessment(), [JSON.stringify({ edits: [{ target: 1, value: same }] }), JSON.stringify({ edits: [{ target: 1, value: same }] })]), /repeats another question/)
})

test('a model that needs a fact asks for it, and more items than the list holds are refused', async () => {
  const { result } = await run('add a question about the lab handout', assessment(), [JSON.stringify({ needsClarification: 'Which lab handout do you mean?' })])
  assert.equal(result.clarification, 'Which lab handout do you mean?')
  assert.match((await run('add 3 questions', assessment(49))).result.clarification, /holds at most 50 items; this one has 49/)
})

test('syllabus lists are edited the same way, and a model edit needs the selected course', async () => {
  const removed = await run('remove program outcome 2', syllabus())
  assert.deepEqual(removed.result.patch, { programOutcomes: ['Apply a', 'Apply c'] })
  assert.deepEqual([removed.result.requiresConfirmation, removed.calls.length], [false, 0])
  assert.deepEqual((await run('delete the second policy', syllabus())).result.patch, { coursePolicy: ['Late work'] })
  const added = await run('add two course policies about attendance', syllabus(), [JSON.stringify({ items: ['Attendance is required for assessments.', 'Absences need documentation.'] })])
  assert.deepEqual(added.result.patch.coursePolicy, ['Late work', 'Honesty', 'Attendance is required for assessments.', 'Absences need documentation.'])
  assert.match((await run('add two course policies about attendance', syllabus(''))).result.clarification, /Select the course/)
  const reworded = await run('reword the second requirement', syllabus(), [JSON.stringify({ edits: [{ target: 1, value: 'Submit every activity on time.' }] })])
  assert.deepEqual(reworded.result.patch.courseRequirements, ['Attend', 'Submit every activity on time.'])
})

test('only an instructor view can edit, and week requests keep the outline contract', async () => {
  const input = operatorInput.parse({ operation: 'revise', message: 'remove question 3', viewRole: 'student', editor: assessment() })
  await assert.rejects(planValidatedTool(input, { id: 'student-1', role: 'student', local: false }, AbortSignal.timeout(2000), async () => ''), /authorized instructor/)
  assert.equal(parseFrame('make week 2 outcomes shorter', syllabus()), null)
})

test('the chat panel routes list commands to the editor, and names the section a request is about', () => {
  const route = (message: string, editor: ReturnType<typeof assessment> | ReturnType<typeof syllabus> | null) => workProposal({ message, attachments: [], role: 'instructor', editor, registrations: [], catalog: [] })
  assert.equal((route('remove question 3', assessment()) as { type: string }).type, 'editor-edit')
  assert.equal((route('add two more questions about arrays', assessment()) as { type: string }).type, 'editor-edit')
  assert.equal((route('swap questions 1 and 2', assessment()) as { type: string }).type, 'editor-edit')
  assert.equal((route('delete the second course policy', syllabus()) as { type: string; section: string }).section, 'coursePolicy')
  assert.equal(route('add two more questions', null), null)
  assert.equal(sectionFor('reword the second requirement'), 'courseRequirements')
  assert.equal(sectionFor('add a policy about attendance'), 'coursePolicy')
  assert.equal(sectionFor('revise the grading policy'), 'gradingSystem')
  assert.equal(sectionFor('write the course description'), 'courseDescription')
})

test('the operator endpoint lets a list command through its request gate with no model connected, and still refuses unrelated requests', async t => {
  const previous = process.env.AI_LOCAL_MODE
  process.env.AI_LOCAL_MODE = 'true'
  t.after(() => { if (previous === undefined) delete process.env.AI_LOCAL_MODE; else process.env.AI_LOCAL_MODE = previous })
  const { handleRequest } = await import('../server/http.js')
  const call = (message: string) => handleRequest(new Request('http://localhost/api/ai?action=operator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'revise', message, viewRole: 'instructor', editor: syllabus() }) }))
  const removed = await call('Remove program outcome 2')
  assert.equal(removed.status, 200)
  const body = await removed.json()
  assert.deepEqual(body.patch, { programOutcomes: ['Apply a', 'Apply c'] })
  assert.equal(body.notes[0], 'Understood: remove program outcome 2.')
  const refused = await call('Remove the old files from my account')
  assert.equal(refused.status, 400)
  assert.equal((await refused.json()).error.code, 'CONTENT_REQUEST_REQUIRED')
})
