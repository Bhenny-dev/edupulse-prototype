import type { Page } from '@playwright/test'
import { popularCultureDraft } from './operator-steps-fixture'

// UI transport only. Encryption, provider envelopes and source checking have a
// separate real-handler integration test; this never claims hosted inference.
export async function operatorStepsUI(page: Page, options: { hold?: boolean; terminalFailure?: boolean } = {}) {
  const requests: Record<string, any>[] = []
  let release = () => {}
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/ai?action=operator', async route => {
    const body = route.request().postDataJSON()
    requests.push(body)
    if (!body.continuation) return route.fulfill({ json: { pending: true, continuation: 'synthetic-research-checkpoint', generated: false } })
    if (options.terminalFailure || requests.length === 2) return route.abort('failed')
    if (options.hold) await gate
    if (body.continuation === 'synthetic-research-checkpoint') return route.fulfill({ json: { pending: true, continuation: 'synthetic-draft-checkpoint', generated: true } })
    return route.fulfill({ json: { patch: popularCultureDraft, generated: true, requiresConfirmation: true, sources: popularCultureDraft.onlineReferences, notes: ['Synthetic model and research transport for this test. New teaching content requires instructor review.'] } })
  })
  return { requests, release }
}
