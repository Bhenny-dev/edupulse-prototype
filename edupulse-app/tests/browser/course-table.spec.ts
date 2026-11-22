import {test,expect} from '@playwright/test'
import {deanManagementUI} from '../dean-management-fixture'
for(const role of ['dean','associate_dean'])test(`${role} manages courses through table rows without a course modal`,async({page},info)=>{
 await deanManagementUI(page,role);await page.goto('/#/records')
 const table=page.getByRole('region',{name:'Course catalog and instructor loads',exact:true})
 await expect(table.getByRole('columnheader',{name:'Course title',exact:true})).toBeVisible();await expect(table.getByRole('columnheader',{name:'Status',exact:true})).toHaveCount(0)
 const row=table.getByRole('row').filter({has:page.getByRole('cell',{name:'IT 401',exact:true})}).first()
 await expect(row.getByRole('cell',{name:'Capstone project',exact:true})).toBeVisible()
 await expect(page.locator('.dean-course-card')).toHaveCount(0)
 await row.getByRole('button',{name:/Course actions for IT 401/}).click()
 await page.getByRole('menuitem',{name:'Add instructor',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Load IT 401',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Cancel',exact:true}).click()
 await expect(page.getByRole('dialog')).toHaveCount(0)
 await page.screenshot({path:`.data/course-table-${role}-${info.project.name}.png`,fullPage:true})
})
