import { test, expect, type Page } from '../snapshots/fixtures'
import { instructorCourseUI } from '../instructor-course-fixture'
import { baselineUI } from '../baseline-fixture'

// UI transport only: the meeting days, times and rooms below are fixture records, not real classes.
const openSchedule = async (page: Page, isMobile: boolean) => {
  await page.goto('/#/dashboard')
  if (isMobile) await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await page.getByRole('navigation', { name: isMobile ? 'Mobile navigation' : 'Main navigation' }).getByRole('link', { name: 'Schedule', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Schedule', exact: true })).toBeVisible()
}

test('an instructor sees the classes they teach on a weekly calendar, opens one, and sees classes without a time apart', async ({ page, isMobile }) => {
  const fixture = await instructorCourseUI(page)
  for (const row of fixture.records.institutional as any[]) if (row.kind === 'loads' && row.data.CourseCode === 'IT 102') row.data.Schedules = [{ days: 'MW', time: '7:30 - 9:00', room: 'A310' }, { days: 'F', time: '1:00 - 4:00', room: 'Lab 2' }]
  await openSchedule(page, isMobile)
  await expect(page.getByText('Your weekly class meetings for the classes you teach.')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Next class:' })).toContainText('IT 102')
  if (isMobile) await expect(page.getByRole('button', { name: 'Agenda', exact: true })).toHaveAttribute('aria-pressed', 'true')
  else {
    await expect(page.getByRole('button', { name: 'Week', exact: true })).toHaveAttribute('aria-pressed', 'true')
    const grid = page.getByRole('group', { name: /^Class meetings, week of/ })
    await expect(grid.getByRole('button', { name: /^IT 102 block BSIT-1A, Monday 7:30 AM - 9:00 AM, room A310$/ })).toBeVisible()
    await expect(grid.getByRole('button', { name: /^IT 102 block BSIT-1A, Wednesday 7:30 AM - 9:00 AM, room A310$/ })).toBeVisible()
    await expect(grid.getByRole('button', { name: /^IT 102 block BSIT-1A, Friday 1:00 PM - 4:00 PM, room Lab 2$/ })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    // A meeting is a framed card: solid edges on the left, right and bottom, and a header band across the top with the code centred (no left-only stripe).
    const card = grid.getByRole('button', { name: /^IT 102 block BSIT-1A, Monday/ })
    expect(await card.evaluate(element => { const style = getComputedStyle(element); return [style.borderLeftWidth, style.borderRightWidth, style.borderBottomWidth, style.borderTopWidth] })).toEqual(['2px', '2px', '2px', '0px'])
    const outer = (await card.boundingBox())!, head = (await card.locator('.schedule-meeting-head').boundingBox())!
    expect(Math.abs(head.width - (outer.width - 4))).toBeLessThanOrEqual(1)
    // Light like the Home class card: the header band is not a dark solid.
    expect(await card.locator('.schedule-meeting-head').evaluate(element => getComputedStyle(element).color)).not.toBe('rgb(255, 255, 255)')
    expect(Math.abs(head.x + head.width / 2 - (outer.x + outer.width / 2))).toBeLessThanOrEqual(1)
    await expect(card.locator('.schedule-meeting-head')).toContainText('IT 102')
  }
  // A class the Dean loaded without days and times is listed apart, never placed on the calendar.
  const apart = page.getByRole('region', { name: 'Classes without a meeting time' })
  await expect(apart).toContainText('IT 201')
  await expect(page.getByRole('button', { name: /^IT 201/ }).first()).toBeVisible()
  // Previous and next week change the dates, Today returns.
  const range = page.locator('.schedule-range')
  const first = await range.textContent()
  await page.getByRole('button', { name: 'Next week', exact: true }).click()
  await expect(range).not.toHaveText(first!)
  await page.getByRole('button', { name: 'Today', exact: true }).click()
  await expect(range).toHaveText(first!)
  // A meeting opens its class as a page over Home.
  await page.getByRole('button', { name: /^IT 102 block BSIT-1A, Monday/ }).first().click()
  await expect(page).toHaveURL(/#\/dashboard\?course=/)
  await expect(page.getByRole('dialog', { name: /^Class IT 102/ })).toBeVisible()
  expect(fixture.forbidden).toEqual([])
})

test('a student sees the classes they are enrolled in with the days and times the Dean recorded', async ({ page, isMobile }) => {
  const { records } = (await baselineUI(page, 'student')) as { records: any }
  records.assignedCourses = [{ id: 'course-1', course_code: 'IT 102', course_title: 'Computer Programming 1', active: true, block_section: 'BSIT-1A', suspended: false, units: '3', year_level: '1', semester: '1st Semester', academic_year: '2026-2027', instructor_name: 'Morgan Sample Instructor' },
    { id: 'course-2', course_code: 'IT 105', course_title: 'Discrete Mathematics', active: true, block_section: 'BSIT-1A', suspended: false, units: '3', year_level: '1', semester: '1st Semester', academic_year: '2026-2027', instructor_name: 'Morgan Sample Instructor' }]
  records.classSchedule = [{ load_key: 'IT 102|BSIT-1A|1st Semester|2026-2027', course_code: 'IT 102', course_title: 'Computer Programming 1', block: 'BSIT-1A', academic_year: '2026-2027', semester: '1st Semester', instructor_name: 'Morgan Sample Instructor', slots: [{ days: 'TTH', time: '10:00 - 11:30', room: 'B204' }] }]
  await openSchedule(page, isMobile)
  await expect(page.getByText('Your weekly class meetings for the classes you are enrolled in.')).toBeVisible()
  await expect(page.getByRole('button', { name: /^IT 102 block BSIT-1A, Tuesday 10:00 AM - 11:30 AM, room B204$/ }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /^IT 102 block BSIT-1A, Thursday 10:00 AM - 11:30 AM, room B204$/ }).first()).toBeVisible()
  // A class without a recorded schedule says so.
  await expect(page.getByRole('region', { name: 'Classes without a meeting time' })).toContainText('IT 105')
  await page.getByRole('button', { name: /^IT 102 block BSIT-1A, Tuesday/ }).first().click()
  await expect(page).toHaveURL(/#\/dashboard\?course=course-1/)
})

test('a student with no classes in the semester is told so', async ({ page, isMobile }) => {
  const { records } = (await baselineUI(page, 'student')) as { records: any }
  records.assignedCourses = []; records.classSchedule = []
  await openSchedule(page, isMobile)
  await expect(page.getByRole('region', { name: 'No classes' })).toContainText('Classes you join or are enrolled in appear here')
})
