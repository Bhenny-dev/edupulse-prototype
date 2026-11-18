import {test,expect} from './fixtures'
import {teachingLoadUI,teachingLoadPdf} from '../teaching-load-fixture'
const folder='../feature-documentation/system-manual/47-teaching-load-documents'
test('teaching-load PDF review keeps source columns, explicit mapping and term filters',async({page})=>{
 const fixture=await teachingLoadUI(page)
 await page.goto('/#/records')
 await page.locator('input[type=file][accept*=".pdf"]').setInputFiles({name:'approved-load.pdf',mimeType:'application/pdf',buffer:Buffer.from(await teachingLoadPdf())})
 const review=page.getByRole('dialog',{name:'Review teaching loads',exact:true})
 await expect(review).toBeVisible()
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
