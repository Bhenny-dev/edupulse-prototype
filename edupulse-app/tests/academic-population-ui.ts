import { createHash } from 'node:crypto'
import { expect, type Page } from '@playwright/test'
import { academicUI } from './academic-ui-fixture'
import { monitoringOwner, monitoringVersion } from './monitoring-fixture'
 import { learningOutline, teachingItems, syllabusPdf } from '../scripts/lib/population-content'

/** Fictional identities and controlled reads; hosted population is verified separately. */
export async function populatedAcademicUI(page:Page,role='instructor') {
 const records:any={courses:[],publications:[],enrollments:[],attempts:[],accesses:[],reading:[],sessions:[],institutional:[],faculty:[],events:[],notices:[],classCodes:[],announcements:[],classJoins:[],deliverySchedules:[]}
 const workspace:any={syllabi:[],content:{},registrations:[]},writes:any[]=[]
 const digest=(s:string)=>createHash('md5').update(s).digest('hex')
 const students=Array.from({length:70},(_,n)=>({Email:n?'learner'+n+'@example.invalid':'ui.fixture@example.invalid',StudentID:`2026-${String(n+1).padStart(4,'0')}`,Name:['Lina','Mateo','Avery','Nora','Elena','Paolo','Mia','Gabriel','Celine','Adrian'][n%10]+' '+['Cruz','Santos','Reyes','Ramos','Garcia','Flores','Torres'][Math.floor(n/10)],YearLevel:'1',Block:n<35?'BSIT-1A':'BSIT-1B'}))
 const titles=['Purposive Communication','Understanding the Self','Environmental Science']
 for(const [index,code]of ['GE 1','GE 2','GE ELEC-ES'].entries()){
  const syllabus:any={id:`learning-${index}`,courseCode:code,courseTitle:titles[index],status:'active',sample:false,courseDescription:`Practical learning and evidence-based applications in ${titles[index]}.`,courseInfo:{academicYear:'2026-2027',periodOffered:'1st Semester',units:'3'},courseOutline:learningOutline(code,titles[index]!)}
  const pdf=await syllabusPdf(syllabus);syllabus.approvedFile={name:`${code.replaceAll(' ','-')}-syllabus.pdf`,size:pdf.length,base64:pdf.toString('base64'),sha256:createHash('sha256').update(pdf).digest('hex'),uploadedAt:'2026-11-25T00:00:00Z',approvalAttested:true}
  workspace.syllabi.push(syllabus)
  const cid=index?digest(code):'a'.repeat(32),parent=`course-${index}`
  records.courses.push({id:cid,instructor_id:monitoringOwner,instructor_name:'Andrea Reyes',syllabus_id:syllabus.id,course_code:code,course_title:titles[index],active:true,syllabus_status:'active',source_revision:1,academic_year:'2026-2027',semester:'1st Semester',outline:syllabus.courseOutline})
  records.institutional.push({kind:'courses',record_key:code,data:{CourseCode:code,CourseTitle:titles[index],Units:'3',YearLevel:'1',Semester:'1'}},{kind:'loads',record_key:parent,data:{CourseCode:code,CourseTitle:titles[index],InstructorID:monitoringOwner,InstructorName:'Andrea Reyes',LoadType:'course',AcademicYear:'2026-2027',Semester:'1st Semester',TeachingSyllabusID:syllabus.id}})
  for(const [bi,block]of ['BSIT-1A','BSIT-1B'].entries()){
   records.institutional.push({kind:'loads',record_key:`${code}|${block}`,data:{CourseCode:code,CourseTitle:titles[index],InstructorID:monitoringOwner,InstructorName:'Andrea Reyes',LoadType:'class',ParentLoadKey:parent,Block:block,AcademicYear:'2026-2027',Semester:'1st Semester',TeachingSyllabusID:syllabus.id,ScheduleDays:['M','T','W','TH','F','S'][index],ScheduleTime:'08:00 - 10:00',Room:`Learning Room ${index+1}`}})
   const roster=students.filter(s=>s.Block===block)
   workspace.registrations.push({id:`roster-${index}-${bi}`,courseCode:code,blockSection:block,academicYear:'2026-2027',semester:'1st Semester',status:'active',students:roster})
   records.enrollments.push(...roster.map(s=>({course_id:cid,instructor_id:monitoringOwner,student_email:s.Email,display_name:s.Name,student_ref:s.StudentID,block_section:block,year_level:1})))
   records.classCodes.push({course_code:code,block,academic_year:'2026-2027',semester:'1st Semester',code:`AB${index+2}${bi+2}QRS`,load_key:`${code}|${block}`,parent_key:parent})
  }
  for(const row of syllabus.courseOutline)for(const [id,item]of Object.entries(teachingItems(syllabus,row,row.sections[0],'2026-11-25T00:00:00Z'))){
   const value:any=item;value.status=row.week<=5?'published':row.week===18?'draft':'checked';workspace.content[id]=value
   if(value.status!=='published')continue
   const content=structuredClone(value.content);if(content.questions)content.questions=content.questions.map(({correctIndex:_key,explanation:_why,...q}:any)=>q)
   records.publications.push({id:digest(id),course_id:cid,instructor_id:monitoringOwner,workspace_item_id:id,week:row.week,type:value.type,title:content.title,content,source_version:monitoringVersion,active:true,release_at:null,due_at:value.dueAt})
  }
  const assessments=records.publications.filter((p:any)=>p.course_id===cid&&p.type==='assessment'&&p.content.assessmentRole!=='reflection'&&p.week!==3).slice(0,3)
  const materials=records.publications.filter((p:any)=>p.course_id===cid&&p.type==='material').slice(0,3)
  const reflection=records.publications.find((p:any)=>p.course_id===cid&&p.content.assessmentRole==='reflection')
  students.forEach((student,n)=>{
   assessments.forEach((p:any,number:number)=>records.attempts.push({id:`${digest(`${cid}:${n}:${number}`).slice(0,8)}-1111-4111-8111-111111111111`,publication_id:p.id,instructor_id:monitoringOwner,student_id:n?'learner-'+n:monitoringOwner,student_email:student.Email,source_version:monitoringVersion,score:3+(n+number)%3,max_score:5,grading_status:'graded',attempt_no:1,answers:[0,1,0,2,'I compared a practical example with a checkable result.'],question_scores:Array.from({length:5},(_,i)=>i<3+(n+number)%3?1:0),topic_scores:[{topic:p.content.questions[0].topic,score:3+(n+number)%3,max_score:5}],submitted_at:'2026-11-25T02:00:00Z'}))
   if(n%13===0)records.attempts.push({id:`reflection-${index}-${n}`,publication_id:reflection.id,instructor_id:monitoringOwner,student_id:n?'learner-'+n:monitoringOwner,student_email:student.Email,source_version:monitoringVersion,score:0,max_score:5,grading_status:'pending_review',attempt_no:1,answers:Array(5).fill('I connected the main idea with a practical example, recorded the observation and explained a limitation.'),question_scores:Array(5).fill(null),topic_scores:[],submitted_at:'2026-11-25T02:30:00Z'})
   materials.forEach((p:any,number:number)=>{records.accesses.push({publication_id:p.id,instructor_id:monitoringOwner,student_email:student.Email,first_opened_at:'2026-11-25T01:00:00Z'});records.reading.push({publication_id:p.id,instructor_id:monitoringOwner,student_email:student.Email,source_version:monitoringVersion,sections_read:number?2:4,total_sections:4,updated_at:'2026-11-25T01:15:00Z',completed_at:number?null:'2026-11-25T01:15:00Z'})})
  })
  records.announcements.push({id:`announcement-${index}`,instructor_id:monitoringOwner,course_code:code,academic_year:'2026-2027',semester:'1st Semester',title:'Weekly learning plan',body:'Read the worked examples, complete the concept checks and submit an applied explanation. Use the private discussion for questions about individual work.',created_at:'2026-11-25T00:00:00Z',updated_at:'2026-11-25T00:00:00Z',attachments:[]})
 }
 const projection=()=>role==='student'?{...records,courses:records.courses,enrollments:records.enrollments.filter((e:any)=>e.student_email==='ui.fixture@example.invalid'),attempts:records.attempts.filter((a:any)=>a.student_email==='ui.fixture@example.invalid'),accesses:records.accesses.filter((a:any)=>a.student_email==='ui.fixture@example.invalid'),reading:records.reading.filter((a:any)=>a.student_email==='ui.fixture@example.invalid'),institutional:[],classCodes:[]}:records
 await academicUI(page,async()=>({json:projection()}),role,{full_name:role==='student'?'Lina Cruz':'Andrea Reyes'})
 await page.route('**/api/ai?action=academic',route=>{if(route.request().method()!=='GET'){writes.push(route.request().postDataJSON());return route.fulfill({status:500,json:{error:{message:'Capture does not perform academic commands.'}}})}return route.fulfill({json:projection()})})
 await page.route('**/api/ai?action=workspace*',route=>route.fulfill({json:{mode:'cloud',revision:1,data:role==='student'?{syllabi:[],content:{},registrations:[]}:workspace}}))
 return {records,workspace,writes}
}

export async function academicPopulationScene(page:Page,role:string,shot:(name:string)=>Promise<void>=async()=>{}){
 const fixture=await populatedAcademicUI(page,role)
 await page.goto('/#/dashboard');await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible({timeout:20000});await shot(`${role}-home`)
 if(role==='instructor'){
  await page.goto('/#/dashboard?course=GE%201&block=BSIT-1A&tab=announcements');await expect(page.getByRole('region',{name:'Class Code',exact:true})).toContainText('AB22QRS');await shot('instructor-announcements')
  await page.getByRole('button',{name:'Scores',exact:true}).click();await expect(page.getByText('Assessment score radar',{exact:true})).toBeVisible();await shot('instructor-scores')
 }else{
  await page.getByRole('region',{name:'Your classes'}).getByRole('button',{name:/^Open GE 1 /}).click();await page.getByRole('button',{name:'Scores',exact:true}).click();await expect(page.getByRole('region',{name:'Personal assessment results'})).toBeVisible();await shot('student-scores')
 }
 await page.reload();await expect(page.getByRole('button',{name:'Scores',exact:true})).toHaveAttribute('aria-pressed','true',{timeout:20000})
 expect(fixture.writes).toEqual([])
}
