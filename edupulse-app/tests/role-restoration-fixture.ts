import type { Page } from '@playwright/test'
import { academicUI } from './academic-ui-fixture'
import type { AcademicData } from '../src/components/academic/academicData'

export const roleRecords: AcademicData = {
  courses: [{ id: 'a'.repeat(32), course_code: 'IT 102', course_title: 'Computer Programming 1', instructor_id: 'synthetic-instructor', active: true, source_revision: 4 }],
  publications: [
    { id: 'b'.repeat(32), course_id: 'a'.repeat(32), active: true, type: 'material', week: 1, title: 'Variables lesson', source_version: 'v1', content: { sections: [{ heading: 'Variables', body: 'A variable stores a value.\nUse a descriptive name.' }, { heading: 'Practice', body: 'Declare a variable for a learner name.' }] } },
    ...['Variables quiz', 'Functions quiz', 'Arrays quiz'].map((title, index) => ({ id: String(index + 1).repeat(32), course_id: 'a'.repeat(32), active: true, type: 'assessment', week: index + 1, title, source_version: 'v1', content: { questions: [1, 2, 3].map(number => ({ text: `Synthetic question ${number}`, options: ['Option A', 'Option B', 'Option C', 'Option D'] })) } })),
  ],
  enrollments: [
    { course_id: 'a'.repeat(32), student_email: 'ui.fixture@example.invalid', display_name: 'Synthetic learner', student_ref: 'SYN-001', block_section: 'BSIT-1A' },
    { course_id: 'a'.repeat(32), student_email: 'second@example.invalid', display_name: 'Synthetic second learner', student_ref: 'SYN-002', block_section: 'BSIT-1B' },
  ],
  attempts: [1, 2, 3].map((index) => ({ id: `attempt-${index}`, publication_id: String(index).repeat(32), source_version: 'v1', student_id: 'synthetic-learner', student_email: 'ui.fixture@example.invalid', score: index, max_score: 3, submitted_at: `2026-10-${24 + index}T03:00:00Z` })),
  accesses: [],
}
export async function restorationUI(page: Page, role = 'instructor') {
  const records = structuredClone(roleRecords)
  if (role === 'student') records.enrollments = records.enrollments.slice(0, 1)
  if (role === 'associate_dean') { records.attempts = []; records.accesses = [] }
  await academicUI(page, async () => ({ json: records }), role)
  let revision = 0
  let workspace: Record<string, unknown> = { syllabi: [], content: {}, registrations: [] }
  await page.route('**/api/ai?action=workspace', async route => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON()
      if (body.revision !== revision) return route.fulfill({ status: 409, json: { error: { code: 'WORKSPACE_CONFLICT', message: 'Revision conflict' } } })
      workspace = body.data; revision++
    }
    return route.fulfill({ json: { revision, data: workspace, mode: 'cloud' } })
  })
  await page.route('**/api/ai?action=academic', async route => {
    if (route.request().method() === 'POST') {
      const command = route.request().postDataJSON()
      if (command.operation === 'open') { records.accesses.push({ publication_id: command.publication, student_email: 'ui.fixture@example.invalid', first_opened_at: '2026-10-28T02:00:00Z' }); return route.fulfill({ json: { saved: true } }) }
    }
    return route.fulfill({ json: records })
  })
  return { records, getWorkspace: () => workspace }
}
