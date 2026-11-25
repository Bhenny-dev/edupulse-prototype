import { expect, type Page } from '@playwright/test'
import { instructorCourseUI } from './instructor-course-fixture'

export async function approvedCourseUI(page: Page, status = 'approved_uploaded') {
  const fixture = await instructorCourseUI(page)
  const syllabus = { ...fixture.syllabus, status }
  const draft = { ...syllabus, id: 'newer-repository-draft', status: 'drafted', lastUpdated: '2026-11-25T00:00:00Z', courseOutline: [{ week: 1, contents: ['Unapproved repository topic'], ilos: 'Draft only.' }] }
  fixture.setWorkspace({ ...fixture.getWorkspace(), syllabi: [draft, syllabus] })
  await page.goto('/#/dashboard?course=IT%20102&tab=materials')
  await expect(page.getByRole('heading', { name: /^Week 1/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Upload syllabi', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Continue editing draft', exact: true })).toHaveCount(0)
  await expect(page.getByText(/Open a topic to add its teaching materials/)).toHaveCount(0)
  await expect(page.getByText(/Copies are private to your account/)).toHaveCount(0)
  await expect(page.getByText('Unapproved repository topic', { exact: true })).toHaveCount(0)
  return { ...fixture, syllabus }
}
