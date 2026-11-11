import {test,expect} from './fixtures'
import {mkdir} from 'node:fs/promises'
import {automaticRecordsUI} from '../automatic-records-fixture'
import {unifiedCoursewareUI} from '../courseware-unified-fixture'
const root='../feature-documentation/system-manual/27-cached-workspaces'
async function shot(page:any,name:string){await mkdir(root,{recursive:true});await page.mouse.move(2,400);await page.screenshot({path:`${root}/${name}.png`,animations:'disabled',fullPage:true,style:'.app-topbar{position:static !important}'})}
test('workspace cache: retained course presentation and manual account refresh',async({page})=>{
 await unifiedCoursewareUI(page);await page.goto('/#/courseware?course=baseline-syllabus&week=1')
 await page.locator('[data-content-id="unified-material"]').getByRole('button',{name:'Actions for Variables lesson',exact:true}).click();await page.getByRole('menuitem',{name:'View presentation',exact:true}).click();await page.getByRole('button',{name:'Next slide',exact:true}).click()
 await page.getByRole('link',{name:'Dashboard',exact:true}).click();await page.getByRole('link',{name:'Course',exact:true}).click();await expect(page.locator('.pres-topbar-counter')).toHaveText('2 / 2');await shot(page,'01-retained-reader')
 await page.goto('/#/settings?tab=privacy');await expect(page.getByRole('button',{name:'Refresh workspace and records',exact:true})).toBeEnabled();await shot(page,'02-manual-refresh');await page.screenshot({path:'../feature-documentation/system-walkthrough/02-shared-interface/14-settings-data-and-privacy.png',animations:'disabled',fullPage:true,style:'.app-topbar{position:static !important}'})
})
test('workspace cache: another tab announces updates without applying them',async({page})=>{
 const fixture=await automaticRecordsUI(page);await page.goto('/#/dashboard');await expect(page.getByRole('status').filter({hasText:'Records up to date'})).toBeVisible();await page.waitForLoadState('networkidle')
 const before=fixture.counts().gets;await page.evaluate(()=>{const c=new BroadcastChannel('edupulse-records-fe67b9d2-719b-4b10-91cd-76031ab115fe');c.postMessage('invalidate');c.close()});await expect(page.getByText('Updates available',{exact:true})).toBeVisible();expect(fixture.counts().gets).toBe(before);await shot(page,'03-updates-available')
 const release=fixture.holdRead();try{await page.getByRole('button',{name:'Refresh records',exact:true}).click();await expect.poll(()=>fixture.counts().gets).toBeGreaterThan(before);await shot(page,'04-manual-read-pending')}finally{release()}
})

test('workspace cache: browser reload restores the open presentation and slide',async({page})=>{
 await unifiedCoursewareUI(page);await page.goto('/#/courseware?course=baseline-syllabus&week=1')
 await page.locator('[data-content-id="unified-material"]').getByRole('button',{name:'Actions for Variables lesson',exact:true}).click();await page.getByRole('menuitem',{name:'View presentation',exact:true}).click();await page.getByRole('button',{name:'Next slide',exact:true}).click()
 await expect(page.locator('.pres-topbar-counter')).toHaveText('2 / 2');await page.reload();await expect(page.locator('.pres-topbar-counter')).toHaveText('2 / 2');await shot(page,'05-reloaded-reader')
})
