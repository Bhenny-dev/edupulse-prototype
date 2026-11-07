import test from 'node:test'
import assert from 'node:assert/strict'
import { planCourseSeed, IT_PROGRAM, units, teachingDraft, programmingOutline } from '../scripts/lib/it-course-seed.mjs'
import { courseOutput } from '../server/contracts.js'
import { teachingContentIssues } from '../src/lib/rag/courseware.js'
import { buildCourseInput } from '../src/utils/courseInput.js'

const now = '2026-11-06T08:00:00.000Z'
const student = (n: number, year = 1) => ({ student_number: `SYN-${year}-${n}`, email: `syn-${year}-${n}@gmail.com`, full_name: `Synthetic learner ${n}`, year_level: year, department: 'College of Information Technology', program: IT_PROGRAM })
const input = () => ({ owner: { id: 'synthetic-instructor', role: 'instructor' }, workspace: { revision: 4, data: { syllabi: [{ id: 'programming', courseCode: 'IT 102', courseTitle: 'Computer Programming 1', status: 'downloaded_for_approval', courseOutline: [{ week: 1, contents: ['test'], ilos: 'test' }], courseInfo: { academicYear: '2026-2027' } }, { id: 'networking', courseCode: 'IT 202', courseTitle: 'Fundamentals of Networking', status: 'active', approvedFile: { name: 'synthetic-existing.pdf', approvalAttested: true }, courseOutline: programmingOutline() }], content: { original: { syllabusId: 'networking', week: 2, type: 'material', status: 'draft', content: { title: 'Existing instructor work', sections: [{ body: 'Keep this exactly.' }] } } }, registrations: [] } }, students: [...Array.from({ length: 71 }, (_, i) => student(i)), ...Array.from({ length: 36 }, (_, i) => student(i, 2)), { ...student(99), department: 'Other college' }, { ...student(100), program: 'Other program' }, student(101, 3)], activity: { attempts: 12, accesses: 20 } })

test('course seed matches official program/year and splits real rosters at 35 without creating results', () => {
  const source = input(), before = structuredClone(source)
  const result = planCourseSeed(source, { now, networkingYear: 2 })
  assert.deepEqual(source, before)
  assert.equal(result.summary.addedEnrollments, 107)
  assert.equal(result.summary.addedRosters, 5)
  assert.deepEqual(result.data.registrations.map((r: any) => r.students.length), [35, 35, 1, 35, 1])
  assert.equal(result.summary.writesStudentActivity, false)
  assert.equal('attempts' in result.data, false)
  assert.equal('accesses' in result.data, false)
  for (const row of result.data.registrations) for (const s of row.students || []) assert.equal(s.YearLevel, row.courseCode === 'IT 102' ? '1' : '2')
})
test('seed preserves approved Networking, existing content and prior Programming version', () => {
  const source = input(), result = planCourseSeed(source, { now })
  assert.deepEqual(result.data.syllabi[1], source.workspace.data.syllabi[1])
  assert.deepEqual(result.data.content.original, source.workspace.data.content.original)
  assert.equal(result.data.syllabi[0].status, 'drafted')
  assert.equal(result.data.syllabi[0].versions[0].courseOutline[0].contents[0], 'test')
  assert.equal(result.data.syllabi[0].courseOutline.length, 18)
  assert.deepEqual(result.data.syllabi[0].courseOutline.filter((r: any) => !r.ilos).map((r: any) => r.week), [9, 18])
  assert.equal(Object.values(result.data.content).some((item: any) => ['published', 'checked'].includes(item.status)), false)
})
test('seed reruns make no duplicate rosters, items or syllabus versions', () => {
  const first = planCourseSeed(input(), { now })
  const again = planCourseSeed({ ...input(), workspace: { revision: 5, data: first.data } }, { now: '2026-11-07T08:00:00.000Z' })
  assert.equal(again.unchanged, true)
  assert.equal(again.summary.addedEnrollments, 0)
  assert.equal(again.summary.addedItems, 0)
  assert.equal(again.summary.addedRosters, 0)
})
test('seed refuses ambiguous ownership, identity and approved-syllabus replacement', () => {
  const source = input()
  assert.throws(() => planCourseSeed({ ...source, owner: { ...source.owner, role: 'student' } }), /instructor/)
  const duplicate = input(); duplicate.students.push(duplicate.students[0])
  assert.throws(() => planCourseSeed(duplicate), /Duplicate/)
  const mismatch = input(); mismatch.students[0].email = 'other@example.invalid'
  assert.throws(() => planCourseSeed(mismatch), /identity/)
  const approved = input(); approved.workspace.data.syllabi[0].status = 'active'
  assert.throws(() => planCourseSeed(approved), /approved programming/)
  const ambiguous = input(); ambiguous.workspace.data.syllabi.push({ ...ambiguous.workspace.data.syllabi[0], id: 'other' })
  assert.throws(() => planCourseSeed(ambiguous), /Exactly one/)
})
test('all 31 original weekly packs pass the production courseware schema and minimum teaching-content gate', () => {
  let count = 0
  for (const [code, modules] of Object.entries(units) as [string, any[]][]) for (const unit of modules) {
    const draft = courseOutput.parse(teachingDraft(code, unit))
    assert.deepEqual(teachingContentIssues(draft), [], `${code} week ${unit.week}`)
    assert.equal(draft.assessment.questions.length, 3)
    count++
  }
  assert.equal(count, 31)
  const request = buildCourseInput({ courseCode: 'IT 102', courseTitle: 'Programming', courseOutline: programmingOutline() }, 1)
  assert.equal(request.plan.resources.length, 2)
  assert.ok(request.plan.resources.every((ref: { name: string }) => ref.name.length > 10))
})

test('older seed resource aliases repair once without rewriting teaching content', () => {
  const first = planCourseSeed(input(), { now })
  first.data.syllabi[0].courseOutline[0].resources = first.data.syllabi[0].courseOutline[0].resources.map((ref: { name: string; url: string }) => ({ title: ref.name, url: ref.url }))
  const repaired = planCourseSeed({ ...input(), workspace: { revision: 5, data: first.data } }, { now })
  assert.equal(repaired.summary.repairedReferenceRows, 1)
  assert.deepEqual(repaired.data.content, first.data.content)
  const again = planCourseSeed({ ...input(), workspace: { revision: 6, data: repaired.data } }, { now })
  assert.equal(again.unchanged, true)
})
