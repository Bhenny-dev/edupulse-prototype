import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { AcademicData } from '../src/components/academic/academicData'
import { accountInstructorModel, accountManagementModel, accountStudentModel, accountActivity, timeAgo } from '../src/pages/dashboardModels'

const NOW = Date.parse('2026-11-02T12:00:00Z')
const course = (id: string, code: string, extra: Record<string, unknown> = {}) => ({ id, course_code: code, course_title: `${code} title`, active: false, ...extra })
const records = (): AcademicData => ({
  courses: [
    course('c1', 'IT 102', { active: true, syllabus_status: 'active', instructor_id: 'i1', instructor_name: 'Account instructor', outline: [{ week: 1, contents: ['Variables'], ilos: 'Explain' }], block_info: [{ block: 'BSIT-1A', yearLevel: '1', students: 30, adviser: 'Adviser A' }] }),
    course('c2', 'IT 103', { syllabus_status: 'checked', instructor_id: 'i1' }),
    course('c3', 'IT 104'),
  ],
  publications: [
    { id: 'm1', course_id: 'c1', active: true, type: 'material', week: 1, title: 'Variables lesson', source_version: 'v1' },
    { id: 'a1', course_id: 'c1', active: true, type: 'assessment', week: 1, title: 'Variables quiz', source_version: 'v1' },
    { id: 'a2', course_id: 'c1', active: true, type: 'assessment', week: 2, title: 'Functions quiz', source_version: 'v1', due_at: '2026-11-09T00:00:00Z' },
    { id: 'a3', course_id: 'c1', active: true, type: 'assessment', week: 3, title: 'Past quiz', source_version: 'v1', due_at: '2026-10-01T00:00:00Z' },
  ],
  enrollments: [
    { course_id: 'c1', student_email: 'one@example.invalid', block_section: 'BSIT-1A' },
    { course_id: 'c1', student_email: 'two@example.invalid', block_section: 'BSIT-1A' },
    { course_id: 'c1', student_email: 'three@example.invalid', block_section: 'BSIT-1B' },
  ],
  attempts: [
    { publication_id: 'a1', source_version: 'v1', student_email: 'one@example.invalid', score: 9, max_score: 10, submitted_at: '2026-10-30T00:00:00Z', grading_status: 'graded', topic_scores: [{ topic: 'Variables', score: 9, max_score: 10 }] },
    { publication_id: 'a1', source_version: 'v1', student_email: 'two@example.invalid', score: 5, max_score: 10, submitted_at: '2026-10-31T00:00:00Z', grading_status: 'graded', topic_scores: [{ topic: 'Variables', score: 5, max_score: 10 }] },
    { publication_id: 'a2', source_version: 'v1', student_email: 'three@example.invalid', score: 0, max_score: 10, submitted_at: '2026-11-01T00:00:00Z', grading_status: 'pending_review' },
  ],
  accesses: [],
  institutional: [{ kind: 'courses', record_key: 'IT 105', data: { CourseCode: 'IT 105' } }, { kind: 'loads', record_key: 'IT 104|A|1', data: { CourseCode: 'IT 104' } }],
  faculty: [{ id: 'i2', name: 'Unloaded instructor', email: 'i2@example.invalid' }],
  events: [
    { id: 'e1', kind: 'publication', title: 'Variables lesson', detail: 'Published week 1', created_at: '2026-11-02T10:00:00Z' },
    { id: 'e2', kind: 'syllabus', title: 'IT 102', detail: 'active', created_at: '2026-11-01T12:00:00Z' },
  ],
  notices: [],
})
const SAMPLE_NAMES = /Rogelio|Guisdan|Fianza|Guaki|Bhenny/

