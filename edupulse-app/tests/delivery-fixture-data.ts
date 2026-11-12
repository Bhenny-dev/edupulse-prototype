import {CURRICULUM_COURSES} from '../src/data/curriculum.js'
import {curriculumKey} from '../src/utils/curriculumMetadata.js'
import {teachingChoices} from '../scripts/lib/complete-syllabus.js'
import {authoredPlan,type AuthoredInput} from '../scripts/lib/authored-weeks-plan.js'
import type {DeliveryInput} from '../scripts/lib/delivery-plan.js'
const active:Record<string,string[]>={Dave:['IT 103','WMAD303'],Ralphy:['IT 204','WMAD 306'],Marielle:['WMADE 3','CP 1','CP 2','WMADE 4'],Rogelio:['IT 201 - AD','WMADE 1'],Libby:['WMAD 304','IT 202'],Sharmaine:['WMADE 3','WMADE 4'],Steve:['IT 101','IT 102']}
const draftSyllabus=(code:string,index:number)=>{
 const c=CURRICULUM_COURSES.find(c=>curriculumKey(c.code)===curriculumKey(code))!
 return {id:`synthetic-${index}-${curriculumKey(code)}`,courseCode:code,courseTitle:c.title,status:'drafted' as const,courseDescription:c.description,programOutcomes:c.programOutcomes,courseInfo:{courseCode:code,courseTitle:c.title,creditUnits:c.units,noOfHours:c.units*18,classification:c.classification,prerequisites:c.prerequisites,periodOffered:c.semester==='summer'?'Summer':`${c.semester===1?'1st':'2nd'} Semester`,academicYear:'2026-2027'},courseOutline:Array.from({length:18},(_,i)=>({week:i+1,ilos:'',contents:[]}))}
}
export function deliveryFixtureInput():DeliveryInput{
 const source:AuthoredInput={actor:'synthetic-admin',owners:Object.entries(teachingChoices).map(([name,choices],index)=>{
  const codes=[...active[name],...choices.own,...choices.draft]
  for(const course of CURRICULUM_COURSES){if(codes.length>=8)break;if(!codes.some(c=>curriculumKey(c)===curriculumKey(course.code)))codes.push(course.code)}
  return {id:index===0?'fe67b9d2-719b-4b10-91cd-76031ab115fe':`${String(index+1).repeat(8)}-1111-4111-8111-111111111111`,name:name+' Example',role:'instructor',workspace:{revision:1,data:{syllabi:codes.map(code=>draftSyllabus(code,index)),content:{},registrations:[]}}}
 })}
 const owners=authoredPlan(source).owners,courses:DeliveryInput['courses']=[]
 for(const owner of owners){const name=owner.name.split(' ')[0];for(const s of owner.workspace.data.syllabi)if(active[name].includes(s.courseCode)){
  s.status='active';s.approvedFile={name:'synthetic-capture.pdf',size:6,base64:Buffer.from('%PDF-X').toString('base64'),sha256:'a'.repeat(64),uploadedAt:'2026-11-12T00:00:00.000Z',approvalAttested:true}
  s.courseOutline=s.courseOutline.map(r=>r.week<=5?{...r,sections:undefined,contents:r.contents.map(t=>'Approved scope: '+t)}:r)
  courses.push({id:`synthetic-course-${courses.length}`,instructor_id:owner.id,syllabus_id:s.id,course_code:s.courseCode,active:true})
 }}
 const members=courses.map((course,index)=>({course:course.id,student:`synthetic-student-${index}`,email:`learner${index}@example.invalid`,block:'BSIT-1A',year:1}))
 return {actor:source.actor,owners,courses,members,activeStudents:members.length}
}
