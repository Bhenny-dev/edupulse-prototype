import {courseMemberships, emailKey} from '../../utils/courseRoster'
import {currentAttempts, filterAcademic, percent, type AcademicData, type Publication} from './academicData'

export function monitoringCohorts(data:AcademicData, workspace:Parameters<typeof courseMemberships>[0], owner:string|number) {
 const memberships=courseMemberships(workspace,data,owner)
 return data.courses.filter(course=>String(course.instructor_id)===String(owner)).flatMap(course=>{
  const blocks=[...new Set([...data.enrollments.filter(e=>e.course_id===course.id).map(e=>e.block_section||''),...memberships.filter(m=>m.courseCode===course.course_code).map(m=>m.blockSection),...course.block_info?.map((b)=>b.block)||[],...(workspace.registrations||[]).filter((r)=>String(r.uploadedBy)===String(owner)&&r.courseCode===course.course_code&&r.status==='active').map((r)=>r.blockSection),...(data.institutional||[]).filter(r=>r.kind==='loads'&&r.data.CourseCode===course.course_code&&r.data.InstructorID===String(owner)).map(r=>r.data.Block)])]
  return blocks.map(block=>{
   const members=memberships.filter(m=>m.courseCode===course.course_code&&m.blockSection===block).map(member=>{
    const recorded=data.enrollments.find(e=>e.course_id===course.id&&emailKey(e.student_email)===emailKey(member.student.Email))
    const year=Number(member.student.YearLevel)||recorded?.year_level||Number(course.block_info?.find((b)=>b.block===block)?.yearLevel)||null
    return {...member,year:year&&year>=1&&year<=4?year:null,suspended:Boolean(member.suspended??recorded?.suspended)}
   })
   const years=[...new Set(members.map(m=>m.year).filter(Boolean))].sort()
   const recorded=Number(course.block_info?.find((b)=>b.block===block)?.yearLevel)||Number(data.institutional?.find(r=>r.kind==='courses'&&r.data.CourseCode===course.course_code)?.data.YearLevel)
   const year=recorded>=1&&recorded<=4?String(recorded):years.length===1&&members.every(m=>m.year)?String(years[0]):years.length>1?'mixed':'unknown'
   return {id:JSON.stringify([course.id,block]),course,block,year,years,members}
  }).filter(cohort=>cohort.block)
 })
}
export type Cohort=ReturnType<typeof monitoringCohorts>[number]
/** Demonstrations retain their audit history but cannot establish independent student progress. */
export const studentRecorded=(row:{is_test?:boolean|null;admin_actor_id?:unknown})=>row.is_test!==true&&!row.admin_actor_id
export const yearLabel=(year:string)=>year==='mixed'?'Mixed year levels':year==='unknown'?'Year level not recorded':`Year ${year}`
export function cohortRecords(data:AcademicData,cohort:Cohort):AcademicData {
 const result=filterAcademic(data,cohort.course.id,cohort.block),emails=new Set(cohort.members.map(m=>emailKey(m.student.Email)))
 const ids=new Set(result.publications.map(p=>p.id)),matches=(e:{student_email?:string;publication_id:string})=>ids.has(e.publication_id)&&emails.has(emailKey(e.student_email))
 return {...result,enrollments:cohort.members.map(m=>({course_id:cohort.course.id,student_email:emailKey(m.student.Email),student_ref:m.student.StudentID,display_name:m.student.Name,block_section:cohort.block,suspended:m.suspended,year_level:m.year})),attempts:result.attempts.filter(matches).filter(studentRecorded),accesses:result.accesses.filter(matches).filter(studentRecorded),sessions:(data.sessions||[]).filter(matches).filter(studentRecorded),reading:(data.reading||[]).filter(matches).filter(studentRecorded)}
}
export const released=(data:AcademicData,kind:'assessment'|'material',now=Date.now())=>data.publications.filter(p=>p.active&&(kind==='assessment'?p.type==='assessment':p.type!=='assessment')&&(!p.release_at||new Date(p.release_at).getTime()<=now)).sort((a,b)=>a.week-b.week||a.title.localeCompare(b.title))
export function assessmentRows(data:AcademicData) {
 const items=released(data,'assessment'),attempts=currentAttempts({...data,publications:items})
 return data.enrollments.map(student=>{
  const email=emailKey(student.student_email),results=items.map(item=>({item,attempt:attempts.find(a=>a.publication_id===item.id&&emailKey(a.student_email)===email),started:(data.sessions||[]).some(s=>s.publication_id===item.id&&String(s.source_version)===String(item.source_version)&&emailKey(s.student_email)===email)}))
  const marked=results.flatMap(r=>r.attempt&&r.attempt.grading_status!=='pending_review'?[r.attempt]:[])
  return {student,results,submitted:results.filter(r=>r.attempt).length,accessed:results.filter(r=>r.started||r.attempt).length,pending:results.filter(r=>r.attempt?.grading_status==='pending_review').length,average:percent(marked.reduce((n,a)=>n+a.score,0),marked.reduce((n,a)=>n+a.max_score,0)),total:items.length}
 })
}
export function materialState(data:AcademicData,item:Publication,email:string) {
 const access=data.accesses.find(a=>a.publication_id===item.id&&emailKey(a.student_email)===emailKey(email))
 const progress=(data.reading||[]).find(r=>r.publication_id===item.id&&String(r.source_version)===String(item.source_version)&&emailKey(r.student_email)===emailKey(email))
 const total=Array.isArray(item.content?.sections)?item.content.sections.length:0
 const read=progress?Math.min(progress.sections_read,total):0
 return {item,access,read,total,percent:total?Math.round(read/total*100):null,complete:total>0&&read===total,progress}
}
export function materialRows(data:AcademicData) {
 const items=released(data,'material')
 return data.enrollments.map(student=>{
  const results=items.map(item=>materialState(data,item,student.student_email)),total=results.reduce((n,r)=>n+r.total,0),read=results.reduce((n,r)=>n+r.read,0)
  return {student,results,sectionsRead:read,sectionsTotal:total,accessed:results.filter(r=>r.access).length,completed:results.filter(r=>r.complete).length,total:items.length,average:percent(read,total)}
 })
}
