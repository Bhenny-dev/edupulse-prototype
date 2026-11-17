import {test,expect} from './fixtures'
import {deanManagementUI} from '../dean-management-fixture'
test('instructor teaching detail stays empty without assigned loads, including on reload',async({page})=>{
 const fixture=await deanManagementUI(page)
 fixture.records.institutional=fixture.records.institutional!.filter(r=>r.kind!=='loads')
 await page.goto('/#/instructors')
 await page.getByRole('button',{name:'View instructor Alex Sample Instructor'}).click()
 const modal=page.getByRole('dialog',{name:'Instructor Alex Sample Instructor'})
 await expect(modal.getByRole('cell',{name:'IT 102',exact:true})).toHaveCount(0)
 await expect(modal).toContainText('No course load assigned for this term.')
 await modal.getByRole('heading',{name:'Syllabi and delivery',exact:true}).scrollIntoViewIfNeeded()
 await page.screenshot({path:'../feature-documentation/system-manual/46-course-load-workspace/empty-instructor-loads.png',animations:'disabled'})
 await page.reload();await expect(modal).toBeVisible()
 await expect(modal.getByRole('cell',{name:'IT 102',exact:true})).toHaveCount(0)
 expect(fixture.commands).toHaveLength(0)
})
