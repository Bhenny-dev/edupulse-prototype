import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { assessmentContent, coursewarePackPlan, materialContent, parseKeys, parseMaterial, parseSheet, parseSources, readPack, topicFor, type Pack } from '../scripts/lib/courseware-pack'
import { readPackFolder } from '../scripts/lib/courseware-pack-files'
import { samplePack, samplePages, sampleWorkspace } from './courseware-pack-fixture'

const pack = (): Pack => readPack(samplePack())
const owner = { id: '11111111-1111-4111-8111-111111111111', role: 'instructor' }
const when = '2026-11-19T00:00:00.000Z'

test('a teaching material is read into headed notes, steps and source ids across its pages', () => {
  const material = parseMaterial(samplePages.m1)
  assert.equal(material.week, 1)
  assert.equal(material.title, 'Orientation to Sample Studies and Course Basics')
  assert.deepEqual(material.outcomes, ['Explain the first concept with an appropriate example.', 'Analyze the second concept.'])
  assert.deepEqual(material.notes.map(note => note.heading), ['Alpha', 'Beta', 'Course orientation'])
  assert.match(material.notes[0]!.body, /^Alpha is the first sample concept and it is described .* second line of text\.$/)
  assert.equal(material.scenarioHeading, 'Applied ICT Scenario')
  assert.equal(material.steps.length, 5)
  assert.equal(material.expectedOutput, 'Submit a labeled stack.')
  assert.equal(material.checks.length, 2)
  assert.deepEqual(material.sourceIds, ['S01', 'S02'])
  assert.match(material.adaptation, /^Teaching adaptation: Examples .* before instruction\.$/)
  assert.throws(() => parseMaterial(samplePages.a2), /not a weekly teaching material/)
})

test('every assessment kind is read: choice, true or false, matching, applied decision, criteria and the practice test', () => {
  const criteria = parseSheet(samplePages.a1).parts[0]!
  assert.equal(criteria.kind, 'criteria')
  assert.deepEqual(criteria.kind === 'criteria' && criteria.criteria.map(row => row.points), [2, 2, 2, 2, 2])
  assert.equal(criteria.kind === 'criteria' && criteria.criteria[2]!.text, 'Mark components belonging to hardware, OS, framework and application.')
  assert.match(criteria.kind === 'criteria' ? criteria.prompt : '', /^A team compares two sample devices.*compatibility\.$/)
  const mixed = parseSheet(samplePages.a2)
  assert.deepEqual(mixed.parts.map(part => part.kind), ['choice', 'truefalse'])
  const choice = mixed.parts[0]!
  assert.equal(choice.kind === 'choice' && choice.items[1]!.text, 'Which concept fits: Beta is the second sample concept and this statement is long enough to wrap onto a second line?')
  assert.deepEqual(choice.kind === 'choice' && choice.items[2]!.options, ['Alpha', 'Beta', 'Delta', 'Gamma'])
  assert.deepEqual(mixed.parts[1]!.kind === 'truefalse' && mixed.parts[1]!.items.map(item => item.text), ['Alpha: Alpha is the first sample concept.', 'Beta: Gamma groups the third sample concept with its limits.'])
  const matching = parseSheet(samplePages.a3)
  assert.deepEqual(matching.parts.map(part => part.kind), ['matching', 'applied'])
  assert.deepEqual(matching.parts[0]!.kind === 'matching' && matching.parts[0]!.legend, ['Device management', 'File systems', 'Protection domains', 'Authentication and authorization'])
  assert.match(matching.parts[1]!.kind === 'applied' ? matching.parts[1]!.prompt : '', /^Using the following case, prepare five brief decision or verification steps: A user cannot open/)
  const practice = parseSheet(samplePages.a4)
  assert.equal(practice.practice, true)
  assert.equal(parseSheet(samplePages.a2).practice, false)
  assert.throws(() => parseSheet([['WEEK 02 / ASSESSMENT / 10 POINTS', 'Title', 'Lesson 1 | x', 'Part A - Essay Items (5 points; 1 each)', '1. Write.'].join('\n')]), /not supported/)
})

