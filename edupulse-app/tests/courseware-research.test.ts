import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCourseInput } from '../src/utils/courseInput.js'
import { courseInput } from '../server/contracts.js'

test('courseware input reads only course sources unless the request asks for the public web (T9.1, R-C3)', () => {
  const syllabus = { courseCode: 'IT 102', courseTitle: 'Programming', courseOutline: [{ week: 1, ilos: 'Explain variables.', contents: ['Variables'] }] }
  for (const request of ['Generate week 1 materials without web research', 'Generate week 1 materials only from the syllabus', 'Generate week 1 materials; do not use external sources']) assert.equal(buildCourseInput(syllabus, 1, request).research, 'sources', request)
  assert.equal(buildCourseInput(syllabus, 1).research, 'sources', 'no request means course references and files only')
  assert.equal(buildCourseInput(syllabus, 1, 'Add two worked examples about variables').research, 'sources', 'a teaching instruction is not a web request')
  assert.equal(buildCourseInput(syllabus, 1, 'Search the internet for current examples of variables').research, 'auto')
  assert.equal(buildCourseInput(syllabus, 1, 'Generate week 1 materials using web research').research, 'auto')
})

test('courseware input retains the current teaching instruction through API validation', () => {
  const syllabus = { courseCode: 'IT 102', courseTitle: 'Programming', courseOutline: [{ week: 1, ilos: 'Explain variables.', contents: ['Variables'] }] }
  const request = 'Generate week 1 materials in Filipino with two worked examples, without web research'
  const input = courseInput.parse(buildCourseInput(syllabus, 1, request))
  assert.equal(input.request, request)
  assert.equal(input.research, 'sources')
  assert.equal(courseInput.parse(buildCourseInput(syllabus, 1)).request, '')
  assert.equal(courseInput.safeParse({ ...input, request: 'x'.repeat(4001) }).success, false)
})
