import {z} from 'zod'
import {terms} from '../lib/rag/text.js'
const row=z.object({week:z.number().int().min(1).max(52),ilos:z.string().max(5000),contents:z.array(z.string().max(4000)).max(60),activities:z.string().max(5000),assessments:z.string().max(5000)}).strict()
export const referenceSyllabus=z.object({id:z.string().max(100),courseCode:z.string().max(80),courseTitle:z.string().max(200),version:z.string().max(40),status:z.string().max(40),outline:z.array(row).min(1).max(52)}).strict()
export type ReferenceSyllabus=z.infer<typeof referenceSyllabus>
const code=(value:unknown)=>String(value||'').replace(/[^a-z0-9]/gi,'').toLowerCase()
/** Inputs are already visible in this authorized workspace. Never a global private lookup. */
export function relatedSyllabi(syllabi:Record<string,any>[],target:Record<string,unknown>):ReferenceSyllabus[] {
 const query=[...new Set(terms(String(target.courseTitle||'')))],targetCode=code(target.courseCode)
 return syllabi.filter(s=>s.id!==target.id&&s.courseOutline?.length).map(s=>{
  const title=new Set(terms(s.courseTitle||'')),coverage=query.length?query.filter(t=>title.has(t)).length/query.length:0
  const exact=Boolean(targetCode&&code(s.courseCode)===targetCode)
  if(!exact&&(query.length<2||coverage<0.8))return null
  const parsed=referenceSyllabus.safeParse({id:String(s.id),courseCode:s.courseCode||'',courseTitle:s.courseTitle||'',version:String(s.version||1),status:s.sample?'sample':s.status||'drafted',outline:s.courseOutline.map((r:any)=>({week:r.week,ilos:r.ilos||'',contents:(r.contents||[]).map((t:any)=>typeof t==='string'?t:t?.name||'').filter(Boolean),activities:r.activities||'',assessments:r.assessments||''}))})
  if(!parsed.success||JSON.stringify(parsed.data).length>30000)return null
  return {reference:parsed.data,score:(exact?10:0)+coverage+(['active','approved_uploaded'].includes(s.status)?2:0)}
 }).filter((r):r is {reference:ReferenceSyllabus;score:number}=>Boolean(r)).sort((a,b)=>b.score-a.score||a.reference.id.localeCompare(b.reference.id)).slice(0,2).map(r=>r.reference)
}
/** A selected source window; original files remain unchanged and available for full review. */
export function referenceWindow(references:ReferenceSyllabus[],weeks:number[]) {
 return references.map(s=>({id:s.id,courseCode:s.courseCode,courseTitle:s.courseTitle,version:s.version,status:s.status,
  sequence:s.outline.filter(r=>weeks.some(w=>Math.abs(w-r.week)<=2)).map(r=>({week:r.week,topicPreview:r.contents.join('; ').slice(0,90)})),
  selectedWeeks:s.outline.filter(r=>weeks.includes(r.week)).map(r=>({week:r.week,ilos:r.ilos.slice(0,240),contents:r.contents.slice(0,3).map(t=>t.slice(0,120)),activities:r.activities.slice(0,100),assessments:r.assessments.slice(0,100)}))}))
}
