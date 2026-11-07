import { test, expect } from './fixtures'
import { mkdir } from 'node:fs/promises'
import { reviewVoice, conversationVoice, languageVoice } from '../voice-quota-fixture'
const root = '../feature-documentation/system-manual/20-voice-and-provider-errors'
for (const [title, run] of [['review', reviewVoice], ['conversation', conversationVoice], ['language and permissions', languageVoice]] as const) {
  test(`voice and quota: ${title}`, async ({ page }) => {
    await mkdir(root, { recursive: true })
    if (title === 'review') expect((await page.request.get('/')).headers()['permissions-policy']).toContain('microphone=(self)')
    await run(page, async name => { await page.getByRole('dialog', { name: 'Pulse', exact: true }).screenshot({ path: `${root}/${name}.png`, animations: 'disabled' }) })
  })
}
test('voice controls on solid dark surfaces', async ({ page }) => {
  await mkdir(root, { recursive: true })
  await page.addInitScript(() => localStorage.setItem('edupulse-dark-mode', 'true'))
  await reviewVoice(page, async name => { if (name === '03-review-transcript') await page.getByRole('dialog', { name: 'Pulse', exact: true }).screenshot({ path: `${root}/08-voice-dark.png`, animations: 'disabled' }) })
})
