import {weekSections} from './outlineSections'
import { APPROVED_FILE_LIMIT } from '../lib/syllabusLimits'
import {collectSyllabusReferences,bibliographicLabel} from '../lib/rag/syllabusReferences'
export { APPROVED_FILE_LIMIT }
export const meaningfulOutline = rows => Array.isArray(rows) && rows.some(row => row.ilos?.trim() && row.contents?.some(text => text.trim()))

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function syllabusBlocks(syllabus) {
  const paragraphs = []
  const line = text => paragraphs.push({ text: String(text || '') })
  const heading = text => paragraphs.push({ text, heading: true })
  const list = items => (items || []).forEach(line)
  heading(`${syllabus.courseCode} — ${syllabus.courseTitle}`)
  heading('Section 1: Course Information')
  const info = syllabus.courseInfo || {}
  for (const [label, value] of Object.entries({ 'Course Code': syllabus.courseCode, 'Course Title': syllabus.courseTitle, 'Period Offered': info.periodOffered, 'Academic Year': info.academicYear })) line(`${label}: ${value || ''}`)
  heading('Section 2: Course Description')
  line(`Description: ${syllabus.courseDescription || ''}`)
  for (const [label, value] of Object.entries({ 'Credit Units': info.creditUnits, Classification: info.classification, 'No. of Hours': info.noOfHours, Prerequisites: (info.prerequisites || []).join(', ') })) line(`${label}: ${value || ''}`)
  heading('Section 3: Institutional Context')
  for (const [unit, fields] of Object.entries(syllabus.institutionalContext || {})) {
    line(unit.toUpperCase())
    for (const [label, value] of Object.entries(fields)) line(`${label}: ${Array.isArray(value) ? value.join('; ') : value}`)
  }
  heading('Section 4: Program Outcomes'); list(syllabus.programOutcomes)
  heading('Section 5: Course Outline')
  const sectionNumbers=new Map()
  for (const row of syllabus.courseOutline || []) {
    heading(`Week ${row.week}`)
    for(const section of weekSections(row)){
      if(!sectionNumbers.has(section.id))sectionNumbers.set(section.id,sectionNumbers.size+1)
      const weeks=(syllabus.courseOutline||[]).filter(value=>weekSections(value).some(part=>part.id===section.id)).map(value=>value.week)
      heading(`Outline section ${sectionNumbers.get(section.id)} · Weeks ${weeks.join(', ')}`)
      line(`ILOs: ${section.ilos || ''}`)
      for(const content of section.contents||[])line(`Content: ${content}`)
      line(`Teaching-Learning Activities: ${section.activities||''}`);line(`Assessments: ${section.assessments||''}`)
      if(section.assessmentTypes?.length)line(`Assessment Types: ${section.assessmentTypes.join('; ')}`)
      for(const resource of section.resources||[])line(`Resource: ${resource.name||''} ${resource.url||''}`)
    }
  }
  heading('Section 6: Requirements, Grading and Policy')
  line('Course Requirements:'); list(syllabus.courseRequirements)
  line('Grading System:'); list((syllabus.gradingSystem || '').split('\n'))
  line('Course Policy:'); list(syllabus.coursePolicy)
  heading('Section 7: References')
  for (const reference of collectSyllabusReferences({...syllabus,courseOutline:[]})) line([bibliographicLabel(reference),reference.url].filter(Boolean).join('. '))
  heading('Offline approval route')
  line('Prepared by: ____________________  Date: __________')
  line('Reviewed by Dean: _______________  Date: __________')
  line('Approved by CAO: ________________  Date: __________')
  line('Noted by EVP: ___________________  Date: __________')
  return paragraphs
}

export async function syllabusDocx(syllabus) {
  const { Document, Packer, Paragraph, HeadingLevel } = await import('docx')
  return Packer.toBlob(new Document({ sections: [{ children: syllabusBlocks(syllabus).map(block => new Paragraph({ text: block.text, ...(block.heading ? { heading: HeadingLevel.HEADING_1 } : {}) })) }] }))
}

export async function retainApprovedFile(file) {
  if (!/\.(docx|pdf)$/i.test(file.name) || file.size > APPROVED_FILE_LIMIT || !file.size) throw new Error(`Choose a non-empty DOCX or PDF file up to ${APPROVED_FILE_LIMIT / 1000} KB.`)
  const bytes = new Uint8Array(await file.arrayBuffer())
  const valid = /\.pdf$/i.test(file.name) ? new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-' : bytes[0] === 80 && bytes[1] === 75
  if (!valid) throw new Error('This file does not match its DOCX or PDF format.')
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte)
  return { name: file.name, size: file.size, base64: btoa(binary), sha256: [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join(''), uploadedAt: new Date().toISOString() }
}

export function downloadApprovedFile(file) {
  const bytes = Uint8Array.from(atob(file.base64), char => char.charCodeAt(0))
  downloadBlob(new Blob([bytes], { type: /\.pdf$/i.test(file.name) ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), file.name)
}