test('account instructor dashboard counts the owner workspace and marked results, never samples', () => {
  const workspace = {
    syllabi: [{ id: 's1', courseCode: 'IT 102', courseTitle: 'Programming', status: 'active', version: 2, courseOutline: [{}, {}] }, { id: 's2', courseCode: 'IT 103', courseTitle: 'Web', status: 'drafted' }, { id: 'sample', sample: true, courseCode: 'X', status: 'active' }],
    content: { d1: { syllabusId:'s1', status: 'draft', type: 'material', week: 3, title: 'Week 3 notes', generatedAt: '2026-10-29T08:00:00Z' }, d2: { syllabusId:'s2', status: 'draft', type: 'assessment', week: 1, content: { title: 'Week 1 quiz' } }, p1: { syllabusId:'s1', status: 'published', type: 'material', week: 1 }, sample:{syllabusId:'sample',status:'draft',title:'EXCLUDED SAMPLE'}, orphan:{syllabusId:'missing',status:'draft',title:'EXCLUDED ORPHAN'} },
  }
  const model = accountInstructorModel(records(), workspace, NOW)
  assert.deepEqual(model.kpis, { courses: 2, active: 1, drafts: 2, published: 1 })
  assert.deepEqual(model.autoDone, ['onb-1', 'onb-2'])
  assert.deepEqual(model.blocks.map(b => [b.code, b.detail]), [['BSIT-1A', '1st Year · 2 students'], ['BSIT-1B', '1 student']])
  // One and two have marked attempts (90%, 50%); three is pending review and is left out.
  assert.deepEqual([model.snapshot.students, model.snapshot.average, model.snapshot.below, model.snapshot.top], [3, 70, 1, 1])
  assert.equal(model.snapshot.caption, 'Topic averages · IT 102 IT 102 title')
  assert.deepEqual(model.snapshot.chart, [{ topic: 'Variables', avg: 70 }])
  assert.deepEqual(model.queue.map(q => [q.title, q.detail]), [['Week 1 quiz', 'assessment · —'], ['Week 3 notes', 'material · 2026-10-29']])
  assert.deepEqual(model.syllabi.map(s => [s.code, s.version, s.outlineWeeks]), [['IT 102', 2, 2], ['IT 103', 1, 0]])
  assert.equal(model.activity[0]?.time, '2h ago')
  assert.doesNotMatch(JSON.stringify(model), SAMPLE_NAMES)
  assert.doesNotMatch(JSON.stringify(model),/EXCLUDED/)
})

test('empty account records stay empty instead of showing preview values', () => {
  const empty: AcademicData = { courses: [], publications: [], enrollments: [], attempts: [], accesses: [] }
  const instructor = accountInstructorModel(empty, { syllabi: [], content: {} }, NOW)
  assert.deepEqual(instructor.kpis, { courses: 0, active: 0, drafts: 0, published: 0 })
  assert.equal(instructor.snapshot.average, null)
  assert.deepEqual(instructor.snapshot.chart, [])
  assert.deepEqual([instructor.blocks, instructor.activity, instructor.syllabi, instructor.queue], [[], [], [], []])
  const student = accountStudentModel(empty, { email: 'one@example.invalid' }, NOW)
  assert.equal(student.kpis.average, null)
  assert.deepEqual([student.reminders, student.courses, student.trend, student.upcoming], [[], [], [], []])
  assert.equal(student.block, null)
  const management = accountManagementModel(empty, NOW)
  assert.deepEqual(management.kpis, { released: 0, loaded: 0, approved: 0, notRouted: 0 })
  for (const model of [instructor, student, management]) assert.doesNotMatch(JSON.stringify(model), SAMPLE_NAMES)
})

test('account management dashboard reads courses, imported records and faculty', () => {
  const model = accountManagementModel(records(), NOW)
  // Released: IT 102-104 plus imported IT 105. Loaded: IT 102 and IT 103 have instructors, IT 104 has an imported load.
  assert.deepEqual(model.kpis, { released: 4, loaded: 3, approved: 1, notRouted: 2 })
  assert.deepEqual(model.stations.map(s => s.count), [1, 1, 0, 0, 1])
  assert.deepEqual(model.delivery, [{ name: 'IT 102', materials: 1, assessments: 3 }])
  assert.deepEqual(model.faculty.map(f => [f.name, f.loads, f.active, f.behind]), [['Unloaded instructor', 0, 0, 0], ['Account instructor', 2, 1, 1]])
  assert.deepEqual(model.courses.map(c => [c.code, c.status, c.instructor]), [['IT 102', 'active', 'Account instructor'], ['IT 103', 'checked', 'Account instructor'], ['IT 104', 'drafted', 'Not assigned']])
  assert.deepEqual(model.activity.map(a => [a.kind, a.actor, a.action]), [['published', 'Variables lesson', 'Published week 1'], ['syllabus', 'IT 102', 'syllabus is now Active']])
})

