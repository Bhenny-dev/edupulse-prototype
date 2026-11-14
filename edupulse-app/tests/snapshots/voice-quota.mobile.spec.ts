import { test } from './fixtures'
import { mkdir } from 'node:fs/promises'
import { reviewVoice, pendingVoice, readReplyVoice } from '../voice-quota-fixture'
const root = '../feature-documentation/system-manual/20-voice-and-provider-errors'
for (const [title, run] of [['review', reviewVoice], ['transcription', pendingVoice]] as const) {
  test(`mobile voice and quota: ${title}`, async ({ page }) => {
    await mkdir(root, { recursive: true })
    await run(page, async name => { if (['03-review-transcript', '05-openai-credit-error'].includes(name)) await page.getByRole('dialog', { name: 'Pulse', exact: true }).screenshot({ path: `${root}/mobile-${name}.png`, animations: 'disabled' }) })
  })
}
test('mobile visible voice-over reply controls', async ({ page }) => {
  await readReplyVoice(page, async name => { await page.getByRole('dialog', { name: 'Pulse', exact: true }).screenshot({ path: `${root}/mobile-${name}.png`, animations: 'disabled' }) })
})
