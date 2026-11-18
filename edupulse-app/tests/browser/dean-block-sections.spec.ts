import { test, expect } from '@playwright/test'
import { deanManagementUI } from '../dean-management-fixture'

test('an instructor’s course cards open the course with its blocks, and the Dean adds a block with home-block and irregular students', async ({ page }) => {
  const fixture = await deanManagementUI(page)
  // A course load read from a teaching-load file: IT 202 A is block A; the unprinted IT 202 row takes the next free letter.
  fixture.records.institutional!.push({ kind: 'loads', record_key: 'course:IT 202:teacher-b', data: { CourseCode: 'IT 202', CourseTitle: 'Network foundations', InstructorID: 'teacher-b', InstructorName: 'Morgan Sample Instructor', Block: '', LoadType: 'course', AcademicYear: '2026-2027', Semester: '1st Semester',
    SourceRows: [{ subject_code: 'IT 202 A', days: 'TTH', time: '7:30 - 10:00', room: 'A310', units: 3 }, { subject_code: 'IT 202', days: 'MW', time: '1:00 - 2:30', room: 'A311', units: 3 }] as unknown as string } })
  await page.goto('/#/instructors')
  await page.getByRole('button', { name: 'View instructor Morgan Sample Instructor' }).click()
  const instructor = page.getByRole('dialog', { name: 'Instructor Morgan Sample Instructor' })
  const card = instructor.getByRole('button', { name: 'Open IT 202 of Morgan Sample Instructor' })
  await expect(card).toContainText('Blocks A, B'); await expect(card).toContainText('Class lists not added')
  await card.click()
  const course = page.getByRole('dialog', { name: 'Syllabus and teaching contents' })
  await expect(course.getByRole('heading', { name: 'Uploaded syllabus' })).toBeVisible()
  await expect(course.getByRole('region', { name: 'IT 202 block A' })).toContainText('TTH · 7:30 - 10:00 · Room A310')
  await expect(course.getByRole('region', { name: 'IT 202 block B' })).toContainText('MW · 1:00 - 2:30 · Room A311')
  await expect(course.getByRole('region', { name: 'IT 202 block A' })).toContainText('Class list not added yet.')
  await expect(course.getByRole('heading', { name: 'Extracted course outline' })).toBeVisible()
  await expect(course).toContainText('Function quiz')

  await course.getByRole('button', { name: 'Add students to IT 202 A' }).click()
  const add = page.getByRole('dialog', { name: 'Add students to IT 202 A' })
  await add.getByRole('combobox', { name: 'Students from a home block' }).selectOption('BSIT-1A')
  await add.getByRole('checkbox', { name: /Sam Irregular/ }).check()
  await expect(add).toContainText('3 students will join IT 202 A (3 of 35).')
  await add.getByRole('button', { name: 'Add 3 students' }).click()
  await expect(add).toHaveCount(0)
  expect(fixture.commands.at(-1)).toEqual({ action: 'block.add', assignment: 'course:IT 202:teacher-b', expected_instructor: 'teacher-b', block: 'A', students: [{ StudentID: 'SYN-002' }, { StudentID: 'SYN-001' }, { StudentID: 'SYN-005' }] })
  await expect(course).toContainText('IT 202 A: 3 students on the class list of Morgan Sample Instructor.')
  const listed = course.getByRole('region', { name: 'IT 202 block A' })
  await expect(listed).toContainText('Casey Example'); await expect(listed).toContainText('Sam Irregular')
  await expect(listed.locator('.dean-tag')).toHaveText(['Irregular'])
  await expect(course).toContainText('1 irregular student joined this course.')

  await course.getByRole('button', { name: 'Add block section' }).click()
  const fresh = page.getByRole('dialog', { name: 'Add block section' })
  await expect(fresh.getByRole('textbox', { name: 'Block section' })).toHaveValue('C')
  await fresh.getByRole('textbox', { name: 'Days' }).fill('F'); await fresh.getByRole('textbox', { name: 'Time' }).fill('8:00 - 11:00')
  await fresh.getByRole('button', { name: 'Add block without a class list' }).click()
  expect(fixture.commands.at(-1)).toEqual({ action: 'block.add', assignment: 'course:IT 202:teacher-b', expected_instructor: 'teacher-b', block: 'C', days: 'F', time: '8:00 - 11:00', students: [] })
  await expect(course.getByRole('region', { name: 'IT 202 block C' })).toContainText('F · 8:00 - 11:00')
})

test('the course page lists each block section independently with its class list', async ({ page }) => {
  const fixture = await deanManagementUI(page)
  fixture.records.institutional!.push({ kind: 'loads', record_key: 'course:IT 202:teacher-b', data: { CourseCode: 'IT 202', CourseTitle: 'Network foundations', InstructorID: 'teacher-b', InstructorName: 'Morgan Sample Instructor', Block: '', LoadType: 'course', AcademicYear: '2026-2027', Semester: '1st Semester' } },
    { kind: 'loads', record_key: 'IT 202|A|1st Semester|2026-2027', data: { CourseCode: 'IT 202', InstructorID: 'teacher-b', InstructorName: 'Morgan Sample Instructor', Block: 'A', LoadType: 'class', ParentLoadKey: 'course:IT 202:teacher-b', AcademicYear: '2026-2027', Semester: '1st Semester', ScheduleDays: 'TTH', ScheduleTime: '7:30 - 10:00', Room: 'A310',
      Students: [{ StudentID: 'SYN-003', Email: 'taylor@example.invalid', Name: 'Taylor Example' }] as unknown as string } },
    { kind: 'loads', record_key: 'IT 202|B|1st Semester|2026-2027', data: { CourseCode: 'IT 202', InstructorID: 'teacher-b', InstructorName: 'Morgan Sample Instructor', Block: 'B', LoadType: 'class', ParentLoadKey: 'course:IT 202:teacher-b', AcademicYear: '2026-2027', Semester: '1st Semester', ScheduleDays: 'MW', ScheduleTime: '1:00 - 2:30' } })
  await page.goto('/#/records?tab=loads')
  await page.getByRole('button', { name: /^IT 202 Network foundations,/ }).click()
  const course = page.getByRole('dialog', { name: 'IT 202 — Network foundations' })
  const rows = course.locator('table').nth(1).locator('tbody tr')
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0)).toContainText('IT 202 A'); await expect(rows.nth(0)).toContainText('TTH · 7:30 - 10:00 · Room A310'); await expect(rows.nth(0)).toContainText('1 student')
  await expect(rows.nth(1)).toContainText('IT 202 B'); await expect(rows.nth(1)).toContainText('Class list not added')
  await rows.nth(1).getByRole('button', { name: 'Add students to IT 202 B' }).click()
  await expect(page.getByRole('dialog', { name: 'Add students to IT 202 B' })).toBeVisible()
})
