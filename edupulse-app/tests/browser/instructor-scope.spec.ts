import {test,expect} from '@playwright/test'
import {instructorUpdatesUI,sender} from '../instructor-updates-fixture'

test('direct Syllabus navigation loads shared styles and its table fits narrow viewports',async({page})=>{
 await instructorUpdatesUI(page);await page.goto('/#/syllabus?tab=mine')
 const region=page.locator('.academic-table-wrap').first()
 await expect(page.locator('.syllabus-list')).toBeVisible()
 await expect.poll(()=>region.evaluate(element=>getComputedStyle(element).overflowX)).toBe('auto')
 for(const width of [320,768,1440]){
  await page.setViewportSize({width,height:900})
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if(width===320)expect(await region.evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true)
  await expect(page.locator('.syllabus-list').getByTitle('Suspend syllabus',{exact:true})).toBeVisible()
 }
})

test('leaving Syllabus while a share finishes never reloads or announces delivery in another view',async({page})=>{
 const {store}=await instructorUpdatesUI(page)
 let release!:()=>void,started=false
 const pending=new Promise<void>(resolve=>{release=resolve})
 await page.route('**/api/ai?action=syllabi',async route=>{if(route.request().postDataJSON().operation==='send'){started=true;await pending}await route.fallback()})
 await page.goto('/#/syllabus?tab=mine');await page.locator('.syllabus-list').getByTitle('Share syllabus',{exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Share syllabus',exact:true})
 await dialog.getByLabel('Instructor',{exact:true}).selectOption('22222222-1111-4111-8111-111111111111')
 await dialog.getByRole('button',{name:'Share syllabus',exact:true}).click();await expect.poll(()=>started).toBe(true)
 const reads=store.commands.filter(input=>input.operation==='list').length
 await page.goto('/#/dashboard');await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible()
 release();await expect.poll(()=>store.shares.length).toBe(1)
 await page.waitForTimeout(300)
 expect(store.commands.filter(input=>input.operation==='list')).toHaveLength(reads)
 await expect(page.locator('.toast').filter({hasText:'Syllabus shared with'})).toHaveCount(0)
})


test('shared syllabi have no routine refresh control and expose retry only after a read failure',async({page})=>{
 await instructorUpdatesUI(page)
 let fail=true,reads=0
 await page.route('**/api/ai?action=syllabi',async route=>{
  if(route.request().postDataJSON()?.operation!=='list')return route.fallback()
  reads++
  if(fail)return route.fulfill({status:503,json:{error:{code:'UNAVAILABLE',message:'Shared syllabi could not be loaded.'}}})
  return route.fallback()
 })
 await page.goto('/#/syllabus?tab=repository')
 await expect(page.getByRole('button',{name:'Refresh shared syllabi',exact:true})).toHaveCount(0)
 await expect(page.getByRole('alert').filter({hasText:'Shared syllabi could not be loaded.'})).toBeVisible()
 const initialReads=reads
 fail=false
 await page.getByRole('button',{name:'Retry loading shared syllabi',exact:true}).click()
 await expect(page.getByRole('alert').filter({hasText:'Shared syllabi could not be loaded.'})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Retry loading shared syllabi',exact:true})).toHaveCount(0)
 await expect(page.getByRole('heading',{name:'My shared syllabi',exact:true})).toBeVisible()
 expect(reads).toBe(initialReads+1)
 await expect(page.getByRole('button',{name:'Refresh shared syllabi',exact:true})).toHaveCount(0)
 await page.mouse.move(0,0)
 await page.screenshot({path:`.data/redundant-controls-syllabus-${test.info().project.name}.png`,animations:'disabled'})
})

test('workspace save failure has no generic header indicator while Settings retains the error and retry',async({page})=>{
 const {store}=await instructorUpdatesUI(page)
 store.workspaces[sender].syllabi[0].status='drafted'
 let fail=true
 await page.route('**/api/ai?action=workspace',async route=>{
  if(fail&&route.request().method()==='PUT')return route.fulfill({status:503,json:{error:{code:'WORKSPACE_UNAVAILABLE',message:'Cloud save failed. Your pending edit is retained.'}}})
  return route.fallback()
 })
 await page.goto('/#/syllabus?tab=mine')
 await page.locator('.syllabus-list').getByRole('button',{name:'Mark as Checked',exact:true}).click()
 await expect(page.getByTestId('workspace-save-state')).toContainText('Cloud save failed')
 await page.goto('/#/dashboard')
 await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible()
 await expect(page.getByText('Workspace needs attention',{exact:true})).toHaveCount(0)
 await expect(page.locator('.academic-sync-status')).not.toContainText('Waiting for workspace save')
 await page.mouse.move(0,0)
 await page.screenshot({path:`.data/redundant-controls-dashboard-${test.info().project.name}.png`,animations:'disabled'})
 await page.goto('/#/settings?tab=privacy')
 const recovery=page.getByRole('region',{name:'Workspace save recovery',exact:true})
 await expect(recovery.getByRole('alert')).toContainText('Cloud save failed')
 fail=false
 await recovery.getByRole('button',{name:'Retry save',exact:true}).click()
 await expect(page.getByTestId('workspace-save-state')).toHaveText('Saved')
 await expect(recovery).toHaveCount(0)
 expect(store.workspaces[sender].syllabi[0].status).toBe('checked')
})