test('the key gives each right answer with its concept and reason, the expected steps and the criteria', () => {
  const keys = parseKeys(samplePages.keys)
  assert.deepEqual([...keys.keys()], [1, 2, 3, 4])
  const choice = keys.get(2)!.parts[0]!
  assert.deepEqual(choice.entries.map(entry => entry.answer), ['B', 'B', 'D'])
  assert.equal(choice.entries[0]!.concept, 'Alpha')
  assert.match(choice.entries[0]!.explanation, /^Alpha is the first sample concept .* second line of text\.$/)
  const truth = keys.get(2)!.parts[1]!
  assert.deepEqual(truth.entries.map(entry => entry.answer), ['True', 'False'])
  assert.equal(truth.entries[1]!.explanation, 'The described property belongs to Gamma, not Beta.')
  const matching = keys.get(3)!.parts[0]!
  assert.equal(matching.entries[1]!.concept, 'Protection domains')
  assert.equal(matching.entries[1]!.explanation, 'The kernel enforces boundaries between processes.')
  const applied = keys.get(3)!.parts[1]!
  assert.deepEqual(applied.steps, ['Draw a request path', 'List two checks', 'Create a non-destructive sequence', 'Propose a least-privilege fix', 'Submit a case report'])
  assert.match(applied.marking, /^Award 1 point for each correctly adapted step/)
  assert.equal(keys.get(1)!.parts[0]!.criteria.length, 5)
  assert.equal(keys.get(1)!.parts[0]!.criteria[2], 'Mark components belonging to hardware, OS, framework and application.')
})

test('the source register keeps each source with its publisher, weeks and a link that wrapped across lines', () => {
  const sources = parseSources(samplePages.sources)
  assert.deepEqual(sources.map(source => source.id), ['S01', 'S02', 'S03'])
  assert.equal(sources[0]!.publisher, 'KCP College of Information Technology')
  assert.equal(sources[0]!.weeks, '1-4')
  assert.equal(sources[0]!.url, '')
  assert.equal(sources[1]!.url, 'https://example.org/books/sample-os/book-rev5.pdf')
  assert.equal(sources[2]!.url, 'https://example.org/documentation/long/Red_Hat_Enterprise-en-US.pdf')
  assert.equal(sources[2]!.weeks, '3, 4')
})

test('a pack needs every week to have its material, assessment, key and sources', () => {
  const whole = pack()
  assert.deepEqual([...whole.materials.keys()], [1, 2, 3, 4])
  assert.equal(whole.sources.length, 3)
  assert.throws(() => readPack(samplePack().filter(file => !/Week_03_Assessment/.test(file.path))), /Every week needs/)
  assert.throws(() => readPack(samplePack().filter(file => !/Instructor_Only/.test(file.path))), /instructor key/)
  assert.throws(() => readPack(samplePack().map(file => /Week_02_Teaching/.test(file.path) ? { ...file, path: file.path.replace('Week_02_Teaching', 'Week_05_Teaching').replace('Week_02_concepts', 'Week_05_concepts') } : file)), /does not match its folder|Every week needs/)
})

test('a material becomes document sections, ending with the related sources and their links', () => {
  const whole = pack(), content = materialContent(whole.materials.get(2)!, whole.sources, { code: 'SAMPLE 101' })
  assert.equal(content.title, 'Week 2: Sample Concepts and Limits')
  assert.deepEqual(content.sections.map(section => section.heading), ['Intended learning outcomes', 'Alpha', 'Beta', 'Gamma', 'Applied ICT Scenario', 'Follow-along classroom activity', 'Check for understanding', 'Sources'])
  assert.match(content.sections.at(-1)!.body, /^- \*\*S01\*\* Sample Studies Course Syllabus, First Semester \(KCP College of Information Technology\)/)
  assert.doesNotMatch(content.sections.at(-1)!.body, /S02/)
})

