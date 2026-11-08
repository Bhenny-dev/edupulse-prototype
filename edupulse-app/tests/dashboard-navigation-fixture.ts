import type { Page } from '@playwright/test'
import { unifiedCoursewareUI, unifiedWorkspace } from './courseware-unified-fixture'

// Synthetic owner workspace: active courses with mixed content, plus an unfinished syllabus.
export async function dashboardNavigationUI(page: Page) {
  const fixture = await unifiedCoursewareUI(page)
  const workspace = unifiedWorkspace()
  fixture.setWorkspace({ ...workspace, syllabi: [...workspace.syllabi, { ...workspace.syllabi[0], id: 'unfinished-syllabus', courseCode: 'IT 104', courseTitle: 'Research Methods', status: 'drafted' }] })
  return fixture
}
