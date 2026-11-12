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
 await page.getByRole('button',{name:'Open material',exact:true}).first().click();await expect(page.getByRole('region',{name:'Opened courseware',exact:true})).toBeVisible();await shot('03-material-reader');await page.keyboard.press('Escape')
 await page.goto('/#/assessment');await expect(page.getByRole('heading',{name:'Practice Assessments',exact:true})).toBeVisible();await page.getByRole('combobox',{name:'Reading material',exact:true}).selectOption(fixture.store.records.publications[0].id);await page.getByRole('button',{name:'Generate advanced practice with AI',exact:true}).click();await expect(page.getByRole('button',{name:'Save practice attempt',exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('button',{name:'Save practice attempt',exact:true})).toBeVisible();await expect(page.getByRole('dialog',{name:'Sample advanced practice',exact:true})).toBeVisible();await shot('04-practice-questions')
 for(let i=0;i<3;i++)await page.locator(`input[name="practice-${i}"]`).first().check()
 await page.getByRole('button',{name:'Save practice attempt',exact:true}).click();await expect(page.getByText('Practice 1: 3/3',{exact:true})).toBeVisible();await shot('05-practice-improvement')
 await page.getByRole('button',{name:'Practice again',exact:true}).click();for(let i=0;i<3;i++)await page.locator(`input[name="practice-${i}"]`).nth(1).check();await page.getByRole('button',{name:'Save practice attempt',exact:true}).click();await expect(page.getByText('Practice 2: 0/3',{exact:true})).toBeVisible()
 expect(fixture.attempts.length).toBe(2)
 await page.goto('/#/dashboard');await expect(page.getByRole('heading',{name:'Student Dashboard',exact:true})).toBeVisible();await expect.poll(()=>page.locator('.kpi-grid').first().textContent()).toContain('33%');await shot('07-student-dashboard')
 await page.goto('/#/performance');await expect(page.getByRole('heading',{name:'Performance',exact:true})).toBeVisible();await shot('08-student-performance')
}

export async function courseContentDialogScene(page:Page,shot:((name:string)=>Promise<void>)=async()=>{}){
 const fixture=await studentLearningUI(page)
 await page.goto('/#/courseware');await page.getByRole('button',{name:'Open course IT 102',exact:true}).click()
 const tabs=page.getByRole('navigation',{name:'Course content views',exact:true})
 for(const name of ['All','Teaching Materials','Assessments'])await expect(tabs.getByRole('button',{name,exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Open material',exact:true})).toHaveCount(3);await expect(page.getByRole('button',{name:'Open assessment',exact:true})).toHaveCount(3)
 await tabs.getByRole('button',{name:'Teaching Materials',exact:true}).click();await expect(page.getByRole('button',{name:'Open assessment',exact:true})).toHaveCount(0);await shot('10-teaching-materials-tab')
 await page.getByRole('button',{name:'Open material',exact:true}).first().click();const reader=page.getByRole('dialog',{name:'Advanced variables reading',exact:true});await expect(reader).toBeVisible();await page.reload();await expect(reader).toBeVisible();await page.keyboard.press('Escape');await expect(reader).toHaveCount(0)
 await expect(tabs.getByRole('button',{name:'Teaching Materials',exact:true})).toHaveAttribute('aria-pressed','true')
 await tabs.getByRole('button',{name:'Assessments',exact:true}).click();await expect(page.getByRole('button',{name:'Open material',exact:true})).toHaveCount(0);await shot('11-assessments-tab')
 const commands:any[]=[]
 await page.route('**/api/ai?action=academic',async r=>{if(r.request().method()==='GET')return r.fallback();const c=r.request().postDataJSON();commands.push(c);if(c.operation!=='start')return r.fallback();const session={id:'77777777-1111-4111-8111-111111111111',student_id:fixture.store.records.attempts[0].student_id,publication_id:c.publication,source_version:c.version,attempt_no:1,started_at:new Date().toISOString()};fixture.store.records.sessions=[session];return r.fulfill({json:session})})
 await page.getByRole('button',{name:'Open assessment',exact:true}).nth(1).click();const dialog=page.getByRole('dialog',{name:'Functions quiz',exact:true});await expect(dialog).toBeVisible();const questions=dialog.locator('.academic-question');await expect(questions).toHaveCount(3)
 for(const question of await questions.all())await expect(question).toBeVisible()
 await expect(dialog.getByRole('button',{name:/^(Next|Previous) question$/})).toHaveCount(0);await expect(dialog.getByRole('navigation',{name:'Question navigation',exact:true})).toHaveCount(0)
 const rect=await dialog.boundingBox();expect(rect!.y).toBeGreaterThanOrEqual(0);expect(rect!.y+rect!.height).toBeLessThanOrEqual((await page.evaluate(()=>innerHeight))+1);expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.width).toBeLessThanOrEqual(await page.evaluate(()=>innerWidth))
 await shot('12-all-assessment-questions');const count=commands.length;await page.reload();await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'Confirm and submit responses',exact:true})).toBeDisabled();expect(commands.length).toBe(count)
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(tabs.getByRole('button',{name:'Assessments',exact:true})).toHaveAttribute('aria-pressed','true')
}