test('choice, true-or-false and matching items keep their keyed answer and reason', () => {
  const whole = pack(), contents = ['Lesson 2: Concepts', 'A. Alpha', 'B. Beta', 'C. Gamma']
  const mixed = assessmentContent(whole.sheets.get(2)!, whole.keys.get(2)!, contents, { code: 'SAMPLE 101' })
  assert.equal(mixed.questions.length, 5)
  assert.deepEqual(mixed.questions.map(question => [question.type, question.correctIndex]), [['multiple_choice', 1], ['multiple_choice', 1], ['multiple_choice', 3], ['true_false', 0], ['true_false', 1]])
  assert.deepEqual(mixed.questions[0]!.options, ['Beta', 'Alpha', 'Gamma', 'Delta'].map((text, index) => ({ label: String.fromCharCode(65 + index), text })))
  assert.deepEqual(mixed.questions.map(question => question.topic), ['A. Alpha', 'B. Beta', 'C. Gamma', 'A. Alpha', 'B. Beta'])
  assert.equal(mixed.questions[0]!.explanation.startsWith('Alpha. Alpha is the first sample concept'), true)
  assert.equal(mixed.totalPoints, 5)
  const matching = assessmentContent(whole.sheets.get(3)!, whole.keys.get(3)!, ['Lesson 2: Concepts', 'D. Device management'], { code: 'SAMPLE 101' })
  assert.deepEqual(matching.questions.slice(0, 3).map(question => [question.type, question.correctIndex]), [['multiple_choice', 0], ['multiple_choice', 2], ['multiple_choice', 1]])
  assert.match(matching.questions[0]!.text, /^Match the concept: Drivers translate/)
  assert.equal(matching.questions[0]!.topic, 'D. Device management')
})

test('a written part worth several points becomes one written question for each marking point', () => {
  const whole = pack()
  const applied = assessmentContent(whole.sheets.get(3)!, whole.keys.get(3)!, ['Lesson 2: Concepts'], { code: 'SAMPLE 101' }), written = applied.questions.filter(question => question.type === 'short_answer')
  assert.equal(written.length, 5)
  assert.match(written[0]!.text, /^Case: Using the following case/)
  assert.match(written[1]!.text, /^Step 2 of 5 \(same case as question 4\): List two checks\.$/)
  assert.equal(written.every(question => question.responseFormat === 'follow_along' && question.options.length === 0), true)
  assert.equal(applied.totalPoints, 8)
  const rubric = assessmentContent(whole.sheets.get(1)!, whole.keys.get(1)!, ['Class orientation'], { code: 'SAMPLE 101' })
  assert.equal(rubric.questions.length, 5)
  assert.match(rubric.questions[0]!.text, /^Case: A team compares two sample devices/)
  assert.match(rubric.questions[3]!.text, /^Part 4 of 5 \(same case as question 1\): Explain one compatibility risk/)
  assert.match(rubric.questions[0]!.explanation, /^Marking: 2 points per criterion in the printed rubric, recorded here as one mark each\./)
})

test('a key that does not match its assessment is refused instead of guessed', () => {
  const whole = pack(), sheet = whole.sheets.get(2)!, key = structuredClone(whole.keys.get(2)!)
  key.parts[0]!.entries.pop()
  assert.throws(() => assessmentContent(sheet, key, [], { code: 'SAMPLE 101' }), /2 answers for 3 questions/)
  const swapped = structuredClone(whole.keys.get(2)!); swapped.parts.reverse()
  assert.throws(() => assessmentContent(sheet, swapped, [], { code: 'SAMPLE 101' }), /key does not match/)
  const letter = structuredClone(whole.keys.get(2)!); letter.parts[0]!.entries[0]!.answer = 'F'
  assert.throws(() => assessmentContent(sheet, letter, [], { code: 'SAMPLE 101' }), /not one of the options/)
  const criteria = structuredClone(whole.keys.get(1)!); criteria.parts[0]!.criteria[0] = 'Something else entirely.'
  assert.throws(() => assessmentContent(whole.sheets.get(1)!, criteria, [], { code: 'SAMPLE 101' }), /different criteria/)
})

