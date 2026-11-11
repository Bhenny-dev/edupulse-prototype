import {test,expect,type Page} from '@playwright/test'
import {adminReloadUI,ADMIN_ACTOR_ID} from '../admin-reload-fixture'
import {workspaceViewKey} from '../../src/utils/workspaceViewState'

async function setup(page:Page){
 const fixture=await adminReloadUI(page,'instructor')
 await page.goto('/#/syllabus?tab=mine')
 await expect(page.locator('.support-view-banner')).toContainText(fixture.account.name)
 const key=workspaceViewKey(`support-${ADMIN_ACTOR_ID}-${fixture.account.id}`,'instructor')
 return {fixture,key}
}
async function savedOverlay(page:Page,key:string){
 return page.evaluate(key=>new Map<string,unknown>(JSON.parse(sessionStorage.getItem(key)||'{"entries":[]}').entries).get('layout-overlay'),key)
}

test('search surface survives reload while its query stays transient and Escape remains closed',async({page})=>{
 const {fixture,key}=await setup(page)
 await page.keyboard.press('Control+k')
 const input=page.getByPlaceholder('Search syllabi, courseware, students...', {exact:true})
 await input.fill('private search text')
 await expect.poll(()=>savedOverlay(page,key)).toBe('search')
 expect(await page.evaluate(key=>sessionStorage.getItem(key),key)).not.toContain('private search text')
 fixture.calls.length=0
 await page.reload()
 await expect(input).toBeVisible();await expect(input).toHaveValue('')
 expect(new URL(page.url()).hash).toBe('#/syllabus?tab=mine')
 await expect(page.locator('.support-view-banner')).toContainText(fixture.account.name)
 expect(fixture.calls.filter(call=>['chat','operator','courseware'].includes(call.action))).toEqual([])
 await page.keyboard.press('Escape')
 await expect(input).toHaveCount(0)
 await expect.poll(()=>savedOverlay(page,key)).toBeNull()
 await page.reload();await expect(page.locator('.support-view-banner')).toContainText(fixture.account.name)
 await expect(input).toHaveCount(0)
})

for(const overlay of ['account','notifications','language','roles'] as const)test(`header ${overlay} surface restores after verified account reload`,async({page},info)=>{
 test.skip(info.project.name==='mobile'&&overlay==='language','Language shortcut is intentionally hidden on phones.')
 const {key}=await setup(page)
 if(overlay==='account')await page.getByRole('button',{name:'Account menu',exact:true}).click()
 if(overlay==='notifications')await page.getByRole('button',{name:/^Notifications(?:,|$)/}).click()
 if(overlay==='language')await page.getByTitle('Language',{exact:true}).click()
 if(overlay==='roles'){
  await page.getByRole('button',{name:'Account menu',exact:true}).click()
  await page.getByRole('button',{name:'Switch view',exact:true}).click()
 }
 const surface=overlay==='account'?page.getByRole('link',{name:'Settings',exact:true}):overlay==='notifications'?page.getByRole('heading',{name:'Notifications',exact:true}):overlay==='language'?page.getByRole('button',{name:'English',exact:true}):page.getByRole('heading',{name:'Switch View',exact:true})
 await expect(surface).toBeVisible();await expect.poll(()=>savedOverlay(page,key)).toBe(overlay)
 await page.reload();await expect(surface).toBeVisible()
 expect(new URL(page.url()).hash).toBe('#/syllabus?tab=mine')
 await page.keyboard.press('Escape');await expect(surface).toHaveCount(0)
 await expect.poll(()=>savedOverlay(page,key)).toBeNull()
})

test('mobile navigation reopens after reload and choosing a destination clears its saved surface',async({page},info)=>{
 test.skip(info.project.name!=='mobile','Mobile navigation is only visible at the phone breakpoint.')
 const {key}=await setup(page)
 await page.getByRole('button',{name:'Open menu',exact:true}).click()
 const close=page.getByRole('button',{name:'Close menu',exact:true})
 await expect(close).toBeVisible();await expect.poll(()=>savedOverlay(page,key)).toBe('mobile')
 await page.reload();await expect(close).toBeVisible()
 await page.getByRole('navigation').filter({has:page.getByRole('link',{name:'Syllabus',exact:true})}).last().getByRole('link',{name:'Course',exact:true}).click()
 await expect(page).toHaveURL(/#\/courseware$/)
 await expect(close).toHaveCount(0)
 await expect.poll(()=>savedOverlay(page,key)).toBeNull()
})
