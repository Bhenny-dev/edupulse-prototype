import type { OcrPage } from './ocrText'

export type OcrProgress = { done: number; total: number; page: number | null; status: string }
/** Scans are read page by page on the device; longer scans should be split. */
export const OCR_PAGE_LIMIT = 60
const READABLE = 20

/**
 * Reads the pages of a PDF that have no text layer, on this device: page images go only to a local
 * Tesseract worker and never to the server. The PDF is opened with the same eval-free PDF.js build
 * the server sandbox uses. Pages that already have text are left to the server's extraction.
 */
export async function ocrScannedPages(file: File, { signal, onProgress }: { signal: AbortSignal; onProgress: (progress: OcrProgress) => void }): Promise<{ pageCount: number; pages: OcrPage[] }> {
  const [{ getDocumentProxy, extractText, renderPageAsImage }, { createWorker, OEM }] = await Promise.all([import('unpdf'), import('tesseract.js')])
  // Served from this origin by the build (vite.config.js); the CSP blocks third-party scripts.
  const assets = new URL('/ocr/', window.location.origin).href
  const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()), { disableFontFace: true, useSystemFonts: false, verbosity: 0, wasmUrl: `${assets}pdf/` })
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null
  const aborted = new Promise<never>((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('OCR was cancelled.', 'AbortError')), { once: true }))
  aborted.catch(() => undefined)
  try {
    const { text } = await extractText(pdf, { mergePages: false })
    const scanned = text.map((page, index) => ({ page: index + 1, length: page.trim().length })).filter(page => page.length < READABLE).map(page => page.page)
    if (scanned.length > OCR_PAGE_LIMIT) throw new Error(`This scan has ${scanned.length} pages without text. OCR reads up to ${OCR_PAGE_LIMIT} pages at a time; split the PDF first.`)
    onProgress({ done: 0, total: scanned.length, page: null, status: 'Loading the OCR engine' })
    worker = await Promise.race([createWorker('eng', OEM.LSTM_ONLY, { workerPath: `${assets}worker.min.js`, corePath: assets, langPath: assets.replace(/\/$/, ''), workerBlobURL: false }), aborted])
    const pages: OcrPage[] = []
    for (const [index, number] of scanned.entries()) {
      signal.throwIfAborted()
      onProgress({ done: index, total: scanned.length, page: number, status: `Reading page ${number}` })
      const { width, height } = (await pdf.getPage(number)).getViewport({ scale: 1 })
      // About 300 dpi, the resolution Tesseract is trained for, capped so a poster-size page stays in memory.
      const image = await renderPageAsImage(pdf, number, { scale: Math.min(300 / 72, 3300 / Math.max(width, height)) })
      const { data } = await Promise.race([worker.recognize(new Blob([image], { type: 'image/png' })), aborted])
      pages.push({ page: number, text: data.text, confidence: data.confidence })
    }
    onProgress({ done: scanned.length, total: scanned.length, page: null, status: 'Checking the text' })
    return { pageCount: pdf.numPages, pages }
  } finally {
    await worker?.terminate()
    await pdf.loadingTask.destroy()
  }
}
