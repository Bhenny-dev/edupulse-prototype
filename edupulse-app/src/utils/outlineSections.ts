export type OutlineSection = { id: string; ilos: string; contents: string[]; activities: string; assessments: string; assessmentTypes: string[]; teachingMaterials?: string[]; resources?: {type?:string;name:string;url:string}[] }
export type OutlineWeek = { week: number; ilos?: string; contents?: string[]; activities?: string; assessments?: string; assessmentTypes?: string[]; teachingMaterials?: string[]; resources?: OutlineSection['resources']; sections?: OutlineSection[]; [key:string]:unknown }
export const isOutlineExam = (row:OutlineWeek) => !row.ilos?.trim() && /examination/i.test(row.assessments||'')
export function weekSections(row:OutlineWeek):OutlineSection[] {
 return row.sections?.length ? row.sections : [{id:`week-${row.week}`,ilos:row.ilos||'',contents:row.contents||[],activities:row.activities||'',assessments:row.assessments||'',assessmentTypes:row.assessmentTypes||[],teachingMaterials:row.teachingMaterials||[],resources:row.resources||[]}]
}
/** Calendar weeks remain unique. Aggregate fields keep existing exports/readers compatible. */
export function aggregateSections<T extends OutlineWeek>(row:T,sections:OutlineSection[]):T {
 const join=(field:'ilos'|'activities'|'assessments')=>sections.map(section=>section[field]).filter(Boolean).join('\n\n')
 return {...row,sections,ilos:join('ilos'),activities:join('activities'),assessments:join('assessments'),contents:sections.flatMap(section=>section.contents),assessmentTypes:[...new Set(sections.flatMap(section=>section.assessmentTypes))],teachingMaterials:[...new Set(sections.flatMap(section=>section.teachingMaterials||[]))],resources:sections.flatMap(section=>section.resources||[])}
}
export function editOutlineSection<T extends OutlineWeek>(rows:T[],_week:number,id:string,patch:Partial<OutlineSection>):T[] {
 return rows.map(row=>isOutlineExam(row)?row:weekSections(row).some(section=>section.id===id)?aggregateSections(row,weekSections(row).map(section=>section.id===id?{...section,...patch,id}:section)):row)
}
export function addOutlineSection<T extends OutlineWeek>(rows:T[],week:number,id:string):T[] {
 return rows.map(row=>row.week===week&&!isOutlineExam(row)?aggregateSections(row,[...weekSections(row),{id,ilos:'',contents:[],activities:'',assessments:'',assessmentTypes:[],resources:[]}]):row)
}
export function shareOutlineSection<T extends OutlineWeek>(rows:T[],section:OutlineSection,weeks:number[]):T[] {
 const targets=rows.filter(row=>weeks.includes(row.week))
 if(!targets.length||targets.some(isOutlineExam))throw new Error('Choose existing teaching weeks. Examination weeks cannot share teaching sections.')
 return rows.map(row=>{
  if(isOutlineExam(row))return row
  const existing=weekSections(row),already=existing.some(value=>value.id===section.id)
  let sections=existing.filter(value=>(value.id!==section.id||weeks.includes(row.week))&&(value.id===section.id||value.ilos.trim()||value.contents.some(text=>text.trim())||value.activities.trim()||value.assessments.trim()||value.resources?.length||!(/^(?:week-|empty-)/).test(value.id))).map(value=>value.id===section.id?section:value)
  if(weeks.includes(row.week)&&!already)sections.push(section)
  if(sections.length>12)throw new Error(`Week ${row.week} already has 12 sections. Remove a section before sharing another into it.`)
  // Preserve the fixed calendar slot when its only section moves away.
  if(!sections.length)sections=[{id:`empty-${row.week}-${section.id}`,ilos:'',contents:[],activities:'',assessments:'',assessmentTypes:[],resources:[]}]
  return aggregateSections(row,sections)
 })
}
export function removeOutlineSection<T extends OutlineWeek>(rows:T[],week:number,id:string):T[] {
 return rows.map(row=>row.week===week?aggregateSections(row,weekSections(row).filter(section=>section.id!==id)):row)
}

export const normalizeOutlineSections=<T extends OutlineWeek>(rows:T[])=>rows.map(row=>isOutlineExam(row)?row:aggregateSections(row,weekSections(row)))

export function mergeOutlineRows<T extends OutlineWeek>(rows:T[]):T[] {
 const result=new Map<number,T>()
 rows.forEach((row,index)=>{const prior=result.get(row.week),sections=row.sections||[{...weekSections(row)[0]!,id:`imported-section-${index+1}`}];result.set(row.week,aggregateSections(prior||row,[...(prior?weekSections(prior):[]),...sections]))})
 return [...result.values()]
}
