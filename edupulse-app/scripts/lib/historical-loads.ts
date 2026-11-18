import {createHash} from 'node:crypto'
import type {TeachingLoadDocument} from '../../src/utils/teachingLoad'

type Instructor={id:string;name:string;email:string}
type Course={code:string;title:string;units:number}
type Source={filename:string;sha256:string;academicYear:string;semester:string}
/** Explicitly reviewed identity/course bindings only. Source suffixes never become blocks. */
export function historicalLoadRecords(doc:TeachingLoadDocument,people:Record<string,Instructor>,courses:Record<string,Course>,source:Source){
 if(!/^[a-f0-9]{64}$/.test(source.sha256)||!/^20\d{2}-20\d{2}$/.test(source.academicYear)||Number(source.academicYear.slice(0,4))>=2026||source.semester!=='2nd Semester')throw new Error('Expected a verified completed-semester source.')
 if(!doc.entries.length||doc.warnings.some(w=>/unreadable|could not|no table rows/i.test(w)))throw new Error('Every source page must be readable before backfill.')
 const groups=new Map<string,{kind:string;record_key:string;data:Record<string,unknown>}>(),catalog=new Map<string,Course>(),seen=new Set<string>()
 for(const entry of doc.entries){
  const teacher=people[entry.instructor],course=courses[entry.subjectCode],position=`${entry.page}:${entry.row}`
  if(!teacher?.id||!teacher.name||!teacher.email||!course?.code||!course.title||course.units!==entry.units||seen.has(position)||entry.academicYear!==source.academicYear||entry.semester!==source.semester||!['Bachelor','Masters'].includes(entry.degree))throw new Error(`Unreviewed or conflicting source row ${position}.`)
  seen.add(position)
  const prior=catalog.get(course.code);if(prior&&(prior.title!==course.title||prior.units!==course.units))throw new Error('Conflicting semester course definition.')
  catalog.set(course.code,course)
  const key=`historical:${createHash('sha256').update([source.academicYear,source.semester,course.code,teacher.id].join('|')).digest('hex').slice(0,32)}`
  const item=groups.get(key)||{kind:'loads',record_key:key,data:{LoadType:'course',Block:'',CourseCode:course.code,InstructorID:teacher.id,InstructorName:teacher.name,Email:teacher.email,AcademicYear:source.academicYear,Semester:source.semester,HighestDegree:entry.degree,HasMasters:entry.degree==='Masters'?'Yes':'No',SourceInstructor:entry.instructor,SourceFile:source.filename,SourceSHA256:source.sha256,AllocationSource:'approved-historical-teaching-load',SourceRows:[],SourceForms:[]}}
  if(item.data.HighestDegree!==entry.degree)throw new Error('Conflicting degree on the same instructor form.')
  ;(item.data.SourceRows as unknown[]).push({page:entry.page,row:entry.row,subject_code:entry.subjectCode,source_title:entry.title,source_instructor:entry.instructor,source_year:entry.academicYear,source_semester:entry.semester,degree:entry.degree,time:entry.time,days:entry.days,units:entry.units,lecture:entry.lecture,lab:entry.lab,hours:entry.hours,computed_hours:entry.computedHours,room:entry.room,students:entry.students,program:entry.program,warnings:entry.warnings})
  item.data.SourceForms=doc.totals.filter(t=>t.instructor===entry.instructor)
  groups.set(key,item)
 }
 return {catalog:[...catalog.values()].map(c=>({kind:'course_terms',record_key:[source.academicYear,source.semester,c.code].join('|'),data:{CourseCode:c.code,CourseTitle:c.title,Units:String(c.units),AcademicYear:source.academicYear,Semester:source.semester,Status:'active',SourceFile:source.filename,SourceSHA256:source.sha256,AllocationSource:'approved-historical-teaching-load'}})),loads:[...groups.values()]}
}
