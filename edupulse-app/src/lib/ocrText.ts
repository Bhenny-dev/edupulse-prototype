// Pure helpers for OCR text. Kept free of browser APIs so they are unit-tested in Node.

export type OcrGrid = { vertical:number[]; horizontal:number[] }
export type OcrPage = { page: number; text: string; confidence: number; words?: {text:string;x0:number;x1:number;y0:number;y1:number;baseline?:number}[]; grid?:OcrGrid }
/** Ruled form lines in the rendered scan. Text never supplies invented cell boundaries. */
export function scannedTableGrid(data:Uint8ClampedArray,width:number,height:number):OcrGrid {
  const dark=(x:number,y:number)=>{const i=(y*width+x)*4;return data[i]+data[i+1]+data[i+2]<420&&data[i+3]>128}
  const centers=(values:number[])=>{const groups:number[][]=[];for(const n of values){const last=groups.at(-1);if(last&&n-last.at(-1)!<4)last.push(n);else groups.push([n])}return groups.map(g=>Math.round(g.reduce((s,n)=>s+n,0)/g.length))}
  const rows:number[]=[]
  for(let y=0;y<height;y++){let count=0;for(let x=0;x<width;x++)if(dark(x,y))count++;if(count>width*.55)rows.push(y)}
  const horizontal=centers(rows)
  if(horizontal.length<3)return {horizontal:[],vertical:[]}
  const top=horizontal[0],bottom=horizontal.at(-1)!,cols:number[]=[]
  for(let x=0;x<width;x++){let count=0;for(let y=top;y<=bottom;y++)if(dark(x,y))count++;if(count>(bottom-top)*.75)cols.push(x)}
  return {horizontal,vertical:centers(cols)}
}
const luminance = (data: Uint8ClampedArray, i: number) => (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000
/** A screenshot or flatbed scan: most of it is near-white paper. A phone photo of paper is grayer and uneven. */
export function whiteBackground(data: Uint8ClampedArray) {
  let white = 0, seen = 0
  for (let i = 0; i < data.length; i += 16) { seen++; if (luminance(data, i) >= 235) white++ }
  return seen > 0 && white / seen > 0.6
}
/** Every pixel darker than the paper becomes black ink, so light-gray print reads as clearly as black (in place). */
export function inkOnWhite(data: Uint8ClampedArray, cut = 200) {
  for (let i = 0; i < data.length; i += 4) { const ink = luminance(data, i) < cut ? 0 : 255; data[i] = data[i + 1] = data[i + 2] = ink; data[i + 3] = 255 }
}
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

/** Longest side, in pixels, that OCR reads best: small screenshots are enlarged (at most three times), camera photos reduced. */
export const IMAGE_MIN_SIDE = 1600, IMAGE_MAX_SIDE = 4000, IMAGE_MAX_UPSCALE = 3
export function imageScale(width: number, height: number) {
  const longest = Math.max(width, height)
  if (!longest) return 1
  if (longest > IMAGE_MAX_SIDE) return IMAGE_MAX_SIDE / longest
  return longest < IMAGE_MIN_SIDE ? Math.min(IMAGE_MAX_UPSCALE, IMAGE_MIN_SIDE / longest) : 1
}
