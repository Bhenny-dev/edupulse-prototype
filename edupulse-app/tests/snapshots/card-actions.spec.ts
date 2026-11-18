import {test,expect} from './fixtures'
import {deanManagementUI} from '../dean-management-fixture'

for(const role of ['dean','associate_dean'])test(`${role} catalog and instructor card menus`,async({page})=>{
 await deanManagementUI(page,role)
 await page.goto('/#/records')
 await expect(page.getByRole('button',{name:'Add Course',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Course actions for IT 102',exact:true}).click()
 await expect(page.getByRole('menuitem',{name:'Edit course',exact:true})).toBeVisible()
 await expect(page.getByRole('menuitem',{name:'Remove course',exact:true})).toHaveCount(0)
 await page.screenshot({path:`../feature-documentation/system-manual/46-course-load-workspace/${role}-course-actions.png`,animations:'disabled'})
 await page.keyboard.press('Escape')
 await page.goto('/#/instructors')
 await page.getByRole('button',{name:'Instructor actions for Alex Sample Instructor',exact:true}).click()
 await expect(page.getByRole('menuitem',{name:'Suspend instructor',exact:true})).toBeVisible()
 await page.screenshot({path:`../feature-documentation/system-manual/46-course-load-workspace/${role}-instructor-actions.png`,animations:'disabled'})
})
