import {z} from 'zod'
import {ApiError} from '../../server/contracts.js'
import {aggregateSections,isOutlineExam,weekSections,type OutlineWeek} from '../utils/outlineSections.js'
import type {EditorSnapshot} from './editorTools.js'
import {ASSESSMENT_FORMATS} from '../data/assessmentFormats.js'

const values={ilos:z.string().max(5000),contents:z.array(z.string().max(2000)).max(40),activities:z.string().max(5000),assessments:z.string().max(5000),assessmentTypes:z.array(z.enum(ASSESSMENT_FORMATS.map(format=>format.label) as [string,...string[]])).max(10)}
type Field=keyof typeof values
const all=Object.keys(values) as Field[]
type Input={editor:EditorSnapshot|null;message:string;section:string|null;context:string;targetPath?:string}
type Target={week:number;position:number;id:string;fields:Field[];item?:number}
export type OutlineEditScope={targets:Target[];complete:boolean}
export const OUTLINE_EDIT_INSTRUCTIONS='Return ONLY {"edits":[{"target":1,"changes":{"ilos":"...","contents":["..."],"activities":"...","assessments":"...","assessmentTypes":["Essay"]}}]}. Include exactly one edit per supplied target and ONLY its listed fields. Never return ids, weeks, sections, courseOutline, operations or paths. For a listItem return an array with exactly one replacement string. Complete requests require useful nonempty content. Assessment types: '+ASSESSMENT_FORMATS.map(format=>format.label).join(', ')+'.'
const fail=(path:string,message:string):never=>{throw new ApiError(400,'OUTLINE_TARGET_INVALID',`${path}: ${message} Nothing changed.`)}

/** Positions are UI references only. Existing IDs are resolved from the exact editor baseline,
 * kept outside model output, and used to update every association of a shared section. */
export function resolveOutlineEdit(input:Input):OutlineEditScope|null {
 if(input.editor?.kind!=='syllabus')return null
 const requestedPath=input.targetPath||input.context.match(/Editable field path:\s*([\w.]+)/)?.[1]
 // A fresh explicit week request overrides a stale pointer selection.
 const selectedIndex=requestedPath?.match(/^courseOutline\.(\d+)\./)?.[1]
 const selectedWeek=selectedIndex===undefined?undefined:(input.editor.data.courseOutline as OutlineWeek[]|undefined)?.[Number(selectedIndex)]?.week
 const explicitWeeks=[...input.message.matchAll(/\b(?:week|wk)\.?\s*(\d{1,2})\b/gi)].map(match=>Number(match[1]))
 const path=explicitWeeks.some(week=>week!==selectedWeek)?undefined:requestedPath
 const field=path?.match(/^courseOutline\.(\d+)\.(?:sections\.(\d+)\.)?(ilos|contents|activities|assessments|assessmentTypes)(?:\.(\d+))?$/)
 if(path?.startsWith('courseOutline.')&&!field)return fail(path,'This outline field is not writable through the targeted contract.')
 const mentions=[...input.message.matchAll(/\b(?:week|wk)\.?\s*(\d{1,2})\b([^]*?)(?=\b(?:week|wk)\.?\s*\d|$)/gi)]
 if(!field&&!mentions.length)return null
 if(!field&&input.section&&!['all','courseOutline'].includes(input.section))return null
 const rows=input.editor.data.courseOutline as OutlineWeek[]|undefined
 if(!Array.isArray(rows)||!rows.length)return fail('courseOutline','Choose a course with existing teaching weeks.')
 if(rows.some(row=>!row||!Number.isInteger(row.week))||new Set(rows.map(row=>row.week)).size!==rows.length)return fail('courseOutline','The existing week references are invalid or duplicated.')
 for(const row of rows)if(row.sections&&(new Set(row.sections.map(section=>section.id)).size!==row.sections.length||row.sections.some(section=>!section.id)))return fail(`week ${row.week}.sections`,'The existing section references are invalid or duplicated.')
 const complete=/\b(?:complete|fill|finish|populate)\b/i.test(input.message)
 const fieldsIn=(text:string)=>{
  const fields:Field[]=[]
  for(const [key,pattern] of [['ilos',/\b(?:ilos?|(?:intended )?learning outcomes?)\b/i],['contents',/\b(?:contents?|topics?)\b/i],['activities',/\b(?:activities|activity|teaching.learning)\b/i],['assessments',/\bassessments?\b(?!\s*(?:types?|formats?))/i],['assessmentTypes',/\bassessment (?:types?|formats?)\b/i]] as const)if(pattern.test(text))fields.push(key)
  return fields
 }
 const targets:Target[]=[]
 const add=(row:OutlineWeek,position:number,selected:Field[],item?:number)=>{
  if(isOutlineExam(row))return fail(`week ${row.week}`,'Examination slots cannot be edited as teaching sections.')
  const section=weekSections(row)[position-1]
  if(!section)return fail(`week ${row.week}.section ${position}`,'The section does not exist. Choose an existing section.')
  const existing=targets.find(target=>target.id===section.id)
  if(existing)existing.fields=[...new Set([...existing.fields,...selected])]
  else targets.push({week:row.week,position,id:section.id,fields:selected,...(item===undefined?{}:{item})})
 }
 if(field){
  const row=rows[Number(field[1])];if(!row)return fail(path!,'The week no longer exists.')
  const item=field[4]===undefined?undefined:Number(field[4]),key=field[3] as Field
  const section=weekSections(row)[Number(field[2]||0)]
  if(item!==undefined&&(!Array.isArray(section?.[key])||item>=(section[key] as string[]).length))return fail(path!,'The list item no longer exists.')
  add(row,Number(field[2]||0)+1,[key],item)
 }else for(const mention of mentions){
  const row=rows.find(row=>row.week===Number(mention[1]));if(!row)return fail(`week ${mention[1]}`,'The week does not exist.')
  const groups=[...mention[2]!.matchAll(/\bsections?\s*(\d+(?:\s*(?:,|and|&)\s*(?:section\s*)?\d+)*)([^]*?)(?=\bsections?\s*\d|$)/gi)]
  const inherited=fieldsIn(input.message.slice(0,mentions[0]!.index))
  if(groups.length)for(const group of groups){const fields=fieldsIn(group[2]!);for(const position of group[1]!.match(/\d+/g)!.map(Number))add(row,position,fields.length?fields:inherited.length?inherited:all)}
  else {const fields=fieldsIn(mention[2]!);for(const [index] of weekSections(row).entries())add(row,index+1,fields.length?fields:inherited.length?inherited:all)}
 }
 if(!targets.length)return fail('courseOutline','Name the existing week and section to edit.')
 if(targets.length>12)return fail('courseOutline','Select at most 12 sections per targeted request.')
 return {targets,complete}
}

