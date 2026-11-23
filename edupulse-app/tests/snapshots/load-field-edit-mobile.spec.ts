import {test,expect} from './fixtures'
import {teachingLoadUI} from '../teaching-load-fixture'
import {teachingLoadXlsx,xlsxMime} from '../xlsx-fixture'
test('editable teaching load details retain corrections until confirmation',async({page},info)=>{
 if(info.project.name==='mobile')await page.setViewportSize({width:390,height:1500})
 await teachingLoadUI(page)
 await page.goto('/#/records')
 await page.locator('label.dean-upload',{hasText:'Upload course load'}).locator('input[type=file]').setInputFiles({name:'CIT-SCHEDULE-First-Semester-S.Y-2026-2027.xlsx',mimeType:xlsxMime,buffer:await teachingLoadXlsx()})
 const dialog=page.getByRole('dialog',{name:'Review teaching loads',exact:true})
 await dialog.getByLabel('Time',{exact:true}).fill('08:00 - 10:00')
 await dialog.getByLabel('Days',{exact:true}).fill('MWF')
 await dialog.getByLabel('Room',{exact:true}).fill('A322')
 await expect(dialog.locator('output')).toHaveText('6')
 await dialog.locator('.load-import-edit').screenshot({path:`../feature-documentation/system-manual/47-teaching-load-documents/05-${info.project.name}-editable-details.png`,animations:'disabled'})
})
