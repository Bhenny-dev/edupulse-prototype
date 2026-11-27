import test from 'node:test'
import assert from 'node:assert/strict'
import { instructorCourses, instructorRecords, moveTeachingWeek, weekTopics, topicEntries, assessmentCoverage, topicProgress, syllabusForCourse, approvedSyllabusForCourse } from '../src/utils/instructorCourses.js'
import { contentGenerationRequest, navigationCorrection, sourceDestination } from '../src/lib/systemChatPolicy.js'
import { operatorInput, planValidatedTool } from '../src/agents/toolPlanner.js'
import type { AcademicData } from '../src/components/academic/academicData.js'
import { classTeachingPlan } from '../src/utils/classTeachingPlan.js'
import { classStreamWeekOrder } from '../src/utils/classStreamOrder.js'

const records = (): AcademicData => ({ courses: [{ id: 'course', course_code: 'IT 102', course_title: 'Programming', instructor_id: 'teacher', active: true }], publications: [], enrollments: [], accesses: [], attempts: [], institutional: [
  { kind: 'courses', record_key: 'IT 102', data: { CourseCode: 'IT 102', CourseTitle: 'Programming', Units: '3', YearLevel: '1' } },
  ...['A', 'B'].map(block => ({ kind: 'loads', record_key: block, data: { CourseCode: 'IT 102', Block: block, InstructorID: 'teacher', Semester: '1' } })),
  { kind: 'loads', record_key: 'other', data: { CourseCode: 'IT 201', InstructorID: 'other' } },
  { kind: 'loads', record_key: 'inactive', data: { CourseCode: 'IT 202', InstructorID: 'teacher', Status: 'suspended' } },
] })

test('course teaching selects an attested approved copy independently of repository drafts',()=>{
 const [course]=instructorCourses(records(),'teacher')
 const approved={id:'approved',courseCode:'IT 102',status:'approved_uploaded',approvedFile:{approvalAttested:true}}
 const draft={...approved,id:'draft',status:'drafted',lastUpdated:'2026-11-25'}
 assert.equal(approvedSyllabusForCourse([draft,approved],course)?.id,'approved')
 assert.equal(approvedSyllabusForCourse([draft],course),undefined)
 assert.equal(approvedSyllabusForCourse([{...approved,approvedFile:{approvalAttested:false}}],course),undefined)
 assert.equal(approvedSyllabusForCourse([{...approved,suspended:true}],course),undefined)
 assert.equal(approvedSyllabusForCourse([{...approved,courseCode:'OTHER'}],course),undefined)
})

test('independent inherited bases keep same-course blocks, contents and reload IDs separate',()=>{
 const data=records()
 data.courses=[{...data.courses[0],syllabus_id:'original'},{...data.courses[0],id:'continued-projection',syllabus_id:'continued'}]
 data.institutional!.find(r=>r.record_key==='B')!.data.TeachingSyllabusID='continued'
 const syllabi=[{id:'original',courseCode:'IT 102',status:'active',courseInfo:{}},{id:'continued',courseCode:'IT 102',status:'active',courseInfo:{},handedOverFrom:{instructorId:'former'}}]
 const cards=instructorCourses(data,'teacher',syllabi)
 assert.equal(cards.length,2)
 const own=cards.find(c=>!c.syllabusId)!,continued=cards.find(c=>c.syllabusId==='continued')!
 assert.deepEqual(own.blocks,['A']);assert.deepEqual(own.courseIds,['course'])
 assert.deepEqual(continued.blocks,['B']);assert.deepEqual(continued.courseIds,['continued-projection'])
 assert.equal(syllabusForCourse(syllabi,continued)?.id,'continued');assert.equal(syllabusForCourse(syllabi,own)?.id,'original')
 assert.equal(instructorCourses(data,'teacher',syllabi).find(c=>c.syllabusId==='continued')?.id,continued.id)
})

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

test('legacy publication IDs never move a concept check or reflection ahead of its reading', () => {
  const entries = [
    { id: '0-reflection', type: 'assessment', content: { assessmentRole: 'reflection', coverage: { materialIds: ['reading'] } } },
    { id: '1-check', type: 'assessment', content: { coverage: { materialIds: ['reading', 'example'] } } },
    { id: '8-reading', type: 'material', workspace_item_id: 'reading', content: {} },
    { id: '9-example', type: 'material', content: { courseItemId: 'example', teachingOrder: 3072 } },
  ]
  const sequence = topicEntries(entries, 'legacy', true)
  assert.deepEqual(sequence.map(row => row.id), ['8-reading', '9-example', '1-check', '0-reflection'])
  assert.equal(entries[0].id, '0-reflection')
})