test('account student dashboard lists own pending work, future deadlines and safe source links', () => {
  const data = records()
  data.enrollments = data.enrollments.slice(0, 1)
  data.attempts = data.attempts.slice(0, 1)
  data.courses[0] = { ...data.courses[0], source_links: ['https://example.invalid/notes', 'javascript:alert(1)'] } as AcademicData['courses'][number]
  const model = accountStudentModel(data, { email: 'one@example.invalid' }, NOW)
  assert.deepEqual(model.kpis, { enrolled: 3, average: 90, mastered: 1, pending: 3 })
  assert.deepEqual(model.reminders.map(r => r.path), ['/courseware', '/assessment', '/assessment'])
  assert.deepEqual(model.block, { code: 'BSIT-1A', year: 'Year 1', students: 30, adviser: 'Adviser A' })
  assert.deepEqual(model.courses.map(c => [c.code, c.score]), [['IT 102', 90], ['IT 103', null], ['IT 104', null]])
  assert.deepEqual(model.sources[0]?.items.map(i => i.href), ['https://example.invalid/notes'])
  assert.deepEqual(model.trend, [{ week: 'W1', score: 90 }])
  assert.deepEqual(model.upcoming.map(u => u.title), ['Functions quiz'])
})

test('saved events read as recorded activity with relative times', () => {
  assert.equal(accountActivity([{ id: 'x', kind: 'import', title: 'loads.csv', detail: 'loads: 1 new, 0 updated', created_at: '2026-11-02T11:59:50Z' }], 5, NOW)[0]?.action, 'imported: loads: 1 new, 0 updated')
  assert.equal(timeAgo('2026-11-02T11:59:50Z', NOW), 'Just now')
  assert.equal(timeAgo('not a date', NOW), '')
})

test('upcoming student work includes released activities, while hidden and future-release work stays out',()=>{
 const data=records()
 data.publications.push(
  {id:'activity',course_id:'c1',active:true,type:'activity',week:2,title:'Released activity',source_version:'v1',due_at:'2026-11-08T00:00:00Z'},
  {id:'hidden',course_id:'c1',active:false,type:'activity',week:2,title:'Hidden activity',source_version:'v1',due_at:'2026-11-08T00:00:00Z'},
  {id:'future',course_id:'c1',active:true,type:'activity',week:2,title:'Unreleased activity',source_version:'v1',release_at:'2026-11-05T00:00:00Z',due_at:'2026-11-08T00:00:00Z'},
 )
 const model=accountStudentModel(data,{email:'one@example.invalid'},NOW)
 assert.deepEqual(model.upcoming.map(item=>[item.title,item.type]),[['Released activity','Activity'],['Functions quiz','Assessment']])
})

test('block cards are distinct per course and score details use marked current results including a true zero',()=>{
 const data=records()
 data.enrollments.push({course_id:'c2',student_email:'one@example.invalid',block_section:'BSIT-1A'})
 data.attempts.push({publication_id:'a3',source_version:'v1',student_email:'one@example.invalid',score:0,max_score:10,submitted_at:'2026-11-02T00:00:00Z',grading_status:'graded',is_test:true})
 const model=accountInstructorModel(data,{},NOW)
 assert.equal(model.blocks.filter(block=>block.code==='BSIT-1A').length,2)
 assert.ok(model.blocks.every(block=>block.course.includes('IT 10')&&block.courseId))
 assert.equal(model.snapshot.scored,2)
 assert.deepEqual(model.snapshot.results.map(item=>[item.score,item.marked,item.test]),[[70,2,false],[0,1,true]])
 assert.equal(model.snapshot.average,48,'ungraded work is excluded; recorded zero remains real')
})
