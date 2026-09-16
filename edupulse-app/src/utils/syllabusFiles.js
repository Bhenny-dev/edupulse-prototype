export const APPROVED_FILE_LIMIT = 500_000
export const meaningfulOutline = rows => Array.isArray(rows) && rows.some(row => row.ilos?.trim() && row.contents?.some(text => text.trim()))

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function syllabusDocx(syllabus) {
  const { Document, Packer, Paragraph, HeadingLevel } = await import('docx')
  const paragraphs = []
  const line = text => paragraphs.push(new Paragraph({ text: String(text || '') }))
  const heading = text => paragraphs.push(new Paragraph({ text, heading: HeadingLevel.HEADING_1 }))
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
  for (const row of syllabus.courseOutline || []) {
    line(`Week ${row.week}`); line(`ILOs: ${row.ilos || ''}`)
    for (const content of row.contents || []) line(`Content: ${content}`)
    line(`Activities: ${row.activities || ''}`); line(`Assessments: ${row.assessments || ''}`)
    line(`Teaching Materials: ${(row.teachingMaterials || []).join('; ')}`)
    line(`Assessment Types: ${(row.assessmentTypes || []).join('; ')}`)
    for (const resource of row.resources || []) line(`Resource: ${resource.name || ''} ${resource.url || ''}`)
  }
  heading('Section 6: Requirements, Grading and Policy')
  line('Course Requirements:'); list(syllabus.courseRequirements)
  line('Grading System:'); list((syllabus.gradingSystem || '').split('\n'))
  line('Course Policy:'); list(syllabus.coursePolicy)
  heading('Section 7: References')
  for (const book of syllabus.books || []) line([book.title, book.authors, book.year, book.publisher].filter(Boolean).join('; '))
  for (const ref of syllabus.onlineReferences || []) { line(ref.title); line(ref.url) }
  heading('Offline approval route')
  line('Prepared by: ____________________  Date: __________')
  line('Reviewed by Dean: _______________  Date: __________')
  line('Approved by CAO: ________________  Date: __________')
  line('Noted by EVP: ___________________  Date: __________')
  return Packer.toBlob(new Document({ sections: [{ children: paragraphs }] }))
}

export async function retainApprovedFile(file) {
  if (!/\.docx$/i.test(file.name) || file.size > APPROVED_FILE_LIMIT || !file.size) throw new Error('Choose a non-empty DOCX file up to 500 KB.')
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes[0] !== 80 || bytes[1] !== 75) throw new Error('This file is not a valid DOCX archive.')
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte)
  return { name: file.name, size: file.size, base64: btoa(binary), sha256: [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join(''), uploadedAt: new Date().toISOString() }
}

export function downloadApprovedFile(file) {
  const bytes = Uint8Array.from(atob(file.base64), char => char.charCodeAt(0))
  downloadBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), file.name)
}
