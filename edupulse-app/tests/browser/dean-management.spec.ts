import { test, expect } from '@playwright/test'
import { deanManagementUI } from '../dean-management-fixture'

const csv = (name: string, lines: string[]) => ({ name, mimeType: 'text/csv', buffer: Buffer.from(lines.join('\n')) })

test('Dean loads a course to an instructor and releases a class load', async ({ page }) => {
  const fixture = await deanManagementUI(page)
  await page.goto('/#/records?tab=loads')
  await expect(page.getByRole('heading', { name: 'Course loads', exact: true })).toBeVisible()
  await expect(page.locator('.kpi-card .glass-icon')).toHaveCount(4)
  const capstone = page.locator('.dean-load-row').filter({ hasText: 'IT 401' })
  await expect(capstone).toContainText('No instructor loaded yet')
  await capstone.getByRole('button', { name: 'Load course' }).click()
  const dialog = page.getByRole('dialog', { name: 'Load IT 401', exact: true })
  await dialog.getByRole('combobox', { name: 'Instructor' }).selectOption('teacher-b')
  await dialog.locator('label.dean-chip', { hasText: 'BSIT-2A' }).click()
  await dialog.getByRole('button', { name: 'Assign to 1 block' }).click()
  await expect(dialog).toHaveCount(0)
  expect(fixture.commands[0]).toEqual({ action: 'load.assign', filename: 'Course page', loads: [{ course_code: 'IT 401', course_title: 'Capstone project', instructor_id: 'teacher-b', block: 'BSIT-2A', semester: '1st Semester' }] })
  await expect(page.getByRole('status').filter({ hasText: 'Morgan Sample Instructor now teaches IT 401 for BSIT-2A' })).toBeVisible()
  await expect(capstone).toContainText('Morgan Sample Instructor · BSIT-2A')

  await page.getByRole('button', { name: 'Remove Alex Sample Instructor from IT 102 BSIT-1A', exact: true }).click()
  await page.getByRole('dialog', { name: 'Remove course load' }).getByRole('button', { name: 'Remove load' }).click()
  expect(fixture.commands[1]).toEqual({ action: 'load.remove', keys: ['IT 102|BSIT-1A|1st Semester'] })
  await page.getByRole('button', { name: 'Course list', exact: true }).click()
  await expect(page.getByRole('button', { name: /^IT 102 Programming foundations, not yet loaded$/ })).toBeVisible()
})

test('a faculty load upload is matched and reviewed before anything is saved', async ({ page }) => {
  const fixture = await deanManagementUI(page)
  await page.goto('/#/records?tab=loads')
  await page.locator('input[type=file]').setInputFiles(csv('faculty-load.csv', ['Faculty Load Report,,', 'Instructor,Subject Code,Section', 'Morgan Sample Instructor,IT301,BSIT 3-A', 'Unknown Person,IT 102,BSIT 1-B', 'Sample Instructor,IT 102,BSIT 1-A']))
  const review = page.getByRole('dialog', { name: 'Review course load upload' })
  await expect(review).toContainText('Add: 1')
  await expect(review).toContainText('No instructor account matches "Unknown Person"')
  await expect(review).toContainText('Several instructors match "Sample Instructor"')
  expect(fixture.commands).toHaveLength(0)
  await review.getByRole('button', { name: 'Add 1 course load' }).click()
  await expect(review).toHaveCount(0)
  expect(fixture.commands[0]).toEqual({ action: 'load.assign', filename: 'faculty-load.csv', loads: [{ course_code: 'IT 301', course_title: 'Systems analysis', instructor_id: 'teacher-b', block: 'BSIT-3A' }] })
})