test('instructor tabs share workspace topics and order, with only confirmed publications in Stream', () => {
  const data = records(), syllabus = { id: 's', courseOutline: [{ week: 1, contents: ['Current topic'] }] }
  data.courses[0] = { ...data.courses[0], syllabus_id: 's', outline: [{ week: 1, contents: ['Older title'] }] }
  const item = (title: string, position: number, type = 'material', status = 'published') => ({ syllabusId: 's', week: 1, type, status, position, content: { title } })
  const saved = { lesson: item('Reading', 1), example: item('Worked example', 2), quiz: item('Concept check', 3, 'assessment'), draft: item('Draft', 4, 'material', 'draft'), hidden: item('Hidden lesson', 5, 'material', 'hidden') }
  data.publications = Object.entries(saved).map(([id, entry], index) => ({
    id: String(9 - index), active: true, course_id: 'course', type: entry.type, title: entry.content.title, week: 1, source_version: '1',
    workspace_item_id: id, content: { courseTopicId: 'obsolete-id', teachingOrder: 9 - index },
  }))
  const [{ groups }] = classTeachingPlan(syllabus, saved, data).weeks
  const [group] = groups
  assert.equal(group.topic.title, 'Current topic')
  assert.deepEqual(group.entries.map(entry => entry.content.title), ['Reading', 'Worked example', 'Draft', 'Hidden lesson', 'Concept check'])
  assert.deepEqual(group.entries.flatMap(entry => entry.publication?.title || []), ['Reading', 'Worked example', 'Concept check'])
  assert.equal(classTeachingPlan(syllabus, saved, { ...data, publications: [] }).hasDeliveries, false)
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

test('Stream prioritizes the latest opened block week, then upcoming dates and unplaced weeks', () => {
  const data = records()
  const now = Date.parse('2026-11-27T04:00:00Z')
  const course = { block: 'A', semester: '1st Semester', academicYear: '2026-2027', slots: { A: [{ days: 'M', time: '8:00 AM - 10:00 AM' }] } }
  const syllabus = { id: 'approved' }
  const weeks = [1, 2, 3, 4, 5, 9].map(week => ({ week, entries: [] }))
  data.institutional!.push({ kind: 'term_calendar', record_key: '1st Semester|2026-2027', data: { ClassesStart: '2026-11-02', Weeks: '18' } })
  assert.deepEqual(classStreamWeekOrder({ weeks, posts: [], data, course, syllabus, now }), [4, 3, 2, 1, 5, 9])
  data.deliverySchedules = [
    { course_id: 'course', syllabus_id: syllabus.id, instructor_id: 'teacher', block_section: 'B', revision: 1, updated_at: '', windows: [{ week: 9, opens_at: '2026-11-01T00:00:00Z', closes_at: null }] },
    { course_id: 'course', syllabus_id: syllabus.id, instructor_id: 'teacher', block_section: 'A', revision: 1, updated_at: '', windows: [
      { week: 3, opens_at: '2026-11-20T00:00:00Z', closes_at: '2026-11-20T02:00:00Z' },
      { week: 4, opens_at: '2026-12-01T00:00:00Z', closes_at: null },
    ] },
  ]
  assert.deepEqual(classStreamWeekOrder({ weeks, posts: [{ week: 1 }], data, course, syllabus, now }), [3, 1, 4, 2, 5, 9])
})

test('Stream can prioritize released work when a legacy class has no calendar', () => {
  const data = records()
  const course = { block: 'A', semester: '1st Semester', academicYear: '2026-2027' }
  const weeks = [
    { week: 1, entries: [{ publication: {} }] },
    { week: 2, entries: [{ publication: { release_at: '2026-11-21T00:00:00Z' } }] },
    { week: 3, entries: [{ publication: { release_at: '2026-12-01T00:00:00Z' } }] },
    { week: 4, entries: [{ publication: { delivery_mode: 'block_schedule' } }] },
    { week: 9, entries: [] },
  ]
  assert.deepEqual(classStreamWeekOrder({ weeks, posts: [], data, course, syllabus: { id: 'approved' }, now: Date.parse('2026-11-27T04:00:00Z') }), [2, 1, 3, 4, 9])
})
