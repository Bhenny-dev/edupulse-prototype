import test from 'node:test'
import assert from 'node:assert/strict'
import {CURRICULUM_COURSES} from '../src/data/curriculum.js'
import {authoredCatalog} from '../scripts/lib/authored-weeks-catalog.js'
import {authoredPlan,authoredWeek,type AuthoredInput} from '../scripts/lib/authored-weeks-plan.js'
import {curriculumKey} from '../src/utils/curriculumMetadata.js'

const input=():AuthoredInput=>({actor:'admin',owners:[{id:'teacher',name:'Synthetic instructor',role:'instructor',workspace:{revision:7,data:{syllabi:[{id:'draft',courseCode:'IT 102',courseTitle:'Computer Programming 1',status:'drafted',courseOutline:Array.from({length:18},(_,i)=>({week:i+1,ilos:'',contents:[]}))}],content:{},registrations:[],enrollmentOverrides:[{courseCode:'IT 102',studentEmail:'learner@example.invalid',excluded:false,suspended:true,blockSection:'BSIT-1A'}]}}}]})
test('all sixty curriculum courses have five valid substantive original teaching and assessment packs',()=>{
 assert.equal(Object.keys(authoredCatalog).length,60)
 for(const course of CURRICULUM_COURSES){
  assert.equal(authoredCatalog[curriculumKey(course.code)].lessons.length,5)
  for(let w=1;w<=5;w++){
   const pack=authoredWeek(course.code,w)
   assert.equal(pack.assessment.questions.length,3)
   assert.ok(pack.assessment.questions.every(q=>q.type==='short_answer'&&q.explanation.length>80))
  }
 }
 const java=authoredWeek('IT 102',3)
 assert.match(java.material.sections.map(s=>s.body).join(' '),/Java/)
 assert.match(java.material.sections.map(s=>s.body).join(' '),/String/)
 assert.match(authoredWeek('IT 103',4).assessment.questions[1].explanation,/population variance is 2/)
 assert.match(authoredWeek('WMAD 304',5).assessment.questions[1].explanation,/62 ordinary host/)
})
test('authoring is additive and idempotent, preserving statuses, rosters and untouched weeks',()=>{
 const before=input(),plan=authoredPlan(before),data=plan.owners[0].workspace.data
 assert.equal(plan.summary.addedItems,15);assert.equal(plan.summary.filledOutlineWeeks,5)
 assert.equal(data.syllabi[0].status,'drafted');assert.ok(!data.syllabi[0].approvedFile)
 assert.deepEqual(data.syllabi[0].courseOutline.slice(5),before.owners[0].workspace.data.syllabi[0].courseOutline.slice(5))
 assert.deepEqual(data.enrollmentOverrides,before.owners[0].workspace.data.enrollmentOverrides)
 assert.ok(Object.values(data.content).every(i=>i.status==='draft'&&i.content.ai&&!('verification' in (i.content.ai as object))))
 const again=authoredPlan({...before,owners:plan.owners})
 assert.equal(again.summary.addedItems,0);assert.equal(again.summary.unchangedOwners,1)
 assert.deepEqual(again.owners,plan.owners);assert.equal(Object.keys(before.owners[0].workspace.data.content).length,0)
})
test('saved teaching, attachments, approved outlines and published history are never replaced',()=>{
 const before=input(),s=before.owners[0].workspace.data.syllabi[0]
 s.status='active';s.approvedFile={name:'synthetic.pdf',size:6,base64:Buffer.from('%PDF-X').toString('base64'),sha256:'a'.repeat(64),uploadedAt:'2026-11-12T00:00:00.000Z',approvalAttested:true}
 s.courseOutline=s.courseOutline.map(r=>({...r,ilos:'Explain Java data and programs.',contents:['Java language foundations'],activities:'Trace Java programs.',assessments:'Written explanation',assessmentTypes:[]}))
 const content=before.owners[0].workspace.data.content
 content['manual-file']={syllabusId:'draft',week:1,type:'material',status:'checked',content:{title:'Instructor attachment',privateBytes:'retained'}}
 content['old-history']={syllabusId:'draft',week:12,type:'assessment',status:'published',content:{title:'Retained publication',questions:[]}}
 const plan=authoredPlan(before),data=plan.owners[0].workspace.data
 assert.deepEqual(data.syllabi[0],s);assert.deepEqual(data.content['manual-file'],content['manual-file']);assert.deepEqual(data.content['old-history'],content['old-history'])
 assert.equal(plan.summary.addedItems,14)
 assert.ok(!data.content['gen-mat-draft-w1'])
 const multi=input();multi.owners[0].workspace.data.syllabi[0].courseOutline[0].sections=[{id:'a',ilos:'A',contents:['A'],activities:'A',assessments:'A',assessmentTypes:[]},{id:'b',ilos:'B',contents:['B'],activities:'B',assessments:'B',assessmentTypes:[]}]
 assert.throws(()=>authoredPlan(multi),/separate section mappings/)
})
