import type { Page } from '@playwright/test'
import { accountSupportUI } from './account-support-fixture'

export const CREDIT_ERROR = 'Your Anthropic API account has no available credits. Check Plans & Billing in Claude Console. Claude and Claude Code subscriptions use a separate balance.'

export async function navigationUI(page: Page, role = 'admin', workspaceRecovery = false) {
 await accountSupportUI(page,role)
 await page.route('https://*.supabase.co/rest/v1/rpc/edupulse_admin_overview',route=>route.fulfill({json:{accounts:[],appEvents:[],authEvents:[]}}))
 await page.route('https://*.supabase.co/rest/v1/rpc/edupulse_admin_agent_activity',route=>route.fulfill({json:{totals:{runs:0,declined:0,failed:0,avgMs:0},byAgent:[],byRule:[],recent:[]}}))
 let modelCalls=0
 let connection: {provider:string;model:string;source:string;expiresAt:string;workspaceId?:string;testedAt?:string}={provider:'anthropic',model:'synthetic-claude-model',source:'personal',expiresAt:'2026-11-10T00:00:00.000Z'}
 await page.route('**/api/ai?*',async route=>{
  const action=new URL(route.request().url()).searchParams.get('action')
  if(action==='support')return route.fallback()
  if(action==='providers'){
   if(route.request().method()==='POST'){const input=route.request().postDataJSON();if(input.apiKey)throw new Error('Workspace recovery must reuse the saved credential');connection={...connection,workspaceId:input.workspaceId||undefined,testedAt:undefined}}
   return route.fulfill({json:{connection,models:[{id:connection.model,name:'Synthetic Claude model'}]}})
  }
  if(action==='provider-workspaces')return route.fulfill({json:{workspaces:[{id:'wrkspc_default',name:'Default'},{id:'wrkspc_teaching',name:'Teaching'}]}})
  if(action==='provider-test'&&workspaceRecovery){
   if(!connection.workspaceId)return route.fulfill({status:400,json:{error:{code:'PROVIDER_WORKSPACE_REQUIRED',message:'Choose your Claude workspace in Settings → AI & Knowledge, then save the connection and test the selected model.'}}})
   connection={...connection,testedAt:'2026-11-03T00:00:00.000Z'};return route.fulfill({json:{tested:true,connection}})
  }
  if(action==='provider-test')return route.fulfill({status:402,json:{error:{code:'PROVIDER_CREDITS',message:CREDIT_ERROR}}})
  if(action==='operator'||action==='chat'){modelCalls++;return route.fulfill({status:503,json:{error:{code:'MODEL_UNAVAILABLE',message:'Synthetic model must not run for navigation.'}}})}
  if(action==='conversations')return route.fulfill({json:{conversations:[],messages:[],memories:[]}})
  if(action==='health')return route.fulfill({json:{version:'synthetic-ui',provider:'anthropic',model:connection.model,connection,ready:true,embeddings:false,message:'Credential saved and model listed. Generation has not been tested.',database:{ready:true,kind:'synthetic',message:'Synthetic UI records'},identity:{mode:'account',role},checkedAt:'2026-11-03T00:00:00.000Z'}})
  return route.fallback()
 })
 return {modelCalls:()=>modelCalls}
}
