import type { Page } from '@playwright/test'
import { accountSupportUI } from './account-support-fixture'
import { STAFF_ACCOUNTS } from '../scripts/lib/staff-accounts.mjs'

/** Controlled account-picker transport; actual Auth registration/sign-in is verified separately. */
export async function staffRegistrationUI(page:Page) {
  await accountSupportUI(page)
  const accounts=STAFF_ACCOUNTS.map((account,index)=>({...account,id:`44444444-4444-4444-8444-${String(index+1).padStart(12,'0')}`,department:'',program:null,year_level:null,student_number:null}))
  await page.route('**/api/ai?*',async route=>{
    const request=route.request(),url=new URL(request.url())
    if(url.searchParams.get('action')!=='support')return route.fallback()
    if(request.method()==='POST') {
      const account=accounts.find(row=>row.id===request.postDataJSON().id)
      return account?route.fulfill({json:account}):route.fulfill({status:403,json:{error:{code:'SUPPORT_FORBIDDEN',message:'Account unavailable'}}})
    }
    const q=(url.searchParams.get('q')||'').toLowerCase(),found=accounts.filter(row=>row.role===url.searchParams.get('role')&&`${row.name} ${row.email}`.toLowerCase().includes(q))
    return route.fulfill({json:{accounts:found,total:found.length,offset:0,pageSize:50,departments:[],programs:[]}})
  })
}
