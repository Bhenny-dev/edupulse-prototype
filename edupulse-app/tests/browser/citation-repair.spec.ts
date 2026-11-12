import {test,expect} from '@playwright/test'
import {citationRepairUI} from '../citation-repair-fixture'
test('split citation displays as one catalog record and keeps metadata out of retained teaching text',async({page})=>{
 const panel=await citationRepairUI(page)
 await expect(panel).toContainText('0 retained text')
 await panel.getByRole('button',{name:'View',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Retained source review',exact:true})).toContainText('No book text was retained')
 const writes:string[]=[]
 page.on('request',request=>{if(request.url().includes('action=syllabus-sources')){const operation=request.postDataJSON()?.operation;if(['read','index','attach','remove'].includes(operation))writes.push(operation)}})
 await page.reload()
 await expect(page.getByRole('dialog',{name:'Retained source review',exact:true})).toContainText('No book text was retained')
 await page.getByRole('button',{name:'Close retained source',exact:true}).click()
 await panel.getByRole('button',{name:/Source actions for/}).click()
 await expect(page.getByRole('menu')).toBeVisible()
 await page.reload();await expect(page.getByRole('menu')).toBeVisible()
 expect(writes).toEqual([])
})
