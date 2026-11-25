import { expect, type Page } from '@playwright/test'
import { instructorCourseUI } from './instructor-course-fixture'
import { makeRuledSyllabusPdf } from './fixtures'
export async function managedClassUI(page: Page) {
 const fixture = await instructorCourseUI(page)
 ;(fixture.records as any).classCodes = [{ course_code:'IT 201', block:'BSIT-2A',academic_year:'2026-2027',semester:'1st Semester',code:'K7M2QXP' }]
 return fixture
}
export async function uploadInClass(page: Page) {
 const file = { name:'algorithms-approved.pdf', mimeType:'application/pdf',buffer:makeRuledSyllabusPdf({transformed:true,wordRange:true,segmentedRules:true,code:'IT 201',title:'Algorithms'}) }
 const transfer = await page.evaluateHandle(({bytes,name,type}) => { const data=new DataTransfer();data.items.add(new File([new Uint8Array(bytes)],name,{type}));return data },{bytes:[...file.buffer],name:file.name,type:file.mimeType})
 await page.getByRole('button',{name:/Drop an approved syllabus/}).dispatchEvent('drop',{dataTransfer:transfer});await transfer.dispose()
 await expect(page.getByRole('region',{name:'Extracted approved course outline',exact:true})).toBeVisible()
 await page.getByRole('checkbox').check()
 await page.getByRole('button',{name:'Use syllabus for course',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Upload syllabi',exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Syllabus',exact:true})).toBeVisible()
}
