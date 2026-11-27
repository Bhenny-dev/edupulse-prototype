import {test,expect} from '@playwright/test'
import {studentLearningScene,studentLearningUI,courseContentDialogScene} from '../student-learning-ui'
test('student enrolled course cards, reading, generated practice and repeat progress',async({page})=>{test.setTimeout(60000);await studentLearningScene(page)})
test('Admin student actions keep attribution without the removed header controls and reload never replays writes',async({page})=>{
 test.setTimeout(60000);await studentLearningUI(page,true);const commands:any[]=[]
 await page.route('**/api/ai?action=academic',async r=>{if(r.request().method()==='GET')return r.fallback();const c=r.request().postDataJSON();commands.push(c);return r.fulfill({json:c.operation==='start'?{id:'77777777-1111-4111-8111-111111111111',attempt_no:1,started_at:new Date().toISOString(),is_test:true}:{opened:true}})})
 await page.goto('/#/courseware');await page.getByRole('region',{name:'Your classes'}).getByRole('button',{name:/^Open IT 102 /}).click();await page.getByRole('button',{name:'Teaching Materials & Assessments',exact:true}).click()
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
test('practice from a finished quiz lists only submitted quizzes, sends the quiz as its source and explains when none exist',async({page})=>{
 const fixture=await studentLearningUI(page),quiz=fixture.store.records.publications.find((p:any)=>p.id===fixture.store.records.attempts[0].publication_id)!
 expect(quiz.type).toBe('assessment')
 await page.goto('/#/assessment');await expect(page.getByRole('heading',{name:'Practice Assessments',exact:true})).toBeVisible()
 const picker=page.getByRole('combobox',{name:'Finished quiz',exact:true}),generate=page.getByRole('button',{name:'Generate practice on the same topics',exact:true})
 await expect(generate).toBeDisabled()
 await expect(picker.locator('option')).toHaveCount(2)
 await picker.selectOption(quiz.id);await generate.click()
 await expect(page.getByRole('button',{name:'Save practice attempt',exact:true})).toBeVisible()
 expect(fixture.commands.find((c:any)=>c.operation==='generate')).toEqual({operation:'generate',source:'assessment',publication:quiz.id,version:quiz.source_version})
 fixture.store.records.attempts.length=0
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Close practice',exact:true}).click()
 await expect(picker).toBeDisabled();await expect(generate).toBeDisabled()
 await expect(page.getByText('Submit an instructor quiz first. It then appears here for practice.',{exact:true})).toBeVisible()
})
test('mock quizzes list only reading marked as advanced, send that source and explain when none exist',async({page})=>{
 const fixture=await studentLearningUI(page),readings=fixture.store.records.publications.filter((p:any)=>p.type!=='assessment'&&p.content)
 expect(readings.length).toBeGreaterThan(0)
 await page.goto('/#/assessment');await expect(page.getByRole('heading',{name:'Practice Assessments',exact:true})).toBeVisible()
 const picker=page.getByRole('combobox',{name:'Advanced reading',exact:true}),generate=page.getByRole('button',{name:'Generate mock quiz',exact:true})
 await expect(picker).toBeDisabled();await expect(generate).toBeDisabled()
 await expect(page.getByText('Your instructors have not delivered reading marked as advanced yet. Mock quizzes appear here when they do.',{exact:true})).toBeVisible()
 const marked=readings[0];marked.content={...marked.content,advancedReading:true}
 await page.reload({waitUntil:'domcontentloaded'})
 await expect(picker.locator('option')).toHaveCount(2)
 await picker.selectOption(marked.id);await generate.click()
 await expect(page.getByRole('button',{name:'Save practice attempt',exact:true})).toBeVisible()
 expect(fixture.commands.find((c:any)=>c.operation==='generate')).toEqual({operation:'generate',source:'advanced',publication:marked.id,version:marked.source_version})
})
