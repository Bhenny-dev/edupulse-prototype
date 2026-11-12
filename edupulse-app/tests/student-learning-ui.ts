import {expect,type Page} from '@playwright/test'
import {monitoringUI,monitoringStore} from './monitoring-fixture'
import {adminReloadUI} from './admin-reload-fixture'
export async function studentLearningUI(page:Page,support=false){
 page.setDefaultTimeout(10000)
 const store=monitoringStore();store.records.courses[0].instructor_name='Rowan Sample Instructor';store.records.publications[0].title='Advanced variables reading';store.records.attempts=store.records.attempts.slice(0,1)
 if(support){await adminReloadUI(page,'student');await page.route('**/api/ai?action=academic',r=>r.fulfill({json:store.records}));await page.route('**/api/ai?action=workspace*',r=>r.fulfill({json:{mode:'cloud',revision:1,data:store.workspace}}))}else await monitoringUI(page,'student',store)
 const sets:any[]=[],attempts:any[]=[],commands:any[]=[]
 await page.route('**/api/ai?action=practice',async route=>{
  const input=route.request().postDataJSON();commands.push(input)
  if(input.operation==='list')return route.fulfill({json:{sets,attempts}})
  if(input.operation==='generate'){const set={id:'99999999-1111-4111-8111-111111111111',course_id:'a'.repeat(32),publication_id:store.records.publications[0].id,title:'Sample advanced practice',questions:[1,2,3].map(i=>({text:`Apply the sample concept in scenario ${i}`,options:['Option A','Option B','Option C','Option D']}))};sets.push(set);return route.fulfill({json:set})}
  if(input.operation==='submit'){const result={id:crypto.randomUUID(),set_id:input.set,score:input.responses.filter((x:number)=>x===0).length,max_score:3,submitted_at:new Date().toISOString(),is_test:support};attempts.push(result);return route.fulfill({json:result})}
  throw Error('Unexpected practice command')
 })
 return {store,sets,attempts,commands}
}
export async function studentLearningScene(page:Page,shot:((name:string)=>Promise<void>)=async()=>{}){
 const fixture=await studentLearningUI(page)
 await page.goto('/#/courseware');await expect(page.getByRole('heading',{name:'My Courses',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Open course IT 102',exact:true})).toContainText('Rowan Sample Instructor');await shot('01-course-cards')
 await page.getByRole('button',{name:'Open course IT 102',exact:true}).click();await page.reload();await expect(page.getByRole('button',{name:'Back to My Courses',exact:true})).toBeVisible();await shot('02-delivered-course')
 await page.getByRole('button',{name:'Open material',exact:true}).first().click();await expect(page.getByRole('region',{name:'Opened courseware',exact:true})).toBeVisible();await shot('03-material-reader')
 await page.goto('/#/assessment');await expect(page.getByRole('heading',{name:'Practice Assessments',exact:true})).toBeVisible();await page.getByRole('combobox',{name:'Reading material',exact:true}).selectOption(fixture.store.records.publications[0].id);await page.getByRole('button',{name:'Generate advanced practice with AI',exact:true}).click();await expect(page.getByRole('button',{name:'Save practice attempt',exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('button',{name:'Save practice attempt',exact:true})).toBeVisible();await shot('04-practice-questions')
 for(let i=0;i<3;i++)await page.locator(`input[name="practice-${i}"]`).first().check()
 await page.getByRole('button',{name:'Save practice attempt',exact:true}).click();await expect(page.getByText('Practice 1: 3/3',{exact:true})).toBeVisible();await shot('05-practice-improvement')
 await page.getByRole('button',{name:'Practice again',exact:true}).click();for(let i=0;i<3;i++)await page.locator(`input[name="practice-${i}"]`).nth(1).check();await page.getByRole('button',{name:'Save practice attempt',exact:true}).click();await expect(page.getByText('Practice 2: 0/3',{exact:true})).toBeVisible()
 expect(fixture.attempts.length).toBe(2)
 await page.goto('/#/dashboard');await expect(page.getByRole('heading',{name:'Student Dashboard',exact:true})).toBeVisible();await expect.poll(()=>page.locator('.kpi-grid').first().textContent()).toContain('33%');await shot('07-student-dashboard')
 await page.goto('/#/performance');await expect(page.getByRole('heading',{name:'Performance',exact:true})).toBeVisible();await shot('08-student-performance')
}
