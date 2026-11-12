import {test,expect} from '@playwright/test'
import {studentLearningScene,studentLearningUI} from '../student-learning-ui'
test('student enrolled course cards, reading, generated practice and repeat progress',async({page})=>{await studentLearningScene(page)})
test('Admin student actions keep attribution without the removed header controls and reload never replays writes',async({page})=>{
 await studentLearningUI(page,true);const commands:any[]=[]
 await page.route('**/api/ai?action=academic',async r=>{if(r.request().method()==='GET')return r.fallback();const c=r.request().postDataJSON();commands.push(c);return r.fulfill({json:c.operation==='start'?{id:'77777777-1111-4111-8111-111111111111',attempt_no:1,started_at:new Date().toISOString(),is_test:true}:{opened:true}})})
 await page.goto('/#/courseware');await page.getByRole('button',{name:'Open course IT 102',exact:true}).click()
 await expect(page.getByText('Records up to date',{exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Export authorized records',exact:true})).toHaveCount(0)
 await expect(page.getByLabel('Enable Admin demonstration controls',{exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'Open material',exact:true}).first().click();await expect(page.getByRole('region',{name:'Opened courseware'})).toBeVisible();await expect.poll(()=>commands.some(c=>c.operation==='open'&&c.adminTest)).toBe(true)
 const before=commands.length;await page.reload();await expect(page.getByRole('region',{name:'Opened courseware'})).toBeVisible();await page.waitForLoadState('networkidle');expect(commands.length).toBe(before)
 await page.getByRole('button',{name:'Open assessment',exact:true}).nth(1).click();await expect.poll(()=>commands.some(c=>c.operation==='start'&&c.adminTest)).toBe(true)
})
