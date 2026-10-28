import { test, expect } from '@playwright/test'
import { restorationUI } from '../role-restoration-fixture'

for (const role of ['instructor', 'student', 'dean', 'associate_dean']) {
  test(`restored ${role} pages use account records and keep each authorized section reachable`, async ({ page }) => {
    test.setTimeout(90000)
    const problems: string[] = []; page.on('pageerror', error => problems.push(error.message))
    await restorationUI(page, role)
    await page.goto('/#/dashboard'); await expect(page.getByRole('navigation', { name: 'Quick actions' })).toBeVisible()
    if (role === 'instructor' || role === 'student' || role === 'dean') {
      await page.goto('/#/performance'); await expect(page.getByRole('img', { name: /^Assessment score radar:/ })).toBeVisible()
      await expect(page.locator('.recharts-radar-polygon')).toBeVisible()
      for (const [tab, heading] of [['By Topic', 'Topics and assessment coverage'], ['Learning Materials', 'Learning Material Access'], ['Assessment Scores', 'Recorded assessment attempts'], ...(role !== 'student' ? [['Alerts', 'Score review threshold']] : [])]) {
        await page.getByRole('navigation', { name: 'Performance views' }).getByRole('button', { name: tab, exact: true }).click(); await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
      }
      if (role !== 'student') { await page.goto('/#/performance?tab=scores'); await page.getByRole('button', { name: 'Synthetic learner', exact: true }).click(); await expect(page.getByRole('dialog', { name: 'Student performance detail' })).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog', { name: 'Student performance detail' })).toHaveCount(0) }
    }
    if (['dean', 'associate_dean'].includes(role)) {
      for (const [tab, heading] of [['syllabi', 'Syllabus status overview'], ['delivery', 'Published delivery by course'], ['students', 'Confirmed class lists'], ['alerts', 'Readiness and delivery alerts']]) {
        await page.goto(`/#/monitor?tab=${tab}`); await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible(); await expect(page.getByRole('heading', { name: 'Recorded assessment attempts' })).toHaveCount(0)
      }
      for (const path of ['records?tab=sections', 'records?tab=courses', 'course-loading', 'course-loading?tab=instructors']) { await page.goto('/#/' + path); await expect(page.locator('.academic-portal')).toBeVisible() }
      if (role === 'associate_dean') { await page.goto('/#/performance'); await expect(page).toHaveURL(/dashboard/); await expect(page.getByRole('link', { name: 'College Performance', exact: true })).toHaveCount(0) }
    }
    if (role === 'instructor') {
      await page.goto('/#/scoring-sheet'); await expect(page.getByRole('heading', { name: 'Assessment scoring matrix' })).toBeVisible(); await expect(page.getByText('No attempt', { exact: true }).first()).toBeVisible(); await page.getByRole('button', { name: 'Learning Material Access', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Material access chart' })).toBeVisible()
    }
    if (role === 'student') {
      await page.goto('/#/courseware'); await page.getByRole('button', { name: 'Open material', exact: true }).click(); await expect(page.getByRole('region', { name: 'Opened courseware' })).toContainText('A variable stores a value.'); await page.getByRole('button', { name: 'Presentation', exact: true }).click(); await expect(page.getByRole('button', { name: /Next/i }).first()).toBeVisible()
      await page.goto('/#/assessment'); await page.getByRole('button', { name: 'Open assessment', exact: true }).first().click(); await expect(page.getByRole('navigation', { name: 'Question navigation' })).toBeVisible(); await expect(page.getByRole('status').filter({ hasText: 'Saved score:' })).toBeVisible()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    expect(problems).toEqual([])
  })
}
test('confirmed shared CSV import survives refresh; templates and history work', async ({ page }) => {
  test.setTimeout(60000)
  const fixture = await restorationUI(page, 'dean'); await page.goto('/#/records')
  await page.getByLabel('Choose CSV for preview').setInputFiles({ name: 'synthetic-courses.csv', mimeType: 'text/csv', buffer: Buffer.from('CourseCode,CourseTitle,Units,Classification,Hours,Prerequisites,YearLevel,Semester\nIT 102,"Programming, basics",3,Core,5,,1,1\nIT 103,,3,Core,3,,1,1') })
  await expect(page.getByText('1 valid · 1 rejected · 2 total')).toBeVisible(); await page.getByRole('button', { name: 'Confirm Import (1 records)', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Saved 1 new' })).toBeVisible()
  expect(fixture.records.institutional!.filter(row=>row.kind==='courses')).toHaveLength(1)
  await page.reload(); await expect(page.getByRole('heading', { name: 'Shared academic records' })).toBeVisible(); await expect(page.getByRole('cell', { name: 'Programming, basics', exact: true })).toBeVisible()
  await page.getByRole('navigation', { name: 'File import views' }).getByRole('button', { name: 'History', exact: true }).click(); await expect(page.getByRole('cell', { name: 'synthetic-courses.csv', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Templates', exact: true }).click(); const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download Course Records Template', exact: true }).click(); expect((await download).suggestedFilename()).toBe('courses-template.csv')
})
test('dark mode keeps account sections and charts on solid readable surfaces', async ({ page }) => {
  await restorationUI(page); await page.addInitScript(() => localStorage.setItem('edupulse-dark-mode', 'true')); await page.goto('/#/performance')
  await expect(page.getByRole('img', { name: /^Assessment score radar:/ })).toBeVisible()
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundImage)).toBe('none')
  expect(await page.locator('.app-topbar').evaluate(element => getComputedStyle(element).backgroundImage)).toBe('none')
  expect(await page.locator('.card').first().evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(15, 23, 42)')
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, overflow: [...document.querySelectorAll('*')].filter(element => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 10).map(element => ({ class: element.className?.toString(), width: element.getBoundingClientRect().width })) }))
  expect(dimensions.scroll, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.width + 1)
})
test('account notices come from unanswered records and read state survives reload', async ({ page }) => {
  const fixture = await restorationUI(page, 'student'); fixture.records.attempts.pop()
  await page.goto('/#/notifications'); await expect(page.getByText('Unanswered assessment: Arrays quiz', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Mark All Read', exact: true }).click(); await page.reload(); await expect(page.getByRole('button', { name: 'Mark All Read', exact: true })).toBeDisabled()
})
