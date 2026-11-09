import {test,expect} from '@playwright/test'
import {automaticRecordsUI} from '../automatic-records-fixture'
import {unifiedCoursewareUI} from '../courseware-unified-fixture'
import {restorationUI} from '../role-restoration-fixture'

async function nav(page:any,name:string){if(await page.getByRole('button',{name:'Open menu',exact:true}).isVisible())await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('link',{name,exact:true}).click()}
test('instructor reader, selected course and slide survive route return and focus without a workspace read',async({page})=>{
  await page.clock.install();await unifiedCoursewareUI(page)
  let reads=0;page.on('request',r=>{if(new URL(r.url()).searchParams.get('action')==='workspace'&&r.method()==='GET')reads++})
  await page.goto('/#/courseware?course=baseline-syllabus&week=1')
  await page.locator('[data-content-id="unified-material"]').getByRole('button',{name:'Actions for Variables lesson',exact:true}).click()
  await page.getByRole('menuitem',{name:'View presentation',exact:true}).click();await page.getByRole('button',{name:'Next slide',exact:true}).click();await expect(page.locator('.pres-topbar-counter')).toHaveText('2 / 2')
  const before=reads;await page.clock.fastForward(601000);await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('online'));document.dispatchEvent(new Event('visibilitychange'))})
  expect(reads).toBe(before);await expect(page.locator('.pres-topbar-counter')).toHaveText('2 / 2')
  await nav(page,'Dashboard');await nav(page,'Course');await expect(page.locator('.pres-topbar-counter')).toHaveText('2 / 2');expect(reads).toBe(before)
})
test('student reader return restores presentation without recording another material open',async({page})=>{
  await restorationUI(page,'student');let opens=0
  page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('action=academic')&&r.postDataJSON()?.operation==='open')opens++})
  await page.goto('/#/courseware');await page.getByRole('button',{name:'Open material',exact:true}).click();await page.getByRole('button',{name:'Presentation',exact:true}).click();await page.getByRole('button',{name:'Next slide',exact:true}).click()
  const counter=await page.locator('.pres-topbar-counter').textContent();await nav(page,'Dashboard');await nav(page,'My Courses');await expect(page.locator('.pres-topbar-counter')).toHaveText(counter!);expect(opens).toBe(1)
  await page.getByRole('button',{name:'Close material',exact:true}).click();await nav(page,'Dashboard');await nav(page,'My Courses');await expect(page.getByRole('region',{name:'Opened courseware'})).toHaveCount(0)
})
test('Settings manual refresh revalidates data without business commands or writes',async({page})=>{
  const fixture=await automaticRecordsUI(page);await page.goto('/#/settings?tab=privacy')
  await expect(page.getByRole('button',{name:'Refresh workspace and records',exact:true})).toBeEnabled()
  const before=fixture.counts().gets;await page.getByRole('button',{name:'Refresh workspace and records',exact:true}).click();await expect.poll(()=>fixture.counts().gets).toBeGreaterThan(before)
  expect(fixture.counts().puts).toBe(0);expect(fixture.counts().business).toBe(0)
})
