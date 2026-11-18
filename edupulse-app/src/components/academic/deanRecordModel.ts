import type { AcademicData, Course } from './academicData'
import { currentAttempts } from './academicData'
import { assignBlocks } from '../../utils/blockSections'

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
  const publicationCourses=new Map(released.map(pub=>[pub.id,pub.course_id]))
  const activeMemberships=new Set(data.enrollments.filter(member=>!member.suspended).map(member=>`${member.course_id}\0${email(member.student_email)}`))
  const loadedCodes=new Set((data.institutional||[]).filter(row=>row.kind==='loads').map(row=>text(row.data.CourseCode).toLowerCase()).filter(Boolean))
  const people=new Map((data.faculty||[]).map(person=>[person.id,{id:person.id,name:person.name||person.email||person.id}]))
  for(const course of data.courses)if(course.instructor_id&&!people.has(course.instructor_id))people.set(course.instructor_id,{id:course.instructor_id,name:course.instructor_name||course.instructor_id})
  const activity=(courseIds:Set<string>,studentEmail?:string)=>{
    const publications=released.filter(pub=>courseIds.has(pub.course_id)),ids=new Set(publications.map(pub=>pub.id))
    const belongs=(row:{publication_id:string;student_email?:string})=>activeMemberships.has(`${publicationCourses.get(row.publication_id)}\0${email(row.student_email)}`)
    const submissions=attempts.filter(attempt=>ids.has(attempt.publication_id)&&belongs(attempt)&&(!studentEmail||email(attempt.student_email)===studentEmail))
    const opens=accesses.filter(access=>ids.has(access.publication_id)&&belongs(access)&&(!studentEmail||email(access.student_email)===studentEmail))
    return {publications:publications.length,submissions:submissions.length,opens:opens.length,testSubmissions:submissions.filter(attempt=>attempt.is_test).length,testOpens:opens.filter(access=>access.is_test).length}
  }
  return {courses:[...records.values()].sort((a,b)=>a.code.localeCompare(b.code)),loadedCodes,students:[...students.values()].sort(order),blocks:blockRows,faculty:[...people.values()].sort((a,b)=>a.name.localeCompare(b.name)),memberships:memberships.size,released,attempts,accesses,activity}
}

// ---- Dean course loading and account directory -------------------------------------------
export type DeanInstructor = { id:string; name:string; email:string; status:'active'|'suspended'; employee_id:string; has_masters:boolean|null; degree:string; specialization:string; last_sign_in_at?:string|null; historical?:boolean }
export type DeanAccount = { id:string; student_number:string; name:string; surname:string; first_name:string; middle_name:string; email:string; year_level:number|null; department?:string;program:string; status:'active'|'suspended'; block:string|null; type:string|null; last_sign_in_at?:string|null }
export type LoadRow = { manual?:boolean; key:string; code:string; title?:string; block:string; semester:string; academicYear:string; instructorId:string; instructorName:string; hasMasters:string; specialization:string;time:string;days:string;room:string;units:string;lecture:string;lab:string;hours:string;computedHours:string;students:string;program:string;source:string;degree:string;sourceCode:string;sourceTitle:string;sourceInstructor:string;sourceYear:string;sourceSemester:string;loadType:string;parentKey:string;updatedAt?:string;sourceRows?:Record<string,unknown>[];sourceForms?:Record<string,unknown>[];roster?:Record<string,unknown>[]|null;schedules?:Record<string,unknown>[];allocation?:string }
/** A block section of a course load: from its block record, or still only on the retained teaching-load rows. */
export type BlockSection = { key:string; block:string; slots:{days:string;time:string;room:string}[]; students:{email:string;name:string;id:string}[]; listed:boolean; recorded:boolean }
type Directory = { instructors?:DeanInstructor[]; students?:DeanAccount[]; irregular?:Record<string,string>[] }
const sourceTotal=(rows:unknown,field:string)=>{if(!Array.isArray(rows)||!rows.length)return '';const values=rows.map(r=>r[field]).filter(v=>typeof v==='number');return values.length===rows.length?String(values.reduce((n,v)=>n+v,0)):''}
const key = (value:unknown) => text(value).toUpperCase().replace(/[\s-]+/g,'')

