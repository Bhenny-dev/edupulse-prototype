import { test, expect, type Page } from '@playwright/test'

async function open(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto('/#/dashboard')
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  return page.getByRole('dialog', { name: 'Pulse', exact: true })
}
/** A real PNG with large dark text on white, drawn in the page so no binary fixture is kept in the repository. */
const picture = async (page: Page, lines: string[]) => Buffer.from((await page.evaluate(text => {
  const canvas = document.createElement('canvas')
  canvas.width = 1000; canvas.height = 120 + text.length * 90
  const context = canvas.getContext('2d')!
  context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#000'; context.font = 'bold 56px Arial, sans-serif'
  text.forEach((line, index) => context.fillText(line, 40, 100 + index * 90))
  return canvas.toDataURL('image/png')
}, lines)).split(',')[1]!, 'base64')

test('a picture attached to the chat is accepted by the file chooser and its text is read by OCR on this device', async ({ page }) => {
  test.setTimeout(180_000)
  const pulse = await open(page)
  // The chooser offers pictures as well as documents, so they are not filtered out of the picker.
  const accept = (await pulse.locator('input[type="file"]').getAttribute('accept'))!.split(',')
  for (const type of ['.pdf', '.csv', 'image/png', 'image/jpeg', '.png', '.jpg', '.webp']) expect(accept).toContain(type)

  const sent: { attachments?: { title: string; text: string }[] }[] = []
  page.on('request', request => { if (request.method() === 'POST' && request.url().includes('/api/ai')) { try { sent.push(request.postDataJSON()) } catch { /* not JSON */ } } })
  await pulse.locator('input[type="file"]').setInputFiles({ name: 'board photo.png', mimeType: 'image/png', buffer: await picture(page, ['Week 5 Quiz', 'Network Security']) })
  await expect(pulse.getByText(/board photo\.png \(OCR\) · text read by OCR, \d+% confidence/)).toBeVisible({ timeout: 150_000 })

  await pulse.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('What does this picture say?')
  await pulse.getByRole('button', { name: 'Send', exact: true }).click()
  await expect.poll(() => sent.find(body => body.attachments?.some(item => item.title === 'board photo.png (OCR)'))?.attachments?.[0]?.text ?? '', { timeout: 30_000 }).toMatch(/network/i)
  const text = sent.find(body => body.attachments?.length)!.attachments![0]!.text
  expect(text).toMatch(/security/i)
  expect(text).toMatch(/quiz/i)
})

test('a picture with no text is refused with a reason, and nothing is attached', async ({ page }) => {
  test.setTimeout(180_000)
  const pulse = await open(page)
  const blank = Buffer.from((await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 600; canvas.height = 300
    const context = canvas.getContext('2d')!
    context.fillStyle = '#fff'; context.fillRect(0, 0, 600, 300)
    return canvas.toDataURL('image/png')
  })).split(',')[1]!, 'base64')
  await pulse.locator('input[type="file"]').setInputFiles({ name: 'blank.png', mimeType: 'image/png', buffer: blank })
  await expect(pulse.getByText('No readable text was found in blank.png.', { exact: false })).toBeVisible({ timeout: 150_000 })
  await expect(pulse.getByText(/blank\.png \(OCR\)/)).toHaveCount(0)
})
