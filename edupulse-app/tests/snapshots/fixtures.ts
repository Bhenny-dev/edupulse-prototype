import { test as base, expect } from '@playwright/test'
export { expect, type Page, type Locator } from '@playwright/test'

// Applies to every capture suite, including mobile, manual and upload flows.
export const test = base.extend({
  page: async ({ page }, runCapture, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
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
