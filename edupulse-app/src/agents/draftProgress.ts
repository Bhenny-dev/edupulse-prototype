import {syllabusPatch,type EditorSnapshot} from './editorTools.js'

/** A validated preview is display data, never an implicit editor/save command. */
export function outlineDraftProgress(patch:Record<string,unknown>,editor:EditorSnapshot) {
 const parsed=syllabusPatch.safeParse(patch)
 if(!parsed.success||!parsed.data.courseOutline)return null
 const baseline=(Array.isArray(editor.data.courseOutline)?editor.data.courseOutline:[]) as {week:number;assessments?:string}[]
 const rows=parsed.data.courseOutline.filter(row=>row.ilos.trim()&&row.contents.some(text=>text.trim())&&row.activities?.trim()&&row.assessments?.trim()&&baseline.some(old=>old.week===row.week&&!/examination/i.test(old.assessments||'')&&JSON.stringify(old)!==JSON.stringify(row))&&!/examination/i.test(row.assessments||''))
 if(!rows.length)return null
 return {rows,total:baseline.filter(row=>!/examination/i.test(row.assessments||'')).length}
}

const fields=['week','ilos','contents','activities','assessments','teachingMaterials','assessmentTypes','resources']
const editable=(row:Record<string,unknown>)=>JSON.stringify(fields.map(key=>[key,row[key]]))
/** Confirmed placement changes only unchanged target rows and never persists or drops other weeks. */
export function keepOutlineDraft(current:Record<string,unknown>[],baseline:Record<string,unknown>[],incoming:unknown,week?:number) {
 const drafts=syllabusPatch.parse({courseOutline:incoming}).courseOutline!,selected=new Map(drafts.filter(r=>week===undefined||r.week===week).map(r=>[r.week,r]))
 let kept=0,conflicts=0
 const rows=current.map(row=>{
  const next=selected.get(Number(row.week));if(!next)return row
  const before=baseline.find(r=>r.week===row.week)
  if(!before||/examination/i.test(String(before.assessments||''))||editable(row)!==editable(before)&&editable(row)!==editable(next)){conflicts++;return row}
  kept++;return {...row,...next}
 })
 return {rows,kept,conflicts}
}
