import type { Page } from '@playwright/test'
import { restorationUI } from './role-restoration-fixture'

// Synthetic UI transport only; SQL/role boundaries are exercised separately.
export async function baselineUI(page:Page,role='instructor') {
 const fixture=await restorationUI(page,role)
 const faculty=[{id:'11111111-1111-4111-8111-111111111111',name:'Synthetic instructor',email:'teacher@example.invalid'},{id:'22222222-1111-4111-8111-111111111111',name:'Synthetic second instructor',email:'teacher2@example.invalid'}]
 fixture.records.faculty=role==='student'?[]:faculty
 fixture.records.courses[0].instructor_id=faculty[0].id
 fixture.records.institutional=[{kind:'courses',record_key:'IT 102',data:{CourseCode:'IT 102',CourseTitle:'Computer Programming 1',Units:'3',Classification:'Core',Hours:'54',Prerequisites:'',YearLevel:'1',Semester:'1'}}]
 if(role!=='student')fixture.records.institutional.push({kind:'loads',record_key:'IT 102|BSIT-1A|1',data:{InstructorID:faculty[0].id,InstructorName:faculty[0].name,Email:faculty[0].email,CourseCode:'IT 102',Block:'BSIT-1A',Semester:'1',HasMasters:'true',Specialization:'Programming'}},{kind:'rosters',record_key:'SYN-001',data:{StudentID:'SYN-001',Name:'Synthetic learner',Email:'ui.fixture@example.invalid',YearLevel:'1',Block:'BSIT-1A',Schedule:'Mon / Wed 10:00',Status:'active'}})
 fixture.records.events=[{id:'synthetic-event',kind:'syllabus',title:'IT 102',detail:'active',created_at:'2026-10-28T04:00:00Z'}]
 fixture.records.notices=[{id:'aaaaaaaa-1111-4111-8111-111111111111',title:'New published material: Variables lesson',detail:'Week 1 is available.',path:'/courseware',created_at:'2026-10-28T04:00:00Z'}]
 return fixture
}

export const baselineWorkspace={
 syllabi:[{id:'baseline-syllabus',courseCode:'IT 102',courseTitle:'Computer Programming 1',status:'active',instructorId:'fe67b9d2-719b-4b10-91cd-76031ab115fe',version:2,sample:false,approvedFile:{name:'synthetic-approved.pdf',approvalAttested:true},courseOutline:[1,2,3].map(week=>({week,ilos:'Explain and apply programming concepts.',contents:['Variables','Functions','Arrays'],activities:'Worked examples',assessments:'Quiz'})),versions:[{id:'baseline-syllabus',courseCode:'IT 102',courseTitle:'Earlier programming plan',version:1,status:'drafted',courseOutline:[{week:1,ilos:'Explain variables.',contents:['Variables']}]}]}],
 content:{'baseline-quiz':{syllabusId:'baseline-syllabus',week:1,type:'assessment',status:'draft',content:{title:'Mapped programming quiz',questions:['Variables','Functions','Arrays'].map((topic,i)=>({id:`q${i}`,text:`Explain ${topic}`,topic,options:['Option A','Option B','Option C','Option D'],correctIndex:i,explanation:'Reviewed course reference.'}))}}},registrations:[]
}
