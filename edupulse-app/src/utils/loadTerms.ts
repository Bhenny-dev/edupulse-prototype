import {CURRENT_TERM,termKey} from './teachingLoad'
import type {AcademicData} from '../components/academic/academicData'
export const CURRENT_LOAD_TERM=termKey(CURRENT_TERM.academicYear,CURRENT_TERM.semester)
export function loadTerm(year:string,semester:string){
 const canonical=/^(?:1|first)/i.test(semester)?'1st Semester':/^(?:2|second)/i.test(semester)?'2nd Semester':/summer/i.test(semester)?'Summer':semester
 return year&&canonical?termKey(year,canonical):'unspecified'
}
export function loadTermOptions(data:AcademicData){
 const options=new Map([[CURRENT_LOAD_TERM,'Current · 1st Semester · AY 2026–2027'],['2026-2027|2nd Semester','Next · 2nd Semester · AY 2026–2027'],['2025-2026|2nd Semester','Previous · 2nd Semester · AY 2025–2026']])
 for(const row of data.institutional||[])if(row.kind==='loads'){
  const key=loadTerm(row.data.AcademicYear||'',row.data.Semester||'')
  if(!options.has(key))options.set(key,key==='unspecified'?'Term not recorded':`${row.data.Semester} · AY ${row.data.AcademicYear}`)
 }
 return [...options]
}
export function recordsForLoadTerm(data:AcademicData,term:string):AcademicData{
 if(term==='all')return data
 return {...data,institutional:(data.institutional||[]).filter(row=>row.kind!=='loads'||loadTerm(row.data.AcademicYear||'',row.data.Semester||'')===term)}
}
