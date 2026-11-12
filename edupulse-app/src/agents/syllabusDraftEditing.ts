import type {EditorSnapshot} from './editorTools.js'
import {aggregateSections,isOutlineExam,weekSections,type OutlineWeek} from '../utils/outlineSections.js'

const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b)
const fail=(field:string):never=>{throw new Error(`${field} changed during generation. Your newer edits were preserved; ask Pulse to retry that target.`)}

/** Rebase validated content onto the live form, atomically. No save or lifecycle command. */
export function rebaseSyllabusDraft(before:EditorSnapshot,current:EditorSnapshot,patch:Record<string,unknown>){
 if(before.kind!=='syllabus'||current.kind!=='syllabus'||before.instance!==current.instance||before.data.id!==current.data.id||before.data.courseCode!==current.data.courseCode)throw new Error('The syllabus or selected course changed. Reopen the intended editable syllabus.')
 const result:Record<string,unknown>={}
 for(const [key,value] of Object.entries(patch)){
  if(key==='courseOutline')continue
  if(!same(before.data[key],value)&&!same(current.data[key],before.data[key])&&!same(current.data[key],value))fail(key)
  if(!same(before.data[key],value))result[key]=value
 }
 if(patch.courseOutline){
  const baseline=before.data.courseOutline as OutlineWeek[],live=current.data.courseOutline as OutlineWeek[],incoming=patch.courseOutline as OutlineWeek[]
  const changes=new Map<string,Record<string,unknown>>()
  for(const row of incoming){
   const old=baseline.find(item=>item.week===row.week)
   if(!old)throw new Error(`Week ${row.week} is outside the existing syllabus schedule.`)
   if(same(old,row))continue
   if(isOutlineExam(old)){if(row.assessments!==old.assessments||row.ilos?.trim()||row.contents?.some(text=>text.trim())||row.activities?.trim())throw new Error(`Week ${row.week} is an examination slot and cannot be replaced by generated teaching content.`);continue}
   const prior=weekSections(old),next=weekSections(row)
   if(!same(prior.map(section=>section.id),next.map(section=>section.id)))throw new Error(`Week ${row.week}: existing section IDs and their order must remain unchanged.`)
   for(const section of next){
    const original=prior.find(item=>item.id===section.id)!
    const fields=Object.fromEntries(Object.entries(section).filter(([key,value])=>key!=='id'&&!same(value,original[key as keyof typeof original])))
    if(!Object.keys(fields).length)continue
    const linked=(rows:OutlineWeek[])=>rows.filter(item=>weekSections(item).some(candidate=>candidate.id===section.id)).map(item=>item.week)
    if(!same(linked(baseline),linked(live)))fail(`Section ${section.id} teaching-week relationships`)
    const previous=changes.get(section.id)
    for(const [field,value] of Object.entries(fields)){
     if(previous&&field in previous&&!same(previous[field],value))throw new Error(`Shared section ${section.id}.${field} has conflicting generated values.`)
     for(const linkedRow of live){const present=weekSections(linkedRow).find(item=>item.id===section.id);if(present&&!same(present[field as keyof typeof present],original[field as keyof typeof original])&&!same(present[field as keyof typeof present],value))fail(`Week ${linkedRow.week}, section ${section.id}.${field}`)}
    }
    changes.set(section.id,{...previous,...fields})
   }
  }
  result.courseOutline=live.map(row=>weekSections(row).some(section=>changes.has(section.id))?aggregateSections(row,weekSections(row).map(section=>({...section,...changes.get(section.id),id:section.id}))):row)
 }
 return result
}
