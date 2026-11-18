import {test,expect} from './fixtures'
import {teachingLoadUI,teachingLoadPdf} from '../teaching-load-fixture'
test('editable teaching load details retain corrections until confirmation',async({page},info)=>{
 if(info.project.name==='mobile')await page.setViewportSize({width:390,height:1500})
 await teachingLoadUI(page)
 await page.goto('/#/records')
 await page.locator('input[type=file][accept*=".pdf"]').setInputFiles({name:'approved-load.pdf',mimeType:'application/pdf',buffer:Buffer.from(await teachingLoadPdf())})
 const dialog=page.getByRole('dialog',{name:'Review teaching loads',exact:true})
 await dialog.getByLabel('Time',{exact:true}).fill('08:00 - 10:00')
 await dialog.getByLabel('Days',{exact:true}).fill('MWF')
 await dialog.getByLabel('Room',{exact:true}).fill('A322')
 await expect(dialog.locator('output')).toHaveText('6')
 await dialog.locator('.load-import-edit').screenshot({path:`../feature-documentation/system-manual/47-teaching-load-documents/05-${info.project.name}-editable-details.png`,animations:'disabled'})
})
