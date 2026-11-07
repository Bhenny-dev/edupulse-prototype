import { test as base, expect } from '@playwright/test'
export { expect, type Page, type Locator } from '@playwright/test'

// Applies to every capture suite, including mobile, manual and upload flows.
export const test = base.extend({
  page: async ({ page }, runCapture, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    if (process.env.SNAPSHOT_UI_ONLY === '1') await page.route('**/api/ai?*', route => {
      if (route.request().method() !== 'GET') return route.fallback()
      const action = new URL(route.request().url()).searchParams.get('action')
      // Lowest-priority read-only defaults. A suite's explicit transport always overrides these.
      if (action === 'health') return route.fulfill({ json: { version: 'synthetic-ui', provider: 'retrieval', ready: false, embeddings: false, message: 'UI capture transport', database: { ready: false, kind: 'synthetic' }, identity: { mode: 'synthetic', role: 'guest' } } })
      if (action === 'providers') return route.fulfill({ json: { connection: null, connections: [], models: [] } })
      if (action === 'conversations') return route.fulfill({ json: { threads: [], messages: [], memories: [], automaticMemory: true, mode: 'session' } })
      return route.fallback()
    })
    const problems: string[] = []
    page.on('pageerror', error => problems.push(`pageerror: ${error.message}`))
    page.on('console', message => {
      if (message.type() === 'error' && /Content Security Policy|Refused to/.test(message.text())) problems.push(`csp: ${message.text()}`)
    })
    await runCapture(page)
    await testInfo.attach('capture-problems', { body: JSON.stringify(problems), contentType: 'application/json' })
    expect(problems, 'capture must be free of page errors and CSP violations').toEqual([])
  },
})
