import { test,expect,type Page } from './fixtures'
import { mkdir } from 'node:fs/promises'
import { baselineUI,baselineWorkspace } from '../baseline-fixture'

const root='../feature-documentation/system-walkthrough/09-restored-role-pages'
async function shot(page:Page,name:string,selector?:string) {
 await mkdir(root,{recursive:true});await expect(page.getByRole('region',{name:'Loading academic records'})).toHaveCount(0);await page.mouse.move(2,400);await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));await (selector?page.locator(selector):page).screenshot({path:`${root}/${name}.png`,animations:'disabled',fullPage:!selector,style:'.app-topbar{position:static !important}'})
}
test('synthetic baseline topic mastery and reviewed-response controls',async({page})=>{
 await baselineUI(page);await page.goto('/#/performance?tab=bytopic');await expect(page.getByRole('img',{name:/^Syllabus topic mastery radar:/})).toBeVisible();await shot(page,'36-topic-mastery-heatmap')
 await page.goto('/#/scoring-sheet');await page.getByLabel('Assessment attempt',{exact:true}).selectOption('00000000-0000-4000-8000-000000000001');await page.getByLabel('Review reason',{exact:true}).fill('Checked all responses against the approved syllabus.');await shot(page,'37-instructor-response-marking')
 await page.getByRole('button',{name:'Confirm reviewed marks',exact:true}).click();await page.getByRole('button',{name:'Confirm reminder',exact:true}).first().click();await expect(page.getByRole('status').filter({hasText:'in-app reminders saved'})).toBeVisible();await shot(page,'38-confirmed-in-app-reminder')
})
test('synthetic baseline loading, block correction and offline review',async({page})=>{
 await baselineUI(page,'dean');await page.goto('/#/course-loading?tab=instructors');await page.getByLabel('Released course',{exact:true}).selectOption('IT 102');await page.getByLabel('Block',{exact:true}).fill('BSIT-1B');await page.getByRole('button',{name:'Suggest highest-priority instructor',exact:true}).click();await shot(page,'39-loading-proposals')
 await page.goto('/#/records?tab=sections');await page.getByLabel('Imported student',{exact:true}).selectOption('SYN-001');await page.getByLabel('Confirmed block',{exact:true}).fill('BSIT-1B');await shot(page,'40-block-correction')
 await page.goto('/#/monitor?tab=review');await page.getByLabel('Course to review',{exact:true}).selectOption('a'.repeat(32));await page.getByLabel('Correction request',{exact:true}).fill('Clarify the learning outcomes before the offline review route.');await shot(page,'41-offline-review-inbox')
})
test('synthetic baseline student timed written response and saved notice',async({page})=>{
 const fixture=await baselineUI(page,'student');fixture.records.attempts=[];const publication=fixture.records.publications.find(p=>p.type==='assessment')!;publication.content={...publication.content,assessmentPolicy:{durationSeconds:600,maxAttempts:2},questions:[{text:'Choose the named variable.',topic:'Variables',options:['A','B','C','D']},{text:'Explain how a function groups reusable instructions.',type:'short_answer',topic:'Functions'},{text:'An array holds only one value.',type:'true_false',topic:'Arrays',options:['True','False']}]};
 await page.goto('/#/assessment');await page.getByRole('button',{name:'Open assessment',exact:true}).first().click();await page.getByRole('button',{name:'Question 2',exact:true}).click();await page.getByRole('textbox',{name:'Written response for question 2',exact:true}).fill('A function groups a reusable sequence of instructions.');await shot(page,'42-timed-written-assessment')
 await page.getByRole('button',{name:'Question 1',exact:true}).click();await page.getByLabel('Question 1: A',{exact:true}).check();await page.getByRole('button',{name:'Question 3',exact:true}).click();await page.getByLabel('Question 3: False',{exact:true}).check();await page.getByRole('button',{name:'Confirm and submit responses',exact:true}).click();await page.getByLabel('Appeal to instructor',{exact:true}).fill('Please review the explanation.');await shot(page,'43-assessment-pending-review-and-appeal')
 await page.goto('/#/notifications');await shot(page,'44-persisted-academic-notices')
})
test('synthetic baseline syllabus versions, assessment mappings and delivery settings',async({page})=>{
 const fixture=await baselineUI(page);fixture.setWorkspace(structuredClone(baselineWorkspace));await page.goto('/#/syllabus?tab=mine');await page.getByTitle('Version History').first().click();await shot(page,'45-saved-syllabus-versions','[aria-label="Syllabus history"]');await page.getByRole('button',{name:'Close',exact:true}).click()
 await page.goto('/#/courseware?tab=builder&course=baseline-syllabus&week=1');await page.getByRole('button',{name:'Open',exact:true}).first().click();await expect(page.getByRole('button',{name:'Save Assessment'})).toBeVisible();await page.getByRole('combobox',{name:'Question 2 response type'}).selectOption('true_false');await page.locator('.assessment-question-input').nth(1).fill('Functions group reusable instructions.');await page.getByText('True',{exact:true}).click();await shot(page,'46-assessment-topic-mapping')
 await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByText('Delivery settings',{exact:true}).first().click();await shot(page,'47-publication-delivery-settings')
 await page.locator('.delivery-settings').first().evaluate(element=>element.removeAttribute('open'));await page.screenshot({path:'../feature-documentation/system-manual/03-courseware-generation-and-review/04-generated-drafts-for-review.png',animations:'disabled',fullPage:true,style:'.app-topbar{position:static !important}'})
})

test('synthetic account Pulse guidance matches shared records',async({page})=>{
 await baselineUI(page,'dean');await page.goto('/#/records');await page.getByRole('button',{name:'Open Pulse assistant',exact:true}).click();const pulse=page.getByRole('dialog',{name:'Pulse',exact:true});await pulse.getByRole('button', { name: 'Pulse options', exact: true }).click(); await pulse.getByRole('button',{name:'Guide this page',exact:true}).click();await expect(pulse.locator('.pulse-focus-heading strong')).toHaveText('Academic Records');await pulse.getByRole('button',{name:'Import files from EduSuite',exact:true}).click();await pulse.getByRole('button',{name:'Next step',exact:true}).click();await pulse.getByRole('button',{name:'Next step',exact:true}).click();await expect(pulse).toContainText('Confirm Import saves shared records and matching enrollments');await shot(page,'50-account-pulse-guidance')
})
