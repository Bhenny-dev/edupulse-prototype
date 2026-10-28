import { test,expect } from '@playwright/test'
import { baselineUI,baselineWorkspace } from '../baseline-fixture'

test('syllabus-topic mastery uses mapped marks and restores radar, heatmap and status',async({page})=>{
 await baselineUI(page);await page.goto('/#/performance?tab=bytopic')
 await expect(page.getByRole('img',{name:/^Syllabus topic mastery radar:/})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Topic mastery heatmap — My sections'})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Mastery / needs-review counts by topic'})).toBeVisible()
 await expect(page.getByRole('cell',{name:'Not assessed',exact:true}).first()).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
})
test('instructor marks saved responses and the score and topic marks persist',async({page})=>{
 const fixture=await baselineUI(page);await page.goto('/#/scoring-sheet')
 await page.getByLabel('Assessment attempt',{exact:true}).selectOption(fixture.records.attempts[0].id!)
 await page.getByLabel('Question 2 points',{exact:true}).selectOption('1');await page.getByLabel('Review reason',{exact:true}).fill('Reviewed the function response against the approved topic.')
 await page.getByRole('button',{name:'Confirm reviewed marks',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Question marks saved'})).toBeVisible()
 expect(fixture.records.attempts[0].score).toBe(2);await page.reload();await expect(page.getByRole('cell',{name:'2/3',exact:true}).first()).toBeVisible()
})
test('student starts a timed written-response assessment, submits, and appeals the saved result',async({page})=>{
 const fixture=await baselineUI(page,'student');fixture.records.attempts=[]
 const publication=fixture.records.publications.find(p=>p.type==='assessment')!;publication.content={...publication.content,assessmentPolicy:{durationSeconds:600,maxAttempts:2},questions:[{text:'Choose A',topic:'Variables',options:['A','B','C','D']},{text:'Explain a function',type:'short_answer',topic:'Functions'},{text:'An array holds only one value.',type:'true_false',topic:'Arrays',options:['True','False']}]}
 await page.goto('/#/assessment');await page.getByRole('button',{name:'Open assessment',exact:true}).first().click()
 await page.getByLabel('Question 1: A',{exact:true}).check();await page.getByRole('button',{name:'Next question',exact:true}).click();await expect(page.getByLabel('Question 1: A',{exact:true})).toBeHidden();await page.getByRole('textbox',{name:'Written response for question 2',exact:true}).fill('A function groups reusable instructions.');await page.getByRole('button',{name:'Next question',exact:true}).click();await page.getByLabel('Question 3: False',{exact:true}).check();await page.getByRole('button',{name:'Previous question',exact:true}).click();await expect(page.getByRole('textbox',{name:'Written response for question 2',exact:true})).toHaveValue('A function groups reusable instructions.');await page.getByRole('button',{name:'Question 3',exact:true}).click()
 await page.getByRole('button',{name:'Confirm and submit responses',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Written responses await instructor marking.'})).toBeVisible();await expect(page.getByRole('status').filter({hasText:'Saved score: 2/3.'})).toBeVisible()
 await page.getByLabel('Appeal to instructor',{exact:true}).fill('Please check my function explanation.');await page.getByRole('button',{name:'Submit appeal',exact:true}).click();await expect(page.getByText('Appeal saved for your instructor.',{exact:true})).toBeVisible()
})
test('confirmed loading suggestions and block corrections update shared records',async({page})=>{
 const fixture=await baselineUI(page,'associate_dean');await page.goto('/#/course-loading?tab=instructors')
 await page.getByLabel('Released course',{exact:true}).selectOption('IT 102');await page.getByLabel('Block',{exact:true}).fill('BSIT-1B');await page.getByRole('button',{name:'Suggest highest-priority instructor',exact:true}).click()
 await expect(page.getByRole('combobox',{name:'Proposed instructor for IT 102'})).toHaveValue('11111111-1111-4111-8111-111111111111')
 await page.getByRole('button',{name:'Confirm 1 proposed load(s)',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Confirmed 1 new'})).toBeVisible()
 expect(fixture.records.institutional!.filter(r=>r.kind==='loads')).toHaveLength(2)
 await page.goto('/#/records?tab=sections');await page.getByLabel('Imported student',{exact:true}).selectOption('SYN-001');await page.getByLabel('Confirmed block',{exact:true}).fill('BSIT-1B');await page.getByRole('button',{name:'Confirm block correction',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Block correction saved'})).toBeVisible()
 expect(fixture.records.institutional!.find(r=>r.kind==='rosters')!.data.Block).toBe('BSIT-1B')
})
test('Dean offline inbox sends correction requests and account notice read receipts survive reload',async({page})=>{
 await baselineUI(page,'dean');await page.goto('/#/monitor?tab=review');await expect(page.getByRole('heading',{name:'Offline syllabus review inbox'})).toBeVisible()
 await page.getByLabel('Course to review',{exact:true}).selectOption('a'.repeat(32));await page.getByLabel('Correction request',{exact:true}).fill('Please clarify the learning outcomes before the offline signatory route.');await page.getByRole('button',{name:'Confirm correction request',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Correction request saved'})).toBeVisible()
 await page.goto('/#/notifications');await page.getByRole('button',{name:'Mark All Read',exact:true}).click();await page.reload();await expect(page.getByRole('button',{name:'Mark All Read',exact:true})).toBeDisabled()
})
test('saved syllabus versions can be viewed and restored as a draft',async({page})=>{
 const fixture=await baselineUI(page);fixture.setWorkspace(structuredClone(baselineWorkspace));await page.goto('/#/syllabus?tab=mine')
 await page.getByTitle('Version History').first().click();await expect(page.getByRole('heading',{name:'Saved syllabus versions'})).toBeVisible();await page.getByRole('button',{name:'Restore version as draft',exact:true}).click();await expect(page.getByRole('dialog',{name:'Syllabus history'})).toHaveCount(0)
 const saved=fixture.getWorkspace() as typeof baselineWorkspace;expect(saved.syllabi[0].status).toBe('drafted');expect(saved.syllabi[0].approvedFile).toBeUndefined();expect(saved.syllabi[0].version).toBe(3)
})
test('assessment topic mappings and delivery policy save through the instructor workspace',async({page})=>{
 const fixture=await baselineUI(page);fixture.setWorkspace(structuredClone(baselineWorkspace));await page.goto('/#/courseware?tab=builder&course=baseline-syllabus&week=1')
 await page.getByRole('button',{name:'Open',exact:true}).first().click();await page.getByRole('combobox',{name:'Question 1 syllabus topic'}).selectOption('Functions');await page.getByRole('combobox',{name:'Question 2 response type'}).selectOption('true_false');await page.locator('.assessment-question-input').nth(1).fill('Functions group reusable instructions.');await page.getByText('True',{exact:true}).click();await page.getByRole('button',{name:'Save Assessment',exact:true}).click()
 await page.getByText('Delivery settings',{exact:true}).first().click();await page.getByLabel('Release at',{exact:true}).fill('2026-12-01T08:00');await page.getByLabel('Due at',{exact:true}).fill('2026-12-08T08:00');await page.getByLabel('Time limit (minutes, 0 = none)',{exact:true}).fill('20');await page.getByRole('combobox',{name:'Allowed attempts'}).selectOption('2');await page.getByRole('button',{name:'Save delivery settings',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Delivery settings saved'})).toBeVisible()
 const saved=fixture.getWorkspace() as typeof baselineWorkspace;expect(saved.content['baseline-quiz'].content.questions[0].topic).toBe('Functions');expect((saved.content['baseline-quiz'].content.questions[1] as {type?:string}).type).toBe('true_false');expect(saved.content['baseline-quiz'].content.questions[1].options).toEqual(['True','False']);expect((saved.content['baseline-quiz'].content as unknown as {assessmentPolicy:{maxAttempts:number}}).assessmentPolicy.maxAttempts).toBe(2)
})

test('authenticated Pulse guidance describes shared records and keeps Dean marks read-only',async({page})=>{
 await baselineUI(page,'dean');await page.goto('/#/records');await page.getByRole('button',{name:'Open Pulse assistant',exact:true}).click();const pulse=page.getByRole('dialog',{name:'Pulse',exact:true});await pulse.getByRole('button',{name:'Guide this page',exact:true}).click();await expect(pulse).toContainText('Review official EduSuite CSV exports');await expect(pulse.locator('.pulse-focus-heading strong')).toHaveText('Academic Records');await expect(pulse.locator('.connected-pulse-warning').filter({hasText:'This workflow currently contains sample data.'})).toHaveCount(0);await pulse.getByRole('button',{name:'Import files from EduSuite',exact:true}).click();await pulse.getByRole('button',{name:'Next step',exact:true}).click();await pulse.getByRole('button',{name:'Next step',exact:true}).click();await expect(pulse).toContainText('Confirm Import saves shared records and matching enrollments');
 await page.goto('/#/performance');await pulse.getByRole('button',{name:"Explain what I'm looking at",exact:true}).click();await pulse.getByRole('button',{name:'Next step',exact:true}).click();await pulse.getByRole('button',{name:'Next step',exact:true}).click();await expect(pulse).toContainText('The Dean cannot change marks.');await expect(pulse.locator('.connected-pulse-warning').filter({hasText:'This workflow currently contains sample data.'})).toHaveCount(0)
})
