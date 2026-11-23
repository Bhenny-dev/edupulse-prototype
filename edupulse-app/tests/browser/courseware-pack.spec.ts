import { test, expect } from '@playwright/test'
import { createHash } from 'node:crypto'
import { baselineUI, baselineWorkspace } from '../baseline-fixture'
import { coursewarePackPlan, readPack } from '../../scripts/lib/courseware-pack'
import { samplePack, sampleWorkspace } from '../courseware-pack-fixture'

// An invented pack is planned into the fixture instructor's workspace the way the seeding script does it, and the instructor opens the result.
async function seeded(page: Parameters<typeof baselineUI>[0]) {
  const fixture = await baselineUI(page), { revision, data } = sampleWorkspace(), base = baselineWorkspace.syllabi[0]!
  const bytes = Buffer.from('%PDF-1.4\nApproved syllabus\n%%EOF')
  const approvedFile = { name: 'approved.pdf', size: bytes.length, base64: bytes.toString('base64'), sha256: createHash('sha256').update(bytes).digest('hex'), uploadedAt: '2026-11-01T00:00:00.000Z', approvalAttested: true }
  Object.assign(data.syllabi[0]!, { id: base.id, courseCode: base.courseCode, courseTitle: base.courseTitle, status: 'active', approvedFile })
  data.registrations = []
  const plan = coursewarePackPlan({ owner: { id: 'fe67b9d2-719b-4b10-91cd-76031ab115fe', role: 'instructor' }, workspace: { revision, data } }, readPack(samplePack()), { code: base.courseCode })
  fixture.setWorkspace(plan.data)
  fixture.records.courses[0].syllabus_id = base.id
  return { fixture, plan }
}
const openWeeks = async (page: Parameters<typeof baselineUI>[0]) => {
  await page.goto('/#/courseware')
  await page.locator('.instructor-course-card').filter({ hasText: 'IT 102' }).first().click()
  await page.getByRole('button', { name: 'Teaching Materials & Assessments', exact: true }).click()
  await expect(page.locator('details.instructor-topic').first()).toBeAttached()
  await page.locator('details.instructor-topic').evaluateAll(nodes => nodes.forEach(node => { (node as HTMLDetailsElement).open = true }))
}

test('pack courseware shows on every teaching week as drafts, and practice content sits with the examination week', async ({ page }) => {
  const { plan } = await seeded(page)
  expect(plan.summary).toMatchObject({ addedMaterials: 4, addedAssessments: 4, preservedItems: 0, examWeeks: [4] })
  await openWeeks(page)
  for (const [week, title] of [[1, 'Orientation to Sample Studies and Course Basics'], [2, 'Sample Concepts and Limits'], [3, 'Matching Sample Terms']] as const) {
    const section = page.locator(`[data-week="${week}"]`), items = section.locator('.instructor-sequence-item')
    await expect(items).toHaveCount(2)
    await expect(items.nth(0)).toContainText(`Week ${week}: ${title}`)
    await expect(items.nth(0)).toContainText('Draft')
    await expect(items.nth(1)).toContainText(`Week ${week} assessment: ${title}`)
  }
  const exam = page.locator('[data-week="4"]')
  await expect(exam).toContainText('Examination')
  await expect(exam.getByText('Other saved content for this week')).toBeVisible()
  await exam.locator('summary').click()
  await expect(exam.locator('.instructor-sequence-item')).toHaveText([/Week 4: Midterm Review: Sample Studies/, /Week 4 assessment: Midterm Review: Sample Studies/])
})

test('a pack material opens with its notes and sources, and a pack assessment opens with its keyed answers', async ({ page }) => {
  await seeded(page)
  await openWeeks(page)
  const items = page.locator('[data-week="2"] .instructor-sequence-item')
  await items.nth(0).getByRole('button', { name: 'Open', exact: true }).click()
  const material = page.getByRole('dialog')
  await expect(material).toContainText('Intended learning outcomes')
  await expect(material).toContainText('Alpha is the first sample concept')
  await expect(material).toContainText('Sample Studies Course Syllabus, First Semester')
  await expect(material).toContainText('Teaching adaptation: Examples and learning activities were originally written for this pack')
  await page.keyboard.press('Escape')
  await items.nth(1).getByRole('button', { name: 'Open', exact: true }).click()
  await expect(page.getByLabel('Question 1 text')).toHaveValue('Which concept fits: Alpha is the first sample concept?')
  await expect(page.getByLabel('Question 1 option 2')).toHaveValue('Alpha')
  await expect(page.getByLabel('Question 1 explanation')).toHaveValue(/^Alpha\. Alpha is the first sample concept/)
  await expect(page.getByLabel('Question 4 text')).toHaveValue('Alpha: Alpha is the first sample concept.')
  await expect(page.getByRole('combobox', { name: 'Question 1 syllabus topic' })).toHaveValue('A. Alpha')
})
