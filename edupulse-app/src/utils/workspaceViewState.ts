type SourceSelection={section:number;start:number;end:number;signature:string}
type ViewValue=SourceSelection|string|number|boolean|null|Set<string|number>
type TabStorage=Pick<Storage,'getItem'|'setItem'>
const LIMIT=65_536,MAX_ENTRIES=200
const storage=()=>{try{return sessionStorage}catch{return null}}
export const workspaceViewKey=(owner:string,role:string)=>`edupulse-view-v1:${encodeURIComponent(owner)}:${encodeURIComponent(role||'guest')}`

/** Opt-in navigation references only. Response caches, editor content and commands stay out. */
function valid(key:unknown,value:unknown):value is ViewValue {
  if(typeof key!=='string'||key.length>400)return false
  const id=(item:unknown)=>typeof item==='string'&&item.length<=200
  if(/^source-inspector:.+:retained$/.test(key))return value===null||id(value)
  if(/^source-inspector:.+/.test(key)){
   if(value===null)return true
   if(!value||typeof value!=='object'||Array.isArray(value))return false
   const item=value as Record<string,unknown>
   return ['end,section,signature,start','end,input,section,signature,start'].includes(Object.keys(item).sort().join(','))&&(!('input' in item)||item.input===true)&&['section','start','end'].every(field=>Number.isInteger(item[field])&&Number(item[field])>=0)&&Number(item.section)<=100&&Number(item.end)<=150000&&Number(item.end)>Number(item.start)&&Number(item.end)-Number(item.start)<=2000&&typeof item.signature==='string'&&/^\d{1,10}$/.test(item.signature)
  }
  if(/^syllabus-(?:reader|share|delete|suspend|adopt)$/.test(key))return value===null||id(value)
  if(/^monitoring-followup:/.test(key))return typeof value==='boolean'
  if(/^monitoring-(?:detail|roster-member):/.test(key))return value===null||id(value)
  if(/^monitoring-roster-action:/.test(key))return value===null||['edit','suspend','resume','remove'].includes(value as string)
  if(/^monitoring-roster-menu:/.test(key))return value===null||id(value)
  if(/^monitoring-roster-status:/.test(key))return ['all','active','suspended'].includes(value as string)
  if(/^monitoring-roster-page:/.test(key))return value===0||value===1
  if(/^monitoring-roster-add:/.test(key))return typeof value==='boolean'
  if(/^monitoring-menu:/.test(key))return value===null||value==='delivery'||value==='results'
  if(key==='ai-local-model')return id(value)
  if(/^dean-detail:(?:records|instructors|students)$/.test(key))return value===null||(typeof value==='string'&&id(value)&&(/^(?:block|course|instructor):.+$/.test(value)||['students','blocks','years','faculty'].includes(value)))
  if(key==='layout-overlay')return value===null||['search','account','notifications','roles','language','mobile'].includes(value as string)
  if(key==='course-location'||/^course:.+:(?:reader|delivery)$/.test(key)||/^academic-reader:.+$/.test(key))return value===null||id(value)
  if(/^course:.+:expanded$/.test(key))return value instanceof Set&&value.size<=52&&[...value].every(item=>Number.isInteger(item)&&Number(item)>=1&&Number(item)<=52)
  if(/^course:.+:selected$/.test(key))return value instanceof Set&&value.size<=200&&[...value].every(id)
  if(/^course:.+:type$/.test(key))return value===null||value==='assessment'
  if(/^course:.+:mode$/.test(key)||/^publication:.+:mode$/.test(key))return value===null||value==='document'||value==='presentation'
  if(/^slide:.+$/.test(key))return Number.isInteger(value)&&Number(value)>=0&&Number(value)<=1000
  if(/^syllabus-sources-open:.+$/.test(key))return typeof value==='boolean'
  if(/^syllabus-source-(?:reader|menu):.+$/.test(key))return value===null||id(value)
  return false
}

export function readWorkspaceViews(key:string,tab:TabStorage|null=storage()):Map<string,ViewValue> {
  try {
    const raw=tab?.getItem(key)
    if(!raw||new TextEncoder().encode(raw).length>LIMIT)return new Map()
    const saved=JSON.parse(raw)
    if(saved?.version!==1||!Array.isArray(saved.entries)||saved.entries.length>MAX_ENTRIES)return new Map()
    const entries=saved.entries.flatMap((entry:unknown)=>{
      if(!Array.isArray(entry)||entry.length!==2)return []
      const [name,stored]=entry,value=stored&&typeof stored==='object'&&Array.isArray(stored.set)?new Set(stored.set):stored
      return valid(name,value)?[[name,value] as [string,ViewValue]]:[]
    })
    return new Map(entries)
  }catch{return new Map()}
}

export function saveWorkspaceViews(key:string,views:Map<string,unknown>,tab:TabStorage|null=storage()) {
  try {
    const entries=[...views].filter(([name,value])=>valid(name,value)).slice(-MAX_ENTRIES).map(([name,value])=>[name,value instanceof Set?{set:[...value]}:value])
    let raw=JSON.stringify({version:1,entries})
    while(new TextEncoder().encode(raw).length>LIMIT&&entries.length){entries.shift();raw=JSON.stringify({version:1,entries})}
    tab?.setItem(key,raw)
  }catch{/* Storage denial must not break navigation. The in-memory view remains usable. */}
}
