import {expect,type Page} from '@playwright/test'
import {mkdir} from 'node:fs/promises'
import {oversightUI} from '../oversight-fixture'
import {baselineUI} from '../baseline-fixture'
const manual='../feature-documentation/system-manual/29-combined-oversight',roles='../feature-documentation/system-walkthrough/09-restored-role-pages'
async function shot(page:Page,paths:string[]){await expect(page.getByRole('region',{name:'Loading academic records'})).toHaveCount(0);await page.mouse.move(2,400);await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0)});for(const path of paths){await mkdir(path.slice(0,path.lastIndexOf('/')),{recursive:true});await page.screenshot({path,animations:'disabled',fullPage:true,style:'.app-topbar{position:static !important}'})}}
export async function overviewScene(page:Page,role='dean',mobile=false,dark=false){
 if(dark)await page.addInitScript(()=>localStorage.setItem('edupulse-dark-mode','true'));await oversightUI(page,role);await page.goto('/#/monitor?tab=delivery');await expect(page).toHaveURL(/tab=overview/);await expect(page.getByRole('heading',{name:'Syllabus and delivery overview',exact:true})).toBeVisible();await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible()
 await shot(page,[`${manual}/${mobile?'mobile-'+(dark?'dark-':''):''}${role}-overview.png`,...(!mobile?[role==='dean'?`${roles}/13-monitor-syllabus-status.png`:'../feature-documentation/system-walkthrough/08-authenticated-records/06-associate-dean-oversight.png']:[])])
 if(!mobile&&role==='dean'){
  for(const [tab,file,old] of [['students','dean-students','15-monitor-students'],['alerts','dean-alerts','16-monitor-alerts']]){await page.getByRole('navigation',{name:'Monitor views'}).getByRole('button',{name:tab==='students'?'Student Oversight':'Alerts',exact:true}).click();await shot(page,[`${manual}/${file}.png`,`${roles}/${old}.png`])}
  await page.goto('/#/course-loading');await expect(page.getByRole('heading',{name:'Course readiness monitoring',exact:true})).toBeVisible();await shot(page,[`${roles}/17-course-loading.png`])
 }
}
export async function reviewScene(page:Page){await baselineUI(page,'dean');await page.goto('/#/monitor?tab=review');await page.getByLabel('Course to review',{exact:true}).selectOption('a'.repeat(32));await page.getByLabel('Correction request',{exact:true}).fill('Clarify the learning outcomes before the offline review route.');await shot(page,[`${manual}/dean-review-inbox.png`,`${roles}/41-offline-review-inbox.png`])}
export async function previewScene(page:Page,mobile=false){
 await page.route('**/api/ai?action=workspace',route=>route.request().method()==='GET'?route.fulfill({json:{mode:'preview',revision:0}}):route.fallback());await page.goto('/');await page.getByRole('button',{name:'Dean',exact:true}).click();await page.goto('/#/monitor?tab=syllabi');await expect(page).toHaveURL(/tab=overview/);await expect(page.getByRole('heading',{name:'Delivery Progress',exact:true})).toBeVisible();await page.waitForTimeout(1800)
 await shot(page,mobile?['../feature-documentation/system-manual/12-interface-and-loading/09-mobile-monitor-tabs.png']:[`${manual}/preview-combined.png`,'../feature-documentation/system-walkthrough/03-dean-and-associate-dean/04-monitor-syllabus-status.png'])
}
