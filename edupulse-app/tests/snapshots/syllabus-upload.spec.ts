import { test, expect } from '@playwright/test'
import { Document, Packer, Paragraph } from 'docx'
import { makePdf } from '../fixtures'

test('syllabus DOCX import previews, accepts, and retries the same file', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto('/#/syllabus?tab=builder')
  const buffer = await Packer.toBuffer(new Document({ sections: [{ children: [
    'Section 1: Course Information', 'Course Code: IT 102', 'Course Title: Computer Programming 1',
    'Section 5: Course Outline', 'Week 1', 'ILOs: Explain variable declarations.', 'Topics: Variables and assignment',
  ].map(text => new Paragraph(text)) }] }))
  const input = page.locator('.upload-zone input[type=file]')
  const upload = { name: 'sample-syllabus.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer }
  await input.setInputFiles(upload)
  await expect(page.getByText('Extracted Sections Preview', { exact: true })).toBeVisible()
  await page.locator('.upload-zone').locator('..').screenshot({ path: '../feature-documentation/system-manual/02-syllabus-lifecycle/12-import-preview.png', animations: 'disabled' })
  await page.getByRole('button', { name: 'Choose Different File' }).click()
  await input.setInputFiles({ ...upload, name: 'invalid.txt' })
  await expect(page.getByText('Only .docx and .pdf files are supported')).toBeVisible()
  await page.locator('.upload-zone').screenshot({ path: '../feature-documentation/system-manual/02-syllabus-lifecycle/13-import-error.png', animations: 'disabled' })
  await page.getByRole('button', { name: 'Try Again' }).click()
  await input.setInputFiles({ ...upload, buffer: Buffer.from('not a DOCX') })
  await expect(page.getByText('Failed to read the syllabus. Choose a valid DOCX or PDF with readable text, or a clear scan of up to 60 pages.')).toBeVisible()
  await page.getByRole('button', { name: 'Try Again' }).click()
  await input.setInputFiles(upload)
  await expect(page.getByText('Extracted Sections Preview', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Use This Syllabus', exact: true }).click()
  await expect(page.getByLabel('Course', { exact: true })).toHaveValue('IT 102')
  await expect(page.getByPlaceholder('Topic...', { exact: true }).first()).toHaveValue('Variables and assignment')
})

test('syllabus PDF import previews the extracted course and week', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto('/#/syllabus?tab=builder')
  const buffer = makePdf([['Section 1: Course Information', 'Course Code: IT 102', 'Course Title: Computer Programming 1', 'Section 5: Course Outline', 'Week 1', 'ILOs: Explain variable declarations.', 'Topics: Variables and assignment']])
  await page.getByLabel('Upload syllabus DOCX or PDF').setInputFiles({ name: 'sample-syllabus.pdf', mimeType: 'application/pdf', buffer: Buffer.from(buffer) })
  await expect(page.getByText('Extracted Sections Preview', { exact: true })).toBeVisible()
  await page.locator('.upload-zone').locator('..').screenshot({ path: '../feature-documentation/system-manual/02-syllabus-lifecycle/14-pdf-import-preview.png', animations: 'disabled' })
  await page.getByRole('button', { name: 'Use This Syllabus', exact: true }).click()
  await expect(page.getByLabel('Course', { exact: true })).toHaveValue('IT 102')
  await expect(page.getByPlaceholder('Topic...', { exact: true }).first()).toHaveValue('Variables and assignment')
})
