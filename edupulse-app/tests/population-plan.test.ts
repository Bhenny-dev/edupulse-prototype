import test from 'node:test'
import assert from 'node:assert/strict'
import {populationPlan,type PopulationInput} from '../scripts/lib/population-plan'
import {curriculumCourse,curriculumLabel} from '../src/utils/curriculumMetadata'

test('curriculum allocation preserves records, bounds blocks and repeats without adding syllabi',()=>{
 const input:PopulationInput={students:Array.from({length:38},(_,i)=>({student_number:`S${String(i).padStart(3,'0')}`,email:`student${i}@example.invalid`,full_name:`Synthetic learner ${i}`,user_id:`student-${i}`,year_level:1,active:true})),owners:[{id:'a',role:'instructor',name:'First instructor',workspace:{revision:1,data:{syllabi:[{id:'approved',courseCode:'IT 102',status:'active',approvedFile:{retained:true},courseInfo:{academicYear:'2025-2026'}}],content:{},registrations:[],enrollmentOverrides:[{courseCode:'IT 102',studentEmail:'student0@example.invalid',excluded:false,suspended:true,blockSection:'BSIT-1A-TEST'}]}}},{id:'b',role:'instructor',name:'Second instructor',workspace:{revision:1,data:{syllabi:[],content:{},registrations:[]}}}],institutional:[]}
 const plan=populationPlan(input)
 assert.equal(plan.owners.find(o=>o.id==='a')!.workspace.data.enrollmentOverrides[0].blockSection,'BSIT-1A');assert.equal(plan.owners.find(o=>o.id==='a')!.workspace.data.enrollmentOverrides[0].suspended,true);assert.equal(plan.summary.students,38);assert.equal(plan.summary.blocks,2)
 assert.equal(plan.rosters.filter(r=>r.Block==='BSIT-1A').length,35);assert.equal(plan.rosters.filter(r=>r.Block==='BSIT-1B').length,3)
 assert.ok(plan.loads.every(l=>l.YearLevel==='1'&&Number(l.Units)>0))
 assert.ok(plan.owners.every(o=>plan.loads.some(l=>l.InstructorID===o.id)))
 assert.deepEqual(plan.owners.find(o=>o.id==='a')!.workspace.data.syllabi[0],input.owners[0].workspace.data.syllabi[0])
 assert.ok(plan.owners.flatMap(o=>o.workspace.data.syllabi).filter(s=>s.id!=='approved').every(s=>s.status==='drafted'&&!s.approvedFile))
 const again=populationPlan({...input,owners:plan.owners,institutional:plan.loads.map(data=>({kind:'loads',data}))})
 assert.deepEqual(again.owners,plan.owners);assert.deepEqual(again.loads,plan.loads)
 assert.equal(curriculumCourse('IT 201 - AD')?.units,3);assert.match(curriculumLabel('WMAD303'),/3 units/)
 assert.throws(()=>populationPlan({...input,students:[input.students[0],input.students[0]]}),/Duplicate/)
})