test('topics match a concept to a listed content line, else the fallback', () => {
  const contents = ['Lesson 2: Operating System', 'A. Operating System Overview', 'C. Concurrency', 'H. File Systems']
  assert.equal(topicFor('Concurrency', contents), 'C. Concurrency')
  assert.equal(topicFor('File systems', contents), 'H. File Systems')
  assert.equal(topicFor('Race condition', contents), 'Lesson 2: Operating System')
  assert.equal(topicFor('Race condition', contents, ''), '')
})

test('the plan adds each week as drafts on the matching topic and leaves everything else as it was', () => {
  const input = { owner, workspace: sampleWorkspace() }, plan = coursewarePackPlan(input, pack(), { code: 'SAMPLE 101' }, { now: when })
  assert.deepEqual(plan.summary, { courseCode: 'SAMPLE 101', syllabusId: 'syllabus-sample', syllabusStatus: 'drafted', weeks: 4, addedMaterials: 4, addedAssessments: 4, addedQuestions: 5 + 5 + 8 + 2, preservedItems: 0, examWeeks: [4] })
  assert.equal(plan.expectedRevision, 7)
  const content = plan.data.content, week1 = content['pack-mat-syllabus-sample-w1']!, quiz = content['pack-assess-syllabus-sample-w2']!
  assert.equal(week1.status, 'draft')
  assert.equal(week1.week, 1)
  assert.equal(week1.content.courseTopicId, 's-lesson-1', 'week 1 has two sections; the lesson heading picks the right one')
  assert.equal(quiz.content.outlineSectionId, 's-lesson-2')
  assert.deepEqual(quiz.content.coverage, { materialIds: ['pack-mat-syllabus-sample-w2'] })
  assert.equal(quiz.content.overallAssessment, false)
  assert.equal(content['pack-mat-syllabus-sample-w3']!.content.courseTopicId, 's-lesson-2', 'weeks that share a section share its topic')
  const exam = content['pack-assess-syllabus-sample-w4']!
  assert.equal(exam.content.outlineSectionId, 'practice-week-4', 'practice content in an examination week stays outside the examination topic')
  assert.deepEqual((exam.content.questions as { topic: string }[]).map(question => question.topic), ['A. Alpha', 'D. Device management'], 'practice questions map to the lesson that names their concept')
  assert.equal(content['pack-mat-syllabus-sample-w1']!.provenance && (content['pack-mat-syllabus-sample-w1']!.provenance as { reviewRequired: boolean }).reviewRequired, true)
  // The approved syllabus, the roster and every enrollment record are exactly as they were.
  assert.deepEqual(plan.data.syllabi, input.workspace.data.syllabi)
  assert.deepEqual(plan.data.registrations, input.workspace.data.registrations)
  assert.equal(Object.values(content).every(item => item.status === 'draft'), true)
  assert.equal(input.workspace.data.content && Object.keys(input.workspace.data.content).length, 0, 'the input was not modified')
})

