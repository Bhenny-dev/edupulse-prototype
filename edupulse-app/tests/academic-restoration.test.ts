import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assessmentSummary, currentAttempts, filterAcademic, topicSummary, type AcademicData } from '../src/components/academic/academicData'
import { parseIntake, mergeIntake } from '../src/components/academic/recordIntake'
import { workspaceData } from '../server/workspace'

test('academic summaries exclude prior versions and preserve zero scores without treating no attempt as zero', () => {
  const data: AcademicData = { courses: [{ id: 'c', course_code: 'IT', course_title: 'Course', active: true }], publications: [{ id: 'p', course_id: 'c', active: true, week: 1, type: 'assessment', title: 'Assessment', source_version: 'new' }, { id: 'empty', course_id: 'c', active: true, week: 2, type: 'assessment', title: 'Unanswered', source_version: 'v1' }], enrollments: [{ course_id: 'c', student_email: 'a@example.invalid', block_section: 'A' }, { course_id: 'c', student_email: 'b@example.invalid', block_section: 'B' }], attempts: [{ publication_id: 'p', source_version: 'old', student_email: 'a@example.invalid', score: 3, max_score: 3, submitted_at: '2026-10-20T00:00:00Z' }, { publication_id: 'p', source_version: 'new', student_email: 'a@example.invalid', score: 0, max_score: 3, submitted_at: '2026-10-28T00:00:00Z' }], accesses: [] }
  assert.equal(currentAttempts(data).length, 1)
  assert.equal(assessmentSummary(data)[0]?.score, 0)
  assert.equal(assessmentSummary(data)[1]?.score, null)
  assert.equal(filterAcademic(data, 'c', 'B').attempts.length, 0)
  assert.equal(filterAcademic(data, 'c', 'A', '2026-10-28', '2026-10-28').attempts.length, 1)
  assert.equal(filterAcademic(data, 'unknown').enrollments.length, 0)
})
test('record intake handles quoted fields, rejects invalid and duplicate rows, and merges stable keys', () => {
  const parsed = parseIntake('StudentID,Name,Email,YearLevel,Block,Schedule,Status\n1,"Learner, A",a@example.invalid,1,A,"Mon\nTue",Active\n1,Duplicate,a@example.invalid,1,A,,Active\n2,B,invalid,1,B,,Active', 'rosters')
  assert.equal(parsed.accepted.length, 1); assert.equal(parsed.errors.length, 2)
  assert.equal(parsed.accepted[0]?.Name, 'Learner, A'); assert.equal(parsed.accepted[0]?.Schedule, 'Mon\nTue')
  const merged = mergeIntake([{ StudentID: '1', Block: 'A', Name: 'Old' }], parsed.accepted, 'rosters')
  assert.equal(merged.updated, 1); assert.equal(merged.created, 0); assert.equal(merged.rows[0]?.Name, 'Learner, A')
  assert.throws(() => parseIntake('StudentID,Name,Email,YearLevel,Block,Schedule,Status\n"unclosed', 'rosters'), /Unclosed/)
  assert.throws(() => parseIntake('Unexpected,Name\n1,A', 'courses'), /Expected/)
})
test('workspace schema preserves bounded private intake without changing legacy snapshots', () => {
  const legacy = { syllabi: [], content: {}, registrations: [] }
  assert.deepEqual(workspaceData.parse(legacy), legacy)
  const intake = { courses: [{ CourseCode: 'IT 102', CourseTitle: 'Programming' }], loads: [], rosters: [], history: [] }
  assert.deepEqual(workspaceData.parse({ ...legacy, intake }).intake, intake)
  assert.equal(workspaceData.safeParse({ ...legacy, intake: { ...intake, courses: Array.from({ length: 1001 }, () => ({})) } }).success, false)
})

import { revisedWorkspace } from '../src/utils/syllabusRevisions'
test('topic mastery counts only mapped graded current attempts and never invents topics',()=>{
 const data:AcademicData={courses:[{id:'c',course_code:'IT',course_title:'Programming',active:true}],publications:[{id:'p',course_id:'c',active:true,week:1,type:'assessment',title:'Quiz',source_version:'v1'}],enrollments:[],accesses:[],attempts:[{publication_id:'p',source_version:'v1',student_email:'a@example.invalid',score:1,max_score:2,submitted_at:'2026-10-27',topic_scores:[{topic:'Variables',score:1,max_score:2}]},{publication_id:'p',source_version:'v1',student_email:'a@example.invalid',score:2,max_score:2,submitted_at:'2026-10-28',topic_scores:[{topic:'Variables',score:2,max_score:2}]}]}
 assert.equal(topicSummary(data)[0].value,100);assert.equal(topicSummary(data).length,1);data.attempts[1].grading_status='pending_review';assert.deepEqual(topicSummary(data),[])
})
test('syllabus revisions retain editable history and withdraw stale published courseware',()=>{
 const before={id:'s',status:'active',version:1,courseOutline:[{week:1,contents:['Variables']},{week:2,contents:['Functions']}],approvedFile:{base64:'large'}}
 const data={syllabi:[before],content:{changed:{syllabusId:'s',week:1,status:'published'},same:{syllabusId:'s',week:2,status:'published'}}}
 const next=revisedWorkspace(data,{...before,status:'drafted',courseOutline:[{week:1,contents:['New topic']},{week:2,contents:['Functions']}]})
 assert.equal(next.content.changed.status,'draft');assert.equal(next.content.changed.outOfAlignment,true);assert.equal(next.content.same.status,'checked');assert.equal(next.syllabi[0].versions[0].approvedFile,undefined);assert.equal(data.content.changed.status,'published')
})

// Exercise the front-end JavaScript guide contract at runtime.
const {accountGreeting,prepareIntent}=await import(new URL('../src/agents/guidance.js',import.meta.url).href)
const {default:recordsGuide}=await import(new URL('../src/agents/recordsAgent.js',import.meta.url).href)
const {default:monitorGuide}=await import(new URL('../src/agents/monitorAgent.js',import.meta.url).href)
const {default:performanceGuide}=await import(new URL('../src/agents/performanceAgent.js',import.meta.url).href)
test('account guidance distinguishes persisted records from preview and preserves role boundaries',()=>{
 const dean={role:'dean',authenticated:true},associate={role:'associate_dean',authenticated:true}
 assert.match(accountGreeting(recordsGuide,dean),/confirm shared/);assert.match(accountGreeting(recordsGuide,{role:'dean'}),/sample/)
 const imported=prepareIntent(recordsGuide,recordsGuide.intents[0],dean);assert.match(imported.steps.at(-1).body,/saves shared records/)
 assert.match(prepareIntent(monitorGuide,monitorGuide.intents[0],associate).steps.at(-1).body,/no student-score access/)
 assert.match(prepareIntent(performanceGuide,performanceGuide.intents.at(-1),dean).steps.at(-1).body,/cannot change marks/)
})
