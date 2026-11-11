import type {Page} from '@playwright/test'
import {academicUI} from './academic-ui-fixture'
export const SECOND_ADMIN_EMAIL='2024-1-0262.botay@kcp.edu.ph'
export const SECOND_ADMIN_ID='a667b9d2-719b-4b10-91cd-76031ab115fe'
export const SECOND_ADMIN_SUBJECT={id:'b667b9d2-719b-4b10-91cd-76031ab115fe',role:'instructor',name:'Synthetic Instructor',email:'instructor@example.invalid',department:'Sample college'}
/** Synthetic UI transport. No hosted registration, Google session, or credential is represented. */
export async function secondAdminUI(page:Page){
 const calls:{action:string;method:string;operation?:string}[]=[]
 const empty={mode:'cloud',courses:[],enrollments:[],publications:[],attempts:[],accesses:[],notices:[],events:[],faculty:[],institutional:[]}
 await academicUI(page,async()=>({json:empty}),'admin',{}, {id:SECOND_ADMIN_ID,email:SECOND_ADMIN_EMAIL})
 await page.route('https://*.supabase.co/auth/v1/settings',r=>r.fulfill({json:{external:{google:true}}}))
 await page.route('https://*.supabase.co/rest/v1/rpc/edupulse_admin_overview',r=>r.fulfill({json:{accounts:[
  {id:SECOND_ADMIN_ID,name:'System Admin',email:null,role:'admin',confirmed:true},
  {id:'c667b9d2-719b-4b10-91cd-76031ab115fe',name:'System Admin',email:null,role:'admin',confirmed:true},
  {...SECOND_ADMIN_SUBJECT,confirmed:true}],appEvents:[],authEvents:[]}}))
 await page.route('https://*.supabase.co/rest/v1/rpc/edupulse_admin_agent_activity',r=>r.fulfill({json:{totals:{runs:0,declined:0,failed:0,avgMs:0},byAgent:[],byRule:[],recent:[]}}))
 await page.route('**/api/ai?*',route=>{
  const request=route.request(),action=new URL(request.url()).searchParams.get('action')||'',method=request.method(),body=method==='POST'?request.postDataJSON():null
  calls.push({action,method,operation:body?.operation})
  if(action==='support')return route.fulfill({json:method==='POST'||new URL(request.url()).searchParams.has('subject')?SECOND_ADMIN_SUBJECT:{accounts:[SECOND_ADMIN_SUBJECT],total:1,offset:0,pageSize:50,departments:[],programs:[]}})
  if(action==='health')return route.fulfill({json:{version:'synthetic-ui',ready:true,provider:'retrieval',model:'synthetic-ui',database:{ready:true,kind:'synthetic'},identity:{mode:'account',role:'admin'}}})
  if(action==='providers')return route.fulfill({json:{connections:[],connection:null,models:[]}})
  if(action==='conversations')return route.fulfill({json:{threads:[],messages:[],memories:[],automaticMemory:true}})
  return route.fallback()
 })
 return {calls}
}
