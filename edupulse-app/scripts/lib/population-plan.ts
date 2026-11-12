import {createHash} from 'node:crypto'
import {CURRICULUM_COURSES} from '../../src/data/curriculum.js'
import {curriculumKey} from '../../src/utils/curriculumMetadata.js'

type Student={student_number:string;email:string;full_name:string;year_level:number;active:boolean;user_id:string}
type Owner={id:string;role:string;name:string;workspace:{revision:number;data:any}}
export type PopulationInput={students:Student[];owners:Owner[];institutional:{kind:string;data:Record<string,string>}[]}
export const populationVersion='cit-curriculum-loading-2026-11-12'
const canonical=curriculumKey
const digest=(value:string)=>createHash('sha256').update(value).digest('hex').slice(0,24)

/** Owner-authorized assignments. No invented qualifications, approvals or learner activity. */
export function populationPlan(input:PopulationInput){
 const students=[...input.students].sort((a,b)=>a.year_level-b.year_level||a.student_number.localeCompare(b.student_number))
 if(new Set(students.map(s=>s.email)).size!==students.length)throw new Error('Duplicate active student email')
 const owners=structuredClone(input.owners.filter(o=>o.role==='instructor')).sort((a,b)=>a.name.localeCompare(b.name))
 if(!owners.length)throw new Error('Active instructor accounts required')
 const blocks=new Map<string,Student[]>()
 for(const year of [1,2,3,4]){
  const members=students.filter(s=>s.year_level===year)
  for(let offset=0;offset<members.length;offset+=35)blocks.set(`BSIT-${year}${String.fromCharCode(65+offset/35)}`,members.slice(offset,offset+35))
 }
 const rosters=[...blocks].flatMap(([Block,members])=>members.map(s=>({StudentID:s.student_number,Name:s.full_name,Email:s.email,Block,YearLevel:String(s.year_level),Status:'active',AllocationSource:populationVersion})))
 const actualBlocks=new Map(rosters.map(r=>[r.Email,r.Block]))
 let correctedLegacyBlocks=0
 for(const owner of owners)for(const decision of owner.workspace.data.enrollmentOverrides||[]){
  const Block=actualBlocks.get(decision.studentEmail)
  if(Block&&decision.blockSection?.endsWith('-TEST')){decision.blockSection=Block;correctedLegacyBlocks++}
 }
 const courses:Record<string,string>[]=[],loads:Record<string,string>[]=[],allocations:any[]=[]
 const loadUnits=new Map(owners.map(o=>[o.id,0]))
 const timestamp=new Date().toISOString()
 for(const course of CURRICULUM_COURSES){
  const confirmed=input.institutional.filter(r=>r.kind==='loads'&&canonical(r.data.CourseCode)===canonical(course.code))
  let candidates=owners.flatMap(owner=>owner.workspace.data.syllabi.filter((s:any)=>canonical(s.courseCode)===canonical(course.code)&&s.status!=='archived').map((syllabus:any)=>({owner,syllabus})))
  candidates=candidates.filter(c=>c.syllabus.status==='active').length?candidates.filter(c=>c.syllabus.status==='active'):candidates
  if(!candidates.length){
   const owner=[...owners].sort((a,b)=>(loadUnits.get(a.id)||0)-(loadUnits.get(b.id)||0)||a.name.localeCompare(b.name))[0]
   const syllabus={id:`loading-${digest(course.code+owner.id)}`,courseCode:course.code,courseTitle:course.title,status:'drafted',sample:false,instructorId:owner.id,version:1,lastUpdated:timestamp.slice(0,10),courseInfo:{courseCode:course.code,courseTitle:course.title,periodOffered:course.semester==='summer'?'Summer':`${course.semester===1?'1st':'2nd'} Semester`,academicYear:'2026-2027',creditUnits:course.units,noOfHours:course.units*18,classification:course.classification,prerequisites:course.prerequisites},courseDescription:course.description,programOutcomes:course.programOutcomes,courseOutline:Array.from({length:18},(_,i)=>({week:i+1,ilos:'',contents:[],activities:'',assessments:'',assessmentTypes:[]})),references:[],allocationSource:populationVersion}
   owner.workspace.data.syllabi.push(syllabus);candidates=[{owner,syllabus}]
  }
  for(const [Block,members] of blocks){
   if(members[0].year_level!==course.yearLevel)continue
   const prior=confirmed.find(r=>r.data.Block===Block&&owners.some(o=>o.id===r.data.InstructorID))
   const selected=prior?candidates.find(c=>c.owner.id===prior.data.InstructorID):undefined
   if(prior&&!selected)throw new Error(`Existing ${course.code}/${Block} load has no matching owned syllabus; reconcile before changing it`)
   const {owner,syllabus}=selected||[...candidates].sort((a,b)=>(loadUnits.get(a.owner.id)||0)-(loadUnits.get(b.owner.id)||0)||a.owner.name.localeCompare(b.owner.name))[0]
   const code=syllabus.courseCode
   if(!courses.some(c=>c.CourseCode===code))courses.push({CourseCode:code,CourseTitle:course.title,Units:String(course.units),YearLevel:String(course.yearLevel),Semester:String(course.semester),CurriculumCode:course.curriculumCode,Source:'Recorded BSIT curriculum; owner-authorized assignment'})
   loads.push({...(prior?.data||{}),InstructorID:owner.id,InstructorName:owner.name,CourseCode:code,Block,Semester:String(course.semester),Units:String(course.units),YearLevel:String(course.yearLevel),AcademicYear:syllabus.courseInfo?.academicYear||'2026-2027',AllocationSource:populationVersion})
   loadUnits.set(owner.id,(loadUnits.get(owner.id)||0)+course.units)
   allocations.push({code,canonicalCode:course.code,owner:owner.id,syllabus:syllabus.id,block:Block,year:course.yearLevel,semester:course.semester,units:course.units,students:members.length,active:syllabus.status==='active'})
  }
 }
 const periods=[1,2,'summer'].flatMap(semester=>[1,2,3,4].map(year=>({year,semester,units:CURRICULUM_COURSES.filter(c=>c.yearLevel===year&&c.semester===semester).reduce((n,c)=>n+c.units,0)}))).filter(p=>p.units)
 const summary={students:students.length,blocks:blocks.size,correctedLegacyBlocks,curriculumCourses:CURRICULUM_COURSES.length,courseLoadRows:loads.length,expectedMemberships:allocations.reduce((n,c)=>n+c.students,0),instructors:owners.map(o=>({name:o.name,courseBlocks:loads.filter(l=>l.InstructorID===o.id).length,unitsAcrossAllPeriods:loadUnits.get(o.id)})),periods,activeCourseBlocks:allocations.filter(a=>a.active).length,draftCourseBlocks:allocations.filter(a=>!a.active).length}
 return {owners,courses,rosters,loads,allocations,summary}
}
