import type {Page} from '@playwright/test'
import {createHash} from 'node:crypto'
import {citationMetadata,htmlToStructuredText} from '../server/ingest/formats.mjs'

// Original sample source and real metadata conversion; persistence/index replies are controlled UI transports.
export const referenceHtml='<html><head><meta name="citation_title" content="Classroom Network Guide"><meta name="citation_author" content="Sample Teaching Team"><meta name="citation_publication_date" content="2025-02-01"><meta name="citation_publisher" content="Sample Teaching Press"></head><body><h1>Trace a packet</h1><p>A switch forwards local frames. A router connects different networks. Label both devices on the classroom diagram and trace the sender, destination and next hop. Compare a local destination with a destination on another network. This original sample demonstrates the reference reader and is not an institutional publication.</p></body></html>'
export const referenceUrl='https://sources.example.org/classroom-guide'
export async function referenceIntakeUI(page:Page,failIndex=false){
 const requests:any[]=[],writes:any[]=[],copies=new Map<string,any>();let indexCalls=0,release=()=>{}
 const held=new Promise<void>(resolve=>{release=resolve})
 let workspace={syllabi:[],content:{},registrations:[]}
 await page.route('**/api/ai?action=workspace',async route=>{if(route.request().method()==='PUT'){const input=route.request().postDataJSON();writes.push(input);workspace=input.data}return route.fulfill({json:{revision:writes.length,mode:'local',data:workspace}})})
 await page.route('**/api/ai?action=syllabus-sources',async route=>{
  const command=route.request().postDataJSON();requests.push(command)
  if(command.operation==='list')return route.fulfill({json:{sources:command.references.map((reference:any)=>({reference,status:'unread',snapshot:[...copies.values()].find(copy=>copy.reference.title===reference.title)}))}})
  if(command.operation==='import-link'||command.operation==='import-file'){
   if(command.operation==='import-link'&&command.url.endsWith('/hold'))await held
   const bytes=command.operation==='import-file'?Buffer.from(command.base64,'base64'):Buffer.from(referenceHtml),input=bytes.toString(),metadata=citationMetadata(input,command.operation==='import-link'||command.name.endsWith('.html'))
   const reference={kind:command.operation==='import-link'?'link':'book',title:metadata.title||'Sample File',authors:metadata.author,year:metadata.year,publisher:metadata.publisher,url:command.url||''}
   const snapshot={id:command.operation==='import-link'?'11111111-1111-4111-8111-111111111111':'22222222-2222-4222-8222-222222222222',reference,reference_key:'synthetic-key',sha256:createHash('sha256').update(bytes).digest('hex'),name:command.name||'source.html',mime:'text/html',size:bytes.length,pages:0,truncated:false,created_at:'2026-11-10T01:00:00.000Z',warnings:[],versions:1,status:'retained',url:command.url||''}
   copies.set(snapshot.id,{...snapshot,text:htmlToStructuredText(input),base64:bytes.toString('base64')})
   return route.fulfill({json:{reference,snapshot,missing:['authors','year','publisher'].filter(field=>!reference[field as keyof typeof reference]),titleOrigin:metadata.titleOrigin}})
  }
  if(command.operation==='index'){indexCalls++;if(failIndex&&indexCalls===1)return route.fulfill({status:503,json:{error:{code:'DATABASE_UNAVAILABLE',message:'Synthetic index interruption.'}}});return route.fulfill({json:{indexed:true,documentId:'33333333-3333-4333-8333-333333333333',duplicate:indexCalls>1,chunks:1,embeddingModel:'controlled-ui-transport'}})}
  if(command.operation==='review')return route.fulfill({json:copies.get(command.id)})
  if(command.operation==='open'){const copy=copies.get(command.id);return route.fulfill({json:{name:copy.name,mime:copy.mime,base64:copy.base64,sha256:copy.sha256}})}
  throw new Error('Unexpected source command '+command.operation)
 })
 return {requests,writes,release}
}
