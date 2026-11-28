import { expect, type Page } from '@playwright/test'
import { accountSupportUI, supportAccounts } from './account-support-fixture'
import { deanRecordData } from './dean-records-data'

const retryMessage = 'Academic records could not be loaded completely. Retry with the selected Admin view.'

export async function managementSupportScene(page: Page, role: 'dean' | 'associate_dean', shot = async (_scene: string) => {}) {
  const title = role === 'dean' ? 'Dean' : 'Program Coordinator'
  const subject = supportAccounts.find(account => account.role === role)!
  const fixture = await accountSupportUI(page)
  const records = deanRecordData()
  const directory = { instructors: [{ id: 'teacher-a', name: 'Alex Sample Instructor', status: 'active', email: 'teacher@example.invalid' }], students: [], irregular: [] }
  const institutional = [
    { kind: 'course_terms', record_key: 'IT 102|1st Semester|2026-2027', data: { CourseCode: 'IT 102', CourseTitle: 'Programming foundations', Units: '3', AcademicYear: '2026-2027', Semester: '1st Semester' } },
    { kind: 'loads', record_key: 'course:IT 102:teacher-a', data: { CourseCode: 'IT 102', InstructorID: 'teacher-a', InstructorName: 'Alex Sample Instructor', LoadType: 'course', AcademicYear: '2026-2027', Semester: '1st Semester' } },
  ]
  let unavailable = true
  await page.route('**/api/ai?action=academic', async route => {
    if (route.request().method() !== 'GET' || route.request().headers()['x-edupulse-subject'] !== subject.id) return route.fallback()
    if (unavailable) return route.fulfill({ status: 503, json: { error: { code: 'ACADEMIC_UNAVAILABLE', message: retryMessage } } })
    return route.fulfill({ json: { ...records, institutional, directory, ...(role === 'associate_dean' ? { attempts: [], accesses: [] } : {}) } })
  })

  await page.goto('/#/dashboard')
  await page.locator('section.card').filter({ has: page.getByRole('heading', { name: 'Role coverage', exact: true }) })
    .getByText(title, { exact: true }).locator('..').getByRole('button', { name: 'Open view', exact: true }).click()
  await page.getByRole('button', { name: 'View ' + subject.name, exact: true }).click()
  await expect(page.getByRole('heading', { name: title + ' Dashboard', exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText(retryMessage)
  await expect(page.getByLabel('Switch admin view', { exact: true })).toHaveText('Admin · ' + title)
  unavailable = false
  await page.getByRole('button', { name: 'Retry connection', exact: true }).click()

  const instructor = page.getByRole('article', { name: 'Alex Sample Instructor', exact: true })
  await expect(instructor).toContainText('Programming foundations')
  await expect(instructor.getByRole('button', { name: 'Assign course to Alex Sample Instructor' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Account menu', exact: true })).toHaveAttribute('title', subject.name)
  const savedPath = page.url()
  const writes = () => fixture.calls.filter(call => call.method === 'POST' && ['support', 'academic', 'workspace'].includes(call.action))
  const previousWrites = writes().length
  await page.reload()
  await expect(instructor).toBeVisible()
  await expect(page).toHaveURL(savedPath)
  await expect(page.getByLabel('Switch admin view', { exact: true })).toHaveText('Admin · ' + title)
  expect(writes()).toHaveLength(previousWrites)
  expect(fixture.calls.some(call => call.action === 'support' && call.method === 'GET' && call.lookupSubject === subject.id)).toBe(true)
  await shot(role === 'dean' ? 'admin-dean-dashboard' : 'admin-coordinator-dashboard')
}
