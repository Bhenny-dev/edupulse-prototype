import { test, expect } from './fixtures'
import { managedClassUI } from '../managed-classes-ui'
const folder='../feature-documentation/system-manual/54-management-loaded-classes'
test('existing class enrollment and in-class upload on a phone',async({page})=>{
 await managedClassUI(page)
 await page.goto('/#/dashboard?course=IT%20201&tab=materials')
 await expect(page.getByRole('heading',{name:'Upload syllabi',exact:true})).toBeVisible()
 await page.screenshot({path:`${folder}/08-phone-upload.png`,animations:'disabled'})
 await page.getByRole('button',{name:'Class List',exact:true}).click()
 await expect(page.getByRole('button',{name:'Copy invitation link for block BSIT-2A',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Copy invitation link for block BSIT-2A',exact:true}).scrollIntoViewIfNeeded()
 await page.screenshot({path:`${folder}/09-phone-class-list.png`,animations:'disabled'})
})
