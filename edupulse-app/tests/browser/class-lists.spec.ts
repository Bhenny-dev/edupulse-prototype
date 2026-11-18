import { test, expect, type Page } from '@playwright/test'
import { deanManagementUI } from '../dean-management-fixture'
import { instructorCourseUI } from '../instructor-course-fixture'
import { buildXls, classListRows } from '../xls-fixture'

// The registrar numbers sections (IT 202 - 7, IT 202 - 8); the teaching load letters the same blocks (IT 202 A, B).
const classList = (section: string, meetings: [string, string, string][], students: [string, string, string, string?][], code = 'IT 202', title = 'Network foundations') => ({
  name: `${code} - ${section} Class List Report for First Semester   S.Y. 2026-2027.xls`, mimeType: 'application/vnd.ms-excel',
  buffer: Buffer.from(buildXls([{ name: `Class List for ${code} - ${section}`, rows: classListRows({ code, title, section, meetings, faculty: 'INSTRUCTOR, Morgan Sample', students }) }])),
})
const upload = (page: Page) => page.locator('label.dean-upload', { hasText: 'Upload class lists' }).locator('input[type=file]')

test('the Dean uploads the registrar class lists and each one lands on its teaching-load block', async ({ page }, info) => {
  const fixture = await deanManagementUI(page)
  fixture.records.institutional!.push({ kind: 'loads', record_key: 'course:IT 202:teacher-b', data: { CourseCode: 'IT 202', CourseTitle: 'Network foundations', InstructorID: 'teacher-b', InstructorName: 'Morgan Sample Instructor', Block: '', LoadType: 'course', AcademicYear: '2026-2027', Semester: '1st Semester',
    SourceRows: [{ subject_code: 'IT 202 A', days: 'TTH', time: '7:30 - 10:00', room: 'A310', units: 3 }, { subject_code: 'IT 202 B', days: 'MW', time: '1:00 - 2:30', room: 'A311', units: 3 }] as unknown as string } })
  await page.goto('/#/records')
  await upload(page).setInputFiles([
    classList('7', [['Tue', '07:30 am', 'A310'], ['Thu', '07:30 am', 'A310']], [['EXAMPLE, CASEY', 'F', 'SYN-002'], ['EXAMPLE, RILEY', 'M', 'SYN-001'], ['NEWCOMER, PAT', 'M', 'SYN-404'], ['LEAVER, DREW', 'F', 'SYN-009', 'Dropped']]),
    classList('8', [['Mon', '01:00 pm', 'A311'], ['Wed', '01:00 pm', 'A311']], [['EXAMPLE, TAYLOR', 'M', 'SYN-003']]),
  ])
  const dialog = page.getByRole('dialog', { name: 'Class lists' })
  const first = dialog.getByRole('group', { name: /IT 202 - 7/ }), second = dialog.getByRole('group', { name: /IT 202 - 8/ })
  await expect(first).toContainText('IT 202 - 7 · Network foundations · Faculty: INSTRUCTOR, Morgan Sample · Tue 07:30 A310, Thu 07:30 A310 · 1st Semester 2026-2027')
  await expect(first.getByRole('combobox', { name: 'Add to block section' })).toHaveValue('course:IT 202:teacher-b|A')
  await expect(first.getByRole('combobox', { name: 'Add to block section' }).locator('option:checked')).toHaveText('IT 202 A · Morgan Sample Instructor · TTH · 7:30 - 10:00 · Room A310 · same instructor, same days, same start time, same room')
  await expect(first).toContainText('2 students will be added · 1 without an EduPulse account yet · 1 not enrolled')
  await expect(second.getByRole('combobox', { name: 'Add to block section' })).toHaveValue('course:IT 202:teacher-b|B')
  await first.getByText('Students on this list (4)').click()
  await expect(first.getByRole('region', { name: 'Students on IT 202 - 7' }).locator('.dean-tag')).toHaveText(['Will be added', 'Will be added', 'No EduPulse account yet', 'Not enrolled (Dropped)'])
  await page.screenshot({ path: info.outputPath('class-lists-preview.jpg'), type: 'jpeg', quality: 70, animations: 'disabled' })

  await dialog.getByRole('button', { name: 'Add 3 students' }).click()
  await expect(dialog).toHaveCount(0)
  expect(fixture.commands.slice(-2)).toEqual([
    { action: 'block.add', assignment: 'course:IT 202:teacher-b', expected_instructor: 'teacher-b', block: 'A', days: 'TTH', time: '7:30 - 10:00', room: 'A310', students: [{ StudentID: 'SYN-002' }, { StudentID: 'SYN-001' }] },
    { action: 'block.add', assignment: 'course:IT 202:teacher-b', expected_instructor: 'teacher-b', block: 'B', days: 'MW', time: '1:00 - 2:30', room: 'A311', students: [{ StudentID: 'SYN-003' }] },
  ])
  await expect(page.getByText('Class lists added: IT 202 A (2 students), IT 202 B (1 student). 1 listed student has no EduPulse account yet; upload the same list again after their accounts are created.')).toBeVisible()

  // Uploading the same list again adds nobody twice.
  await upload(page).setInputFiles([classList('7', [['Tue', '07:30 am', 'A310'], ['Thu', '07:30 am', 'A310']], [['EXAMPLE, CASEY', 'F', 'SYN-002'], ['EXAMPLE, RILEY', 'M', 'SYN-001']])])
  const again = page.getByRole('dialog', { name: 'Class lists' })
  await expect(again.getByRole('group', { name: /IT 202 - 7/ })).toContainText('0 students will be added · 2 already on the block')
  await expect(again.getByRole('button', { name: 'Nothing to add' })).toBeDisabled()
})

