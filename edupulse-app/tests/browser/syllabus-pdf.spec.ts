import { test, expect } from '@playwright/test'
import { makePdf, makeScannedPdf } from '../fixtures'
import { scanPage } from '../scans'

const syllabus = ['Section 1: Course Information', 'Course Code: IT 102', 'Course Title: Computer Programming 1', 'Section 5: Course Outline', 'Week 1', 'ILOs: Explain variable declarations.', 'Topics: Variables and assignment']

async function openBuilder(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto('/#/syllabus?tab=builder')
}

test('PDF syllabus text is extracted, previewed and accepted into the course form', async ({ page }) => {
  await openBuilder(page)
  await page.getByLabel('Upload syllabus DOCX or PDF').setInputFiles({ name: 'syllabus.pdf', mimeType: 'application/pdf', buffer: Buffer.from(makePdf([syllabus])) })
  await expect(page.getByText('Extracted Sections Preview', { exact: true })).toBeVisible({ timeout: 30000 })
  await page.getByRole('button', { name: 'Use This Syllabus', exact: true }).click()
  await expect(page.getByLabel('Course', { exact: true })).toHaveValue('IT 102')
  await expect(page.getByPlaceholder('Topic...', { exact: true }).first()).toHaveValue('Variables and assignment')
})

test('a scanned PDF syllabus uses OCR and still fills the course and outline', async ({ page, browser, isMobile }) => {
  test.skip(isMobile, 'OCR extraction is viewport independent; desktop covers the scanned document.')
  test.setTimeout(300000)
  await openBuilder(page)
  const buffer = makeScannedPdf([{ jpeg: await scanPage(browser, syllabus, { dpi: 300, degraded: false }) }])
  await page.getByLabel('Upload syllabus DOCX or PDF').setInputFiles({ name: 'scanned-syllabus.pdf', mimeType: 'application/pdf', buffer: Buffer.from(buffer) })
  await expect(page.getByText(/OCR read 1 scanned page/)).toBeVisible({ timeout: 240000 })
  await page.getByRole('button', { name: 'Use This Syllabus', exact: true }).click()
  await expect(page.getByLabel('Course', { exact: true })).toHaveValue('IT 102')
  await expect(page.getByPlaceholder('Topic...', { exact: true }).first()).toHaveValue('Variables and assignment')
})
