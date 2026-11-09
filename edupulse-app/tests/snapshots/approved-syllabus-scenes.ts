import { expect, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { approvedIntakeUI, dropApprovedPdf, openIntake } from '../approved-syllabus-fixture'
import {makeRuledSyllabusPdf,makePdf} from '../fixtures'
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

export async function layoutReviewScene(page:Page,mobile=false) {
 await approvedIntakeUI(page);const input=await openIntake(page)
 const buffer=Buffer.alloc(650000,32);makeRuledSyllabusPdf({transformed:true,wordRange:true,segmentedRules:true}).copy(buffer)
 await input.setInputFiles({name:'sample-scaled-syllabus.pdf',mimeType:'application/pdf',buffer})
 const outline=page.getByRole('region',{name:'Extracted approved course outline',exact:true})
 await expect(outline.locator('tbody tr')).toHaveCount(4);await expect(outline).toContainText('Nested conditions')
 await expect(page.getByText('PDF or DOCX, up to 750 KB. Scanned PDFs use OCR.',{exact:true})).toBeVisible()
 await shot(page,`${mobile?'mobile-':''}06-scaled-layout-and-size`)
 await input.setInputFiles({name:'sample-missing-week.pdf',mimeType:'application/pdf',buffer:makeRuledSyllabusPdf({transformed:true,segmentedRules:true,missingWeek:true})})
 await expect(outline.locator('tbody tr')).toHaveCount(3)
 await expect(page.getByText(/Unnumbered outline content.*II\. Decisions.*no week was inferred/)).toBeVisible()
 await shot(page,`${mobile?'mobile-':''}07-missing-week-review`)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
}

export async function builderSourceScene(page:Page,mobile=false) {
 await approvedIntakeUI(page);await page.goto('/#/syllabus?tab=builder')
 const lines=['Section 1: Course Information','Course Code: SPEC 901','Course Title: Special Topics from the Approved Source','Period Offered: First Semester','Academic Year: 2025-2026','Section 5: Course Outline','Week 1','ILOs: Explain variables.','Topics: Variables and assignment']
 await page.getByLabel('Upload syllabus DOCX or PDF').setInputFiles({name:'sample-source-course.pdf',mimeType:'application/pdf',buffer:Buffer.from(makePdf([lines]))})
 await expect(page.getByText('Extracted Sections Preview',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Use This Syllabus',exact:true}).click()
 const section=page.locator('[data-section="1"]'),course=page.getByRole('combobox',{name:'Course',exact:true})
 await expect(course).toHaveValue('SPEC 901');await expect(course.locator('option:checked')).toContainText('Special Topics from the Approved Source');await expect(page.getByRole('textbox',{name:'Academic Year',exact:true})).toHaveValue('2025-2026')
 const box=(await section.boundingBox())!,field=(await course.boundingBox())!
 expect(field.x+field.width).toBeLessThanOrEqual(box.x+box.width)
 await section.screenshot({path:`${root}/${mobile?'mobile-':''}08-imported-builder-identity.png`,animations:'disabled',style:'.app-topbar{position:static !important}'})
}
