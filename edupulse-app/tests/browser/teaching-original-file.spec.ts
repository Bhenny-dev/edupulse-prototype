import { test, expect, type Locator, type Page } from '@playwright/test'
import { instructorCourseUI } from '../instructor-course-fixture'
import { makePptx, PNG_PIXEL } from '../pptx-fixture'
import { makePdf } from '../fixtures'
import { approvedDocx, approvedLines } from '../approved-syllabus-fixture'

// A teaching material made from an uploaded file is shown as that file, not as the text read out of it.
type Upload = { name: string; mime: string; bytes: Uint8Array }
const ID = '4a5b6c7d-1111-4222-8333-444455556666'
const EXTRACTED = 'Extracted words from the uploaded file'

async function openMaterial(page: Page, file: Upload, options: { unavailable?: boolean } = {}) {
  const fixture = await instructorCourseUI(page)
  const workspace = fixture.getWorkspace() as any
  workspace.content.lesson.status = 'draft'
  workspace.content.lesson.content = { ...workspace.content.lesson.content, subtitle: 'Instructor teaching material', sections: [{ heading: 'Variables and named values', body: `${EXTRACTED}\n[[Slide 1]]` }], attachments: [{ name: file.name, path: `${ID}/${ID}/${file.name}`, size: file.bytes.length, mime: file.mime }] }
  fixture.setWorkspace(workspace)
  // The API hands out a short-lived signed address; the stored bytes come from that address.
  await page.route('**/api/ai?action=teaching-files', route => route.fulfill({ json: { url: `https://files.example.invalid/${encodeURIComponent(file.name)}?token=t&download=${encodeURIComponent(file.name)}` } }))
  await page.route('https://files.example.invalid/**', route => options.unavailable
    ? route.fulfill({ status: 403, body: 'denied', headers: { 'access-control-allow-origin': '*' } })
    : route.fulfill({ status: 200, body: Buffer.from(file.bytes), headers: { 'access-control-allow-origin': '*', 'content-type': 'application/octet-stream', 'content-disposition': `attachment; filename="${file.name}"` } }))
  await page.goto(`/#/courseware?course=${fixture.syllabus.id}`)
  await page.locator('[data-topic="variables"] > summary').click()
  await page.locator('.instructor-sequence-item').filter({ has: page.getByText('Variables lesson', { exact: true }) }).getByRole('button', { name: 'Open', exact: true }).click()
  return page.getByRole('dialog', { name: 'Variables lesson' })
}

const darkPixels = (canvas: Locator) => canvas.evaluate(element => {
  const target = element as HTMLCanvasElement, data = target.getContext('2d')!.getImageData(0, 0, target.width, target.height).data
  let dark = 0
  for (let index = 0; index < data.length; index += 4) if (data[index]! < 128 && data[index + 3]! > 0) dark++
  return dark
})
async function expectNotExtracted(dialog: Locator) {
  await expect(dialog.getByText(EXTRACTED)).toHaveCount(0)
  await expect(dialog.getByText('[[Slide 1]]')).toHaveCount(0)
  await expect(dialog.locator('.doc-viewer-page')).toHaveCount(0)
}

