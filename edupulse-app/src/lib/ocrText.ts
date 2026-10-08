// Pure helpers for OCR text. Kept free of browser APIs so they are unit-tested in Node.

export type OcrPage = { page: number; text: string; confidence: number }
export type OcrSummary = { pages: number; read: number; blank: number[]; confidence: number; low: { page: number; confidence: number }[] }

/** Pages whose OCR confidence is below this are named in the review so the instructor checks them. */
export const LOW_CONFIDENCE = 70
// The same threshold the server uses for a page "without text".
const READABLE = 20
const MARKER = /^\[\[Page (\d{1,4})\]\]$/

/** Tesseract's text with trailing spaces removed and runs of blank lines collapsed. */
export function tidyOcrText(text: string) {
  return text.replace(/\r\n?/g, '\n').split('\n').map(line => line.replace(/\s+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * Puts each OCR page under its own [[Page n]] marker so indexed passages keep their page for citations.
 * OCR reads everything visible on a page, so it replaces that page's few extracted characters; a page
 * where OCR found nothing keeps what it had. Pages with a text layer, and any text before the first
 * marker, are kept unchanged. Markers removed while editing are restored in page order.
 */
export function mergePageText(text: string, pages: OcrPage[]) {
  const intro: string[] = [], byPage = new Map<number, string[]>()
  let current: number | null = null
  for (const line of text.split('\n')) {
    const marker = line.trim().match(MARKER)
    if (marker) { current = Number(marker[1]); if (!byPage.has(current)) byPage.set(current, []); continue }
    if (current === null) intro.push(line)
    else byPage.get(current)!.push(line)
  }
  for (const page of pages) {
    const body = tidyOcrText(page.text)
    if (body) byPage.set(page.page, [body])
    else if (!byPage.has(page.page)) byPage.set(page.page, [])
  }
  const body = [...byPage].sort(([a], [b]) => a - b).map(([page, lines]) => [`[[Page ${page}]]`, lines.join('\n').trim()].filter(Boolean).join('\n'))
  return [intro.join('\n').trim(), ...body].filter(Boolean).join('\n\n')
}

export function summarizeOcr(pages: OcrPage[]): OcrSummary {
  const read = pages.filter(page => tidyOcrText(page.text).length >= READABLE)
  return {
    pages: pages.length, read: read.length,
    blank: pages.filter(page => !read.includes(page)).map(page => page.page),
    confidence: read.length ? Math.round(read.reduce((n, page) => n + page.confidence, 0) / read.length) : 0,
    low: read.filter(page => page.confidence < LOW_CONFIDENCE).map(page => ({ page: page.page, confidence: Math.round(page.confidence) })),
  }
}
