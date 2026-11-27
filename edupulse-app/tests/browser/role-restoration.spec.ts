import { test, expect } from '@playwright/test'
import { restorationUI } from '../role-restoration-fixture'

const DASHBOARD_SECTION: Record<string, string> = { instructor: 'Home', student: 'Home', dean: 'Instructor course loads', associate_dean: 'Instructor course loads' }
for (const role of ['instructor', 'student', 'dean', 'associate_dean']) {
  test(`restored ${role} pages use account records and keep each authorized section reachable`, async ({ page }) => {
    test.setTimeout(90000)
    const problems: string[] = []; page.on('pageerror', error => problems.push(error.message))
    await restorationUI(page, role)
    await page.goto('/#/dashboard'); await expect(page.getByRole('heading', { name: DASHBOARD_SECTION[role], exact: true })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Quick actions' })).toHaveCount(0)
    // No preview sample (names, scores, feed) leaks into an account dashboard.
    await expect(page.getByRole('main')).not.toContainText(/Rogelio|Guisdan|Fianza|Guaki|Pangcog/)
    if (role === 'instructor') await expect(page.getByRole('heading', { name: 'Score Snapshot', exact: true })).toHaveCount(0)
    if (role === 'student') {
      await expect(page.getByRole('region', { name: 'Your classes' })).toContainText('IT 102')
      await expect(page.getByRole('heading', { name: 'Pending Assessments', exact: true })).toBeVisible()
    }
    if (role === 'dean' || role === 'associate_dean') await expect(page.getByRole('article', { name: 'Synthetic instructor', exact: true })).toBeVisible()
    if (role === 'student' || role === 'dean') {
      await page.goto('/#/performance'); await expect(page.getByRole('img', { name: /^Assessment score radar:/ })).toBeVisible()
      await expect(page.locator('.recharts-radar-polygon')).toBeVisible()
      for (const [tab, heading] of [['By Topic', 'Topics and assessment coverage'], ['Learning Materials', 'Learning Material Access'], ['Assessment Scores', 'Recorded assessment attempts'], ...(role !== 'student' ? [['Alerts', 'Score review threshold']] : [])]) {
        await page.getByRole('navigation', { name: 'Performance views' }).getByRole('button', { name: tab, exact: true }).click(); await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
      }
      if (role !== 'student') { await page.goto('/#/performance?tab=scores'); await page.getByRole('button', { name: 'Synthetic learner', exact: true }).click(); await expect(page.getByRole('dialog', { name: 'Student performance detail' })).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog', { name: 'Student performance detail' })).toHaveCount(0) }
    }
    if (['dean', 'associate_dean'].includes(role)) {
      for (const [tab, heading] of [['syllabi', 'Syllabus and delivery overview'], ['delivery', 'Released courseware by course'], ['students', 'Syllabus and delivery overview'], ['alerts', 'Readiness and delivery alerts']]) {
        await page.goto(`/#/monitor?tab=${tab}`); await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible(); await expect(page.getByRole('heading', { name: 'Recorded assessment attempts' })).toHaveCount(0)
      }
      for (const path of ['records?tab=sections', 'records?tab=courses', 'course-loading', 'course-loading?tab=instructors']) { await page.goto('/#/' + path); await expect(page.locator('.academic-portal')).toBeVisible() }
      if (role === 'associate_dean') { await page.goto('/#/performance'); await expect(page).toHaveURL(/dashboard/); await expect(page.getByRole('link', { name: 'College Performance', exact: true })).toHaveCount(0) }
    }
    if (role === 'instructor') {
      await page.goto('/#/scoring-sheet');await page.getByRole('button',{name:'Open IT 102 · BSIT-1A',exact:true}).click();await page.getByRole('button',{name:'Assessment Scores',exact:true}).click();await expect(page.getByRole('heading',{name:'Assessment scores by student',exact:true})).toBeVisible(); await page.getByRole('button', { name: 'Learning Material Access', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Class access per material' })).toBeVisible()
    }
    if (role === 'student') {
      await page.goto('/#/courseware');await page.getByRole('region',{name:'Your classes'}).getByRole('button',{name:/^Open IT 102 /}).click();await page.getByRole('button',{name:'Teaching Materials & Assessments',exact:true}).click(); await page.getByRole('button', { name: 'Open material', exact: true }).click(); await expect(page.getByRole('region', { name: 'Opened courseware' })).toContainText('A variable stores a value.'); await page.getByRole('button', { name: 'Presentation', exact: true }).click(); await expect(page.getByRole('button', { name: /Next/i }).first()).toBeVisible()
      await page.goto('/#/assessment'); await page.getByRole('button', { name: 'Open assessment', exact: true }).first().click(); await expect(page.getByRole('dialog').locator('.academic-question').first()).toBeVisible();await expect(page.getByRole('button',{name:'Next question',exact:true})).toHaveCount(0); await expect(page.getByRole('status').filter({ hasText: 'Saved score:' })).toBeVisible()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    expect(problems).toEqual([])
  })
}
test('dark mode keeps account sections and charts on solid readable surfaces', async ({ page }) => {
  await restorationUI(page); await page.addInitScript(() => localStorage.setItem('edupulse-dark-mode', 'true')); await page.goto('/#/student-monitoring?course='+ 'a'.repeat(32)+'&block=BSIT-1A&tab=assessments')
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


test('student sees assigned units and pending releases without draft content or an inferred result',async({page})=>{
 const {records}=await restorationUI(page,'student')
 records.assignedCourses=[{id:'d'.repeat(32),course_code:'IT 104',course_title:'Research Methods',active:false,block_section:'BSIT-1A',suspended:false,units:'3',year_level:'1',semester:'2',academic_year:'2026-2027'}]
 await page.goto('/#/dashboard?term=2026-2027%7C2nd%20Semester')
 const card=page.getByRole('button',{name:'Open IT 104 Research Methods',exact:true})
 await expect(card).toContainText('3 units')
 await expect(card).toContainText('2nd Semester')
 await expect(card).toContainText('Awaiting instructor release')
 await card.click()
 await expect(page.getByRole('heading',{name:'IT 104 — Research Methods',exact:true})).toBeVisible()
 await expect(page.getByRole('status').filter({hasText:'Course assigned.'})).toBeVisible()
 await page.getByRole('button',{name:'Teaching Materials & Assessments',exact:true}).click()
 await expect(page.getByRole('button',{name:'Open material',exact:true})).toHaveCount(0)
 await page.reload()
 await expect(page.getByRole('status').filter({hasText:'Course assigned.'})).toBeVisible()
})
