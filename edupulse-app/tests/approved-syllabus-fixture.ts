import { expect, type Page } from '@playwright/test'
import { Document, Packer, Paragraph } from 'docx'
import { restorationUI } from './role-restoration-fixture'
import { makePdf } from './fixtures'

// UI transport only. Real generated PDF/DOCX bytes use the production reader.
export const approvedLines = [
 'Section 1: Course Information', 'Course Code: IT 202', 'Course Title: Fundamentals of Networking',
 'Period Offered: 2nd Semester', 'Academic Year: 2026-2027',
 'Section 2: Course Description', 'Description: Explain and apply network foundations.',
 'Section 4: Program Outcomes', '1. Design a network for a small organization.',
 'Section 5: Course Outline', 'Week 1', 'ILOs: Distinguish network components and topologies.',
 'Content: Network components', 'Content: Network topology types', 'Activities: Guided discussion',
 'Assessments: Learning discussion', 'Teaching Materials: Reading guide',
 'Section 6: Requirements, Grading & Policy', 'Course Requirements: Weekly lab notes',
 'Course Policy: Cite your sources.', 'Section 7: References', 'Networking reference; Synthetic author; 2026; Test publisher',
]
export function approvedPdf() { return { name:'approved-networking.pdf', mimeType:'application/pdf', buffer:Buffer.from(makePdf([approvedLines])) } }
export async function approvedDocx(lines=approvedLines) { return {name:'approved-course.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:await Packer.toBuffer(new Document({sections:[{children:lines.map(text=>new Paragraph(text))}]}))} }
export async function approvedIntakeUI(page:Page,role='instructor') {
 const fixture=await restorationUI(page,role)
 fixture.records.courses=[];fixture.records.publications=[];fixture.records.enrollments=[];fixture.records.institutional=[]
 fixture.setWorkspace({syllabi:[],content:{},registrations:[]})
 return fixture
}
export async function openIntake(page:Page) {
 await page.goto('/#/courseware');await page.getByRole('link',{name:'Upload syllabi',exact:true}).click()
 await expect(page).toHaveURL(/syllabus\?tab=mine&upload=approved/)
 await expect(page.getByRole('button',{name:/Drop an approved syllabus/})).toBeFocused()
 return page.getByLabel('Upload approved syllabus PDF or DOCX',{exact:true})
}
export async function dropApprovedPdf(page:Page) {
 const file=approvedPdf()
 const transfer=await page.evaluateHandle(({name,bytes,type})=>{const data=new DataTransfer();data.items.add(new File([new Uint8Array(bytes)],name,{type}));return data},{name:file.name,bytes:[...file.buffer],type:file.mimeType})
 await page.getByRole('button',{name:/Drop an approved syllabus/}).dispatchEvent('drop',{dataTransfer:transfer});await transfer.dispose()
 await expect(page.getByRole('heading',{name:'IT 202 - Fundamentals of Networking',exact:true})).toBeVisible()
 return file
}
