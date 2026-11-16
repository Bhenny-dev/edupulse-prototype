import test from 'node:test'
import assert from 'node:assert/strict'
import { describeFrame, parseFrame, type Frame } from '../src/agents/requestFrame.js'
import { itemFromPath, itemPreview, itemFields } from '../src/agents/fieldIndex.js'

const question = (n: number) => ({ id: `q${n}`, text: `Question ${n}?`, type: 'multiple_choice', options: ['A', 'B', 'C', 'D'].map(label => ({ label, text: `${label} ${n}` })), correctIndex: 0, explanation: `Because ${n}.` })
const assessment = { kind: 'content' as const, data: { title: 'Loops quiz', questions: [1, 2, 3, 4, 5].map(question) } }
const lesson = { kind: 'content' as const, data: { title: 'Loops', sections: [{ heading: 'Intro', body: 'Start.' }, { heading: 'Counting loops', body: 'for' }, { heading: 'Summary', body: 'End.' }] } }
const syllabus = { kind: 'syllabus' as const, data: { courseCode: 'CIT 101', programOutcomes: ['Apply a', 'Apply b', 'Apply c'], courseRequirements: ['Attend', 'Submit'], coursePolicy: ['Late work', 'Honesty'], courseOutline: [{ week: 1, ilos: 'x', contents: [] }] } }
type Editor = { kind: 'content' | 'syllabus'; data: Record<string, unknown> }
const frame = (message: string, editor: Editor = assessment, path?: string) => { const result = parseFrame(message, editor, path); assert.ok(result && 'frame' in result, `${message}: ${JSON.stringify(result)}`); return result.frame }
const clarification = (message: string, editor: Editor = assessment, path?: string) => { const result = parseFrame(message, editor, path); assert.ok(result && 'clarification' in result, message); return result.clarification }
const summary = (value: Frame) => ({ command: value.command, targets: value.targets, insertAt: value.insertAt, moveTo: value.moveTo, count: value.count })

test('the items named by a message are resolved to positions in the open list', () => {
  assert.deepEqual(summary(frame('remove question 3')), { command: 'remove', targets: [2], insertAt: 5, moveTo: 0, count: 1 })
  assert.deepEqual(frame('Delete questions 2 and 4.').targets, [1, 3])
  assert.deepEqual(frame('delete questions 2-4').targets, [1, 2, 3])
  assert.deepEqual(frame('delete questions 2 to 4').targets, [1, 2, 3])
  assert.deepEqual(frame('remove the last question').targets, [4])
  assert.deepEqual(frame('remove the first two questions').targets, [0, 1])
  assert.deepEqual(frame('remove the last 2 questions').targets, [3, 4])
  assert.deepEqual(frame('remove the third question').targets, [2])
  assert.deepEqual(frame('drop the 2nd question').targets, [1])
  assert.deepEqual(frame('remove section 2', lesson).targets, [1])
  assert.deepEqual(frame('remove program outcome 2', syllabus).targets, [1])
  assert.equal(frame('remove program outcome 2', syllabus).field.key, 'programOutcomes')
  assert.equal(frame('delete the second policy', syllabus).field.key, 'coursePolicy')
})

test('an item that does not exist is reported, and nothing is guessed', () => {
  assert.equal(clarification('remove question 9'), 'There is no question 9. There are 5 questions. Nothing changed.')
  assert.match(clarification('delete questions 4 and 8'), /no question 8/)
  assert.match(clarification('remove the second policy and policy 7', syllabus), /no course policy 7/)
  assert.match(clarification('remove the question'), /Which question should I remove/)
  assert.match(clarification('remove this question'), /Which question should I remove/)
  assert.match(clarification('swap question 2'), /Name the two questions to swap/)
  assert.match(clarification('move question 2'), /Say where to move question 2/)
  assert.match(clarification('move question 2 to position 9'), /no position 9/)
  assert.match(clarification('add 30 questions'), /at most 12/)
})

test('a selected field supplies the item that "this question" means', () => {
  assert.deepEqual(frame('remove this question', assessment, 'questions.2.text').targets, [2])
  assert.deepEqual(frame('make it harder, rewrite this question', assessment, 'questions.1.explanation').targets, [1])
  assert.deepEqual(itemFromPath(assessment, 'questions.4.options.1.text'), { field: itemFields(assessment)[0], index: 4 })
  assert.equal(itemFromPath(assessment, 'questions.9.text'), null)
  assert.equal(itemFromPath(syllabus, 'courseOutline.0.ilos'), null)
})

test('moving and swapping read the sequence: where an item goes, or which two trade places', () => {
  assert.deepEqual(summary(frame('move question 4 to position 2')), { command: 'move', targets: [3], insertAt: 5, moveTo: 1, count: 1 })
  assert.equal(frame('move the last question to the top').moveTo, 0)
  assert.deepEqual(frame('move the last question to the top').targets, [4])
  assert.equal(frame('move question 1 to the end').moveTo, 4)
  assert.equal(frame('move question 2 after question 4').moveTo, 3, 'removing question 2 first, it lands after the old question 4')
  assert.equal(frame('put question 5 before question 2').moveTo, 1)
  assert.equal(frame('move question 5 after question 2').moveTo, 2)
  assert.deepEqual(summary(frame('swap questions 2 and 5')), { command: 'swap', targets: [1, 4], insertAt: 5, moveTo: 0, count: 1 })
})

