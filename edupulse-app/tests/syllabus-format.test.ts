import { readInstitutionalContext } from '../src/utils/pdfTableLayout.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { parseSyllabusFile, parseSyllabusText } from '../src/utils/syllabusParser.js'
import { retainApprovedFile } from '../src/utils/syllabusFiles.js'
import { makePdf, makeRuledSyllabusPdf } from './fixtures.js'

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

test('ruled PDF cells preserve wrapped lines, page continuations and explicit shared week ranges', async () => {
  const parsed=await parseSyllabusFile(new File([new Uint8Array(makeRuledSyllabusPdf())],'sample-syllabus.pdf'))
  const rows=parsed.sections[4].parsed.courseOutline
  assert.equal(parsed.courseMatch?.code,'IT 102')
  assert.deepEqual(rows.map(row=>row.week),[1,2,3,4])
  assert.match(rows[0]!.ilos,/their role in a program.*Trace a complete example/)
  assert.ok(rows[0]!.contents.includes('a. Variable declaration and assignment'))
  assert.match(rows[1]!.ilos,/nested conditions using a trace table/)
  assert.ok(rows[1]!.contents.includes('b. Nested conditions and complete examples'))
  assert.deepEqual(rows[2]!.contents,rows[3]!.contents)
  assert.deepEqual(parsed.provenance?.find(row=>row.weeks[0]===2)?.pages,[1,2])
})

test('institutional columns retain the college mission continuation without mixing objectives into it',()=>{
  const item=(x:number,y:number,str:string)=>({str,width:str.length*4,transform:[1,0,0,1,x,y]})
  const extracted=readInstitutionalContext([
    {number:1,edges:[[40,100,40.5,200],[300,100,300.5,200],[600,100,600.5,200]],items:[item(50,190,'Mission'),item(310,190,'Objectives'),item(50,175,'Develop computing professionals through'),item(50,160,'active participation and'),item(310,175,'1. Build responsible systems.'),item(310,160,'2. Work collaboratively.')]},
    {number:2,edges:[[40,400,40.5,450],[300,400,300.5,450],[600,400,600.5,450]],items:[item(50,435,'community involvement.'),item(310,435,'3. Share computing knowledge.'),item(40,370,'IV. PROGRAM OUTCOMES')]},
  ])
  assert.equal(extracted?.cit.mission,'Develop computing professionals through active participation and community involvement.')
  assert.deepEqual(extracted?.cit.objectives,['Build responsible systems.','Work collaboratively.','Share computing knowledge.'])
  assert.equal(extracted?.kcp.mission,'')
})
