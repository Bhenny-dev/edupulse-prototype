import type {Page} from '@playwright/test'
import {researchMethodsDraft} from './syllabus-draft-fixture'

// Synthetic transport exercises the actual planner client, mounted builder and preview controls.
export async function outlineProgressUI(page:Page) {
 const requests:Record<string,any>[]=[],writes:unknown[]=[];let release=()=>{}
 const held=new Promise<void>(resolve=>{release=resolve})
 const rows=researchMethodsDraft.courseOutline.filter(row=>row.week<=2)
 const syllabus={id:'synthetic-reference',sample:true,courseCode:'IT 104',courseTitle:'Research Methods',version:2,status:'active',courseOutline:researchMethodsDraft.courseOutline}
 await page.route('**/api/ai?action=workspace',async route=>{
  if(route.request().method()==='PUT')writes.push(route.request().postDataJSON())
  return route.fulfill({json:{revision:0,mode:'local',data:{syllabi:[syllabus],content:{},registrations:[]}}})
 })
 await page.route('**/api/ai?action=operator',async route=>{
  const input=route.request().postDataJSON();requests.push(input)
  if(!input.continuation)return route.fulfill({json:{pending:true,continuation:'synthetic-initial',generated:false}})
  if(input.continuation==='synthetic-initial')return route.fulfill({json:{pending:true,continuation:'synthetic-week-one',generated:true,progress:{rows:rows.slice(0,1),total:16}}})
  if(input.continuation==='synthetic-week-one')return route.fulfill({json:{pending:true,continuation:'synthetic-week-two',generated:true,progress:{rows,total:16}}})
  await held
  return route.fulfill({status:502,json:{error:{code:'INCOMPLETE_RESPONSE',message:'The synthetic model stopped during a later week.'}}})
 })
 return {requests,writes,release,rows}
}
