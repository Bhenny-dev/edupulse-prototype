import {test,expect} from '@playwright/test'
import {studentLearningScene,studentLearningUI} from '../student-learning-ui'
test('student enrolled course cards, reading, generated practice and repeat progress',async({page})=>{await studentLearningScene(page)})
test('Admin support requires explicit labelled controls and can then start a test assessment',async({page})=>{
 await studentLearningUI(page,true);const commands:any[]=[]
 await page.route('**/api/ai?action=academic',async r=>{if(r.request().method()==='GET')return r.fallback();const c=r.request().postDataJSON();commands.push(c);return r.fulfill({json:c.operation==='start'?{id:'77777777-1111-4111-8111-111111111111',attempt_no:1,started_at:new Date().toISOString(),is_test:true}:{opened:true}})})
 await page.goto('/#/courseware');await page.getByRole('button',{name:'Open course IT 102',exact:true}).click();await page.getByRole('button',{name:'Open material',exact:true}).first().click();await expect(page.getByRole('region',{name:'Opened courseware'})).toBeVisible();expect(commands.length).toBe(0)
 await page.getByLabel('Enable Admin demonstration controls',{exact:true}).check();await page.getByRole('button',{name:'Open material',exact:true}).first().click();await expect.poll(()=>commands.some(c=>c.operation==='open'&&c.adminTest)).toBe(true)
})
