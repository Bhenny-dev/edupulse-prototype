import type {Page} from '@playwright/test'
import {academicUI} from './academic-ui-fixture'
import {roleRecords} from './role-restoration-fixture'
import {baselineWorkspace} from './baseline-fixture'
export const monitoringOwner='fe67b9d2-719b-4b10-91cd-76031ab115fe',monitoringVersion='f'.repeat(32)
export function monitoringStore(){
 const records=structuredClone(roleRecords)
 records.courses[0].instructor_id=monitoringOwner
 records.courses.push({...records.courses[0],id:'c'.repeat(32),course_code:'IT 202',course_title:'Networking'})
 records.enrollments=[{...records.enrollments[0],year_level:1},{...records.enrollments[1],block_section:'BSIT-1A',year_level:1},{course_id:'a'.repeat(32),student_email:'outsider@example.invalid',display_name:'Different block learner',student_ref:'OTHER-1',block_section:'BSIT-1B',year_level:1},{course_id:'c'.repeat(32),student_email:'network@example.invalid',display_name:'Networking learner',student_ref:'NET-1',block_section:'BSIT-2A',year_level:2}]
 records.publications.forEach(p=>p.source_version=monitoringVersion)
 const first=records.publications[0]
 records.publications.push(...['Functions lesson','Arrays lesson'].map((title,i)=>({...structuredClone(first),id:(i?'e':'d').repeat(32),title,week:i+2})))
 records.attempts.forEach(a=>a.source_version=monitoringVersion)
 records.attempts.push({...structuredClone(records.attempts[0]),id:'11111111-0000-4000-8000-000000000000',student_id:'second-learner',student_email:'second@example.invalid',score:0,question_scores:[0,0,0]}, {...structuredClone(records.attempts[0]),id:'22222222-0000-4000-8000-000000000000',student_email:'outsider@example.invalid',score:3})
 records.accesses=records.publications.filter(p=>p.type==='material').map((p,i)=>({publication_id:p.id,student_id:'synthetic-learner',student_email:'ui.fixture@example.invalid',first_opened_at:`2026-11-${10+i}T03:00:00Z`}))
 records.sessions=records.attempts.map((a,i)=>({id:`session-${i}`,publication_id:a.publication_id,source_version:String(a.source_version),student_email:a.student_email,student_id:a.student_id,started_at:a.submitted_at,attempt_no:1,is_test:false}))
 records.reading=[{publication_id:first.id,student_id:'synthetic-learner',student_email:'ui.fixture@example.invalid',source_version:monitoringVersion,sections_read:2,total_sections:2,updated_at:'2026-11-12T03:00:00Z',completed_at:'2026-11-12T03:00:00Z'},{publication_id:'d'.repeat(32),student_id:'synthetic-learner',student_email:'ui.fixture@example.invalid',source_version:monitoringVersion,sections_read:1,total_sections:2,updated_at:'2026-11-12T03:00:00Z'}]
 const workspace:any=structuredClone(baselineWorkspace);workspace.syllabi.push({...structuredClone(workspace.syllabi[0]),id:'network-syllabus',courseCode:'IT 202',courseTitle:'Networking'});workspace.content={};workspace.enrollmentOverrides=[]
 return {records,workspace,revision:1,commands:[] as any[],failSave:false}
}
export async function monitoringUI(page:Page,role='instructor',store=monitoringStore()){
 await academicUI(page,async()=>({json:store.records}),role)
 const projection=()=>{
  const records=structuredClone(store.records)
  for(const registration of store.workspace.registrations||[]){const course=records.courses.find(c=>c.course_code===registration.courseCode);if(course)for(const student of registration.students||[])if(!records.enrollments.some(e=>e.course_id===course.id&&e.student_email===student.Email))records.enrollments.push({course_id:course.id,student_email:student.Email,display_name:student.Name,student_ref:student.StudentID,block_section:registration.blockSection,year_level:Number(student.YearLevel)})}
  records.enrollments=records.enrollments.flatMap(e=>{const code=records.courses.find(c=>c.id===e.course_id)?.course_code;const decision=(store.workspace.enrollmentOverrides||[]).find((d:any)=>d.courseCode===code&&d.studentEmail===e.student_email);return decision?.excluded?[]:[{...e,suspended:!!decision?.suspended,block_section:decision?.blockSection||e.block_section,display_name:decision?.displayName||e.display_name,student_ref:decision?.studentRef||e.student_ref,year_level:decision?.yearLevel||e.year_level}]})
  if(role==='student'){records.courses=records.courses.filter(c=>c.id==='a'.repeat(32));records.enrollments=records.enrollments.filter(e=>e.student_email==='ui.fixture@example.invalid');records.attempts=records.attempts.filter(a=>a.student_email==='ui.fixture@example.invalid');records.accesses=records.accesses.filter(a=>a.student_email==='ui.fixture@example.invalid');records.reading=records.reading?.filter(r=>r.student_email==='ui.fixture@example.invalid')}
  return records
 }
 await page.route('**/api/ai?*',async route=>{
  const action=new URL(route.request().url()).searchParams.get('action'),input=route.request().method()==='POST'||route.request().method()==='PUT'?route.request().postDataJSON():null
  if(action==='academic'){
   if(!input)return route.fulfill({json:projection()})
   store.commands.push(input)
   if(input.operation==='sync')return route.fulfill({json:{synced:true}})
   if(role==='student'&&input.operation==='open'){if(!store.records.accesses.some(a=>a.publication_id===input.publication&&a.student_email==='ui.fixture@example.invalid'))store.records.accesses.push({publication_id:input.publication,student_email:'ui.fixture@example.invalid',first_opened_at:'2026-11-12T03:00:00Z'});return route.fulfill({json:{opened:true}})}
   if(role==='student'&&input.operation==='read-section'){
    const item=store.records.publications.find(p=>p.id===input.publication&&p.source_version===input.version)!
    let progress=store.records.reading!.find(r=>r.publication_id===item.id&&r.student_email==='ui.fixture@example.invalid')
    if(!progress){progress={publication_id:item.id,source_version:monitoringVersion,student_email:'ui.fixture@example.invalid',sections_read:0,total_sections:2,updated_at:'2026-11-12T03:00:00Z'};store.records.reading!.push(progress)}
    if(input.section>progress.sections_read)return route.fulfill({status:400,json:{error:{message:'Confirm preceding sections first',code:'READING_PROGRESS_FAILED'}}})
    progress.sections_read=Math.max(progress.sections_read,input.section+1);if(progress.sections_read===2)progress.completed_at='2026-11-12T03:00:00Z'
    return route.fulfill({json:progress})
   }
   throw new Error(`Unexpected monitoring business command: ${input.operation}`)
  }
  if(action==='workspace'){
   if(input){store.commands.push({operation:'workspace',...input});if(store.failSave){store.failSave=false;return route.fulfill({status:503,json:{error:{code:'WORKSPACE_UNAVAILABLE',message:'Synthetic save was not confirmed.'}}})}if(input.revision!==store.revision)return route.fulfill({status:409,json:{error:{code:'WORKSPACE_CONFLICT',message:'Revision conflict'}}});store.workspace=input.data;store.revision++}
   return route.fulfill({json:{mode:'cloud',revision:store.revision,data:store.workspace}})
  }
  if(action==='students')return route.fulfill({json:{students:[{student_number:'SYN-NEW',full_name:'New enrolled learner',email:'new@example.invalid',year_level:1,department:'College of Information Technology',program:'BSIT'}],total:1,offset:0,pageSize:50}})
  if(action==='health')return route.fulfill({json:{version:'synthetic-ui',provider:'retrieval',ready:false,embeddings:false,message:'Monitoring UI fixture',database:{ready:true,kind:'synthetic'},identity:{mode:'synthetic',role}}})
  if(action==='providers')return route.fulfill({json:{connection:null,connections:[],models:[]}})
  if(action==='conversations')return route.fulfill({json:{threads:[],messages:[],memories:[],automaticMemory:true,mode:'session'}})
  if(action==='syllabi')return route.fulfill({json:{shares:[]}})
  if(['chat','operator','courseware'].includes(action||''))throw new Error('Monitoring checks must never invoke inference')
  return route.fallback()
 })
 return {store,projection}
}
