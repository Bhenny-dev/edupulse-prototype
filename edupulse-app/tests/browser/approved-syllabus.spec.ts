import { test, expect } from '@playwright/test'
import { createHash } from 'node:crypto'
import { approvedIntakeUI, approvedPdf, approvedDocx, approvedLines, openIntake, dropApprovedPdf } from '../approved-syllabus-fixture'
import {makeRuledSyllabusPdf} from '../fixtures'

test('approved file starts an empty course through drop, preview, explicit selection and retained save',async({page})=>{
 const fixture=await approvedIntakeUI(page);await openIntake(page)
 await expect(page.getByText('1. Drafted',{exact:true})).toHaveCount(0)
 const upload=await dropApprovedPdf(page),use=page.getByRole('button',{name:'Use syllabus for course',exact:true})
 const outline=page.getByRole('region',{name:'Extracted approved course outline',exact:true})
 await expect(outline.getByRole('columnheader',{name:'Week',exact:true})).toBeVisible()
 const cell=(await outline.getByRole('cell',{name:'1',exact:true}).boundingBox())!,area=(await outline.boundingBox())!
 expect(cell.x).toBeGreaterThanOrEqual(area.x);expect(cell.y).toBeLessThan(area.y+area.height)
 await expect(use).toBeDisabled();expect(fixture.getWorkspace().syllabi).toEqual([])
 await page.getByRole('button',{name:'View syllabus',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Syllabus details',exact:true})
 await expect(dialog.getByText('Network topology types',{exact:true})).toBeVisible()
 await expect(dialog.getByText('Weekly lab notes',{exact:true})).toBeVisible()
 await expect(dialog.getByText(/Networking reference/)).toBeVisible()
 await dialog.getByRole('button',{name:'Close syllabus details',exact:true}).click()
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Original file',exact:true}).click();expect((await download).suggestedFilename()).toBe(upload.name)
 await page.getByRole('checkbox').check();await use.click();await expect(page).toHaveURL(/courseware\?course=/)
 const data=fixture.getWorkspace() as any,syllabus=data.syllabi[0]
 expect(data.syllabi).toHaveLength(1);expect(syllabus.status).toBe('active');expect(syllabus.approvedFile.approvalAttested).toBe(true)
 expect(syllabus.approvedFile.base64).toBe(upload.buffer.toString('base64'));expect(syllabus.approvedFile.sha256).toBe(createHash('sha256').update(upload.buffer).digest('hex'))
 expect(syllabus.courseOutline[0].contents).toEqual(['Network components','Network topology types']);expect(syllabus.courseOutline[0].activities).toBe('Guided discussion')
 expect(data.content).toEqual({});expect(data.registrations).toEqual([])
 await page.reload();await expect(page.getByRole('heading',{name:/IT 202/})).toBeVisible()
 await page.getByRole('button',{name:'Back to courses',exact:true}).click();await expect(page.getByRole('link',{name:'Upload syllabi',exact:true})).toBeVisible()
 await page.getByRole('link',{name:'Upload syllabi',exact:true}).click();await expect(page.locator(`[data-syllabus-id="${syllabus.id}"]`)).toBeVisible()
 await page.locator(`[data-syllabus-id="${syllabus.id}"]`).getByRole('link',{name:'Open course',exact:true}).click();await expect(page).toHaveURL(new RegExp(syllabus.id))
})

test('file validation permits retry and a DOCX course outside the built-in catalog',async({page})=>{
 const fixture=await approvedIntakeUI(page);const input=await openIntake(page)
 for(const upload of [{name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('text')},{...approvedPdf(),buffer:Buffer.from('not a PDF')},{...approvedPdf(),buffer:Buffer.alloc(750001)}]){
  await input.setInputFiles(upload);await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('button',{name:'Use syllabus for course',exact:true})).toHaveCount(0)
 }
 const lines=approvedLines.map(line=>line.replace('IT 202','SPEC 901').replace('Fundamentals of Networking','Special Topics in Networks'))
 await input.setInputFiles(await approvedDocx(lines));await expect(page.getByRole('heading',{name:'SPEC 901 - Special Topics in Networks',exact:true})).toBeVisible()
 await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Use syllabus for course',exact:true}).click();await expect(page).toHaveURL(/courseware\?course=/)
 expect((fixture.getWorkspace().syllabi as any[])[0].courseCode).toBe('SPEC 901')
})

test('save rejection keeps the preview, retries once and does not claim a course early',async({page})=>{
 const fixture=await approvedIntakeUI(page);let reject=true,puts=0
 await page.route('**/api/ai?action=workspace',async route=>{if(route.request().method()!=='PUT')return route.fallback();puts++;if(reject)return route.fulfill({status:503,json:{error:{code:'UNAVAILABLE',message:'Temporary test save failure'}}});return route.fallback()})
 const input=await openIntake(page);await input.setInputFiles(approvedPdf());await expect(page.getByRole('button',{name:'Use syllabus for course',exact:true})).toBeDisabled();await page.getByRole('checkbox').check()
 await page.getByRole('button',{name:'Use syllabus for course',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Temporary test save failure');await expect(page).toHaveURL(/syllabus/);expect(fixture.getWorkspace().syllabi).toEqual([])
 reject=false;await page.getByRole('button',{name:'Use syllabus for course',exact:true}).click();await expect(page).toHaveURL(/courseware\?course=/);expect(fixture.getWorkspace().syllabi).toHaveLength(1);expect(puts).toBe(2)
})

test('missing identity or outline cannot be selected and students have no intake controls',async({page})=>{
 await approvedIntakeUI(page);const input=await openIntake(page)
 await input.setInputFiles(await approvedDocx(['Section 1: Course Information','Course Title: Unmapped course','Section 5: Course Outline','Week 1','ILOs: Explain networks.','Content: Networks']))
 await expect(page.getByRole('alert')).toContainText('Course Code and Course Title')
 await input.setInputFiles(await approvedDocx(approvedLines.slice(0,7)));await expect(page.getByRole('alert')).toContainText('No usable weekly')
})

test('students cannot upload or select an approved syllabus',async({page})=>{
 await approvedIntakeUI(page,'student');await page.goto('/#/courseware');await expect(page.getByRole('heading',{name:'Published Courseware',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Upload syllabi',exact:true})).toHaveCount(0)
 await page.goto('/#/syllabus?tab=mine&upload=approved');await expect(page).toHaveURL(/dashboard/)
})

test('a larger scaled PDF reaches the real review, and an unnumbered continuation stays flagged',async({page})=>{
 const fixture=await approvedIntakeUI(page),input=await openIntake(page)
 const buffer=Buffer.alloc(650000,32);makeRuledSyllabusPdf({transformed:true,wordRange:true,segmentedRules:true}).copy(buffer)
 await input.setInputFiles({name:'larger-approved.pdf',mimeType:'application/pdf',buffer})
 await expect(page.getByRole('heading',{name:'IT 102 - Computer Programming 1',exact:true})).toBeVisible()
 const outline=page.getByRole('region',{name:'Extracted approved course outline',exact:true})
 await expect(outline.locator('tbody tr')).toHaveCount(4);await expect(outline).toContainText('Nested conditions')
 expect(fixture.getWorkspace().syllabi).toEqual([])
 await input.setInputFiles({name:'missing-week.pdf',mimeType:'application/pdf',buffer:makeRuledSyllabusPdf({transformed:true,segmentedRules:true,missingWeek:true})})
 await expect(outline.locator('tbody tr')).toHaveCount(3)
 await expect(page.getByText(/Unnumbered outline content.*II\. Decisions.*no week was inferred/)).toBeVisible()
 await expect(outline.locator('tbody tr').first()).not.toContainText('Decisions')
 expect(fixture.getWorkspace().syllabi).toEqual([])
})
