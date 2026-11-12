import test from 'node:test'
import assert from 'node:assert/strict'
import {deliveryFixtureInput} from './delivery-fixture-data.js'
import {deliveryPlan,demonstrationCohort} from '../scripts/lib/delivery-plan.js'
import {demoAssessment} from '../scripts/lib/demo-assessments.js'
test('each eight-syllabus set contains four own, two complete drafts and two non-self incoming shares',()=>{
 const input=deliveryFixtureInput(),plan=deliveryPlan(input)
 assert.equal(plan.summary.publishedItems,240);assert.equal(plan.summary.preparedSyllabi,26);assert.equal(plan.shares.length,14)
 for(const owner of plan.owners){
  const before=input.owners.find(o=>o.id===owner.id)!
  assert.equal(owner.workspace.data.syllabi.filter(s=>s.teachingSetRole==='own').length,4)
  assert.equal(owner.workspace.data.syllabi.filter(s=>s.teachingSetRole==='draft').length,2)
  assert.equal(plan.shares.filter(s=>s.recipient===owner.id).length,2)
  for(const s of owner.workspace.data.syllabi.filter(s=>s.teachingSetRole==='draft')){assert.equal(s.status,'drafted');assert.equal(s.courseOutline.length,18);assert.ok(s.courseOutline.every(r=>r.contents.length&&(r.ilos.trim()||/Examination/.test(String(r.assessments)))));assert.ok(s.courseRequirements&&s.gradingSystem&&s.coursePolicy);assert.ok(!s.approvedFile)}
  for(const original of before.workspace.data.syllabi.filter(s=>s.status==='active')){const current=owner.workspace.data.syllabi.find(s=>s.id===original.id)!;assert.deepEqual(current.courseOutline,original.courseOutline);assert.deepEqual(current.approvedFile,original.approvedFile)}
 }
 assert.ok(plan.shares.every(s=>s.sender!==s.recipient))
 const again=deliveryPlan({...input,owners:plan.owners});assert.deepEqual(again.owners,plan.owners);assert.equal(again.summary.protectedLaterAssessments,32)
})
test('published questions keep approved topic identity and all seven supported formats exist',()=>{
 const input=deliveryFixtureInput(),plan=deliveryPlan(input),formats=new Set<string>()
 for(const owner of plan.owners)for(const item of Object.values(owner.workspace.data.content))if(item.status==='published'&&item.type==='assessment'){
  const row=owner.workspace.data.syllabi.find(s=>s.id===item.syllabusId)!.courseOutline.find(r=>r.week===item.week)!
  for(const q of item.content.questions as any[]){assert.ok(row.contents.includes(q.topic));formats.add(q.responseFormat||q.type);if(q.type==='true_false')assert.deepEqual(q.options,['True','False'])}
 }
 assert.deepEqual([...formats].sort(),['enumeration','essay','follow_along','identification','matching','multiple_choice','true_false'].sort())
 assert.equal(demoAssessment('IT 202',2).questions[0].correctIndex,2)
})
test('manual work, changed checked items and absent real approval stop the delivery plan',()=>{
 const input=deliveryFixtureInput(),id=Object.keys(input.owners[0].workspace.data.content)[0]
 input.owners[0].workspace.data.content[id].status='checked';assert.throws(()=>deliveryPlan(input),/newer checked/)
 const missing=deliveryFixtureInput();delete missing.owners[0].workspace.data.syllabi[0].approvedFile;assert.throws(()=>deliveryPlan(missing),/approved active/)
})
test('a bounded cohort represents every actual class and never duplicates a learner in one course',()=>{
 const members=['a','b'].flatMap(course=>['A','B'].flatMap(block=>Array.from({length:8},(_,i)=>({course,block,student:`${block}-${i}`}))))
 const cohort=demonstrationCohort([...members,members[0]])
 assert.equal(cohort.length,12);assert.equal(new Set(cohort.map(m=>m.course+':'+m.student)).size,12)
 for(const course of ['a','b'])for(const block of ['A','B'])assert.equal(cohort.filter(m=>m.course===course&&m.block===block).length,3)
 assert.deepEqual(demonstrationCohort([...members].reverse()),cohort)
})
