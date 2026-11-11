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
