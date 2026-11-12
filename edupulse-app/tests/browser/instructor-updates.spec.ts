import {test,expect} from '@playwright/test'
import {academicUI} from '../academic-ui-fixture'
import {roleRecords} from '../role-restoration-fixture'
import {instructorDashboardScene,instructorSyllabusScene,instructorSharingScene} from '../instructor-updates-ui'
test('instructor blocks identify their course and score snapshot uses recorded marked results',async({page})=>{await instructorDashboardScene(page)})
test('syllabus actions merge history and safely persist deletion through reload',async({page})=>{await instructorSyllabusScene(page)})
test('shared syllabi persist only in sender repository and recipient My Syllabus with provenance',async({page})=>{await instructorSharingScene(page)})

test('shared role pages keep overflow conditional and fit short tables to the available viewport',async({page})=>{
 const origin=new URL(test.info().project.use.baseURL || 'http://127.0.0.1:5187').origin
 for(const [role,route] of [['instructor','/student-monitoring?course='+ 'a'.repeat(32)+'&block=BSIT-1A&tab=materials'],['student','/performance?tab=overview'],['dean','/monitor?tab=overview'],['associate_dean','/course-loading'],['admin','/settings?tab=account']]){
  const context=await page.context().browser()!.newContext({viewport:page.viewportSize()!.width<600?{width:320,height:844}:page.viewportSize()!}),view=await context.newPage()
  try{
   await academicUI(view,async()=>({json:structuredClone(roleRecords)}),role)
   await view.goto(`${origin}/#${route}`);await expect(view.locator('main')).toBeVisible()
   await expect.poll(()=>view.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
   const regions=view.locator('.academic-table-wrap');for(const region of await regions.all())expect(await region.evaluate(element=>getComputedStyle(element).overflowX)).toBe('auto')
   if(role==='instructor'&&page.viewportSize()!.width<600){const region=view.locator('.academic-table-wrap').first();await expect(region).toBeVisible();expect(await region.evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true)}
  }finally{await context.close()}
 }
})
