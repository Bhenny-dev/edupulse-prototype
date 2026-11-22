import {test,expect} from '@playwright/test'
import {deanManagementUI} from '../dean-management-fixture'
for(const role of ['dean','associate_dean'])test(`${role} schedule uses a weekday popover without duplicate facts`,async({page},info)=>{
 const fixture=await deanManagementUI(page,role)
 for(const record of (fixture.records.institutional||[]).filter(r=>r.kind==='loads'))Object.assign(record.data,{ScheduleDays:'TTh',ScheduleTime:'7:30 - 10:00',Room:'A310'})
 await page.goto('/#/records')
 const table=page.getByRole('region',{name:'Course catalog and instructor loads',exact:true})
 await expect(table.getByRole('columnheader',{name:'Status',exact:true})).toHaveCount(0)
 await table.getByRole('button',{name:'View schedule for IT 102 Alex Sample Instructor',exact:true}).click()
 const schedule=page.getByRole('dialog',{name:'Class schedule',exact:true});await expect(schedule).toBeVisible()
 await expect(schedule.getByText('Monday',{exact:true})).toBeVisible();await expect(schedule.getByText('Friday',{exact:true})).toBeVisible()
 await expect(schedule.getByText('2.5 hours',{exact:true})).toHaveCount(2)
 await expect(schedule).not.toContainText('Source page');await expect(table.locator('details')).toHaveCount(0)
 await page.screenshot({path:`.data/load-schedule-${role}-${info.project.name}.png`,fullPage:true})
 await page.reload();await expect(schedule).toBeVisible();expect(fixture.commands).toHaveLength(0)
 await page.keyboard.press('Escape');await expect(schedule).toBeHidden()
})
