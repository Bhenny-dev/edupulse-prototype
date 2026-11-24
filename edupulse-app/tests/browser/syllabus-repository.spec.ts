import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { extractText } from 'unpdf'
import { instructorCourseUI } from '../instructor-course-fixture'
import { makePdf } from '../fixtures'

const draftLines = [
  'Section 1: Course Information', 'Course Code: SPEC 901', 'Course Title: Source-based Draft',
  'Period Offered: 1st Semester', 'Academic Year: 2026-2027',
  'Section 2: Course Description', 'Description: Develop a documented solution.',
  'Section 4: Program Outcomes', '1. Explain and document the solution.',
  'Section 5: Course Outline', 'Week 1', 'ILOs: Explain the source concepts.',
  'Content: Source concepts', 'Activities: Guided source discussion', 'Assessments: Reflective essay',
  'Section 6: Requirements, Grading & Policy', 'Course Requirements: Weekly notes',
  'Course Policy: Cite the source.', 'Section 7: References',
]

test('draft PDF imports into its separate repository, saves, reloads and exports a rebuilt PDF without adding a teaching load', async ({ page, isMobile }) => {
  const fixture = await instructorCourseUI(page)
  await page.goto('/#/syllabus?tab=mine')
  if (isMobile) await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  const navigation = page.getByRole('navigation', { name: isMobile ? 'Mobile navigation' : 'Main navigation' })
  await expect(navigation.getByRole('link', { name: 'Syllabus', exact: true })).toHaveClass(/active/)
  await expect(navigation.getByRole('link', { name: 'Course', exact: true })).toHaveCount(0)
  if (isMobile) await page.getByRole('button', { name: 'Close menu', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Upload syllabi', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Upload draft PDF or DOCX', exact: true }).click()
  await expect(page).toHaveURL(/syllabus\?tab=builder&import=draft/)
  await expect(page.getByRole('button', { name: 'Choose draft PDF or DOCX' })).toBeFocused()
  await page.getByLabel('Upload syllabus DOCX or PDF').setInputFiles({ name: 'draft.pdf', mimeType: 'application/pdf', buffer: Buffer.from(makePdf([draftLines])) })
  await expect(page.getByText('Extracted Sections Preview', { exact: true })).toBeVisible()
  expect((fixture.getWorkspace() as any).syllabi).toHaveLength(1)
  await page.getByRole('button', { name: 'Use This Syllabus', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Course Title', exact: true })).toHaveValue('Source-based Draft')
  await page.getByRole('button', { name: 'Save as Drafted', exact: true }).click()
  await expect(page).toHaveURL(/syllabus\?tab=builder&edit=/)
  const saved = (fixture.getWorkspace() as any).syllabi.find((item: any) => item.courseCode === 'SPEC 901')
  expect(saved.status).toBe('drafted'); expect(saved.approvedFile).toBeUndefined()
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Course Title', exact: true })).toHaveValue('Source-based Draft')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF draft', exact: true }).click()
  const file = await download, bytes = new Uint8Array(await readFile((await file.path())!))
  expect(file.suggestedFilename()).toMatch(/\.pdf$/)
  const pdf = await extractText(bytes, { mergePages: true })
  expect(pdf.text).toContain('Source-based Draft'); expect(pdf.text).toContain('Source concepts')
  await page.getByRole('button', { name: 'My Syllabus', exact: true }).click()
  await expect(page.locator('.syllabus-list [data-syllabus-id]')).toHaveCount(2)
  await expect(page.locator(`[data-syllabus-id="${saved.id}"]`)).toContainText('SPEC 901')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.screenshot({ path: `.data/syllabus-repository-${test.info().project.name}.png`, animations: 'disabled', fullPage: true })
  if (isMobile) await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await navigation.getByRole('link', { name: 'Home', exact: true }).click()
  await expect(page.locator('.instructor-course-card')).toHaveCount(2)
  await expect(page.locator('.instructor-course-card').filter({ hasText: 'SPEC 901' })).toHaveCount(0)
  expect(fixture.forbidden).toEqual([])
})

test('Course has a single approved teaching basis and legacy nested builder links resolve to the standalone repository without writes', async ({ page }) => {
  const fixture = await instructorCourseUI(page)
  await page.goto(`/#/courseware?course=${fixture.syllabus.id}`)
  const views = page.getByRole('navigation', { name: 'Class sections' })
  await expect(views.getByRole('button', { name: 'Teaching Materials & Assessments', exact: true })).toBeVisible()
  await expect(views.getByRole('button', { name: 'Syllabus', exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Upload approved syllabus PDF or DOCX')).toHaveCount(0)
  const before = fixture.commands.length
  await page.goto(`/#/courseware?course=${fixture.syllabus.id}&view=syllabus&tab=builder&edit=${fixture.syllabus.id}`)
  await expect(page).toHaveURL(url => url.hash === `#/syllabus?tab=builder&edit=${fixture.syllabus.id}`)
  await expect(page.getByRole('heading', { name: 'Syllabus Builder', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Syllabus Builder', exact: true })).toBeVisible()
  expect(fixture.commands.slice(before).filter(command => command.action === 'workspace')).toEqual([])
  expect(fixture.forbidden).toEqual([])
})
