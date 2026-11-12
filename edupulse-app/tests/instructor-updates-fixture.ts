import type {Page} from '@playwright/test'
import {academicUI} from './academic-ui-fixture'
import {roleRecords} from './role-restoration-fixture'
import {baselineWorkspace} from './baseline-fixture'

export const sender='fe67b9d2-719b-4b10-91cd-76031ab115fe',recipient='22222222-1111-4111-8111-111111111111'
export const sharedStore=()=>({shares:[] as any[],workspaces:{[sender]:structuredClone(baselineWorkspace),[recipient]:{syllabi:[],content:{},registrations:[]}} as Record<string,any>,revisions:{[sender]:1,[recipient]:0} as Record<string,number>,commands:[] as any[],failDelete:false})
export async function instructorUpdatesUI(page:Page,owner=sender,store=sharedStore()){
 const records=structuredClone(roleRecords);records.courses[0].instructor_id=owner
 records.courses.push({...records.courses[0],id:'c'.repeat(32),course_code:'IT 103',course_title:'Programming Lab'})
 records.enrollments.push({...records.enrollments[0],course_id:'c'.repeat(32)})
 await academicUI(page,async()=>({json:records}),'instructor',{full_name:owner===sender?'Synthetic sender':'Synthetic recipient'},{id:owner,email:owner===sender?'sender@example.invalid':'recipient@example.invalid'})
 await page.route('**/api/ai?action=health',route=>route.fulfill({json:{version:'synthetic-ui',provider:'retrieval',ready:false,embeddings:false,message:'Instructor UI fixture',database:{ready:false,kind:'synthetic'},identity:{mode:'synthetic',role:'instructor'}}}))
 await page.route('**/api/ai?action=providers',route=>route.fulfill({json:{connection:null,connections:[],models:[]}}))
 await page.route('**/api/ai?action=conversations',route=>route.fulfill({json:{threads:[],messages:[],memories:[],automaticMemory:true,mode:'session'}}))
 await page.route('**/api/ai?action=workspace*',async route=>{
  if(route.request().method()==='PUT'){
   const input=route.request().postDataJSON();store.commands.push(input)
   if(store.failDelete&&input.data.syllabi.length<store.workspaces[owner].syllabi.length){store.failDelete=false;return route.fulfill({status:503,json:{error:{message:'Synthetic unavailable save',code:'WORKSPACE_UNAVAILABLE'}}})}
   if(input.revision!==store.revisions[owner])return route.fulfill({status:409,json:{error:{message:'Workspace changed',code:'WORKSPACE_CONFLICT'}}})
   store.workspaces[owner]=input.data;store.revisions[owner]++
  }
  return route.fulfill({json:{mode:'cloud',revision:store.revisions[owner],data:store.workspaces[owner]}})
 })
 await page.route('**/api/ai?action=syllabi',async route=>{
  const input=route.request().postDataJSON();store.commands.push(input)
  const visible=store.shares.filter(row=>row.sender_id===owner||row.recipient_id===owner&&!row.recipient_hidden)
  if(input.operation==='recipients')return route.fulfill({json:{instructors:[{id:owner===sender?recipient:sender,name:owner===sender?'Synthetic recipient':'Synthetic sender',email:owner===sender?'recipient@example.invalid':'sender@example.invalid'}]}})
  if(input.operation==='list')return route.fulfill({json:{shares:visible.map(({snapshot:_snapshot,...row})=>row)}})
  if(input.operation==='open'){const share=visible.find(row=>row.id===input.id);return route.fulfill(share?{json:{syllabus:share.snapshot}}:{status:404,json:{error:{code:'SHARE_UNAVAILABLE',message:'Shared syllabus unavailable'}}})}
  if(input.operation==='send'){
   if(owner!==sender||input.recipient!==recipient||input.revision!==store.revisions[owner])return route.fulfill({status:400,json:{error:{code:'SHARING_FAILED',message:'Enter another registered instructor email'}}})
   const {approvedFile:_approvedFile,versions:_versions,history:_history,...snapshot}=store.workspaces[owner].syllabi.find((row:any)=>row.id===input.syllabus)
   const row={id:'99999999-1111-4111-8111-111111111111',sender_id:sender,recipient_id:recipient,syllabus_id:input.syllabus,sender_name:'Synthetic sender',recipient_name:'Synthetic recipient',created_at:'2026-11-12T01:00:00Z',courseCode:snapshot.courseCode,courseTitle:snapshot.courseTitle,snapshot,recipient_hidden:false,sender_suspended:false,recipient_suspended:false}
   store.shares=[...store.shares.filter(share=>share.id!==row.id),row];return route.fulfill({json:{id:row.id,recipient:row.recipient_name}})
  }
  if(['suspend','resume'].includes(input.operation)){const share=visible.find(row=>row.id===input.id);if(!share)return route.fulfill({status:404,json:{error:{message:'Share unavailable'}}});share[share.sender_id===owner?'sender_suspended':'recipient_suspended']=input.operation==='suspend';return route.fulfill({json:{id:share.id}})}
  if(input.operation==='adopt'){
   const share=visible.find(row=>row.id===input.id&&row.recipient_id===owner&&!row.sender_suspended&&!row.recipient_suspended)
   if(!share)return route.fulfill({status:403,json:{error:{message:'Share unavailable'}}})
   let copy=store.workspaces[owner].syllabi.find((row:any)=>row.sharedFrom?.id===share.id&&row.sharedFrom?.mode===input.mode)
   if(!copy){copy={...share.snapshot,id:input.mode==='approved'?'approved-received-copy':'draft-received-copy',instructorId:owner,status:input.mode==='approved'?'active':'drafted',sample:false,version:1,sharedBy:{id:share.sender_id,name:share.sender_name},sharedFrom:{id:share.id,mode:input.mode},...(input.mode==='approved'?{approvedFile:store.workspaces[sender].syllabi[0].approvedFile}:{})};store.workspaces[owner].syllabi.push(copy);store.revisions[owner]++}
   return route.fulfill({json:{id:copy.id,revision:store.revisions[owner]}})
  }
  if(input.operation==='remove'){const row=visible.find(row=>row.id===input.id);if(!row)return route.fulfill({status:403,json:{error:{code:'FORBIDDEN',message:'Share unavailable'}}});if(owner===recipient)row.recipient_hidden=true;else store.shares=store.shares.filter(share=>share.id!==input.id);return route.fulfill({json:{removed:input.id}})}
  return route.fulfill({status:400,json:{error:{code:'BAD_INPUT',message:'Unexpected fixture command'}}})
 })
 return {store,records}
}
