import { jsonValue } from './jsonValue'

// Retain editable snapshots without multiplying approved-file bytes or nesting history.
export function editableSnapshot(syllabus:Record<string,any>) {
 const {versions:_versions,history:_history,approvedFile:_approvedFile,extractedAt:_extractedAt,...snapshot}=syllabus
 return structuredClone(snapshot)
}
export function revisedWorkspace(data:Record<string,any>,next:Record<string,any>) {
 const before=data.syllabi.find((s:Record<string,any>)=>s.id===next.id)
 const versions=before?[...(before.versions || []),editableSnapshot(before)].slice(-10):[]
 const content={...data.content}
 if(before) for(const [id,item] of Object.entries(content) as [string,Record<string,any>][]) {
  if(item.syllabusId!==next.id)continue
  const earlier=before.courseOutline?.find((row:Record<string,any>)=>row.week===item.week)
  const changed=next.courseOutline?.find((row:Record<string,any>)=>row.week===item.week)
  const stale=jsonValue(earlier)!==jsonValue(changed)
  if(stale)content[id]={...item,status:'draft',outOfAlignment:true}
  else if(next.status!=='active'&&item.status==='published')content[id]={...item,status:'checked'}
 }
 return {...data,syllabi:before?data.syllabi.map((s:Record<string,any>)=>s.id===next.id?{...next,versions}:s):[...data.syllabi,{...next,versions}],content}
}
