import test from 'node:test'
import assert from 'node:assert/strict'
import { instructorCourses, instructorRecords, moveTeachingWeek, weekTopics, topicEntries, assessmentCoverage, topicProgress, syllabusForCourse } from '../src/utils/instructorCourses.js'
import { contentGenerationRequest, navigationCorrection, sourceDestination } from '../src/lib/systemChatPolicy.js'
import { operatorInput, planValidatedTool } from '../src/agents/toolPlanner.js'
import type { AcademicData } from '../src/components/academic/academicData.js'

const records = (): AcademicData => ({ courses: [{ id: 'course', course_code: 'IT 102', course_title: 'Programming', instructor_id: 'teacher', active: true }], publications: [], enrollments: [], accesses: [], attempts: [], institutional: [
  { kind: 'courses', record_key: 'IT 102', data: { CourseCode: 'IT 102', CourseTitle: 'Programming', Units: '3', YearLevel: '1' } },
  ...['A', 'B'].map(block => ({ kind: 'loads', record_key: block, data: { CourseCode: 'IT 102', Block: block, InstructorID: 'teacher', Semester: '1' } })),
  { kind: 'loads', record_key: 'other', data: { CourseCode: 'IT 201', InstructorID: 'other' } },
  { kind: 'loads', record_key: 'inactive', data: { CourseCode: 'IT 202', InstructorID: 'teacher', Status: 'suspended' } },
] })

test('instructor courses require exact current Dean load IDs and include a course without a syllabus', () => {
  const data = records(), courses = instructorCourses(data, 'teacher')
  assert.equal(courses.length, 1); assert.equal(courses[0].title, 'Programming'); assert.deepEqual(courses[0].blocks, ['A', 'B']); assert.deepEqual(courses[0].courseIds, ['course'])
  assert.deepEqual(instructorCourses(data, 'teacher-name'), [])
  data.courses = []; assert.equal(instructorCourses(data, 'teacher').length, 1)
  data.institutional = []; assert.deepEqual(instructorCourses(data, 'teacher'), [])
})

test('moving teaching weeks keeps chronological exam slots and stable shared section IDs, protects delivery and unrelated content', () => {
  const outline = [1, 2, 3].map(week => ({ week, ilos: `Outcome ${week}`, contents: [`Topic ${week}`], activities: 'Discuss', assessments: 'Quiz' }))
  outline.push({ week: 9, ilos: '', contents: [], activities: '', assessments: 'Midterm Examination' })
  const content = { a: { syllabusId: 's', week: 1, status: 'published' }, b: { syllabusId: 's', week: 2, status: 'checked' }, other: { syllabusId: 'x', week: 1, status: 'published' } }
  const before = JSON.stringify({ outline, content }), result = moveTeachingWeek(outline, content, 's', 1, 3)
  assert.deepEqual(result.outline.map(row => row.week), [1, 2, 3, 9]); assert.equal(result.outline[0].contents?.[0], 'Topic 2')
  assert.equal(weekTopics(result.outline[2])[0].id, weekTopics(outline[0])[0].id)
  assert.equal(result.content.a.week, 3); assert.equal(result.content.a.status, 'draft'); assert.equal(result.content.b.status, 'draft'); assert.equal(result.content.other, content.other)
  assert.equal(JSON.stringify({ outline, content }), before); assert.throws(() => moveTeachingWeek(outline, content, 's', 1, 9))
})

test('topic assessment coverage stops at the previous assessment and overall coverage includes every material', () => {
  const entry = (id: string, type: string, position: number, overall = false) => ({ id, type, position, content: { courseTopicId: 'topic', overallAssessment: overall } })
  const ordered = topicEntries([entry('final', 'assessment', 1e9, true), entry('b', 'material', 2), entry('q', 'assessment', 3), entry('a', 'material', 1), entry('c', 'material', 4)], 'topic', false)
  assert.deepEqual(ordered.map(row => row.id), ['a', 'b', 'q', 'c', 'final'])
  assert.deepEqual(assessmentCoverage(ordered, 'q'), ['a', 'b']); assert.deepEqual(assessmentCoverage(ordered, 'final'), ['c']); assert.deepEqual(assessmentCoverage(ordered, 'final', true), ['a', 'b', 'c'])
  assert.deepEqual(topicEntries(ordered, 'unrelated', false), [])
})

