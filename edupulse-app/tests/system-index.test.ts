import test from 'node:test'
import assert from 'node:assert/strict'
import { coursePassages, materialPassages, syllabusPassages } from '../server/systemIndex.js'
import { keywordMatch } from '../src/lib/rag/lookup.js'

const destination = { path: '/courseware?view=syllabus&course=s1', label: 'Open syllabus' }
const syllabus = {
  id: 's1', courseCode: 'CIT 101', courseTitle: 'Programming', status: 'approved', courseDescription: 'Introduces programming.',
  programOutcomes: ['Apply programming concepts.', 'Document code.'], gradingSystem: 'Quizzes 40 percent, exams 60 percent.', coursePolicy: ['Late work loses ten percent each day.', 'Academic honesty is required.'],
  approvedFile: { path: 'private/secret-file.pdf' },
  courseOutline: [{ week: 1, ilos: 'Explain variables.', contents: ['Variables'] }, { week: 2, ilos: 'Use repetition.', contents: ['for loops', 'while loops'], activities: 'Lab', assessments: 'Quiz' }, { week: 3 }],
}
const passages = syllabusPassages('syllabus:s1', 'CIT 101 Programming syllabus (approved)', syllabus, destination)
const best = (question: string, among = passages) => among.map(passage => ({ passage, score: keywordMatch(question, `${passage.title}\n${passage.text}`) })).sort((a, b) => b.score - a.score)[0]!.passage

test('a syllabus is indexed by field and by week, each under a breadcrumb title, and never leaks hidden keys', () => {
  assert.deepEqual(passages.map(passage => passage.title), ['CIT 101 Programming syllabus (approved)', 'CIT 101 Programming syllabus (approved) > Program outcomes', 'CIT 101 Programming syllabus (approved) > Grading system', 'CIT 101 Programming syllabus (approved) > Course policies', 'CIT 101 Programming syllabus (approved) > Week 1', 'CIT 101 Programming syllabus (approved) > Week 2'])
  assert.ok(passages.every(passage => !/secret-file|approvedFile/.test(passage.text)))
  assert.deepEqual(passages.map(passage => passage.id).slice(-2), ['syllabus:s1:week-1', 'syllabus:s1:week-2'])
  assert.equal(passages.at(-1)!.destination!.path, '/courseware?view=syllabus&course=s1&week=2')
  assert.equal(passages[3]!.destination!.path, destination.path, 'a field opens the record')
  assert.match(passages.at(-1)!.text, /^Week 2 learning outcomes: Use repetition\.\nWeek 2 contents: for loops; while loops\nWeek 2 activities: Lab\nWeek 2 assessments: Quiz$/)
  assert.match(passages[0]!.text, /Introduces programming/)
  assert.ok(passages.every(passage => passage.origin === 'account'))
})

test('a question finds the passage that holds its answer, not the whole record', () => {
  assert.equal(best('What is the late work policy?').title, 'CIT 101 Programming syllabus (approved) > Course policies')
  assert.equal(best('What are the while loops topics in week 2?').title, 'CIT 101 Programming syllabus (approved) > Week 2')
  assert.equal(best('How are quizzes and exams weighted in grading?').title, 'CIT 101 Programming syllabus (approved) > Grading system')
})

test('a course and a lesson are indexed by week and by section, with the link to the place', () => {
  const course = coursePassages('course:c1', 'CIT 101 Programming', 'CIT 101: Programming. Instructor: Dr. Cruz.', syllabus.courseOutline, { path: '/courseware?course=s1', label: 'Open course' })
  assert.deepEqual(course.map(passage => passage.title), ['CIT 101 Programming', 'CIT 101 Programming > Week 1', 'CIT 101 Programming > Week 2'])
  assert.equal(course[2]!.destination!.path, '/courseware?course=s1&week=2')
  assert.deepEqual(coursePassages('course:c2', 'No weeks', 'No weeks.', undefined).map(passage => passage.title), ['No weeks'])
  const lesson = materialPassages('authored:m1', 'Loops lesson', { title: 'Loops lesson', sections: [{ heading: 'Counting loops', body: 'A for loop repeats a fixed number of times.' }, { heading: 'Conditional loops', body: 'A while loop repeats while a condition holds.' }], examples: ['Print 1 to 10.'] }, { path: '/courseware?item=m1', label: 'Open teaching draft' })
  assert.deepEqual(lesson.map(passage => passage.title), ['Loops lesson', 'Loops lesson > Counting loops', 'Loops lesson > Conditional loops', 'Loops lesson > Examples'])
  assert.equal(lesson[0]!.text, 'Loops lesson')
  assert.equal(best('What is a conditional loop?', lesson).title, 'Loops lesson > Conditional loops')
  assert.equal(best('How does counting work in a loop?', lesson).title, 'Loops lesson > Counting loops')
})
