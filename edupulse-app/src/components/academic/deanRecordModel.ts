import type { AcademicData, Course } from './academicData'
import { currentAttempts } from './academicData'

type BlockCourse = Course & { block_info?: { block?:string; yearLevel?:number|string }[] }
export type DeanStudent = { email:string; name:string; reference:string; years:Set<number>; courseIds:Set<string>; blocks:Set<string> }
export type DeanBlock = { id:string; name:string; year:number|null; mixed:boolean; students:DeanStudent[]; courseIds:Set<string> }
const text = (value:unknown) => String(value ?? '').trim()
const email = (value:unknown) => text(value).toLowerCase()
const year = (value:unknown) => /^[1-9]\d?$/.test(text(value)) ? Number(value) : null
export const syllabusState = (course:Course) => course.syllabus_status || (course.active ? 'active' : 'drafted')
export const approvedSyllabus = (course:Course) => ['active','approved_uploaded'].includes(syllabusState(course))
export const notRoutedSyllabus = (course:Course) => ['drafted','checked'].includes(syllabusState(course))
export const yearLabel = (block:Pick<DeanBlock,'year'|'mixed'>) => block.mixed ? 'Mixed year levels' : block.year ? `Year ${block.year}` : 'Year level not recorded'

/** Read only the supplied authorized projection. Import rows enrich labels, never restore withdrawn memberships. */
export function deanRecords(data:AcademicData, now=Date.now()) {
  const byCourse=new Map(data.courses.map(course=>[course.id,course as BlockCourse]))
  const rosters=(data.institutional||[]).filter(row=>row.kind==='rosters').map(row=>row.data)
  const students=new Map<string,DeanStudent>(),blocks=new Map<string,DeanBlock>()
  const member=(entry:AcademicData['enrollments'][number], previous?:DeanStudent):DeanStudent=>{
    const address=email(entry.student_email)
    const recorded=rosters.find(row=>email(row.Email)===address&&text(row.Block)===text(entry.block_section))
    const info=byCourse.get(entry.course_id)?.block_info?.find(row=>text(row.block)===text(entry.block_section))
    const level=year(entry.year_level)??year(recorded?.YearLevel)??year(info?.yearLevel)
    const result=previous||{email:address,name:text(entry.display_name)||text(recorded?.Name)||address,reference:text(entry.student_ref)||text(recorded?.StudentID),years:new Set<number>(),courseIds:new Set<string>(),blocks:new Set<string>()}
    if(level)result.years.add(level)
    result.courseIds.add(entry.course_id)
    if(text(entry.block_section))result.blocks.add(text(entry.block_section))
    return result
  }
  const memberships=new Set<string>()
  for(const entry of data.enrollments){
    if(!byCourse.has(entry.course_id)||!email(entry.student_email))continue
    const address=email(entry.student_email),name=text(entry.block_section)
    memberships.add(`${entry.course_id}\0${address}`)
    students.set(address,member(entry,students.get(address)))
    if(!name)continue
    const id=name.toLowerCase(),block=blocks.get(id)||{id,name,year:null,mixed:false,students:[],courseIds:new Set<string>()}
    const prior=block.students.find(student=>student.email===address)
    if(prior)member(entry,prior);else block.students.push(member(entry))
    block.courseIds.add(entry.course_id);blocks.set(id,block)
  }
  const order=(a:DeanStudent,b:DeanStudent)=>a.name.localeCompare(b.name)||a.email.localeCompare(b.email)
  const blockRows=[...blocks.values()].map(block=>{
    const levels=new Set(block.students.flatMap(student=>[...student.years]))
    block.mixed=levels.size>1;block.year=levels.size===1?[...levels][0]:null
    block.students.sort(order);return block
  }).sort((a,b)=>(a.year??99)-(b.year??99)||a.name.localeCompare(b.name))
  const records=new Map<string,{code:string;title:string;ids:string[]}>()
  for(const row of (data.institutional||[]).filter(row=>row.kind==='courses')){
    const code=text(row.data.CourseCode);if(code)records.set(code.toLowerCase(),{code,title:text(row.data.CourseTitle),ids:[]})
  }
  for(const course of data.courses){
    const key=text(course.course_code).toLowerCase(),row=records.get(key)||{code:course.course_code,title:course.course_title,ids:[]}
    row.ids.push(course.id);row.title||=course.course_title;records.set(key,row)
  }
  const released=data.publications.filter(item=>byCourse.has(item.course_id)&&item.active&&(!item.release_at||new Date(item.release_at).getTime()<=now))
  const attempts=currentAttempts({...data,publications:released}),accesses=data.accesses.filter(access=>released.some(pub=>pub.id===access.publication_id))
  const loadedCodes=new Set([...data.courses.filter(course=>course.instructor_id).map(course=>text(course.course_code).toLowerCase()),...(data.institutional||[]).filter(row=>row.kind==='loads').map(row=>text(row.data.CourseCode).toLowerCase())].filter(Boolean))
  const people=new Map((data.faculty||[]).map(person=>[person.id,{id:person.id,name:person.name||person.email||person.id}]))
  for(const course of data.courses)if(course.instructor_id&&!people.has(course.instructor_id))people.set(course.instructor_id,{id:course.instructor_id,name:course.instructor_name||course.instructor_id})
  const activity=(courseIds:Set<string>,studentEmail?:string)=>{
    const publications=released.filter(pub=>courseIds.has(pub.course_id)),ids=new Set(publications.map(pub=>pub.id))
    const submissions=attempts.filter(attempt=>ids.has(attempt.publication_id)&&(!studentEmail||email(attempt.student_email)===studentEmail))
    const opens=accesses.filter(access=>ids.has(access.publication_id)&&(!studentEmail||email(access.student_email)===studentEmail))
    return {publications:publications.length,submissions:submissions.length,opens:opens.length,testSubmissions:submissions.filter(attempt=>attempt.is_test).length,testOpens:opens.filter(access=>access.is_test).length}
  }
  return {courses:[...records.values()].sort((a,b)=>a.code.localeCompare(b.code)),loadedCodes,students:[...students.values()].sort(order),blocks:blockRows,faculty:[...people.values()].sort((a,b)=>a.name.localeCompare(b.name)),memberships:memberships.size,released,attempts,accesses,activity}
}