/** Repository ownership alone is not a teaching load. Management inspects assigned courses only. */
export function assignedInstructorSyllabi(data:AcademicData,instructorId:string) {
  const assigned=(data.institutional||[]).filter(r=>r.kind==='loads'&&r.data.InstructorID===instructorId&&!/^(inactive|suspended|withdrawn|deleted)$/i.test(r.data.Status||''))
  const bound=new Set(assigned.map(r=>r.data.TeachingSyllabusID).filter(Boolean)),chosen=new Map<string,Course>()
  const semester=(v:string)=>/^(1|first)/i.test(v)?'1':/^(2|second)/i.test(v)?'2':v.toLowerCase()
  for(const {data:load} of assigned){
    const candidates=data.courses.filter(course=>course.syllabus_id?.startsWith('assignment:')!==true&&course.instructor_id===instructorId&&key(course.course_code)===key(load.CourseCode)
      &&(load.TeachingSyllabusID?course.syllabus_id===load.TeachingSyllabusID:!bound.has(course.syllabus_id||''))
      &&(!course.academic_year||!load.AcademicYear||course.academic_year===load.AcademicYear)
      &&(!course.semester||!load.Semester||semester(course.semester)===semester(load.Semester)))
      .sort((a,b)=>Number(b.active)-Number(a.active)||String(b.updated_at||'').localeCompare(String(a.updated_at||'')))
    if(candidates[0])chosen.set(candidates[0].id,candidates[0])
  }
  return [...chosen.values()]
}

export function loadRows(data:AcademicData,includeCourses=false):LoadRow[] {
  return (data.institutional||[]).filter(row=>row.kind==='loads'&&(includeCourses||row.data.LoadType!=='course')).map(row=>({manual:row.data.ManualLoadDetails==='Yes',loadType:row.data.LoadType||'',parentKey:row.data.ParentLoadKey||'',roster:Array.isArray(row.data.Students)?row.data.Students as unknown as Record<string,unknown>[]:null,schedules:Array.isArray(row.data.Schedules)?row.data.Schedules as unknown as Record<string,unknown>[]:[],allocation:text(row.data.AllocationSource),sourceRows:Array.isArray(row.data.SourceRows)?row.data.SourceRows:[],sourceForms:Array.isArray(row.data.SourceForms)?row.data.SourceForms:[],updatedAt:row.updated_at,key:row.record_key,code:text(row.data.CourseCode),block:text(row.data.Block),semester:text(row.data.Semester),academicYear:text(row.data.AcademicYear),
    sourceCode:text(row.data.SourceSubjectCode),sourceTitle:text(row.data.SourceCourseTitle),sourceInstructor:text(row.data.SourceInstructor),sourceYear:text(row.data.SourceAcademicYear),sourceSemester:text(row.data.SourceSemester),
    time:text(row.data.ScheduleTime),days:text(row.data.ScheduleDays),room:text(row.data.Room),units:row.data.ManualLoadDetails==='Yes'?text(row.data.Units):sourceTotal(row.data.SourceRows,'units')||text(row.data.Units),lecture:text(row.data.LectureUnits),lab:text(row.data.LabUnits),hours:text(row.data.DeclaredHours),computedHours:row.data.ManualLoadDetails==='Yes'?text(row.data.ComputedHours):sourceTotal(row.data.SourceRows,'computed_hours')||text(row.data.ComputedHours),students:text(row.data.StudentCount),program:text(row.data.Program),degree:text(row.data.HighestDegree),source:[row.data.SourceFile,row.data.SourcePage?`page ${row.data.SourcePage}`:''].filter(Boolean).join(' · '),
    title:text(row.data.CourseTitle),instructorId:text(row.data.InstructorID),instructorName:text(row.data.InstructorName)||text(row.data.InstructorID),hasMasters:text(row.data.HasMasters),specialization:text(row.data.Specialization)}))
    .sort((a,b)=>a.code.localeCompare(b.code)||a.block.localeCompare(b.block))
}
export function courseAssignments(data:AcademicData){
 const all=loadRows(data,true),classes=all.filter(row=>row.loadType!=='course'),parents=all.filter(row=>row.loadType==='course')
 const same=(a:LoadRow,b:LoadRow)=>key(a.code)===key(b.code)&&a.instructorId===b.instructorId&&a.academicYear===b.academicYear&&a.semester===b.semester
 const linked=(parent:LoadRow)=>classes.filter(row=>row.parentKey===parent.key||!row.parentKey&&same(row,parent))
 const result=parents.map(parent=>{const sections=blockSections(data,parent,linked(parent),classes);return {...parent,sections,blocks:sections.map(s=>s.block),legacy:false}})
 for(const row of classes){
  if(parents.some(parent=>row.parentKey===parent.key||!row.parentKey&&same(row,parent)))continue
  const prior=result.find(item=>item.legacy&&same(item,row))
  if(prior){if(!prior.blocks.includes(row.block)){prior.blocks.push(row.block);prior.sections.push(...blockSections(data,row,[row],classes))}}else{const sections=blockSections(data,row,[row],classes);result.push({...row,sections,blocks:sections.map(s=>s.block),legacy:true})}
 }
 return result.sort((a,b)=>a.code.localeCompare(b.code)||a.instructorName.localeCompare(b.instructorName))
}
/** Block records first; blocks still only on the retained teaching-load rows follow (printed letter, or the next letter
 * free of other instructors' blocks in schedule order). Students come from the block's class list and enrollments. */
