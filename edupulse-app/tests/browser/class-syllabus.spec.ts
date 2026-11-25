import { test, expect, type Page } from '@playwright/test'
import { instructorCourseUI } from '../instructor-course-fixture'
import { makeRuledSyllabusPdf } from '../fixtures'

// UI transport only: the uploaded files and loads are fixture records.
const upload = (code: string, title: string, name: string) => ({ name, mimeType: 'application/pdf', buffer: makeRuledSyllabusPdf({ transformed: true, wordRange: true, segmentedRules: true, code, title }) })

async function saveOnSyllabusPage(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  await page.goto('/#/syllabus?tab=mine&upload=approved')
  await page.getByLabel('Upload approved syllabus PDF or DOCX', { exact: true }).setInputFiles(file)
  await expect(page.getByRole('region', { name: 'Extracted approved course outline', exact: true })).toBeVisible()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Save syllabus', exact: true }).click()
}

test('the Syllabus page saves an upload, and the class Syllabus view shows only that file and its outline', async ({ page }) => {
  const fixture = await instructorCourseUI(page)
  await saveOnSyllabusPage(page, upload('IT 201', 'Algorithms', 'algorithms-approved.pdf'))
  // The loaded IT 201 has no approved syllabus yet, so the saved copy becomes its syllabus and is also kept in My Syllabus.
  await expect(page.getByText('IT 201 saved. It is now the approved syllabus of your IT 201 class.')).toBeVisible()
  const saved = (fixture.getWorkspace() as any).syllabi.find((item: any) => item.courseCode === 'IT 201')
  expect(saved.status).toBe('active'); expect(saved.approvedFile.name).toBe('algorithms-approved.pdf')
  await expect(page.locator(`[data-syllabus-id="${saved.id}"]`)).toContainText('IT 201')

  await page.goto('/#/dashboard')
  await page.locator('.instructor-course-card').filter({ hasText: 'IT 201' }).click()
  await page.getByRole('button', { name: 'Syllabus', exact: true }).click()
  await expect(page).toHaveURL(/view=class-syllabus/)
  await expect(page.getByRole('button', { name: 'Syllabus', exact: true })).toHaveAttribute('aria-pressed', 'true')
  const file = page.getByRole('region', { name: 'Uploaded syllabus', exact: true })
  await expect(file).toContainText('algorithms-approved.pdf')
  const outline = page.getByRole('region', { name: 'Course outline read from the uploaded syllabus', exact: true })
  await expect(outline.locator('tbody tr')).toHaveCount(3)
  await expect(outline.getByRole('cell', { name: '3–4', exact: true })).toBeVisible()
  // The class only presents; it has no upload, shared picker or draft controls.
  await expect(page.getByLabel('Upload approved syllabus PDF or DOCX')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /shared syllabus/i })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Continue editing draft' })).toHaveCount(0)
  // The original file opens as a page over the class, and Download returns it.
  await file.getByRole('button', { name: 'View uploaded file', exact: true }).click()
  const viewer = page.getByRole('dialog', { name: 'Uploaded syllabus', exact: true })
  await expect(viewer.locator('.retained-page').first()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(viewer).toHaveCount(0)
  const download = page.waitForEvent('download')
  await file.getByRole('button', { name: 'Download', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('algorithms-approved.pdf')
  // The two pages connect only by links.
  await page.getByRole('link', { name: 'Manage syllabi in Syllabus', exact: true }).click()
  await expect(page).toHaveURL(/#\/syllabus\?tab=mine/)
  await expect(page.getByRole('heading', { name: 'Syllabus', exact: true })).toBeVisible()
})

test('a class without an approved syllabus points to the Syllabus page instead of offering an upload', async ({ page }) => {
  await instructorCourseUI(page)
  await page.goto('/#/dashboard')
  await page.locator('.instructor-course-card').filter({ hasText: 'IT 201' }).click()
  const classPage = page.getByRole('dialog', { name: /^Class IT 201/ })
  await expect(classPage.getByRole('region', { name: 'Next step' })).toContainText('Upload it on the Syllabus page')
  await page.getByRole('button', { name: 'Syllabus', exact: true }).click()
  await expect(classPage.getByRole('region', { name: 'No approved syllabus' })).toContainText('Upload the approved syllabus of IT 201 on the Syllabus page')
  await page.getByRole('navigation', { name: 'Class sections' }).getByRole('button', { name: 'Teaching Materials & Assessments', exact: true }).click()
  await expect(classPage.getByRole('region', { name: 'No approved syllabus' })).toBeVisible()
  await expect(page.getByLabel('Upload approved syllabus PDF or DOCX')).toHaveCount(0)
  await classPage.getByRole('link', { name: 'Open Syllabus', exact: true }).click()
  await expect(page).toHaveURL(/#\/syllabus\?tab=mine/)
})

test('a second approved upload for a class that already has one is kept in My Syllabus and the class keeps its own', async ({ page }) => {
  const fixture = await instructorCourseUI(page)
  await saveOnSyllabusPage(page, upload('IT 201', 'Algorithms', 'first-approved.pdf'))
  await expect(page.getByText('IT 201 saved. It is now the approved syllabus')).toBeVisible()
  await saveOnSyllabusPage(page, upload('IT 201', 'Algorithms', 'second-approved.pdf'))
  await expect(page.getByText('Your class already has an approved syllabus, so it keeps using that one.')).toBeVisible()
  const copies = ((fixture.getWorkspace() as any).syllabi as any[]).filter(item => item.courseCode === 'IT 201')
  expect(copies.map(item => [item.approvedFile.name, item.status])).toEqual([['first-approved.pdf', 'active'], ['second-approved.pdf', 'approved_uploaded']])
  await page.goto('/#/dashboard')
  await page.locator('.instructor-course-card').filter({ hasText: 'IT 201' }).click()
  await page.getByRole('button', { name: 'Syllabus', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Uploaded syllabus', exact: true })).toContainText('first-approved.pdf')
})

test('an approved syllabus for a course that is not loaded to the instructor is kept and not attached to any class', async ({ page }) => {
  const fixture = await instructorCourseUI(page)
  await saveOnSyllabusPage(page, upload('IT 301', 'Software Engineering', 'unloaded-approved.pdf'))
  await expect(page.getByText('IT 301 saved in My Syllabus. It links to your class when the Dean loads this course to you')).toBeVisible()
  const saved = ((fixture.getWorkspace() as any).syllabi as any[]).find(item => item.courseCode === 'IT 301')
  expect(saved.status).toBe('approved_uploaded')
  await expect(page.locator(`[data-syllabus-id="${saved.id}"]`)).toContainText('IT 301')
})
