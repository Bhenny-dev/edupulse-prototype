import { test, expect, type Page } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { makeScannedPdf } from '../fixtures.js'
import { PAGES, scanPage, score } from '../scans.js'

// Scanned course pages are read through the real Knowledge library and scored against their ground truth.
const pageText = (text: string, page: number) => text.split(/^\[\[Page \d+\]\]$/m)[page] || ''
const results: Record<string, unknown>[] = []

async function openLibrary(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  await page.getByRole('button', { name: 'AI and knowledge settings' }).click()
  await expect(page.getByRole('heading', { name: 'Knowledge library' })).toBeVisible()
}
async function upload(page: Page, name: string, pdf: Uint8Array) {
  await page.getByLabel('Choose documents to upload').setInputFiles({ name, mimeType: 'application/pdf', buffer: Buffer.from(pdf) })
}
async function reviewedText(page: Page, name: string) {
  await page.getByText(/Review or correct the extracted text/).click()
  return page.getByLabel(`Extracted text of ${name}`).inputValue()
}

test.describe('OCR for scanned PDFs', () => {
  test.describe.configure({ timeout: 300000 })
  test.skip(({ isMobile }) => isMobile, 'OCR runs the same code at every viewport; the desktop run covers it.')
  test.beforeEach(async ({ request }) => {
    // Clear only this suite's documents in its isolated local test workspace.
    const health = await (await request.get('/api/ai?action=health')).json()
    expect(health.identity.mode).toBe('local-workspace')
    const library = await (await request.get('/api/ai?action=documents')).json()
    for (const document of library.documents || []) if (/^(?:week5-scan|week6-mixed|eval-\d+(?:-degraded)?)\.pdf$/.test(document.file_name || '')) {
      expect((await request.delete('/api/ai?action=documents', { data: { id: document.id } })).status()).toBe(200)
    }
  })
  test.afterAll(async () => {
    if (!process.env.OCR_EVAL_OUT || !results.length) return
    await mkdir(process.env.OCR_EVAL_OUT, { recursive: true })
    await writeFile(`${process.env.OCR_EVAL_OUT}/ocr-accuracy.json`, `${JSON.stringify({ generatedAt: new Date().toISOString(), engine: 'tesseract.js 7.0.0, eng 4.0.0_best_int, LSTM', results }, null, 2)}\n`)
  })

  test('a fully scanned PDF is read on the device, page by page, and indexes with its page markers', async ({ page, browser }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    const pdf = makeScannedPdf(await Promise.all(PAGES.map(async p => ({ jpeg: await scanPage(browser, p, { dpi: 300, degraded: false }) }))))
    await openLibrary(page)
    await upload(page, 'week5-scan.pdf', pdf)
    await expect(page.getByText(/no text layer, so it is probably a scan/)).toBeVisible({ timeout: 60000 })
    await page.getByRole('button', { name: 'Read with OCR' }).click()
    await expect(page.getByText('OCR read 2 of 2 scanned pages on this device')).toBeVisible({ timeout: 240000 })
    const text = await reviewedText(page, 'week5-scan.pdf')
    expect(text).toMatch(/^\[\[Page 1\]\]\n[\s\S]*\n\[\[Page 2\]\]\n/)
    for (const [i, truth] of PAGES.entries()) {
      const result = score(pageText(text, i + 1), truth)
      results.push({ case: 'scanned PDF, 300 dpi', page: i + 1, ...result })
      expect(result.wer, `page ${i + 1} word error rate`).toBeLessThanOrEqual(0.05)
    }
    await page.getByRole('button', { name: 'Index document' }).click()
    await expect(page.getByText(/Indexed \d+ passages from 2 pages/)).toBeVisible({ timeout: 60000 })
    expect(errors).toEqual([])
  })

  test('in a mixed PDF only the page without text is read with OCR; the text-layer page is kept exactly', async ({ page, browser }) => {
    const textPage = ['Week 6 covers arrays and their indexes.', 'An array stores values of one type in consecutive positions.']
    const pdf = makeScannedPdf([{ lines: textPage }, { jpeg: await scanPage(browser, PAGES[1]!, { dpi: 200, degraded: true }) }])
    await openLibrary(page)
    await upload(page, 'week6-mixed.pdf', pdf)
    await expect(page.getByText('1 of 2 pages have no text layer.', { exact: false })).toBeVisible({ timeout: 60000 })
    await page.getByRole('button', { name: 'Read that page with OCR' }).click()
    await expect(page.getByText('OCR read 1 of 1 scanned page on this device')).toBeVisible({ timeout: 240000 })
    const text = await reviewedText(page, 'week6-mixed.pdf')
    expect(pageText(text, 1)).toContain(textPage.join('\n'))
    const result = score(pageText(text, 2), PAGES[1]!)
    results.push({ case: 'mixed PDF, scanned page at 200 dpi, degraded', page: 2, ...result })
    expect(result.wer, 'degraded page word error rate').toBeLessThanOrEqual(0.1)
  })

  // Accuracy across scan quality, for the evaluation record only (OCR_EVAL_OUT=<folder>).
  for (const scan of [{ dpi: 300, degraded: true }, { dpi: 200, degraded: false }, { dpi: 150, degraded: false }, { dpi: 150, degraded: true }]) {
    test(`evaluation: ${scan.dpi} dpi${scan.degraded ? ', degraded' : ''}`, async ({ page, browser }) => {
      test.skip(!process.env.OCR_EVAL_OUT, 'Evaluation runs only when OCR_EVAL_OUT is set.')
      const name = `eval-${scan.dpi}${scan.degraded ? '-degraded' : ''}.pdf`
      await openLibrary(page)
      await upload(page, name, makeScannedPdf(await Promise.all(PAGES.map(async p => ({ jpeg: await scanPage(browser, p, scan) })))))
      await page.getByRole('button', { name: 'Read with OCR' }).click()
      await expect(page.getByText(/OCR read \d of 2 scanned pages on this device/)).toBeVisible({ timeout: 240000 })
      const text = await reviewedText(page, name)
      for (const [i, truth] of PAGES.entries()) results.push({ case: `scanned PDF, ${scan.dpi} dpi${scan.degraded ? ', degraded' : ''}`, page: i + 1, ...score(pageText(text, i + 1), truth) })
    })
  }
})
