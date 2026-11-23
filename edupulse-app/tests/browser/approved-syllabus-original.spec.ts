import { test, expect, type Page } from '@playwright/test'
import { instructorCourseUI } from '../instructor-course-fixture'
import { approvedDocx, approvedLines } from '../approved-syllabus-fixture'
import { makePdf, makeRuledSyllabusPdf } from '../fixtures'

// The assigned course IT 201 has no syllabus yet, so its page offers the approved-syllabus upload.
async function openAssignedCourse(page: Page) {
  const fixture = await instructorCourseUI(page)
  await page.goto('/#/courseware')
  await page.locator('.instructor-course-card').filter({ hasText: 'IT 201' }).click()
  await page.getByRole('button', { name: 'Open Teaching Materials and Assessments', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Upload syllabi', exact: true })).toBeVisible()
  return { fixture, input: page.getByLabel('Upload approved syllabus PDF or DOCX', { exact: true }) }
}

test('the uploaded PDF is displayed as the original, and weeks printed as one range stay one extracted row', async ({ page }) => {
  const { input } = await openAssignedCourse(page)
  const buffer = makeRuledSyllabusPdf({ transformed: true, wordRange: true, segmentedRules: true, code: 'IT 201', title: 'Algorithms' })
  await input.setInputFiles({ name: 'capstone-original.pdf', mimeType: 'application/pdf', buffer })
  const outline = page.getByRole('region', { name: 'Extracted approved course outline', exact: true })
  // The original prints Week 3 to Week 4 as one comprised section: one row, not one copy per calendar week.
  await expect(outline.locator('tbody tr')).toHaveCount(3)
  await expect(outline.getByRole('cell', { name: '3–4', exact: true })).toBeVisible()
  await expect(outline.getByRole('cell', { name: '3', exact: true })).toHaveCount(0)
  await expect(outline.getByRole('cell', { name: '4', exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'View syllabus', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Approved syllabus preview', exact: true })
  await expect(dialog.locator('.retained-page')).toHaveCount(2)
  const sheet = dialog.locator('.retained-page[data-drawn="true"]').first()
  await expect(sheet).toBeVisible()
  const ink = await sheet.locator('canvas').evaluate(element => {
    const canvas = element as HTMLCanvasElement, data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
    let dark = 0, minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const at = (y * canvas.width + x) * 4
      if (data[at]! < 128 && data[at + 3]! > 0) { dark++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y) }
    }
    return { dark, width: canvas.width, height: canvas.height, left: minX / canvas.width, right: maxX / canvas.width, top: minY / canvas.height, bottom: maxY / canvas.height }
  })
  expect(ink.dark).toBeGreaterThan(200)
  expect(ink.width).toBeGreaterThan(ink.height)
  // The whole landscape page is drawn at its own proportions: the ruled table sits inside it, not cropped to a corner.
  expect(ink.right - ink.left).toBeGreaterThan(0.5)
  expect(ink.right).toBeLessThan(0.95)
  expect(ink.top).toBeLessThan(0.35)
  expect(ink.bottom).toBeGreaterThan(0.4)
  // The second page is drawn once it scrolls into view. Nothing extracted is written into the dialog as text.
  await dialog.locator('.retained-page').nth(1).scrollIntoViewIfNeeded()
  await expect(dialog.locator('.retained-page[data-drawn="true"]')).toHaveCount(2)
  await expect(dialog.getByText('Nested conditions')).toHaveCount(0)
  await expect(dialog.getByText('Course Code: IT 201')).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: 'Download PDF', exact: true })).toHaveCount(0)
  const original = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Original approved file', exact: true }).click()
  expect((await original).suggestedFilename()).toBe('capstone-original.pdf')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('a Word upload is shown as its own content in a script-free frame, not as extracted fields', async ({ page }) => {
  const { input } = await openAssignedCourse(page)
  const lines = approvedLines.map(line => line.replace('IT 202', 'IT 201').replace('Fundamentals of Networking', 'Algorithms'))
  await input.setInputFiles(await approvedDocx(lines))
  await expect(page.getByRole('heading', { name: 'IT 201 - Algorithms', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'View syllabus', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Approved syllabus preview', exact: true })
  await expect(dialog.locator('iframe.retained-word')).toHaveAttribute('sandbox', '')
  const frame = dialog.frameLocator('iframe.retained-word')
  await expect(frame.getByText('Course Title: Algorithms')).toBeVisible()
  await expect(frame.getByText('Weekly lab notes')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Back', exact: true })).toBeVisible()
})

test('a long upload draws pages as they come into view and gives far pages back', async ({ page }) => {
  const { input } = await openAssignedCourse(page)
  const first = ['Section 1: Course Information', 'Course Code: IT 201', 'Course Title: Algorithms', 'Section 5: Course Outline', 'Week 1', 'ILOs: Explain variables', 'Topics: Variables and assignment']
  const pages = [first, ...Array.from({ length: 11 }, (_, index) => [`Appendix page ${index + 2}`])]
  await input.setInputFiles({ name: 'long-original.pdf', mimeType: 'application/pdf', buffer: Buffer.from(makePdf(pages)) })
  await page.getByRole('button', { name: 'View syllabus', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Approved syllabus preview', exact: true })
  const sheets = dialog.locator('.retained-page')
  await expect(sheets).toHaveCount(12)
  await expect(sheets.first()).toHaveAttribute('data-drawn', 'true')
  await expect(sheets.last()).toHaveAttribute('data-drawn', 'false')
  await sheets.last().scrollIntoViewIfNeeded()
  await expect(sheets.last()).toHaveAttribute('data-drawn', 'true')
  await expect(sheets.first()).toHaveAttribute('data-drawn', 'false')
})
