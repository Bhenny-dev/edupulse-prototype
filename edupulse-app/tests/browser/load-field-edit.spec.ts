import {test,expect} from '@playwright/test'
import {teachingLoadUI} from '../teaching-load-fixture'
import {teachingLoadXlsx,xlsxMime} from '../xlsx-fixture'

test('review corrections save selected load fields, calculate hours and require renewed confirmation',async({page})=>{
 const fixture=await teachingLoadUI(page)
 await page.goto('/#/records')
 await page.locator('label.dean-upload',{hasText:'Upload course load'}).locator('input[type=file]').setInputFiles({name:'CIT-SCHEDULE-First-Semester-S.Y-2026-2027.xlsx',mimeType:xlsxMime,buffer:await teachingLoadXlsx()})
 const dialog=page.getByRole('dialog',{name:'Review teaching loads',exact:true})
 await dialog.getByLabel('Time',{exact:true}).fill('08:00 - 10:00')
 // Days are chosen in the meeting-days picker (up to two): TTH becomes MW.
 await dialog.getByLabel('Days',{exact:true}).click()
 for(const day of ['Tuesday','Thursday'])await dialog.getByRole('checkbox',{name:new RegExp(`^${day}`)}).uncheck()
 for(const day of ['Monday','Wednesday'])await dialog.getByRole('checkbox',{name:new RegExp(`^${day}`)}).check()
 await expect(dialog.locator('output')).toHaveText('4')
 await dialog.getByLabel('Room',{exact:true}).fill('A322')
 await dialog.getByLabel('Students listed',{exact:true}).fill('35.5')
 await expect(dialog.getByRole('alert')).toContainText('whole number')
 await dialog.getByRole('checkbox',{name:/I compared/}).check()
 await expect(dialog.getByRole('button',{name:'Confirm selected loads'})).toBeDisabled()
 await dialog.getByLabel('Students listed',{exact:true}).fill('34')
 await expect(dialog.getByRole('checkbox',{name:/I compared/})).not.toBeChecked()
 await dialog.getByLabel('Lecture units',{exact:true}).fill('2.5')
 await dialog.getByLabel('Program',{exact:true}).fill('BSIT')
 await dialog.getByRole('checkbox',{name:/I compared/}).check()
 await dialog.getByRole('button',{name:'Confirm selected loads'}).click()
 await expect(dialog).toContainText('Saved 1 selected loads')
 expect(fixture.commands[0].entries[0]).toMatchObject({time:'08:00 - 10:00',days:'MW',room:'A322',computed_hours:4,students:34,lecture:2.5,program:'BSIT',page:1})
 expect(fixture.inference).toEqual([])
})