export function outlineEditPrompt(editor:EditorSnapshot,scope:OutlineEditScope){
 const rows=editor.data.courseOutline as OutlineWeek[]
 return {course:Object.fromEntries(['courseCode','courseTitle','courseDescription','courseInfo'].map(key=>[key,editor.data[key]])),targets:scope.targets.map((target,index)=>{
  const section=weekSections(rows.find(row=>row.week===target.week)!)[target.position-1]!
  const sectionContextPreview=Object.fromEntries(all.filter(key=>!target.fields.includes(key)).map(key=>[key,(Array.isArray(section[key])?(section[key] as string[]).join('\n'):String(section[key]||'')).slice(0,600)]))
  return {target:index+1,week:target.week,section:target.position,fields:target.fields,listItem:target.item,sharedWeeks:rows.filter(row=>weekSections(row).some(section=>section.id===target.id)).map(row=>row.week),current:Object.fromEntries(target.fields.map(key=>[key,target.item===undefined?section[key]:(section[key] as string[])[target.item]])),sectionContextPreview}
 })}
}

/** Strict model contract: no IDs, week replacements, relationship edits or extra fields. */
export function mergeOutlineEdits(raw:unknown,editor:EditorSnapshot,scope:OutlineEditScope){
 const schema=z.object({edits:z.array(z.object({target:z.number().int().min(1).max(scope.targets.length),changes:z.object(values).partial().strict()}).strict()).length(scope.targets.length)}).strict()
 const parsed=schema.safeParse(raw)
 if(!parsed.success)return {error:{code:'TOOL_OUTPUT_INVALID',details:parsed.error.issues.map(issue=>`${issue.path.join('.')}: ${issue.message}`)}} as const
 const gaps:string[]=[],seen=new Set<number>()
 for(const edit of parsed.data.edits){
  const target=scope.targets[edit.target-1]!
  if(seen.has(edit.target))gaps.push(`edits.${edit.target}: duplicate target`);seen.add(edit.target)
  for(const key of Object.keys(edit.changes))if(!target.fields.includes(key as Field))gaps.push(`edits.${edit.target}.changes.${key}: field is outside the selected scope`)
  for(const key of target.fields){const value=edit.changes[key];if(value===undefined)gaps.push(`edits.${edit.target}.changes.${key}: required selected field`)
   else if(target.item!==undefined&&(!Array.isArray(value)||value.length!==1))gaps.push(`edits.${edit.target}.changes.${key}: return exactly one list item`)
   else if(scope.complete&&!(typeof value==='string'?value.trim():value.some(text=>text.trim())))gaps.push(`week ${target.week}.section ${target.position}.${key}: nonempty content is required`)
  }
 }
 if(gaps.length)return {error:{code:'TOOL_SCOPE_MISMATCH',details:gaps}} as const
 const changes=new Map(parsed.data.edits.map(edit=>{
  const target=scope.targets[edit.target-1]!,patch={...edit.changes}
  if(target.item!==undefined){const row=(editor.data.courseOutline as OutlineWeek[]).find(row=>row.week===target.week)!,section=weekSections(row)[target.position-1]!,key=target.fields[0]!,list=[...(section[key] as string[])];list[target.item]=(patch[key] as string[])[0]!;Object.assign(patch,{[key]:list})}
  return [target.id,patch]
 }))
 const rows=(editor.data.courseOutline as OutlineWeek[]).map(row=>isOutlineExam(row)||!weekSections(row).some(section=>changes.has(section.id))?structuredClone(row):aggregateSections(row,weekSections(row).map(section=>({...section,...changes.get(section.id),id:section.id}))))
 return {patch:{courseOutline:rows}} as const
}
