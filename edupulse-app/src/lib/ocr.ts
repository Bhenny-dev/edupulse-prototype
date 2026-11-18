import { imageScale,IMAGE_MAX_UPSCALE,inkOnWhite,scannedTableGrid,whiteBackground,type OcrGrid,type OcrPage } from './ocrText'

export type OcrProgress = { done: number; total: number; page: number | null; status: string }
/** Scans are read page by page on the device; longer scans should be split. */
export const OCR_PAGE_LIMIT = 60
const READABLE = 20
/** Pictures above this many pixels are refused: the canvas that prepares them would not fit in memory. */
const IMAGE_PIXEL_LIMIT = 50_000_000
/** Longest side of a ruled form read from a picture: what a 300 dpi scan of a page measures, as PDF pages are rendered. */
const TABLE_SIDE = 3300
// The engine files are served from this origin by the build (vite.config.js); the CSP blocks third-party scripts.
const workerOptions = (assets: string) => ({ workerPath: `${assets}worker.min.js`, corePath: assets, langPath: assets.replace(/\/$/, ''), workerBlobURL: false })

/**
 * Reads the pages of a PDF that have no text layer, on this device: page images go only to a local
 * Tesseract worker and never to the server. The PDF is opened with the same eval-free PDF.js build
 * the server sandbox uses. Pages that already have text are left to the server's extraction.
 */
export async function ocrScannedPages(file: File, { signal, onProgress }: { signal: AbortSignal; onProgress: (progress: OcrProgress) => void }): Promise<{ pageCount: number; pages: OcrPage[] }> {
  const [{ getDocumentProxy, extractText, renderPageAsImage }, { createWorker, OEM,PSM }] = await Promise.all([import('unpdf'), import('tesseract.js')])
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
    if (!scanned.length) return {pageCount:pdf.numPages,pages:[]}
    onProgress({ done: 0, total: scanned.length, page: null, status: 'Loading the OCR engine' })
    worker = await Promise.race([createWorker('eng', OEM.LSTM_ONLY, workerOptions(assets)), aborted])
    const pages: OcrPage[] = []
    for (const [index, number] of scanned.entries()) {
      signal.throwIfAborted()
      onProgress({ done: index, total: scanned.length, page: number, status: `Reading page ${number}` })
      const { width, height } = (await pdf.getPage(number)).getViewport({ scale: 1 })
      // About 300 dpi, the resolution Tesseract is trained for, capped so a poster-size page stays in memory.
      const image = await renderPageAsImage(pdf, number, { scale: Math.min(300 / 72, 3300 / Math.max(width, height)) })
      const blob=new Blob([image],{type:'image/png'}),bitmap=await createImageBitmap(blob)
      const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height
      const context=canvas.getContext('2d',{willReadFrequently:true})!
      context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0);bitmap.close()
      const grid=scannedTableGrid(context.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height)
      const ruled=isRuled(grid)
      const recognition=ruled?await withoutRules(canvas,context,grid):blob
      canvas.width=0;canvas.height=0
      await worker.setParameters({tessedit_pageseg_mode:ruled?PSM.SPARSE_TEXT:PSM.AUTO,preserve_interword_spaces:'1'})
      const { data } = await Promise.race([worker.recognize(recognition, {}, {text:true,blocks:true}), aborted])
      pages.push({ page: number, text: data.text, confidence: data.confidence,words:ocrWords(data),grid })
    }
    onProgress({ done: scanned.length, total: scanned.length, page: null, status: 'Checking the text' })
    return { pageCount: pdf.numPages, pages }
  } finally {
    await worker?.terminate()
    await pdf.loadingTask.destroy()
  }
}

/** A ruled form: enough rules for a header, one row and the columns between them. */
const isRuled = (grid: OcrGrid) => grid.horizontal.length >= 3 && grid.vertical.length >= 4
/**
 * The OCR copy of a ruled page with its rules painted out, so small numbers beside them are read as text rather than
 * discarded as line fragments. The detected grid is kept separately to place every word in its cell.
 */
function withoutRules(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, grid: OcrGrid) {
  const stroke = Math.max(3, Math.ceil(Math.max(canvas.width, canvas.height) / 550))
  context.fillStyle = '#fff'
  for (const x of grid.vertical) context.fillRect(x - stroke / 2, grid.horizontal[0] - stroke, stroke, grid.horizontal.at(-1)! - grid.horizontal[0] + 2 * stroke)
  for (const y of grid.horizontal) context.fillRect(grid.vertical[0] - stroke, y - stroke / 2, grid.vertical.at(-1)! - grid.vertical[0] + 2 * stroke, stroke)
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('The scanned table could not be prepared.')), 'image/png'))
}
type Recognized = { blocks?: { paragraphs: { lines: { baseline: { y1: number }; words: { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }[] }[] }[] }[] | null }
/** Each word with its box and line baseline, in the pixels of the image OCR read. */
const ocrWords = (data: Recognized) => (data.blocks || []).flatMap(block => block.paragraphs.flatMap(paragraph => paragraph.lines.flatMap(line => line.words.map(word => ({ text: word.text, ...word.bbox, baseline: line.baseline.y1 })))))

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
    const draw = (scale: number) => {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('This browser cannot prepare the picture for reading.')
      context.fillStyle = '#fff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.imageSmoothingQuality = 'high'
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
      return { canvas, context, pixels, grid: scannedTableGrid(pixels.data, canvas.width, canvas.height) }
    }
    const scale = imageScale(bitmap.width, bitmap.height)
    let picture = draw(scale)
    // A form or table (a screenshot of a teaching load, say) is read at the size scanned PDF pages are, about 300 dpi,
    // so the small print in its cells is legible; its grid places each word in its cell, as for a scanned page.
    const tableScale = Math.min(IMAGE_MAX_UPSCALE, TABLE_SIDE / Math.max(bitmap.width, bitmap.height))
    if (isRuled(picture.grid) && tableScale > scale * 1.05) { picture.canvas.width = 0; picture = draw(tableScale) }
    const { canvas, context, pixels, grid } = picture
    const ruled = isRuled(grid)
    // On white paper, light-gray print (the unit and hour digits of a printed load) is made black before reading.
    if (ruled && whiteBackground(pixels.data)) { inkOnWhite(pixels.data); context.putImageData(pixels, 0, 0) }
    const image = ruled ? await withoutRules(canvas, context, grid) : await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('This browser cannot prepare the picture for reading.')), 'image/png'))
    canvas.width = 0; canvas.height = 0
    status('Loading the OCR engine')
    const { createWorker, OEM, PSM } = await import('tesseract.js')
    worker = await Promise.race([createWorker('eng', OEM.LSTM_ONLY, workerOptions(new URL('/ocr/', window.location.origin).href)), aborted])
    status('Reading the text')
    if (!ruled) {
      const { data } = await Promise.race([worker.recognize(image), aborted])
      return { page: 1, text: data.text, confidence: data.confidence }
    }
    // Read as one block of lines, a ruled picture keeps the lone digits and the first characters of each cell that
    // sparse reading drops (measured on a screenshot of a CIT teaching load: all 8 rows, against none).
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK, preserve_interword_spaces: '1' })
    const { data } = await Promise.race([worker.recognize(image, {}, { text: true, blocks: true }), aborted])
    return { page: 1, text: data.text, confidence: data.confidence, words: ocrWords(data), grid }
  } finally {
    bitmap.close()
    await worker?.terminate()
  }
}
