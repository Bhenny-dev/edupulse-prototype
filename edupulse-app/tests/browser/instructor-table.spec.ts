import {test,expect} from '@playwright/test'
import {deanManagementUI} from '../dean-management-fixture'
for(const role of ['dean','associate_dean'])test(`${role} instructor table keeps details inline and actions in the last column`,async({page},info)=>{
 const fixture=await deanManagementUI(page,role);await page.goto('/#/instructors')
 const table=page.getByRole('region',{name:'Instructor accounts and course loads',exact:true})
 const row=table.getByRole('row').filter({has:page.getByRole('cell').filter({has:page.getByText('Alex Sample Instructor',{exact:true})})}).first()
 await expect(row).toContainText('teacher-a@example.invalid');await expect(row).toContainText('Master in Information Technology')
 await expect(table.getByRole('columnheader').last()).toHaveText('Actions')
 await expect(page.locator('.dean-person-card')).toHaveCount(0)
 await row.locator('summary').first().click();await expect(row).toContainText('BSIT-1A');await expect(page.getByRole('dialog')).toHaveCount(0)
 await row.getByRole('button',{name:'Instructor actions for Alex Sample Instructor',exact:true}).click()
 await expect(page.getByRole('menuitem',{name:'Remove instructor',exact:true})).toHaveCount(0)
 await page.getByRole('menuitem',{name:'Edit instructor',exact:true}).click()
 await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Cancel',exact:true}).click()
 await expect(page.getByRole('dialog')).toHaveCount(0);expect(fixture.commands).toHaveLength(0)
 await row.locator('summary').first().click();await table.evaluate(element=>{element.scrollLeft=0});await page.screenshot({path:`.data/instructor-table-${role}-${info.project.name}.png`,fullPage:true})
})
