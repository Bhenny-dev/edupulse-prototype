import test from 'node:test'
import assert from 'node:assert/strict'
import {tenSubjectLoads,studentTenVersion} from '../scripts/lib/student-ten-loads.js'
import {studentDemonstrationCohort} from '../scripts/lib/student-demonstration.js'
import type {PopulationInput} from '../scripts/lib/population-plan.js'
test('student allocation caps actual recorded years at ten, preserves the confirmed approved owner and chooses one demonstration course each',()=>{
 const owners=['a','b'].map(id=>({id,name:id,role:'instructor',workspace:{revision:1,data:{syllabi:Array.from({length:12},(_,i)=>({courseCode:'SYN '+i,status:'active'}))}}}))
 const input:PopulationInput={owners,students:[],institutional:[...Array.from({length:12},(_,i)=>({kind:'courses',data:{CourseCode:'SYN '+i,YearLevel:'1',Semester:'1',Units:'3'}})),{kind:'rosters',data:{Block:'ONE',YearLevel:'1',Status:'active'}},{kind:'loads',data:{InstructorID:'b',CourseCode:'SYN 0',Block:'ONE',Semester:'1',AllocationSource:'instructor-5-10-course-blocks-2026-11-13'}}]}
 const plan=tenSubjectLoads(input);assert.equal(plan.loads.length,10);assert.equal(plan.loads.find(l=>l.CourseCode==='SYN 0')?.InstructorID,'b');assert(plan.loads.every(l=>l.AllocationSource===studentTenVersion))
 const members=['a','b','c','d'].flatMap(student=>['x','y'].map(course=>({course,student}))),selected=studentDemonstrationCohort(members);assert.equal(selected.length,4);assert.equal(new Set(selected.map(x=>x.student)).size,4);assert.equal(selected.filter(x=>x.course==='x').length,2);assert.deepEqual(studentDemonstrationCohort(members),selected)
})
