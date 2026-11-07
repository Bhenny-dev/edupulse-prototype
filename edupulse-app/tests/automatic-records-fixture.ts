import { expect, type Page } from '@playwright/test'
import { directoryFixture } from './student-directory-fixture'
import { academicUI } from './academic-ui-fixture'

export const RECORD_OWNER = 'fe67b9d2-719b-4b10-91cd-76031ab115fe'
export async function automaticRecordsUI(page: Page, role = 'instructor') {
  await directoryFixture(page)
  if (role !== 'instructor') await academicUI(page, async () => ({ json: {} }), role)
  if (role === 'admin') {
    await page.route('https://*.supabase.co/rest/v1/rpc/edupulse_admin_overview', route => route.fulfill({ json: { accounts: [], appEvents: [], authEvents: [] } }))
    await page.route('https://*.supabase.co/rest/v1/rpc/edupulse_admin_agent_activity', route => route.fulfill({ json: { totals: { runs: 0, declined: 0, failed: 0, avgMs: 0 }, byAgent: [], byRule: [], recent: [] } }))
  }
  let workspace = { revision: 1, mode: 'cloud', data: { syllabi: [{ id: 'synthetic-roster-syllabus', courseCode: 'IT 102', courseTitle: 'Computer Programming 1', instructorId: RECORD_OWNER, status: 'drafted', version: 1, courseOutline: [{ week: 1, contents: ['Variables'], ilos: 'Explain variables.' }] }], content: {}, registrations: [{ id: 'synthetic-roster', uploadedBy: RECORD_OWNER, courseCode: 'IT 102', courseTitle: 'Computer Programming 1', blockSection: 'BSIT-1A', status: 'active', studentCount: 1, students: [{ StudentID: 'SYN-001', Name: 'Synthetic learner', Email: 'learner@example.invalid' }] }] } }
  let records: any = { courses: [{ id: 'a'.repeat(32), instructor_id: RECORD_OWNER, course_code: 'IT 102', course_title: 'Computer Programming 1', active: false, source_revision: 1, syllabus_status: 'drafted' }], enrollments: [], publications: [], attempts: [], accesses: [], institutional: [], faculty: [], notices: [], events: [{ id: 'synthetic-event', kind: 'workspace', title: 'Synthetic saved activity', detail: 'Saved course draft', created_at: '2026-11-07T04:00:00Z' }] }
  let gets = 0, syncs = 0, puts = 0, business = 0, failRead = false, failSave = false, nextGate: Promise<void> | null = null
  await page.route('**/api/ai?*', async route => {
    const action = new URL(route.request().url()).searchParams.get('action'), method = route.request().method()
    if (action === 'academic') {
      if (method === 'POST') { if (route.request().postDataJSON().operation !== 'sync') { business++; throw new Error('Background refresh must never submit a business command') } syncs++; return route.fulfill({ json: { synced: true } }) }
      gets++
      const response = structuredClone(records), gate = nextGate; nextGate = null
      if (gate) await gate
      if (failRead) return route.fulfill({ status: 503, json: { error: { code: 'ACADEMIC_UNAVAILABLE', message: 'Synthetic record connection unavailable.' } } })
      return route.fulfill({ json: response })
    }
    if (action === 'workspace') {
      if (method === 'PUT') {
        puts++
        if (failSave) return route.fulfill({ status: 503, json: { error: { code: 'WORKSPACE_UNAVAILABLE', message: 'Synthetic save was not confirmed.' } } })
        const input = route.request().postDataJSON()
        if (input.revision !== workspace.revision) return route.fulfill({ status: 409, json: { error: { code: 'WORKSPACE_CONFLICT', message: 'Synthetic revision conflict. Pending edits preserved.' } } })
        workspace = { ...workspace, revision: workspace.revision + 1, data: input.data }
      }
      return route.fulfill({ json: workspace })
    }
    if (action === 'health') return route.fulfill({ json: { version: 'synthetic-ui', provider: 'retrieval', ready: false, embeddings: false, message: 'Synthetic UI transport', database: { ready: true, kind: 'synthetic' }, identity: { mode: 'account', role } } })
    if (action === 'providers') return route.fulfill({ json: { connection: null, connections: [], models: [] } })
    if (action === 'conversations') return route.fulfill({ json: { threads: [], memories: [], automaticMemory: true } })
    if (['chat', 'courseware', 'operator'].includes(action || '')) { business++; return route.fulfill({ status: 503, json: { error: { code: 'UNEXPECTED_MODEL_CALL', message: 'This fixture must not invoke AI.' } } }) }
    return route.fallback()
  })
  return { counts: () => ({ gets, syncs, puts, business }), workspace: () => workspace, setRecords: (value: any) => { records = value }, records: () => records, failRead: (value: boolean) => { failRead = value }, failSave: (value: boolean) => { failSave = value }, holdRead: () => { let release!: () => void; nextGate = new Promise<void>(resolve => { release = resolve }); return release } }
}

export async function addDirectoryStudent(page: Page) {
  await page.getByRole('button', { name: 'Choose students', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Select Riley Demo', exact: true }).check()
  await page.getByLabel('Course for selected students', { exact: true }).selectOption('IT 102')
  await page.getByRole('textbox', { name: 'Block section', exact: true }).fill('BSIT-1A')
  await page.getByRole('button', { name: 'Register selected students (1)', exact: true }).click()
}
export async function rosterWorkflow(page: Page, shot: (name: string) => Promise<void> = async () => {}) {
  const fixture = await automaticRecordsUI(page)
  await page.goto('/#/student-monitoring')
  await expect(page.getByRole('region', { name: 'Course students' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Records up to date' })).toBeVisible()
  await shot('01-course-students')
  await addDirectoryStudent(page)
  const row = page.getByRole('region', { name: 'Enrolled students table' }).getByRole('row').filter({ hasText: 'Riley Demo' })
  await expect(row).toContainText('BSIT-1A')
  await page.reload()
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: /^Actions for/ }).click()
  await page.getByRole('menuitem', { name: 'Change block', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Change student block', exact: true })
  await dialog.getByLabel('New block section', { exact: true }).fill('BSIT-1B')
  await shot('02-change-block')
  await dialog.getByRole('button', { name: 'Save block assignment', exact: true }).click()
  await expect(dialog).toHaveCount(0); await expect(row).toContainText('BSIT-1B')
  await row.getByRole('button', { name: /^Actions for/ }).click()
  await page.getByRole('menuitem', { name: 'Remove from course', exact: true }).click()
  await shot('03-remove-membership')
  await page.getByRole('button', { name: 'Confirm removal', exact: true }).click()
  await expect(row).toHaveCount(0)
  await page.reload(); await expect(row).toHaveCount(0)
  expect((fixture.workspace().data as any).enrollmentOverrides.some((item: any) => item.studentEmail === 'student1@example.invalid' && item.excluded)).toBe(true)
  expect(fixture.counts().business).toBe(0)
}
