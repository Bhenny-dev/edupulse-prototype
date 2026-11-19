import {test,expect} from './fixtures'
import {teachingLoadUI,teachingLoadPdf} from '../teaching-load-fixture'
import {historicalLoadsScene} from '../historical-loads-ui'
const folder='../feature-documentation/system-manual/47-teaching-load-documents'
test('teaching-load PDF review keeps source columns, explicit mapping and term filters',async({page})=>{
 const fixture=await teachingLoadUI(page)
 await page.goto('/#/records');await expect(page.locator('footer')).toHaveCount(0);await expect(page.locator('.page-header').getByLabel('Academic term',{exact:true})).toBeVisible()
 await page.locator('input[type=file][accept*=".pdf"]').setInputFiles({name:'approved-load.pdf',mimeType:'application/pdf',buffer:Buffer.from(await teachingLoadPdf())})
 const review=page.getByRole('dialog',{name:'Review teaching loads',exact:true})
 await expect(review).toBeVisible();await review.getByText('TTh',{exact:true}).first().click();await expect(review.getByRole('checkbox',{name:'Tuesday T',exact:true})).toBeChecked();await expect(review.getByRole('checkbox',{name:'Thursday Th',exact:true})).toBeChecked();await expect(review.getByRole('checkbox',{name:/Sunday/})).toHaveCount(0)
 await expect(review).toContainText('IT 102 A — Programming foundations')
 await expect(review.getByRole('button',{name:'Confirm selected loads'})).toBeDisabled()
 await page.screenshot({path:`${folder}/01-extracted-load.png`,animations:'disabled'})
 await expect(review.getByLabel('Block section',{exact:true})).toHaveCount(0)
 await review.getByRole('checkbox',{name:/I compared/}).check()
 await expect(review.getByRole('button',{name:'Confirm selected loads'})).toBeEnabled()
 await page.screenshot({path:`${folder}/02-reviewed-mapping.png`,animations:'disabled'})
 await review.getByRole('button',{name:'Confirm selected loads'}).click()
 await expect(review).toContainText('Saved 1 selected loads')
 await review.getByRole('button',{name:'Close',exact:true}).click()
 await page.getByLabel('Academic term',{exact:true}).selectOption('2025-2026|2nd Semester')
 await page.reload();await expect(page.getByLabel('Academic term',{exact:true})).toHaveValue('2025-2026|2nd Semester')
 await page.screenshot({path:`${folder}/03-past-term.png`,animations:'disabled'})
 expect(fixture.commands).toHaveLength(1);expect(fixture.inference).toEqual([])
})

for(const role of ['dean','associate_dean'])test(`${role} historical staff qualifications and retained load rows`,async({page})=>{
 await historicalLoadsScene(page,role,async name=>{await page.screenshot({path:`${folder}/04-${role}-${name}.png`,animations:'disabled'})})
})


// Manual load metadata is a required part of the management form.
test('manual course load fields',async({page})=>{
 const{deanManagementUI}=await import('../dean-management-fixture');await deanManagementUI(page);await page.goto('/#/records');await page.getByRole('button',{name:/^IT 401 Capstone project,/}).click();await page.getByRole('button',{name:'Add instructor',exact:true}).click();const form=page.getByRole('dialog',{name:'Load IT 401',exact:true});for(const name of ['Time','Day','Units','Lecture units','Lab units','Number of hours','Room','Program'])await expect(form.getByLabel(name,{exact:true})).toBeVisible()
})
