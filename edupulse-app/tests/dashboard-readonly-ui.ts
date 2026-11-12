import { expect, type Page } from '@playwright/test'
import { adminReloadUI } from './admin-reload-fixture'
import { automaticRecordsUI } from './automatic-records-fixture'

export async function readOnlyDashboard(page:Page,support=false){
 page.setDefaultTimeout(10000)
 const fixture=support?await adminReloadUI(page,'instructor'):await automaticRecordsUI(page)
 const writes:string[]=[]
 await page.route('**/api/ai?action=academic',async route=>{
  if(route.request().method()!=='POST')return route.fallback()
  writes.push(route.request().postDataJSON().operation)
  return route.fulfill({status:503,json:{error:{code:'SUPPORT_UNAVAILABLE',message:'Synthetic legacy synchronization failure'}}})
 })
 await page.goto('/#/dashboard')
 if(support)await expect(page.locator('.support-view-banner')).toContainText('Rowan Instructor Demo')
 const ready=()=>expect(page.locator('.academic-sync-status')).toContainText('Records up to date')
 await ready();await expect(page.getByRole('heading',{name:'Instructor Dashboard',exact:true})).toBeVisible()
 await page.waitForLoadState('networkidle',{timeout:10000})
 expect(writes).toEqual([])
 await page.reload();await ready();await page.waitForLoadState('networkidle',{timeout:10000})
 expect(writes).toEqual([])
 await page.evaluate(id=>{const c=new BroadcastChannel('edupulse-records-'+id);c.postMessage('invalidate');c.close()},support?'44444444-4444-4444-8444-444444444444':'fe67b9d2-719b-4b10-91cd-76031ab115fe')
 await expect(page.getByText('Updates available',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Refresh records',exact:true}).click();await ready()
 expect(writes).toEqual([])
 return fixture
}
