import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { parseSyllabusFile, parseSyllabusText } from '../src/utils/syllabusParser.js'
import { retainApprovedFile } from '../src/utils/syllabusFiles.js'
import { makePdf } from './fixtures.js'

test('PDF text with numbered headings, paired fields and outline columns retains the course and week', () => {
  const parsed = parseSyllabusText('I. Course Information\nCourse Code: IT 102\tCourse Title: Computer Programming 1\nV. Course Outline\nWeek\tLearning Outcomes\tContents\tActivities\tAssessment\n1\tExplain variables\tVariables and assignment\tTrace values\tShort quiz\n2-3\tReview arrays\tArrays\tLab\tQuiz')
  assert.equal(parsed.courseMatch?.code, 'IT 102')
  assert.equal(parsed.sections[0].parsed.courseTitle, 'Computer Programming 1')
  assert.equal(parsed.sections[4].parsed.courseOutline.length, 1, 'ambiguous week ranges are never invented')
  assert.deepEqual(parsed.sections[4].parsed.courseOutline[0].contents, ['Variables and assignment'])
  assert.equal(parsed.sections[4].parsed.courseOutline[0].activities, 'Trace values')
})

test('PDF import reads a real text-layer file and approved retention preserves its bytes and checksum', async () => {
  const bytes = makePdf([['Section 1: Course Information', 'Course Code: IT 102', 'Section 5: Course Outline', 'Week 1', 'ILOs: Explain variables', 'Topics: Variables and assignment']])
  const file = new File([new Uint8Array(bytes)], 'approved-syllabus.pdf', { type: 'application/pdf' })
  const parsed = await parseSyllabusFile(file)
  assert.equal(parsed.courseMatch?.code, 'IT 102')
  assert.deepEqual(parsed.sections[4].parsed.courseOutline[0].contents, ['Variables and assignment'])
  const retained = await retainApprovedFile(file)
  assert.equal(retained.sha256, createHash('sha256').update(bytes).digest('hex'))
  assert.deepEqual(Buffer.from(retained.base64, 'base64'), Buffer.from(bytes))
  await assert.rejects(retainApprovedFile(new File(['not a PDF'], 'wrong.pdf')), /does not match/)
})
