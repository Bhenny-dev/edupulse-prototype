import { test, expect, type Page } from './fixtures'
import { mkdir } from 'node:fs/promises'
import { restorationUI } from '../role-restoration-fixture'

const root = '../feature-documentation/system-walkthrough/09-restored-role-pages'
async function shot(page: Page, name: string, selector?: string) {
  await mkdir(root, { recursive: true })
  await page.mouse.move(2, 400)
  await expect(page.getByRole('region', { name: 'Loading academic records' })).toHaveCount(0)
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }))
  await (selector ? page.locator(selector) : page).screenshot({ path: `${root}/${name}.png`, animations: 'disabled', fullPage: !selector, style: '.app-topbar{position:static !important}' })
}
for (const [role, number] of [['instructor', '01'], ['student', '02'], ['dean', '03'], ['associate_dean', '04']]) {
  test(`synthetic restored ${role} dashboard`, async ({ page }) => { await restorationUI(page, role); await page.goto('/#/dashboard'); await expect(page.getByRole('navigation', { name: 'Quick actions' })).toBeVisible(); await shot(page, `${number}-${role}-dashboard`) })
}
test('synthetic restored performance and scoring sections', async ({ page }) => {
  await restorationUI(page)
  for (const [tab, name] of [['overview', '05-performance-radar-and-history'], ['bytopic', '06-assessment-coverage'], ['materials', '07-material-access'], ['scores', '08-assessment-scores'], ['alerts', '09-threshold-review']]) { await page.goto(`/#/performance?tab=${tab}`); await expect(page.getByRole('navigation', { name: 'Performance views' })).toBeVisible(); await shot(page, name) }
  await page.goto('/#/performance?tab=scores'); await page.getByRole('button', { name: 'Synthetic learner', exact: true }).click(); await shot(page, '10-student-drilldown', '.academic-student-dialog'); await page.keyboard.press('Escape')
  await page.goto('/#/scoring-sheet'); await shot(page, '11-monitoring-scoring-matrix'); await page.getByRole('button', { name: 'Learning Material Access', exact: true }).click(); await shot(page, '12-monitoring-material-matrix')
})
test('synthetic restored oversight, loading and records sections', async ({ page }) => {
  await restorationUI(page, 'dean')
  for (const [path, name] of [['monitor?tab=syllabi', '13-monitor-syllabus-status'], ['monitor?tab=delivery', '14-monitor-delivery'], ['monitor?tab=students', '15-monitor-students'], ['monitor?tab=alerts', '16-monitor-alerts'], ['course-loading', '17-course-loading'], ['course-loading?tab=instructors', '18-instructor-delivery'], ['records?tab=sections', '19-record-blocks'], ['records?tab=courses', '20-record-courses']]) { await page.goto('/#/' + path); await expect(page.locator('.academic-portal')).toBeVisible(); await shot(page, name) }
  await page.goto('/#/records'); await page.getByLabel('Choose CSV for preview').setInputFiles({ name: 'synthetic-courses.csv', mimeType: 'text/csv', buffer: Buffer.from('CourseCode,CourseTitle,Units,Classification,Hours,Prerequisites,YearLevel,Semester\nIT 102,Computer Programming 1,3,Core,5,,1,1\nIT 103,,3,Core,3,,1,1') }); await expect(page.getByText('1 valid · 1 rejected · 2 total')).toBeVisible(); await shot(page, '21-course-intake-preview')
  await page.getByRole('button', { name: 'Confirm Import (1 records)', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Saved 1 new' })).toBeVisible(); await shot(page, '22-course-intake-saved')
  for (const [label, name] of [['Course Loads', '23-load-intake'], ['Student Class Lists', '24-roster-intake'], ['Templates', '25-intake-templates'], ['History', '26-intake-history']]) { await page.getByRole('navigation', { name: 'File import views' }).getByRole('button', { name: label, exact: true }).click(); await shot(page, name) }
})
test('synthetic restored student readers, results and notices', async ({ page }) => {
  const fixture = await restorationUI(page, 'student'); await page.goto('/#/courseware'); await shot(page, '27-student-course-weeks'); await page.getByRole('button', { name: 'Open material', exact: true }).click(); await shot(page, '28-student-document'); await page.getByRole('button', { name: 'Presentation', exact: true }).click(); await shot(page, '29-student-presentation', '[aria-label="Opened courseware"]')
  await page.goto('/#/assessment'); await page.getByRole('button', { name: 'Open assessment', exact: true }).first().click(); await shot(page, '30-student-assessment-result')
  fixture.records.attempts.pop(); await page.goto('/#/notifications'); await page.reload(); await expect(page.getByText('Unanswered assessment: Arrays quiz', { exact: true })).toBeVisible(); await shot(page, '31-account-notices')
})
test('synthetic restored dark solid surfaces', async ({ page }) => {
  await restorationUI(page); await page.addInitScript(() => localStorage.setItem('edupulse-dark-mode', 'true')); await page.goto('/#/performance'); await expect(page.getByRole('img', { name: /^Assessment score radar:/ })).toBeVisible(); await shot(page, '32-dark-performance')
})
