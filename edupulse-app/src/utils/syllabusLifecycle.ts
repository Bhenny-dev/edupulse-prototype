/** Suspension retains content but withdraws delivery. Resume never republishes it. */
export function suspendSyllabus(data:Record<string,any>,id:string){
 const before=data.syllabi.find((s:Record<string,any>)=>s.id===id)
 if(!before||before.suspended)throw new Error('Select an available syllabus to suspend.')
 return {...data,syllabi:data.syllabi.map((s:Record<string,any>)=>s.id===id?{...s,suspended:true,suspendedStatus:s.status,status:'archived'}:s),content:Object.fromEntries(Object.entries(data.content).map(([key,item]:[string,any])=>[key,item.syllabusId===id&&item.status==='published'?{...item,status:'checked'}:item]))}
}
export function resumeSyllabus(data:Record<string,any>,id:string){
 const before=data.syllabi.find((s:Record<string,any>)=>s.id===id)
 if(!before?.suspended)throw new Error('Select a suspended syllabus to resume.')
 return {...data,syllabi:data.syllabi.map((s:Record<string,any>)=>s.id===id?{...s,suspended:false,status:s.suspendedStatus||'drafted',suspendedStatus:undefined}:s)}
}
export function deleteSuspendedSyllabus(data:Record<string,any>,id:string){
 const before=data.syllabi.find((s:Record<string,any>)=>s.id===id)
 if(!before?.suspended||before.status!=='archived')throw new Error('Suspend and save this syllabus before deleting it.')
 return {...data,syllabi:data.syllabi.filter((s:Record<string,any>)=>s.id!==id),content:Object.fromEntries(Object.entries(data.content).filter(([,item]:[string,any])=>item.syllabusId!==id))}
}
export function validateSyllabusRemoval(previous:Record<string,any>,next:Record<string,any>){
 for(const s of previous.syllabi)if(!next.syllabi.some((item:Record<string,any>)=>item.id===s.id)&&(!s.suspended||s.status!=='archived'))throw new Error('Suspend the syllabus in a saved update before deleting it.')
}