function blockSections(data:AcademicData,parent:LoadRow,linked:LoadRow[],classes:LoadRow[]):BlockSection[]{
 const enrolled=(block:string)=>{const ids=new Set(data.courses.filter(c=>c.instructor_id===parent.instructorId&&key(c.course_code)===key(parent.code)).map(c=>c.id));return data.enrollments.filter(e=>!e.suspended&&ids.has(e.course_id)&&text(e.block_section).toUpperCase()===block.toUpperCase()).map(e=>({email:email(e.student_email),name:text(e.display_name)||email(e.student_email),id:text(e.student_ref)}))}
 const people=(roster:Record<string,unknown>[]|null|undefined,block:string)=>{const seen=new Map<string,{email:string;name:string;id:string}>();for(const s of [...(roster||[]).map(r=>({email:email(r.Email),name:text(r.Name)||email(r.Email),id:text(r.StudentID)})),...enrolled(block)])if(s.email&&!seen.has(s.email))seen.set(s.email,s);return [...seen.values()].sort((a,b)=>a.name.localeCompare(b.name))}
 const sections:BlockSection[]=linked.filter(row=>row.block).map(row=>{const slots=(row.schedules?.length?row.schedules:[{days:row.days,time:row.time,room:row.room}]).map(s=>({days:text(s.days),time:text(s.time),room:text(s.room)})).filter(s=>s.days||s.time||s.room);const students=people(row.roster,row.block);return {key:row.key,block:row.block,slots,students,listed:Boolean(row.roster?.length)||students.length>0,recorded:true}})
 const others=classes.filter(row=>row.instructorId!==parent.instructorId&&key(row.code)===key(parent.code)&&row.academicYear===parent.academicYear&&row.semester===parent.semester).map(row=>row.block)
 const sources=(parent.sourceRows||[]).map(r=>({subjectCode:text(r.subject_code),days:text(r.days),time:text(r.time),room:text(r.room)}))
 for(const [source,block] of assignBlocks(sources,others)){
  const prior=sections.find(s=>s.block.toUpperCase()===block)
  if(prior){if((!prior.recorded||!prior.slots.length)&&!prior.slots.some(s=>s.days===source.days&&s.time===source.time))prior.slots.push({days:source.days,time:source.time,room:source.room});continue}
  if(block){const students=people(null,block);sections.push({key:`${parent.key}#${block}`,block,slots:[{days:source.days,time:source.time,room:source.room}],students,listed:students.length>0,recorded:false})}
 }
 return sections.sort((a,b)=>a.block.localeCompare(b.block,undefined,{numeric:true}))
}
export const slotText=(section:Pick<BlockSection,'slots'>)=>section.slots.map(s=>[s.days,s.time,s.room&&`Room ${s.room}`].filter(Boolean).join(' · ')).filter(Boolean).join('; ')||'Schedule not recorded'
/** Each semester catalog entry keeps actual instructor assignments separate from confirmed classes. */
export function courseCatalog(data:AcademicData, model:ReturnType<typeof deanRecords>, curriculum:(code:string)=>{units?:number;yearLevel?:number;semester?:number|string}|undefined=()=>undefined) {
  const loads=loadRows(data),assignments=courseAssignments(data),records=new Map((data.institutional||[]).filter(r=>r.kind==='courses').map(r=>[key(r.data.CourseCode),r]))
  return model.courses.map(course=>{
    const entry=records.get(key(course.code)),record=entry?.data||{},plan=curriculum(course.code)
    const year=null,semesterValue=text(record.Semester)||(plan?.semester===1?'1st Semester':plan?.semester===2?'2nd Semester':plan?.semester==='summer'?'Summer':'')
    const ids=new Set(course.ids),owners=[...new Set(data.courses.filter(c=>ids.has(c.id)).map(c=>c.instructor_name||model.faculty.find(p=>p.id===c.instructor_id)?.name||''))].filter(Boolean)
    return {...course,status:record.Status||'active',recordKey:entry?.record_key,updatedAt:entry?.updated_at,units:text(record.Units)||(plan?.units?String(plan.units):''),year,semester:semesterValue,classification:text(record.Classification),prerequisites:text(record.Prerequisites),
      loads:loads.filter(l=>key(l.code)===key(course.code)),assignments:assignments.filter(l=>key(l.code)===key(course.code)),owners,students:new Set(data.enrollments.filter(e=>ids.has(e.course_id)).map(e=>email(e.student_email))).size,
      approved:data.courses.some(c=>ids.has(c.id)&&approvedSyllabus(c))}
  }).filter(course=>course.status!=='removed')
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

/** Home blocks exist independently of any course load, syllabus or learner activity. */
export function directoryBlocks(students:DeanAccount[],data:AcademicData){
 const groups=new Map<string,{id:string;name:string;department:string;program:string;year:number|null;mixed:boolean;students:DeanAccount[];courseIds:Set<string>}>()
 const byEmail=new Map<string,Set<string>>()
 for(const row of data.enrollments){const address=email(row.student_email);if(!byEmail.has(address))byEmail.set(address,new Set());byEmail.get(address)!.add(row.course_id)}
 for(const student of students){
  if(!student.block||isIrregular(student))continue
  const id=student.block.toLowerCase(),group=groups.get(id)||{id,name:student.block,department:student.department||'',program:student.program,year:student.year_level,mixed:false,students:[],courseIds:new Set<string>()}
  group.students.push(student)
  for(const course of byEmail.get(email(student.email))||[])group.courseIds.add(course)
  if(group.year!==student.year_level){group.mixed=true;group.year=null}
  groups.set(id,group)
 }
 return [...groups.values()].sort((a,b)=>a.department.localeCompare(b.department)||(a.year??99)-(b.year??99)||a.name.localeCompare(b.name))
}
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
