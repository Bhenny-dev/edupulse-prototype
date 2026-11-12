import test from 'node:test'
import assert from 'node:assert/strict'
import {boundedLoads,boundedLoadVersion} from '../scripts/lib/bounded-loads.js'
import {populationPlan,type PopulationInput} from '../scripts/lib/population-plan.js'
const fixture=():PopulationInput=>{
 const owners=Array.from({length:7},(_,i)=>({id:'teacher-'+i,name:'Teacher '+i,role:'instructor',workspace:{revision:1,data:{syllabi:Array.from({length:8},(_,n)=>({courseCode:`COURSE ${i}-${n}`,status:n<2?'active':'drafted',teachingSetRole:n<6?'own':undefined})),registrations:[]}}}))
 const loads=owners.flatMap(o=>o.workspace.data.syllabi.flatMap((s,n)=>['A','B'].map(letter=>({kind:'loads',data:{InstructorID:o.id,CourseCode:s.courseCode,Block:`YEAR-${n%4+1}${letter}`,Semester:'1',AllocationSource:'cit-curriculum-loading-2026-11-12'}}))))
 return {students:[],owners,institutional:[...loads,...[1,2,3,4].flatMap(y=>['A','B'].map(l=>({kind:'rosters',data:{Block:`YEAR-${y}${l}`,Status:'active'}})))]}
}
test('bounded allocations retain actual identities, all blocks, approved coverage and 5–10 classes per teacher; repeat is stable',()=>{
 const input=fixture(),before=structuredClone(input),result=boundedLoads(input)
 assert.deepEqual(input,before);assert(result.summary.instructors.every(o=>o.courseBlocks>=5&&o.courseBlocks<=10))
 assert.equal(result.summary.blocks,8);assert.equal(result.summary.activeBlocks,4);assert.equal(result.summary.unassignedCourseGroups,0)
 for(const l of result.loads)assert(input.institutional.some(r=>r.kind==='loads'&&r.data.InstructorID===l.InstructorID&&r.data.CourseCode===l.CourseCode&&r.data.Block===l.Block))
 const next={...input,institutional:[...input.institutional.filter(r=>r.kind!=='loads'),...result.loads.map(data=>({kind:'loads',data}))]}
 assert.deepEqual(boundedLoads(next).keys,result.keys)
 assert.throws(()=>populationPlan(next),/Bounded instructor allocations/)
 const unrelated=fixture();unrelated.institutional[0].data.AllocationSource='confirmed-external-load';assert.throws(()=>boundedLoads(unrelated),/preserve unrelated/)
 const missing=fixture();missing.owners[0].workspace.data.syllabi=[];assert.throws(()=>boundedLoads(missing),/owned syllabus/)
 assert.equal(result.loads[0].AllocationSource,boundedLoadVersion)
})
