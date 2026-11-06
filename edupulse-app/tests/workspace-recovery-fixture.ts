import type { Page } from '@playwright/test'
import { baselineUI, baselineWorkspace } from './baseline-fixture'

export const pendingExplanation = 'Pending instructor edit retained while the cloud save is unavailable.'
export async function workspaceRecoveryUI(page: Page, conflict = false) {
  await baselineUI(page)
  let remote = structuredClone(baselineWorkspace), revision = 0, failing = true
  await page.route('**/api/ai?action=workspace', async route => {
    if (route.request().method() === 'PUT') {
      if (failing) {
        if (conflict) revision = 1
        return route.fulfill({ status: conflict ? 409 : 503, json: { error: {
          code: conflict ? 'WORKSPACE_CONFLICT' : 'WORKSPACE_UNAVAILABLE',
          message: conflict ? 'A newer workspace exists. Pending edits remain on this device. Export them before loading the latest copy.' : 'Cloud save failed. Your edits remain on this device; retry when connected.',
        } } })
      }
      const body = route.request().postDataJSON()
      if (body.revision !== revision) return route.fulfill({ status: 409, json: { error: { code: 'WORKSPACE_CONFLICT', message: 'A newer workspace exists.' } } })
      remote = body.data; revision++
    }
    return route.fulfill({ json: { revision, data: remote, mode: 'cloud' } })
  })
  return { allowSave: () => { failing = false }, getSavedWorkspace: () => remote }
}

export async function causeWorkspaceSaveFailure(page: Page) {
  await page.goto('/#/courseware?course=baseline-syllabus&week=1')
  await page.locator('[data-content-id="baseline-quiz"]').getByRole('button', { name: 'View', exact: true }).click()
  await page.getByLabel('Question 1 explanation', { exact: true }).fill(pendingExplanation)
  await page.getByRole('button', { name: 'Save Assessment', exact: true }).click()
}
