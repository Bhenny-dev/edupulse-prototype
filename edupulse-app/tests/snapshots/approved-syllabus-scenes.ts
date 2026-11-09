import { expect, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { approvedIntakeUI, dropApprovedPdf } from '../approved-syllabus-fixture'
const root='../feature-documentation/system-manual/30-approved-syllabus-intake'
async function shot(page:Page,name:string) {
 await mkdir(root,{recursive:true});await page.mouse.move(2,400)
 for(const toast of await page.locator('.toast').all())await toast.click().catch(()=>undefined)
 await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0)})
 await page.screenshot({path:`${root}/${name}.png`,animations:'disabled',fullPage:true,style:'.app-topbar{position:static !important}'})
}
export async function intakeScene(page:Page,mobile=false,dark=false) {
 if(dark)await page.addInitScript(()=>localStorage.setItem('edupulse-dark-mode','true'))
 await approvedIntakeUI(page);await page.goto('/#/courseware');await expect(page.getByRole('heading',{name:'Add your first course',exact:true})).toBeVisible()
 const prefix=mobile?`mobile-${dark?'dark-':''}`:''
 if(!dark)await shot(page,`${prefix}01-empty-course`)
 await page.getByRole('link',{name:'Upload syllabi',exact:true}).click();await expect(page.getByRole('button',{name:/Drop an approved syllabus/})).toBeFocused()
 if(!mobile)await shot(page,'02-my-syllabus-upload')
 await dropApprovedPdf(page);await page.getByRole('checkbox').check();await shot(page,`${prefix}03-review-extracted-syllabus`)
 if(!mobile){await page.getByRole('button',{name:'View syllabus',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Syllabus details',exact:true});await dialog.getByText('Course Outline',{exact:true}).scrollIntoViewIfNeeded();await shot(page,'04-view-syllabus');await dialog.getByRole('button',{name:'Close syllabus details',exact:true}).click()}
 await page.getByRole('button',{name:'Use syllabus for course',exact:true}).click();await expect(page).toHaveURL(/courseware\?course=/);await page.getByRole('button',{name:'Back to courses',exact:true}).click()
 await expect(page.getByRole('table',{name:'Courseware courses'})).toBeVisible();if(!mobile)await shot(page,'05-course-added')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
}
