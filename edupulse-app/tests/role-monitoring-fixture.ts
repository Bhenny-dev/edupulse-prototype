import {expect,type Page} from '@playwright/test'
import {accountSupportUI,supportAccounts} from './account-support-fixture'
export async function roleMonitoringUI(page:Page){
 const fixture=await accountSupportUI(page)
 const roles=['dean','associate_dean','instructor','student']
 const accounts=[{id:'fe67b9d2-719b-4b10-91cd-76031ab115fe',name:'System Admin Sample',role:'admin'},...supportAccounts].map(account=>({...account,confirmed:true,lastSignIn:'2026-11-12T02:00:00Z'}))
 let reads=0
 await page.route('https://*.supabase.co/rest/v1/rpc/edupulse_admin_overview',route=>{reads++;return route.fulfill({json:{accounts,authEvents:[],appEvents:roles.map((role,index)=>({id:`audit-${role}`,actorRole:role,action:'navigation',outcome:index===2?'failure':'success',detail:'Synthetic monitoring example',at:'2026-11-12T02:00:00Z'}))}})})
 await page.route('https://*.supabase.co/rest/v1/rpc/edupulse_admin_agent_activity',route=>route.fulfill({json:{totals:{runs:4,declined:0,failed:0,avgMs:12},byAgent:[{agent:'Guardian',runs:4,goalMet:4,fallbacks:0,avgMs:12,lastRun:'2026-11-12T02:00:00Z'}],byRule:[],recent:roles.map(role=>({id:`run-${role}`,role,workflow:'chat',task:'answer',outcome:'answered',at:'2026-11-12T02:00:00Z',ms:12,agents:[{agent:'Guardian',goalMet:true,status:'complete'}]}))}}))
 return {...fixture,reads:()=>reads}
}
export async function roleMonitoringChecks(page:Page){
 const fixture=await roleMonitoringUI(page)
 await page.goto('/#/dashboard?role=instructor&monitorTab=accounts')
 await expect(page.getByRole('heading',{name:'Instructor monitoring',exact:true})).toBeVisible()
 await expect(page.getByRole('cell',{name:'Rowan Instructor Demo',exact:true})).toBeVisible()
 await expect(page.getByRole('cell',{name:'Alex Sample',exact:true})).toHaveCount(0)
 await page.reload()
 await expect(page.getByRole('cell',{name:'Rowan Instructor Demo',exact:true})).toBeVisible()
 await expect(page).toHaveURL(/role=instructor&monitorTab=accounts/)
 await page.getByRole('button',{name:'Recent role AI runs',exact:true}).click()
 await expect(page.getByRole('cell',{name:'answered',exact:true})).toBeVisible()
 await expect(page.getByRole('cell',{name:'Guardian',exact:true})).toBeVisible()
 const reads=fixture.reads()
 await page.getByRole('button',{name:'Health',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Shared service health',exact:true})).toBeVisible()
 expect(fixture.reads()).toBe(reads)
 if(await page.getByRole('button',{name:'Open menu',exact:true}).isVisible())await page.getByRole('button',{name:'Open menu',exact:true}).click()
 await page.getByRole('link',{name:'Dean',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Dean monitoring',exact:true})).toBeVisible()
 expect(fixture.reads()).toBe(reads)
 expect(fixture.calls.filter(call=>call.method==='POST'&&['support','operator','chat','courseware'].includes(call.action))).toEqual([])
}