// ---- Dean course loading and account directory -------------------------------------------
export type DeanInstructor = { id:string; name:string; email:string; status:'active'|'suspended'; employee_id:string; has_masters:boolean|null; degree:string; specialization:string; last_sign_in_at?:string|null }
export type DeanAccount = { id:string; student_number:string; name:string; surname:string; first_name:string; middle_name:string; email:string; year_level:number|null; program:string; status:'active'|'suspended'; block:string|null; type:string|null; last_sign_in_at?:string|null }
export type LoadRow = { key:string; code:string; block:string; semester:string; instructorId:string; instructorName:string; hasMasters:string; specialization:string }
type Directory = { instructors?:DeanInstructor[]; students?:DeanAccount[]; irregular?:Record<string,string>[] }
const key = (value:unknown) => text(value).toUpperCase().replace(/[\s-]+/g,'')

export function loadRows(data:AcademicData):LoadRow[] {
  return (data.institutional||[]).filter(row=>row.kind==='loads').map(row=>({key:row.record_key,code:text(row.data.CourseCode),block:text(row.data.Block),semester:text(row.data.Semester),
    instructorId:text(row.data.InstructorID),instructorName:text(row.data.InstructorName)||text(row.data.InstructorID),hasMasters:text(row.data.HasMasters),specialization:text(row.data.Specialization)}))
    .sort((a,b)=>a.code.localeCompare(b.code)||a.block.localeCompare(b.block))
}
/** Every recorded course with its curriculum placement, class loads and syllabus owners. */
export function courseCatalog(data:AcademicData, model:ReturnType<typeof deanRecords>, curriculum:(code:string)=>{units?:number;yearLevel?:number;semester?:number|string}|undefined=()=>undefined) {
  const loads=loadRows(data),records=new Map((data.institutional||[]).filter(r=>r.kind==='courses').map(r=>[key(r.data.CourseCode),r.data]))
  return model.courses.map(course=>{
    const record=records.get(key(course.code))||{},plan=curriculum(course.code)
    const year=Number(record.YearLevel)||plan?.yearLevel||null,semesterValue=text(record.Semester)||(plan?.semester===1?'1st Semester':plan?.semester===2?'2nd Semester':plan?.semester==='summer'?'Summer':'')
    const ids=new Set(course.ids),owners=[...new Set(data.courses.filter(c=>ids.has(c.id)).map(c=>c.instructor_name||model.faculty.find(p=>p.id===c.instructor_id)?.name||''))].filter(Boolean)
    return {...course,units:text(record.Units)||(plan?.units?String(plan.units):''),year,semester:semesterValue,classification:text(record.Classification),prerequisites:text(record.Prerequisites),
      loads:loads.filter(l=>key(l.code)===key(course.code)),owners,students:new Set(data.enrollments.filter(e=>ids.has(e.course_id)).map(e=>email(e.student_email))).size,
      approved:data.courses.some(c=>ids.has(c.id)&&approvedSyllabus(c))}
  })
}
/** Live accounts when the directory is available; otherwise a read-only view built from records. */
export function deanDirectory(data:AcademicData, model:ReturnType<typeof deanRecords>) {
  const directory=(data as {directory?:unknown}).directory as Directory|undefined,loads=loadRows(data)
  const masters=(id:string)=>{const value=loads.find(l=>l.instructorId===id&&l.hasMasters)?.hasMasters.toLowerCase();return value?['yes','true','1','y'].includes(value):null}
  const instructors:DeanInstructor[]=directory?.instructors?.map(i=>({...i,has_masters:i.has_masters??masters(i.id),specialization:i.specialization||loads.find(l=>l.instructorId===i.id&&l.specialization)?.specialization||''}))
    ||model.faculty.map(p=>({id:p.id,name:p.name,email:(data.faculty||[]).find(f=>f.id===p.id)?.email||'',status:'active',employee_id:'',has_masters:masters(p.id),degree:'',specialization:loads.find(l=>l.instructorId===p.id&&l.specialization)?.specialization||''}))
  const students:DeanAccount[]=directory?.students||model.students.map(s=>{const [first='',...rest]=s.name.split(' ');return {id:s.reference||s.email,student_number:s.reference,name:s.name,surname:rest.pop()||'',first_name:first,middle_name:rest.join(' '),email:s.email,
    year_level:[...s.years][0]??null,program:'',status:'active',block:[...s.blocks][0]||null,type:'Regular'}})
  return {managed:Boolean(directory),instructors,students,irregular:directory?.irregular||[]}
}
export const isIrregular = (student:Pick<DeanAccount,'block'|'type'>) => /irreg/i.test(student.type||'')||student.block==='IRREGULAR'
/** Per-course delivery for one student: released work, what they opened, assessments taken and their average. */
export function studentCourseProgress(data:AcademicData, model:ReturnType<typeof deanRecords>, address:string) {
  const mine=data.enrollments.filter(e=>email(e.student_email)===email(address))
  return [...new Map(mine.map(e=>[e.course_id,e])).values()].map(entry=>{
    const course=data.courses.find(c=>c.id===entry.course_id),released=model.released.filter(p=>p.course_id===entry.course_id),ids=new Set(released.map(p=>p.id))
    const materials=released.filter(p=>p.type!=='assessment'),assessments=released.filter(p=>p.type==='assessment')
    const opened=new Set(model.accesses.filter(a=>ids.has(a.publication_id)&&email(a.student_email)===email(address)).map(a=>a.publication_id))
    const attempts=model.attempts.filter(a=>ids.has(a.publication_id)&&email(a.student_email)===email(address)),graded=attempts.filter(a=>a.grading_status!=='pending_review')
    const score=graded.reduce((sum,a)=>sum+a.score,0),max=graded.reduce((sum,a)=>sum+a.max_score,0)
    return {courseId:entry.course_id,code:course?.course_code||'',title:course?.course_title||'',block:entry.block_section||'',instructor:course?.instructor_name||model.faculty.find(p=>p.id===course?.instructor_id)?.name||'',
      materials:materials.length,opened:materials.filter(p=>opened.has(p.id)).length,assessments:assessments.length,taken:attempts.length,pending:attempts.length-graded.length,average:max>0?Math.round(score/max*100):null}
  }).sort((a,b)=>a.code.localeCompare(b.code))
}