test('topic pills use real current enrolled learner work, include a genuine zero and do not invent missing scores', () => {
  const data = records()
  data.enrollments = [{ course_id: 'course', block_section: 'A', student_email: 'learner@example.invalid' }, { course_id: 'course', student_email: 'suspended@example.invalid', suspended: true }]
  data.publications = [{ id: 'material', course_id: 'course', week: 1, type: 'material', active: true, title: 'Material', source_version: 'v1', content: { courseItemId: 'm' } }, { id: 'quiz', course_id: 'course', week: 1, type: 'assessment', active: true, title: 'Quiz', source_version: 'v1', content: { courseItemId: 'q' } }]
  data.accesses = [{ publication_id: 'material', student_email: 'learner@example.invalid', first_opened_at: '2026-11-01' }, { publication_id: 'material', student_email: 'suspended@example.invalid', first_opened_at: '2026-11-01' }]
  data.attempts = ['learner', 'suspended', 'outsider'].map(name => ({ publication_id: 'quiz', source_version: 'v1', student_email: `${name}@example.invalid`, submitted_at: '2026-11-01', score: name === 'learner' ? 0 : 3, max_score: 3 }))
  const scoped = instructorRecords(data, instructorCourses(data, 'teacher'))
  assert.equal(scoped.attempts.length, 1)
  const entries = [{ id: 'm', type: 'material', week: 1, content: { title: 'Material' } }, { id: 'q', type: 'assessment', week: 1, content: { title: 'Quiz' } }]
  assert.deepEqual(topicProgress(scoped, entries), { access: 100, opened: 1, expected: 1, average: 0, scored: 1 })
  scoped.attempts[0].is_test = true; assert.equal(topicProgress(scoped, entries).average, null)
  scoped.publications[0].release_at = '2099-01-01'; assert.equal(topicProgress(scoped, entries).access, null)
})

test('normal questions and navigation cannot invoke authoring; typos suggest a destination without correcting IDs', async () => {
  for (const text of ['hello', 'Where is the syllabus?', 'explain my progress', 'open dashbaord', 'How do I generate a lesson?']) assert.equal(contentGenerationRequest(text), false)
  for (const text of ['Generate a lesson on loops', 'Write assessment questions', 'Gumawa ng lesson']) assert.equal(contentGenerationRequest(text), true)
  assert.equal(navigationCorrection('open dashbaord'), 'open dashboard'); assert.equal(navigationCorrection('IT 102'), null)
  for (const path of ['https://evil.invalid', '//evil.invalid', '/courseware\\evil', '/unknown']) assert.equal(sourceDestination({ path }), null)
  assert.equal(sourceDestination({ path: '/courseware?course=course', label: 'Open course' })?.path, '/courseware?course=course')
  const result = await planValidatedTool(operatorInput.parse({ operation: 'plan', message: 'Open dashboard', viewRole: 'instructor' }), { id: 'teacher', role: 'instructor', local: false }, AbortSignal.timeout(1000), async () => { throw new Error('Navigation must not invoke a model') })
  assert.equal(result.generated, false)
})

test('current teaching-load blocks and syllabus offering exclude unrelated enrollments and old-term projections', () => {
  const data = records(); data.courses[0].syllabus_id = 'old'; data.courses.push({ ...data.courses[0], id: 'new', syllabus_id: 'new' })
  const syllabi = [{ id: 'old', courseInfo: { academicYear: '2025-2026', periodOffered: '2nd Semester' } }, { id: 'new', courseInfo: { academicYear: '2026-2027', periodOffered: '1st Semester' } }]
  const loaded = instructorCourses(data, 'teacher', syllabi); assert.deepEqual(loaded[0].courseIds, ['new'])
  data.enrollments = ['A','B','C'].map(block => ({ course_id:'new',block_section:block,student_email:`${block}@example.invalid` }))
  assert.equal(instructorRecords(data, loaded).enrollments.length, 2)
})

test('moving a partially generated week fails without stranding its saved paid parts', () => {
 const outline=[1,2].map(week=>({week,ilos:'Explain',contents:['Topic']})), content={checkpoint:{syllabusId:'s',week:1,status:'draft',generationCheckpoint:{parts:['saved']}}}
 const original=JSON.stringify(content)
 assert.throws(()=>moveTeachingWeek(outline,content,'s',1,2),/saved generation progress/)
 assert.equal(JSON.stringify(content),original)
})

test('uploaded course identity tolerates code whitespace without creating an unassigned course',()=>{
 const data=records();data.courses[0].course_code='IT102'
 const loaded=instructorCourses(data,'teacher');assert.deepEqual(loaded[0].courseIds,['course'])
 assert.equal(syllabusForCourse([{id:'uploaded',courseCode:'IT102',status:'active'}],loaded[0])?.id,'uploaded')
 assert.equal(syllabusForCourse([{id:'wrong',courseCode:'IT103',status:'active'}],loaded[0]),undefined)
})
