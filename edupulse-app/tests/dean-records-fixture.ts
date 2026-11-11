import type {Page} from '@playwright/test'
import {academicUI} from './academic-ui-fixture'
import {deanRecordData} from './dean-records-data'
export async function deanRecordsUI(page:Page,role='dean'){
 const records=deanRecordData(),calls:{action:string;method:string}[]=[]
 await academicUI(page,async()=>({json:records}),role)
 await page.route('**/api/ai?*',async route=>{
  const action=new URL(route.request().url()).searchParams.get('action')||'',method=route.request().method();calls.push({action,method})
  if(method!=='GET')throw new Error(`Unexpected write/inference from a read-only Dean view: ${action}`)
  if(action==='health')return route.fulfill({json:{version:'synthetic-ui',ready:false,provider:'retrieval',model:'synthetic-ui',database:{ready:true,kind:'synthetic'},identity:{mode:'account',role}}})
  if(action==='providers')return route.fulfill({json:{connection:null,connections:[],models:[]}})
  if(action==='conversations')return route.fulfill({json:{threads:[],messages:[],memories:[],automaticMemory:true}})
  return route.fallback()
 })
 return {records,calls}
}
