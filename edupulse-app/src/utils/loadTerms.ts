import {CURRENT_TERM,termKey} from './teachingLoad'
import type {AcademicData} from '../components/academic/academicData'
export const CURRENT_LOAD_TERM=termKey(CURRENT_TERM.academicYear,CURRENT_TERM.semester)
export const NEXT_LOAD_TERM='2026-2027|2nd Semester'
export const validLoadTerm=(term:string)=>['all','unspecified'].includes(term)||/^20\d{2}-20\d{2}\|(1st Semester|2nd Semester|Summer)$/.test(term)
export const isWritableLoadTerm=(term:string)=>term===CURRENT_LOAD_TERM||term===NEXT_LOAD_TERM
export function loadTerm(year:string,semester:string){
 const canonical=/^(?:1|first)/i.test(semester)?'1st Semester':/^(?:2|second)/i.test(semester)?'2nd Semester':/summer/i.test(semester)?'Summer':semester
 return year&&canonical?termKey(year,canonical):'unspecified'
}
export function loadTermOptions(data:AcademicData){
 const options=new Map([[CURRENT_LOAD_TERM,'Current · 1st Semester · AY 2026–2027'],['2026-2027|2nd Semester','Next · 2nd Semester · AY 2026–2027'],['2025-2026|2nd Semester','Previous · 2nd Semester · AY 2025–2026']])
 for(const course of [...data.courses,...(data.assignedCourses||[])]){const key=loadTerm(course.academic_year||'',course.semester||'');if(key!=='unspecified'&&!options.has(key))options.set(key,`${course.semester} · AY ${course.academic_year}`)}
 for(const row of data.institutional||[])if(row.kind==='loads'||row.kind==='course_terms'){
  const key=loadTerm(row.data.AcademicYear||'',row.data.Semester||'')
  if(!options.has(key))options.set(key,key==='unspecified'?'Term not recorded':`${row.data.Semester} · AY ${row.data.AcademicYear}`)
 }
 return [...options]
}
export function recordsForLoadTerm(data:AcademicData,term:string):AcademicData{
 if(term==='all')return data
 const raw=data.institutional||[],hasTerms=raw.some(row=>row.kind==='course_terms')
 const loads=raw.filter(row=>row.kind==='loads'&&loadTerm(row.data.AcademicYear||'',row.data.Semester||'')===term)
 const catalog=hasTerms?raw.filter(row=>row.kind==='course_terms'&&loadTerm(row.data.AcademicYear||'',row.data.Semester||'')===term).map(row=>({...row,kind:'courses',record_key:row.data.CourseCode}))
  :raw.filter(row=>row.kind==='courses'&&loadTerm(row.data.AcademicYear||CURRENT_TERM.academicYear,row.data.Semester||CURRENT_TERM.semester)===term)
 const courses=data.courses.filter(course=>course.academic_year&&course.semester?loadTerm(course.academic_year,course.semester)===term:loads.some(row=>row.data.InstructorID===course.instructor_id&&row.data.CourseCode===course.course_code)||term===CURRENT_LOAD_TERM)
 const ids=new Set(courses.map(course=>course.id)),publications=data.publications.filter(item=>ids.has(item.course_id)),pubs=new Set(publications.map(item=>item.id))
 return {...data,courses,publications,enrollments:data.enrollments.filter(row=>ids.has(row.course_id)),attempts:data.attempts.filter(row=>pubs.has(row.publication_id)),accesses:data.accesses.filter(row=>pubs.has(row.publication_id)),reading:data.reading?.filter(row=>pubs.has(row.publication_id)),sessions:data.sessions?.filter(row=>pubs.has(row.publication_id)),deliverySchedules:data.deliverySchedules?.filter(row=>ids.has(row.course_id)),
  assignedCourses:data.assignedCourses?.filter(row=>ids.has(row.id)||loadTerm(row.academic_year||CURRENT_TERM.academicYear,row.semester||'')===term),institutional:[...raw.filter(row=>!['courses','loads'].includes(row.kind)),...catalog,...loads]}
}