test('instructor accounts record master’s degrees and are suspended before removal', async ({ page }) => {
  const fixture = await deanManagementUI(page)
  await page.goto('/#/instructors')
  await expect(page.locator('.kpi-card .glass-icon')).toHaveCount(4)
  const alex = page.locator('.dean-person-card').filter({ hasText: 'Alex Sample Instructor' })
  await expect(alex).toContainText('Master in Information Technology')
  await expect(alex.getByRole('button', { name: 'Remove' })).toHaveCount(0)
  await alex.getByRole('button', { name: 'View instructor Alex Sample Instructor' }).click()
  const detail = page.getByRole('dialog', { name: 'Instructor Alex Sample Instructor' })
  await expect(detail.locator('.dean-facts')).toContainText('Master’s degreeYes')
  await expect(detail).toContainText('BSIT-1A')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Add instructor' }).click()
  const form = page.getByRole('dialog', { name: 'Add instructor' })
  await form.getByLabel('Surname').fill('Rivera'); await form.getByLabel('First name').fill('Dana'); await form.getByLabel('Sign-in email').fill('rivera@edupulse.invalid')
  await form.getByLabel("Has a master's degree").check(); await form.getByLabel('Highest degree').fill('Master of Science in Computer Science')
  await form.getByRole('button', { name: 'Add instructor', exact: true }).click()
  const created = fixture.commands[0] as { action: string; account: Record<string, unknown> }
  expect(created.action).toBe('account.create')
  expect(created.account).toMatchObject({ role: 'instructor', surname: 'Rivera', first_name: 'Dana', email: 'rivera@edupulse.invalid', has_masters: true, degree: 'Master of Science in Computer Science' })
  expect(String(created.account.password)).toMatch(/^Ep9!.{14}$/)
  await expect(page.locator('.dean-notice')).toContainText(String(created.account.password))

  await alex.getByRole('button', { name: 'Suspend' }).click()
  await page.getByRole('dialog', { name: 'Suspend instructor' }).getByRole('button', { name: 'Suspend', exact: true }).click()
  expect(fixture.commands[1]).toEqual({ action: 'account.status', id: 'teacher-a', status: 'suspended' })
  await expect(alex).toContainText('Suspended')
  await alex.getByRole('button', { name: 'Remove' }).click()
  await page.getByRole('dialog', { name: 'Remove instructor' }).getByRole('button', { name: 'Remove account', exact: true }).click()
  expect(fixture.commands[2]).toEqual({ action: 'account.status', id: 'teacher-a', status: 'removed' })
})

test('student lists separate irregular students and show each student’s assessments and materials', async ({ page }) => {
  const fixture = await deanManagementUI(page)
  await page.goto('/#/students')
  await expect(page.getByRole('row').filter({ hasText: 'Sam Irregular' })).toContainText('Irregular')
  await page.getByRole('button', { name: 'View student Riley Example' }).click()
  const riley = page.getByRole('dialog', { name: 'Student Riley Example' })
  await expect(riley.locator('.dean-mini-stats')).toContainText('1 of 1 materials opened')
  await expect(riley.getByRole('row').filter({ hasText: 'IT 102 — Programming foundations' }).first()).toContainText('100%')
  await page.keyboard.press('Escape')

  await page.locator('input[type=file]').setInputFiles(csv('edusuite-class-list.csv', ['Class List,,,,,', 'Student No.,Name,Year Level,Section,Subject Code,Status', '2026-0101,"Ramos, Ana",1,BSIT 1-A,IT 102,Regular', '2025-0202,"Cruz, Ben",2,BSIT 1-A,IT 102,Irregular']))
  const review = page.getByRole('dialog', { name: 'Review student list upload' })
  await expect(review).toContainText('Irregular: 1')
  await review.getByRole('button', { name: 'Irregular (1)' }).click()
  await expect(review).toContainText('Marked irregular in the EduSuite list')
  await expect(review).toContainText('IT 102 · BSIT-1A (Alex Sample Instructor)')
  expect(fixture.commands).toHaveLength(0)
  await review.getByRole('button', { name: 'Save 2 students' }).click()
  const saved = fixture.commands[0] as { action: string; students: Record<string, unknown>[] }
  expect(saved.action).toBe('students.import')
  expect(saved.students).toEqual([
    expect.objectContaining({ student_number: '2026-0101', placement: 'block', block: 'BSIT-1A', password: 'ramos@123', courses: [] }),
    expect.objectContaining({ student_number: '2025-0202', placement: 'irregular', year_level: 2, courses: [{ course_code: 'IT 102', course_title: 'Programming foundations', block: 'BSIT-1A' }] })])

  await page.getByRole('button', { name: 'Blocks / Sections', exact: true }).first().click()
  await page.getByRole('button', { name: 'View irregular students' }).click()
  await expect(page.getByRole('dialog', { name: 'Irregular students' })).toContainText('IT 102 · BSIT-1A')
})
