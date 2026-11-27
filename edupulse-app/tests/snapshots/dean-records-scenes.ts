import { copyFile, mkdir } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import { expect } from './fixtures'
import { deanManagementUI } from '../dean-management-fixture'

const docs = '../feature-documentation'
const folder = `${docs}/system-manual/36-dean-activity-records`
const walkthrough = `${docs}/system-walkthrough`

export async function deanRecordScenes(page: Page, mobile = false, role = 'dean') {
  await page.clock.setFixedTime(new Date("2026-11-27T11:00:00+08:00"))
  const fixture = await deanManagementUI(page, role)
  fixture.records.publications.push({ course_id: 'c1', id: 'p-scheduled', week: 2, type: 'material', title: 'Scheduled practice', active: true, source_version: 'v1', delivery_mode: 'block_schedule' })
  fixture.records.deliverySchedules = [{ course_id: 'c1', syllabus_id: 's1', instructor_id: 'teacher-a', block_section: 'BSIT-1A', revision: 1, updated_at: '', windows: [{ week: 2, opens_at: '2027-01-08T02:00:00Z', closes_at: null }] }]
  fixture.records.directory.students.forEach(student => Object.assign(student as object, { department: 'College of Information Technology' }))
  fixture.inspection.items.push(
    { id: 'published-orientation', status: 'published', type: 'material', week: 1, content: { title: 'Programming lesson', sections: [] } },
    { id: 'published-quiz', status: 'published', type: 'assessment', week: 1, content: { title: 'Reviewed exercise', questions: [] } },
    { id: 'published-practice', status: 'published', type: 'material', week: 2, content: { title: 'Scheduled practice', sections: [] } },
  )
  fixture.inspection.syllabus.courseOutline.push({ week: 2, ilos: 'Trace function calls.', contents: ['Parameters'], activities: 'Guided practice', assessments: 'Review exercise' })
  fixture.records.courses.find(course => course.id === 'c1')?.outline?.push({ week: 2, ilos: 'Trace function calls.', contents: ['Parameters'] })
  await mkdir(folder, { recursive: true })
  const shot = async (name: string, aliases: string[] = [], dialog = false) => {
    if (process.env.SNAPSHOT_SCENES && !new RegExp(process.env.SNAPSHOT_SCENES).test(name)) return
    await page.mouse.move(2, 2)
    await expect(page.locator('.academic-loading')).toHaveCount(0)
    await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0) })
    const path = `${folder}/${mobile ? 'mobile-' : ''}${name}.png`
    if (dialog) await page.getByRole('dialog').screenshot({ path, animations: 'disabled' })
    else await page.screenshot({ path, animations: 'disabled', fullPage: true, style: '.app-topbar{position:static!important}' })
    for (const alias of mobile ? [] : aliases) await copyFile(path, `${walkthrough}/${alias}.png`)
  }
  const staff = '03-dean-and-associate-dean'
  const restored = '09-restored-role-pages'
  const coordinator = role === 'associate_dean'
  await page.goto('/#/dashboard')
  await expect(page.getByRole('article', { name: 'Alex Sample Instructor', exact: true })).toContainText('Block weeks · 1 opened · 1 scheduled')
  await shot(coordinator ? 'coordinator-dashboard' : '01-dashboard', coordinator ? [`${staff}/12-associate-dean-dashboard`, `${restored}/04-associate_dean-dashboard`] : [`${staff}/01-dashboard`, `${restored}/03-dean-dashboard`])
  if (coordinator) return
  const alex = page.getByRole('article', { name: 'Alex Sample Instructor', exact: true })
  await alex.getByRole('button', { name: 'View IT 102 syllabus and delivery' }).click()
  await expect(page.getByRole('heading', { name: 'Delivery by block', exact: true })).toBeVisible()
  await shot('course-delivery', [], true)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Assign course to Morgan Sample Instructor' }).click()
  await page.getByLabel('Course to assign').selectOption('IT 401')
  await expect(page.getByRole('dialog', { name: 'Load IT 401', exact: true }).getByLabel('Instructor', { exact: true })).toHaveValue('Morgan Sample Instructor')
  await shot('assign-course', [], true)
  await page.keyboard.press('Escape')
  await page.getByRole('link', { name: 'Course catalog', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Course catalog and instructor loads' })).toBeVisible()
  await shot('02-course-records', [`${staff}/08-course-records`, `${staff}/02-course-loading-loaded-courses`, `${restored}/17-course-loading`, `${restored}/20-record-courses`])
  await page.goto('/#/instructors')
  await expect(page.getByRole('link', { name: 'View instructor Alex Sample Instructor', exact: true })).toBeVisible()
  await shot('05-instructors', [`${staff}/03-course-loading-instructors`, `${restored}/18-instructor-delivery`])
  await page.goto('/#/students')
  await expect(page.getByRole('heading', { name: 'Student list', exact: true })).toBeVisible()
  await shot('10-all-students', [`${staff}/09-students-by-year`, `${restored}/19-record-blocks`])
  await page.getByRole('combobox', { name: 'Department', exact: true }).selectOption({ label: 'College of Information Technology' }, { timeout: 8000 })
  await expect(page.getByRole('heading', { name: 'Year 1', exact: true })).toBeVisible()
  await shot('07-students-by-year')
  expect(fixture.commands).toHaveLength(0)
}
