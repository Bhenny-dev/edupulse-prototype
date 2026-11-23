import {test,expect} from '@playwright/test'
import {studentLearningScene,studentLearningUI,courseContentDialogScene} from '../student-learning-ui'
test('student enrolled course cards, reading, generated practice and repeat progress',async({page})=>{test.setTimeout(60000);await studentLearningScene(page)})
test('Admin student actions keep attribution without the removed header controls and reload never replays writes',async({page})=>{
 test.setTimeout(60000);await studentLearningUI(page,true);const commands:any[]=[]
 await page.route('**/api/ai?action=academic',async r=>{if(r.request().method()==='GET')return r.fallback();const c=r.request().postDataJSON();commands.push(c);return r.fulfill({json:c.operation==='start'?{id:'77777777-1111-4111-8111-111111111111',attempt_no:1,started_at:new Date().toISOString(),is_test:true}:{opened:true}})})
 await page.goto('/#/courseware');await page.getByRole('button',{name:'Open course IT 102',exact:true}).click()
 await expect(page.getByText('Records up to date',{exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Export authorized records',exact:true})).toHaveCount(0)
 await expect(page.getByLabel('Enable Admin demonstration controls',{exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'Open material',exact:true}).first().click();await expect(page.getByRole('region',{name:'Opened courseware'})).toBeVisible();await expect.poll(()=>commands.some(c=>c.operation==='open'&&c.adminTest)).toBe(true)
 const before=commands.length;await page.reload({waitUntil:'domcontentloaded',timeout:20000});await expect(page.getByRole('region',{name:'Opened courseware'})).toBeVisible({timeout:20000});await page.waitForLoadState('networkidle');expect(commands.length).toBe(before);await page.keyboard.press('Escape')
 await page.locator('.student-resource').filter({has:page.getByRole('heading',{name:'Functions quiz',exact:true})}).getByRole('button',{name:/^(Open|Resume) assessment$/}).click()
 const quiz=page.getByRole('dialog',{name:'Functions quiz',exact:true})
 await expect(quiz).toBeVisible()
 expect(commands.some(c=>c.operation==='start')).toBe(false)
 await quiz.getByRole('button',{name:'Start assessment',exact:true}).click()
 await expect.poll(()=>commands.some(c=>c.operation==='start'&&c.adminTest)).toBe(true)
})

test('course tabs and separate readers restore without replay and every question shares one view',async({page})=>{await courseContentDialogScene(page)})
