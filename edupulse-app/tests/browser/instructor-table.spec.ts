import {test,expect} from '@playwright/test'
import {deanManagementUI} from '../dean-management-fixture'
for(const role of ['dean','associate_dean'])test(`${role} instructor table keeps details inline and actions in the last column`,async({page},info)=>{
 const fixture=await deanManagementUI(page,role);await page.goto('/#/instructors')
 const table=page.getByRole('region',{name:'Instructor accounts and course loads',exact:true})
 const row=table.getByRole('row').filter({has:page.getByRole('cell').filter({has:page.getByText('Alex Sample Instructor',{exact:true})})}).first()
 await expect(row).toContainText('teacher-a@example.invalid');await expect(row).toContainText('Master in Information Technology')
 await expect(table.getByRole('columnheader').last()).toHaveText('Actions')
 await expect(page.locator('.dean-person-card')).toHaveCount(0)
 await row.getByRole('button',{name:'View course loads for Alex Sample Instructor',exact:true}).click();const loads=page.getByRole('dialog',{name:'Course loads - Alex Sample Instructor',exact:true});await expect(loads).toContainText('BSIT-1A');await page.keyboard.press('Escape');await expect(loads).toBeHidden();await expect(row.locator('details')).toHaveCount(0)
 await row.getByRole('button',{name:'Instructor actions for Alex Sample Instructor',exact:true}).click()
 await expect(page.getByRole('menuitem',{name:'Remove instructor',exact:true})).toHaveCount(0)
 await page.getByRole('menuitem',{name:'Edit instructor',exact:true}).click()
 await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Cancel',exact:true}).click()
 await expect(page.getByRole('dialog')).toHaveCount(0);expect(fixture.commands).toHaveLength(0)
 await row.getByRole('button',{name:'View syllabi for Alex Sample Instructor',exact:true}).click();const syllabi=page.getByRole('dialog',{name:'Syllabi - Alex Sample Instructor',exact:true});await expect(syllabi).toBeVisible();await page.reload();await expect(syllabi).toBeVisible();await page.screenshot({path:`.data/instructor-syllabi-popover-${role}-${info.project.name}.png`,fullPage:true});await page.keyboard.press('Escape');await expect(syllabi).toBeHidden();await table.evaluate(element=>{element.scrollLeft=0});await page.screenshot({path:`.data/instructor-table-${role}-${info.project.name}.png`,fullPage:true})
})
