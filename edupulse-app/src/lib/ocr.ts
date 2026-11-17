import { imageScale, type OcrPage } from './ocrText'

export type OcrProgress = { done: number; total: number; page: number | null; status: string }
/** Scans are read page by page on the device; longer scans should be split. */
export const OCR_PAGE_LIMIT = 60
const READABLE = 20
/** Pictures above this many pixels are refused: the canvas that prepares them would not fit in memory. */
const IMAGE_PIXEL_LIMIT = 50_000_000
// The engine files are served from this origin by the build (vite.config.js); the CSP blocks third-party scripts.
const workerOptions = (assets: string) => ({ workerPath: `${assets}worker.min.js`, corePath: assets, langPath: assets.replace(/\/$/, ''), workerBlobURL: false })

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
    worker = await Promise.race([createWorker('eng', OEM.LSTM_ONLY, workerOptions(assets)), aborted])
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

const ocrQueue: { tail: Promise<unknown> } = { tail: Promise.resolve() }
/** One picture at a time: each reader holds an OCR engine in memory, and up to three pictures can be attached together. */
const inTurn = <T>(task: () => Promise<T>): Promise<T> => {
  const run = ocrQueue.tail.then(task, task)
  ocrQueue.tail = run.catch(() => undefined)
  return run
}

/**
 * Reads the text in a picture on this device. The picture is decoded to a canvas (any format the browser opens, turned
 * the way the camera held it, on white so transparent pixels are not black), scaled to a size OCR reads well and handed
 * to a local Tesseract worker. It is never uploaded.
 */
export function ocrImage(file: File, options: { signal: AbortSignal; onProgress: (progress: OcrProgress) => void }): Promise<OcrPage> {
  return inTurn(() => readPicture(file, options))
}

async function readPicture(file: File, { signal, onProgress }: { signal: AbortSignal; onProgress: (progress: OcrProgress) => void }): Promise<OcrPage> {
  const status = (text: string) => onProgress({ done: 0, total: 1, page: null, status: text })
  const stopped = () => new DOMException(signal.reason?.name === 'TimeoutError' ? 'Reading the picture took too long. Try a smaller or sharper picture.' : 'OCR was cancelled.', 'AbortError')
  const aborted = new Promise<never>((_, reject) => signal.addEventListener('abort', () => reject(stopped()), { once: true }))
  aborted.catch(() => undefined)
  status('Preparing the picture')
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(file)).catch(() => { throw new Error(`${file.name} could not be opened as a picture. Use a PNG, JPEG, WebP, GIF or BMP file.`) })
  let worker: Awaited<ReturnType<typeof import('tesseract.js').createWorker>> | null = null
  try {
    if (bitmap.width * bitmap.height > IMAGE_PIXEL_LIMIT) throw new Error(`${file.name} is too large to read here. Resize it to under 50 megapixels.`)
    signal.throwIfAborted()
    const scale = imageScale(bitmap.width, bitmap.height), width = Math.max(1, Math.round(bitmap.width * scale)), height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('This browser cannot prepare the picture for reading.')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, width, height)
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, width, height)
    const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('This browser cannot prepare the picture for reading.')), 'image/png'))
    status('Loading the OCR engine')
    const { createWorker, OEM } = await import('tesseract.js')
    worker = await Promise.race([createWorker('eng', OEM.LSTM_ONLY, workerOptions(new URL('/ocr/', window.location.origin).href)), aborted])
    status('Reading the text')
    const { data } = await Promise.race([worker.recognize(png), aborted])
    return { page: 1, text: data.text, confidence: data.confidence }
  } finally {
    bitmap.close()
    await worker?.terminate()
  }
}
