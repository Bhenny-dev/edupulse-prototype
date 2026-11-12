import type { Page } from '@playwright/test'
// UI-only authenticated fixture. No hosted account or server authorization is exercised.
export async function academicUI(page: Page, respond: () => Promise<{status?:number,json:object}>, role = 'instructor', profile: Record<string,unknown> = {}, principal: {id?:string;email?:string} = {}) {
 const user={id:principal.id||'fe67b9d2-719b-4b10-91cd-76031ab115fe',email:principal.email||(role==='admin'?'riverabenlor461@gmail.com':'ui.fixture@example.invalid'),app_metadata:{role,provider:role==='admin'?'google':'email',...(role==='admin'?{providers:['google']}:{})},user_metadata:{full_name:`Synthetic ${role.replaceAll('_',' ')}`,...profile},aud:'authenticated',created_at:'2026-10-27T00:00:00Z'}
 await page.addInitScript(({user})=>{const part=(x:object)=>btoa(JSON.stringify(x)).replaceAll('=','').replaceAll('+','-').replaceAll('/','_');const token=`${part({alg:'HS256',typ:'JWT'})}.${part({sub:user.id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,app_metadata:user.app_metadata})}.synthetic`;localStorage.setItem('sb-xyziepdkdvvuhgkymooo-auth-token',JSON.stringify({access_token:token,refresh_token:'synthetic-only',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}))},{user})
 await page.route('https://*.supabase.co/auth/v1/user',r=>r.fulfill({json:user}))
 await page.route('https://*.supabase.co/rest/v1/**',r=>r.fulfill({json:[]}))
 await page.route('**/api/ai?action=*',async route=>{
  const action=new URL(route.request().url()).searchParams.get('action')
  if(action==='academic'){if(route.request().method()==='POST'&&route.request().postDataJSON()?.operation==='sync')return route.fulfill({json:{synced:true}});const result=await respond();return route.fulfill(result)}
  if(action==='syllabi'&&route.request().postDataJSON()?.operation==='list')return route.fulfill({json:{shares:[]}})
  if(action==='workspace')return route.fulfill({json:{revision:0,data:null,mode:'cloud'}})
  if(action==='practice'&&route.request().method()==='POST'&&route.request().postDataJSON()?.operation==='list')return route.fulfill({json:{sets:[],attempts:[]}})
  if(action==='documents')return route.fulfill({json:{documents:[]}})
  if(action==='audit')return route.fulfill({json:{saved:true}})
  return route.fallback()
 })
}