test('an uploaded PowerPoint is shown as its slides, drawn where the file puts them', async ({ page }) => {
  const dialog = await openMaterial(page, { name: 'lesson.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', bytes: await makePptx() })
  const first = dialog.locator('.slide-page[data-page="1"]')
  await expect(first).toHaveAttribute('data-drawn', 'true')
  await expectNotExtracted(dialog)
  await expect(dialog.getByRole('button', { name: 'Download PDF', exact: true })).toHaveCount(0)
  // Positions follow the file: the title and body come from the layout, the card, picture, group and table from the slide.
  const area = (await first.locator('.slide-stage').boundingBox())!, scale = area.width / 1280
  const near = (actual: number, expected: number, tolerance = 3) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
  const title = (await dialog.getByText('Variables and named values', { exact: true }).boundingBox())!
  near(title.x, area.x + (96 + 9.6) * scale)
  near(title.y + title.height / 2, area.y + 108 * scale, 4)
  const body = (await dialog.getByText('A variable stores a value', { exact: true }).boundingBox())!
  near(body.x, area.x + (96 + 9.6 + 36) * scale)
  await expect(dialog.getByText('Card text', { exact: true })).toHaveCSS('color', 'rgb(255, 255, 255)')
  await expect(first.locator('path[fill="#ff0000"]')).toHaveCount(1)
  const picture = first.locator('img')
  expect(await picture.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  const pictureBox = (await picture.boundingBox())!
  near(pictureBox.x, area.x + 800 * scale, 2); near(pictureBox.y, area.y + 384 * scale, 2); near(pictureBox.width, 160 * scale, 2)
  await expect(first.locator('td[colspan="2"]')).toContainText('Merged heading')
  const left = (await dialog.getByText('Left cell', { exact: true }).boundingBox())!, right = (await dialog.getByText('Right cell', { exact: true }).boundingBox())!
  expect(right.x).toBeGreaterThan(left.x + 100 * scale)
  // The second slide has its own background, a numbered list that restarts, and the slide number.
  const second = dialog.locator('.slide-page[data-page="2"]')
  await second.scrollIntoViewIfNeeded()
  await expect(second).toHaveAttribute('data-drawn', 'true')
  await expect(second.locator('.slide-stage')).toHaveCSS('background-color', 'rgb(255, 243, 196)')
  await expect(second.locator('p span[aria-hidden="true"]')).toHaveText(['1.', '2.', 'a)'])
  await expect(second.getByText('Slide 2')).toBeVisible()
  const download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Download original', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('lesson.pptx')
})

test('an uploaded PDF is shown as its pages and Edit text still reaches the extracted text', async ({ page }) => {
  const dialog = await openMaterial(page, { name: 'notes.pdf', mime: 'application/pdf', bytes: makePdf([['Original first page'], ['Original second page']]) })
  const sheet = dialog.locator('.retained-page[data-drawn="true"]').first()
  await expect(sheet).toBeVisible()
  expect(await darkPixels(sheet.locator('canvas'))).toBeGreaterThan(100)
  await expect(dialog.locator('.retained-page')).toHaveCount(2)
  await expectNotExtracted(dialog)
  await dialog.getByRole('button', { name: 'Edit text', exact: true }).click()
  await expect(dialog.getByLabel('Section 1 content')).toHaveValue(new RegExp(EXTRACTED))
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(dialog.locator('.retained-page[data-drawn="true"]').first()).toBeVisible()
  await expectNotExtracted(dialog)
})

test('a Word file and a picture are shown as themselves', async ({ page }) => {
  const word = await approvedDocx()
  const dialog = await openMaterial(page, { name: word.name, mime: word.mimeType, bytes: word.buffer })
  await expect(dialog.locator('iframe.retained-word')).toHaveAttribute('sandbox', '')
  await expect(dialog.frameLocator('iframe.retained-word').getByText(approvedLines[2]!)).toBeVisible()
  await expectNotExtracted(dialog)
})

test('a picture upload is drawn as the picture', async ({ page }) => {
  const dialog = await openMaterial(page, { name: 'diagram.png', mime: 'image/png', bytes: PNG_PIXEL })
  const picture = dialog.locator('img.retained-image')
  await expect(picture).toBeVisible()
  expect(await picture.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBe(1)
  await expectNotExtracted(dialog)
})

test('when the stored file cannot be opened the extracted text stands in and the original stays downloadable', async ({ page }) => {
  const dialog = await openMaterial(page, { name: 'lesson.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', bytes: await makePptx() }, { unavailable: true })
  await expect(dialog.getByRole('alert').filter({ hasText: 'could not be displayed here' })).toBeVisible()
  await expect(dialog.getByText(EXTRACTED)).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'lesson.pptx', exact: true })).toBeVisible()
})
