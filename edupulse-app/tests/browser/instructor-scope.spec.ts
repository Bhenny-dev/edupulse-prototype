import {test,expect} from '@playwright/test'
import {instructorUpdatesUI} from '../instructor-updates-fixture'

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
 await page.goto('/#/dashboard');await expect(page.getByRole('heading',{name:'Instructor Dashboard',exact:true})).toBeVisible()
 release();await expect.poll(()=>store.shares.length).toBe(1)
 await page.waitForTimeout(300)
 expect(store.commands.filter(input=>input.operation==='list')).toHaveLength(reads)
 await expect(page.locator('.toast').filter({hasText:'Syllabus shared with'})).toHaveCount(0)
})
