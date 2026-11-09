import type {Page} from '@playwright/test'
import {createHash,randomUUID} from 'node:crypto'
import {restorationUI} from './role-restoration-fixture'
import {referenceSnapshotToken} from '../src/lib/rag/syllabusReferences'
import {draftCoursewareStep} from '../src/lib/rag/courseware'
import {extractDocument} from '../server/ingest/formats.mjs'
import type {Evidence} from '../src/lib/rag/types'
export const sourceLesson='Network components include hosts, switches and routers. Hosts send and receive application data. Switches connect devices within the same local network and forward frames using their learned addresses. Routers connect different networks and use routing information to select a path. A physical link connects interfaces and carries signals between them. In a classroom, computers can connect to one switch and the switch can connect to a router. Traffic between two computers in the same classroom can remain on that local network. Traffic sent to a different network passes through the router. Draw a classroom diagram and identify each host, each interface and each link. Label which device forwards local frames and which device connects networks. Explain why the device roles remain distinct even when a home appliance combines them in one enclosure. Compare the path followed by a local message with the path followed by a message to a second network. Add another computer to the diagram and explain which physical link changes. Then add a second network and explain the router connection. Check your explanation against the actual labels and connections in the diagram. Do not assume that every cable carries the same application traffic or that every network device makes the same forwarding decision. Use the stated network boundary to justify the path.'
export const sourceRefs=[
 {kind:'link' as const,title:'Sample network teaching guide',url:'https://teaching.example.org/network-guide',authors:'Example Teaching Team',year:'2026',publisher:'Sample open teaching collection'},
 {kind:'book' as const,title:'Sample Networks Book',url:'',authors:'Example Author',year:'2025',publisher:'Classroom Example Press'},
 {kind:'link' as const,title:'Unavailable sample reading',url:'https://unavailable.example.org/reading.pdf',authors:'',year:'',publisher:''},
]
export const formattedSourceText=`# Network study guide\n\n### Guided explanation\n\n**Hosts** send and receive application data.\n\n${sourceLesson}\n\n### Compare the devices\n\n| Component | Role |\n| --- | --- |\n| Host | Sends and receives application data |\n| Switch | Forwards local frames |\n| Router | Connects networks |\n\n- Label each **host** in a classroom diagram.\n- Explain the *router* connection.\n\n[Original reading](https://teaching.example.org/network-guide)\n`
export async function attachFormattedSource(page:Page){
 const panel=page.locator('.syllabus-sources')
 await panel.getByRole('button',{name:`Source actions for ${sourceRefs[1]!.title}`,exact:true}).click()
 await page.getByRole('menuitem',{name:'Attach readable copy',exact:true}).click()
 await panel.getByLabel('Attach readable reference copy',{exact:true}).setInputFiles({name:'network-study-guide.md',mimeType:'text/markdown',buffer:Buffer.from(formattedSourceText)})
 return panel.locator('li').filter({has:page.getByText(sourceRefs[1]!.title,{exact:true})})
}
const key=(ref:any)=>createHash('sha256').update(referenceSnapshotToken(ref)).digest('hex')
export async function retainedSourcesUI(page:Page,ready=true){
 const fixture=await restorationUI(page,'instructor')
 const syllabus={id:'retained-course',courseCode:'IT 202',courseTitle:'Fundamentals of Networking',status:'active',instructorId:'fe67b9d2-719b-4b10-91cd-76031ab115fe',version:1,sample:false,approvedFile:{name:'synthetic-approved.pdf',approvalAttested:true},books:[sourceRefs[1]],onlineReferences:[sourceRefs[0],sourceRefs[2]],courseOutline:[{week:1,ilos:'Identify network components and explain their roles.',contents:['Network components'],activities:'Guided discussion',assessments:'Learning',teachingMaterials:['Reading guide'],resources:[]}]}
 fixture.setWorkspace({syllabi:[syllabus],content:{},registrations:[]})
 await page.route('**/api/ai?action=health',route=>route.fulfill({json:{ready,provider:'Controlled source fixture',model:'UI test model',embeddings:false,identity:{mode:'synthetic',role:'instructor'},database:{ready:true,kind:'synthetic'},models:[]}}))
 const snapshots:any[]=[],reads:string[]=[],generation:any[]=[]
 let edition=1,hold:Promise<void>|null=null,release:()=>void=()=>{}
 const manifest=(references:any[])=>references.map(reference=>{const versions=snapshots.filter(row=>row.reference_key===key(reference)),snapshot=versions.at(-1);if(snapshot){const {base64:_base64,text:_text,...summary}=snapshot;return {reference,key:key(reference),status:'retained',snapshot:{...summary,versions:versions.length}}}return {reference,key:key(reference),status:reference.url?'unread':'attachment-needed',message:reference.url?'This link has not been read.':'Citation metadata only. Attach a readable copy to use this book as evidence.'}})
 const retain=(reference:any,bytes:Buffer,text:string,name:string,mime:string,pages:number,url:string)=>{const sha256=createHash('sha256').update(bytes).digest('hex');if(!snapshots.some(row=>row.reference_key===key(reference)&&row.sha256===sha256))snapshots.push({id:randomUUID(),reference_key:key(reference),reference,url,sha256,name,mime,size:bytes.length,text,base64:bytes.toString('base64'),pages,truncated:false,warnings:[],created_at:`2026-11-09T0${edition}:00:00.000Z`})}
 await page.route('**/api/ai?action=syllabus-sources',async route=>{
  const command=route.request().postDataJSON()
  if(command.operation==='list')return route.fulfill({json:{sources:manifest(command.references)}})
  if(command.operation==='read'){
   if(hold)await hold
   for(const ref of command.references){if(!command.refresh&&manifest([ref])[0]?.snapshot)continue;reads.push(ref.title);if(ref.url===sourceRefs[0]!.url){const text=sourceLesson+(edition>1?' The new edition adds a second classroom example.':'');retain(ref,Buffer.from(`<h1>Network components</h1><p>${text}</p>`),text,'network-guide.html','text/html',0,ref.url)}}
   const result=manifest(command.references);for(const source of result)if(source.reference.url===sourceRefs[2]!.url)Object.assign(source,{status:'unavailable',message:'This source requires access. Attach a readable copy instead.'});return route.fulfill({json:{sources:result}})
  }
  if(command.operation==='attach'){const bytes=Buffer.from(command.base64,'base64'),extracted=await extractDocument(new Uint8Array(bytes),command.name);retain(command.reference,bytes,extracted.text,command.name,extracted.mime,extracted.pageTexts.length,'');return route.fulfill({json:{sources:manifest([command.reference])}})}
  const source=snapshots.find(row=>row.id===command.id)
  if(!source)return route.fulfill({status:404,json:{error:{code:'SOURCE_NOT_FOUND',message:'Retained source not found.'}}})
  if(command.operation==='review'){const {base64:_base64,...review}=source;return route.fulfill({json:review})}
  if(command.operation==='open')return route.fulfill({json:{name:source.name,mime:source.mime,base64:source.base64,sha256:source.sha256}})
  if(command.operation==='remove'){snapshots.splice(snapshots.indexOf(source),1);return route.fulfill({json:{removed:true}})}
  return route.fulfill({status:400,json:{error:{message:'Unsupported source fixture operation'}}})
 })
 await page.route('**/api/ai?action=courseware',async route=>{
  const input=route.request().postDataJSON();generation.push(input)
  const snapshot=snapshots.find(row=>row.reference.url===sourceRefs[0]!.url)
  const evidence:Evidence[]=snapshot?[{id:`retained:${snapshot.id}:0`,documentId:snapshot.id,title:snapshot.reference.title,text:snapshot.text,page:null,section:'Network components',flagged:false,origin:'private',method:'provided',url:snapshot.url,similarity:null,rrf:1,relevance:null,query:input.topics.join(' '),retained:{id:snapshot.id,sha256:snapshot.sha256,readAt:snapshot.created_at,reference:snapshot.reference,truncated:false}}]:[]
  const result=await draftCoursewareStep(input,new AbortController().signal,{provider:'Controlled source fixture',model:'UI test model',search:async()=>({evidence:[]}),sourceEvidence:async()=>({evidence,warning:'One listed reading was inaccessible and the book text was not attached before generation.'}),generate:async(_system,prompt)=>{const part=JSON.parse(prompt).generationStep,type=part==='activity'?'activity':'material';return JSON.stringify({[type]:{title:type==='activity'?'Network components discussion':'Network components and classroom connections',sections:[{heading:'Network component roles',body:sourceLesson},{heading:'Worked classroom diagram and discussion',body:sourceLesson}]}})}})
  return route.fulfill({json:result})
 })
 return {...fixture,reads,generation,snapshots,advanceEdition:()=>{edition=2},holdRead:()=>{hold=new Promise<void>(resolve=>{release=resolve});return()=>{hold=null;release()}}}
}
