import { test, expect } from '@playwright/test'
import { reviewVoice, conversationVoice, languageVoice, voiceUI } from '../voice-quota-fixture'
test('dictation keeps mixed-language speech editable and requires Send', async ({ page }) => { await reviewVoice(page) })
test('voice conversation reads replies, resumes, navigates in Tagalog and stops on quota errors', async ({ page }) => { await conversationVoice(page) })
test('unsupported languages, denied microphone and panel closing stop audio safely', async ({ page }) => { await languageVoice(page) })
test('unsupported browser retains typed chat', async ({ page }) => {
  const { dialog } = await voiceUI(page, true)
  await expect(dialog).toContainText('Speech recognition is unavailable')
  await expect(dialog.getByRole('button', { name: 'Start listening' })).toHaveCount(0)
  await dialog.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('hello')
  await dialog.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(dialog).toContainText('Hi! What would you like')
})