test('adding reads how many, where, which format, which topic and which qualities', () => {
  const added = frame('add 2 multiple choice questions about for loops after question 3')
  assert.deepEqual([added.command, added.count, added.insertAt, added.format?.type, added.topic], ['add', 2, 3, 'multiple_choice', 'for loops'])
  const tf = frame('add a true or false question at the beginning')
  assert.deepEqual([tf.count, tf.insertAt, tf.format?.type], [1, 0, 'true_false'])
  assert.deepEqual(summary(frame('add another question')), { command: 'add', targets: [], insertAt: 5, moveTo: 0, count: 1 })
  assert.equal(frame('insert three more questions before question 2').insertAt, 1)
  assert.equal(frame('add one identification question on recursion at the end').format?.responseFormat, 'identification')
  assert.equal(frame('add one identification question on recursion at the end').topic, 'recursion')
  assert.equal(frame('add 2 harder questions in Filipino').language, 'Filipino')
  assert.deepEqual(frame('add 2 harder questions in Filipino').qualities, ['harder'])
  const policy = frame('add two course policies about attendance', syllabus)
  assert.deepEqual([policy.field.key, policy.count, policy.insertAt, policy.topic], ['coursePolicy', 2, 2, 'attendance'])
  assert.equal(frame('add a new section between section 1 and 2', lesson).insertAt, 1)
})

test('rewriting needs named items; anything else is left to the whole-field path', () => {
  assert.deepEqual(summary(frame('make question 3 harder')), { command: 'rewrite', targets: [2], insertAt: 5, moveTo: 0, count: 1 })
  assert.deepEqual(frame('make question 3 harder').qualities, ['harder'])
  assert.deepEqual(frame('rewrite questions 1 to 3 in Filipino').targets, [0, 1, 2])
  assert.deepEqual(frame('reword the second requirement', syllabus).targets, [1])
  assert.match(clarification('reword the third requirement', syllabus), /There is no course requirement 3\. There are 2 course requirements\./)
  assert.deepEqual(frame('shorten every section', lesson).targets, [0, 1, 2])
  assert.equal(parseFrame('improve the questions', assessment), null)
  assert.equal(parseFrame('generate 5 questions about loops', assessment), null)
  assert.equal(parseFrame('open the dashboard', assessment), null)
  assert.equal(parseFrame('make week 3 outcomes shorter', syllabus), null, 'outline weeks keep their own targeted contract')
  assert.equal(parseFrame('remove question 2', null), null)
  assert.equal(parseFrame('remove question 2', lesson), null, 'a lesson has no questions to remove')
})

test('two changes in one message are not guessed at, and a topic is never read as a command', () => {
  assert.match(clarification('remove question 3 and add 2 more questions'), /more than one change \(remove and add\)/)
  assert.match(clarification('move question 4 to the top and delete question 2'), /more than one change \(remove and move\)/)
  assert.match(clarification('generate 3 more questions and remove question 1'), /more than one change \(remove and add\)/)
  const topical = frame('add 2 questions about how to remove duplicates after question 3')
  assert.deepEqual([topical.command, topical.topic, topical.insertAt, topical.count], ['add', 'how to remove duplicates', 3, 2])
  assert.equal(frame('add a question and place it after question 2').insertAt, 2)
  assert.equal(frame('add a question and place it after question 2').command, 'add')
  assert.equal(frame('put question 5 before question 2').command, 'move')
  assert.equal(frame('swap questions 2 and 5').command, 'swap')
})

test('what was understood is stated in one line', () => {
  assert.equal(describeFrame(frame('remove question 3')), 'Understood: remove question 3.')
  assert.equal(describeFrame(frame('remove questions 2 and 4')), 'Understood: remove questions 2 and 4.')
  assert.equal(describeFrame(frame('move the last question to the top')), 'Understood: move question 5 to position 1.')
  assert.equal(describeFrame(frame('swap questions 2 and 5')), 'Understood: swap questions 2 and 5.')
  assert.equal(describeFrame(frame('add 2 multiple choice questions about for loops after question 3')), 'Understood: add 2 multiple-choice questions about for loops after question 3.')
  assert.equal(describeFrame(frame('add a question')), 'Understood: add 1 question at the end.')
  assert.equal(describeFrame(frame('make question 3 harder in Filipino')), 'Understood: rewrite question 3 (harder) in Filipino.')
  assert.equal(itemPreview(itemFields(assessment)[0]!, assessment.data.questions[1]), 'Question 2?')
  assert.equal(itemPreview(itemFields(lesson)[0]!, lesson.data.sections[1]), 'Counting loops: for')
})