test('an instructor reads the registrar .xls class list, keeps enrolled students and chooses the block', async ({ page }) => {
  await instructorCourseUI(page)
  await page.goto('/#/courseware')
  await page.locator('.instructor-course-card').filter({ hasText: 'IT 201' }).click()
  await page.getByRole('button', { name: 'Block sections', exact: true }).click()
  await page.getByRole('button', { name: 'Add block section', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Course class list', exact: true })
  const meetings: [string, string, string][] = [['Mon', '07:30 am', 'A324'], ['Wed', '07:30 am', 'A324']]
  await dialog.locator('input[type=file]').setInputFiles(classList('3', meetings, [['EXAMPLE, CASEY', 'F', 'SYN-002'], ['EXAMPLE, RILEY', 'M', 'SYN-001'], ['LEAVER, DREW', 'F', 'SYN-009', 'Withdrawn']], 'IT 201', 'Data structures'))
  await expect(dialog.getByText('Student Preview (2 records)')).toBeVisible()
  await expect(dialog).toContainText('1 student not enrolled with the registrar was left out.')
  await expect(dialog).toContainText('Registrar section IT 201 - 3, INSTRUCTOR, Morgan Sample, Mon 07:30, Wed 07:30: choose the block section it belongs to.')
  await expect(dialog.getByLabel('Block Section *')).toHaveValue('')
  await dialog.locator('input[type=file]').setInputFiles(classList('7', meetings, [['EXAMPLE, CASEY', 'F', 'SYN-002']]))
  await expect(dialog).toContainText('This class list is for IT 202, not IT 201. Check that you chose the right file.')
})

test('a file that is not a class list, and a list whose course has no load, explain themselves and add nothing', async ({ page }) => {
  await deanManagementUI(page)
  await page.goto('/#/records')
  await upload(page).setInputFiles([{ name: 'notes.csv', mimeType: 'text/csv', buffer: Buffer.from('Topic,Week\nNetworks,1\n') }, classList('9', [['Fri', '08:00 am', 'B201']], [['EXAMPLE, CASEY', 'F', 'SYN-002']])])
  const dialog = page.getByRole('dialog', { name: 'Class lists' })
  await expect(dialog.getByRole('group', { name: 'notes.csv' })).toContainText('This is not a registrar class list.')
  await expect(dialog.getByRole('group', { name: /IT 202 - 9/ })).toContainText('No course load for IT 202 in 1st Semester 2026-2027 was found. Upload the teaching load first.')
  await expect(dialog.getByRole('button', { name: 'Nothing to add' })).toBeDisabled()
})