test('running the plan again changes nothing, and an existing item always wins', () => {
  const first = coursewarePackPlan({ owner, workspace: sampleWorkspace() }, pack(), { code: 'SAMPLE 101' }, { now: when })
  const again = coursewarePackPlan({ owner, workspace: { revision: 8, data: first.data } }, pack(), { code: 'SAMPLE 101' }, { now: when })
  assert.equal(again.unchanged, true)
  assert.equal(again.summary.addedMaterials + again.summary.addedAssessments, 0)
  assert.equal(again.summary.preservedItems, 8)
  const edited = sampleWorkspace()
  edited.data.content['my-own-lesson'] = { syllabusId: 'syllabus-sample', week: 2, type: 'material', status: 'published', content: { title: 'My own lesson' } }
  const plan = coursewarePackPlan({ owner, workspace: edited }, pack(), { code: 'SAMPLE 101' }, { now: when })
  assert.equal(plan.summary.addedMaterials, 3, 'week 2 already has a material of its own')
  assert.equal(plan.summary.preservedItems, 1)
  assert.equal(plan.data.content['my-own-lesson']!.status, 'published')
  assert.equal(plan.data.content['pack-mat-syllabus-sample-w2'], undefined)
})

test('the plan needs exactly one matching syllabus, an instructor and a pack that fits the outline', () => {
  assert.throws(() => coursewarePackPlan({ owner: { ...owner, role: 'dean' }, workspace: sampleWorkspace() }, pack(), { code: 'SAMPLE 101' }), /instructor workspace/)
  assert.throws(() => coursewarePackPlan({ owner, workspace: sampleWorkspace() }, pack(), { code: 'OTHER 202' }), /Exactly one existing OTHER 202 syllabus/)
  const twice = sampleWorkspace(); twice.data.syllabi.push({ ...structuredClone(twice.data.syllabi[0]!), id: 'syllabus-two' })
  assert.throws(() => coursewarePackPlan({ owner, workspace: twice }, pack(), { code: 'SAMPLE 101' }), /Exactly one existing SAMPLE 101 syllabus/)
  const short = sampleWorkspace(); short.data.syllabi[0]!.courseOutline = short.data.syllabi[0]!.courseOutline.filter(row => row.week !== 4)
  assert.throws(() => coursewarePackPlan({ owner, workspace: short }, pack(), { code: 'SAMPLE 101' }), /Week 4 of the pack is not in the SAMPLE 101 outline/)
  const missing = sampleWorkspace(); missing.data.syllabi[0]!.courseOutline.push({ week: 5, ilos: 'More.', contents: ['Lesson 5'] })
  assert.throws(() => coursewarePackPlan({ owner, workspace: missing }, pack(), { code: 'SAMPLE 101' }), /Week 5 of the SAMPLE 101 outline has no pack content/)
  const archived = sampleWorkspace(); archived.data.syllabi[0]!.status = 'archived'
  assert.throws(() => coursewarePackPlan({ owner, workspace: archived }, pack(), { code: 'SAMPLE 101' }), /Exactly one existing/)
})

// The owner's own packs live outside the repository. When they are present, every week of the IT 204 pack must read cleanly.
const official = process.env.EDUPULSE_COURSEWARES || 'C:/Users/Benny/OneDrive/Documents/EduPulse/Coursewares/IT204_Complete_Weekly_Teaching_Assessment_Package'
test('the IT 204 pack on this machine reads in full', { skip: !existsSync(official) }, async () => {
  const whole = readPack(await readPackFolder(official))
  assert.equal(whole.materials.size, 18)
  assert.equal(whole.sources.length, 11)
  let questions = 0
  for (const week of whole.materials.keys()) {
    const content = assessmentContent(whole.sheets.get(week)!, whole.keys.get(week)!, ['Lesson'], { code: 'IT 204' })
    assert.ok(content.questions.length === 5 || content.questions.length === 10, `week ${week} has ${content.questions.length} questions`)
    assert.ok(content.questions.every(question => question.text.trim() && question.explanation.trim()), `week ${week} has an empty question or reason`)
    for (const question of content.questions) if (question.type !== 'short_answer') assert.ok(Number.isInteger(question.correctIndex) && question.correctIndex! < question.options.length)
    questions += content.questions.length
    assert.ok(materialContent(whole.materials.get(week)!, whole.sources, { code: 'IT 204' }).sections.length >= 9)
  }
  assert.equal(questions, 145)
})
