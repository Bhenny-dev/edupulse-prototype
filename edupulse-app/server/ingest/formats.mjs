// Untrusted-file extraction. This module runs inside a resource-limited worker
// with an empty environment (see sandbox.ts). It only reads the bytes it is
// given: no file paths, network fetches, scripts or embedded objects.

export const LIMITS = Object.freeze({ bytes: 4_000_000, pages: 300, characters: 400_000, zipEntries: 2_000, zipUncompressed: 60_000_000, zipRatio: 200, slides: 300 })
export const SUPPORTED = Object.freeze(['pdf', 'docx', 'pptx', 'html', 'markdown', 'text', 'csv'])

export class ExtractionError extends Error {
  /** @param {string} code @param {string} message */
  constructor(code, message) { super(message); this.name = 'ExtractionError'; this.code = code }
}

/** @param {Uint8Array} bytes @param {number} offset */
const u16 = (bytes, offset) => bytes[offset] | (bytes[offset + 1] << 8)
/** @param {Uint8Array} bytes @param {number} offset */
const u32 = (bytes, offset) => (u16(bytes, offset) + u16(bytes, offset + 2) * 65536)

/**
 * Reads the ZIP central directory without decompressing anything, so archive
 * bombs, encryption and ZIP64 are rejected before a parser touches the data.
 * @param {Uint8Array} bytes
 */
export function inspectZip(bytes) {
  let eocd = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) if (u32(bytes, i) === 0x06054b50) { eocd = i; break }
  if (eocd < 0) throw new ExtractionError('INVALID_ARCHIVE', 'The Office file is damaged: its ZIP directory is missing.')
  const count = u16(bytes, eocd + 10), size = u32(bytes, eocd + 12), offset = u32(bytes, eocd + 16)
  if (count === 0xffff || offset === 0xffffffff) throw new ExtractionError('UNSUPPORTED_ARCHIVE', 'ZIP64 archives are not accepted.')
  if (count > LIMITS.zipEntries) throw new ExtractionError('ARCHIVE_LIMIT', 'The Office file contains too many internal parts.')
  if (offset + size > eocd) throw new ExtractionError('INVALID_ARCHIVE', 'The Office file has an invalid ZIP directory.')
  /** @type {string[]} */
  const names = []
  let total = 0, cursor = offset
  for (let n = 0; n < count; n++) {
    if (u32(bytes, cursor) !== 0x02014b50) throw new ExtractionError('INVALID_ARCHIVE', 'The Office file has a damaged ZIP entry.')
    const flags = u16(bytes, cursor + 8), compressed = u32(bytes, cursor + 20), uncompressed = u32(bytes, cursor + 24)
    const nameLength = u16(bytes, cursor + 28), extra = u16(bytes, cursor + 30), comment = u16(bytes, cursor + 32)
    if (flags & 1) throw new ExtractionError('ENCRYPTED', 'Password-protected Office files cannot be read. Save an unprotected copy first.')
    if (uncompressed > 1_000_000 && uncompressed / Math.max(compressed, 1) > LIMITS.zipRatio) throw new ExtractionError('ARCHIVE_BOMB', 'The Office file expands to an unsafe size and was rejected.')
    total += uncompressed
    names.push(new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength)))
    cursor += 46 + nameLength + extra + comment
  }
  if (total > LIMITS.zipUncompressed) throw new ExtractionError('ARCHIVE_BOMB', 'The Office file expands beyond the 60 MB safety limit.')
  return { entries: count, uncompressed: total, names }
}

/**
 * Detects the real format from file content. The extension must agree, so a
 * renamed executable or archive cannot pass as a document.
 * @param {Uint8Array} bytes @param {string} fileName
 */
export function sniff(bytes, fileName) {
  const extension = (fileName.toLowerCase().match(/\.([a-z0-9]{1,8})$/) || [])[1] || ''
  if (!bytes.length) throw new ExtractionError('EMPTY_FILE', 'The file is empty.')
  if (bytes.length > LIMITS.bytes) throw new ExtractionError('FILE_TOO_LARGE', 'Files must be 4 MB or smaller.')
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 8))
  if (head.startsWith('%PDF-')) {
    if (extension !== 'pdf') throw new ExtractionError('TYPE_MISMATCH', 'This file contains PDF data but does not have a .pdf name.')
    return { kind: 'pdf', mime: 'application/pdf' }
  }
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4) {
    const zip = inspectZip(bytes)
    if (zip.names.includes('word/document.xml')) { if (extension !== 'docx') throw new ExtractionError('TYPE_MISMATCH', 'This Word document must use the .docx extension.'); return { kind: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', zip } }
    if (zip.names.includes('ppt/presentation.xml')) { if (extension !== 'pptx') throw new ExtractionError('TYPE_MISMATCH', 'This presentation must use the .pptx extension.'); return { kind: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', zip } }
    if (zip.names.includes('xl/workbook.xml')) throw new ExtractionError('UNSUPPORTED_TYPE', 'Spreadsheets are not indexed directly. Export the sheet as CSV.')
    throw new ExtractionError('UNSUPPORTED_TYPE', 'This ZIP archive is not a supported document.')
  }
  if (/^(doc|ppt|xls)$/.test(extension)) throw new ExtractionError('UNSUPPORTED_TYPE', 'Legacy Office formats (.doc, .ppt, .xls) are not supported. Save as .docx or .pptx.')
  if (bytes.subarray(0, 4096).includes(0) && !(bytes[0] === 0xff && bytes[1] === 0xfe) && !(bytes[0] === 0xfe && bytes[1] === 0xff)) throw new ExtractionError('UNSUPPORTED_TYPE', 'Binary files are not supported. Use PDF, DOCX, PPTX, HTML, TXT, Markdown or CSV.')
  const kinds = { txt: 'text', text: 'text', md: 'markdown', markdown: 'markdown', csv: 'csv', html: 'html', htm: 'html' }
  const kind = kinds[/** @type {keyof typeof kinds} */ (extension)]
  if (!kind) throw new ExtractionError('UNSUPPORTED_TYPE', 'Supported files: PDF, DOCX, PPTX, HTML, TXT, Markdown and CSV.')
  return { kind, mime: kind === 'html' ? 'text/html' : kind === 'csv' ? 'text/csv' : kind === 'markdown' ? 'text/markdown' : 'text/plain' }
}

/** @param {Uint8Array} bytes */
export function decodeText(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return { text: new TextDecoder('utf-16le').decode(bytes.subarray(2)), encoding: 'UTF-16LE' }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return { text: new TextDecoder('utf-16be').decode(bytes.subarray(2)), encoding: 'UTF-16BE' }
  try { return { text: new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes), encoding: 'UTF-8' } }
  catch { return { text: new TextDecoder('windows-1252').decode(bytes), encoding: 'Windows-1252 (fallback)' } }
}

const ENTITIES = /** @type {Record<string, string>} */ ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', copy: '©', reg: '®', bull: '•', middot: '·' })
/** @param {string} text */
export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi, (match, code) => {
    if (code[0] === '#') { const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10); return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '' }
    return ENTITIES[code.toLowerCase()] ?? match
  })
}

/**
 * Converts HTML (uploaded pages or mammoth DOCX output) into structured text:
 * Markdown headings, list bullets and pipe-separated table rows. Scripts,
 * styles and embedded objects are discarded, never executed.
 * @param {string} html
 */
export function htmlToStructuredText(html) {
  const body = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg|math|iframe|object|embed|head)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<(script|style|noscript|template|svg|math|iframe|object|embed|head)\b[^>]*\/?>/gi, ' ')
  const inline = (/** @type {string} */ inner) => inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return decodeEntities(body
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi, (_, level, inner) => `\n\n${'#'.repeat(Number(level))} ${inline(inner)}\n\n`)
    // Table cells become one line per row, even when cells contain paragraphs.
    .replace(/<t([dh])\b[^>]*>([\s\S]*?)<\/t\1\s*>/gi, (_, __, inner) => `${inline(inner)} | `)
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<\/tr\s*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|blockquote|ul|ol|table|li|pre|header|footer|figure|caption)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\| *\n/g, '\n')
    .replace(/\n /g, '\n')
}

/** @param {string} xml */
const xmlText = xml => decodeEntities(xml)

/** @param {Uint8Array} bytes */
async function extractPdf(bytes) {
  const { getDocumentProxy, extractText, getMeta } = await import('unpdf')
  // unpdf's serverless PDF.js build has no eval-based code path (PostScript
  // functions compile to WebAssembly), closing the CVE-2024-4367 class of font
  // exploits. Fonts are parsed for text only, never installed or rendered.
  const pdf = await getDocumentProxy(new Uint8Array(bytes), { disableFontFace: true, useSystemFonts: false, verbosity: 0 })
  try {
    if (pdf.numPages > LIMITS.pages) throw new ExtractionError('PAGE_LIMIT', `PDFs are limited to ${LIMITS.pages} pages. Split the document first.`)
    const [{ text }, meta] = await Promise.all([extractText(pdf, { mergePages: false }), getMeta(pdf).catch(() => ({ info: {} }))])
    const pages = text.map((page, index) => ({ page: index + 1, text: page }))
    const info = /** @type {Record<string, unknown>} */ (meta.info || {})
    return { pages, meta: { title: typeof info.Title === 'string' ? info.Title.slice(0, 200) : '', author: typeof info.Author === 'string' ? info.Author.slice(0, 200) : '', pageCount: pdf.numPages } }
  } finally { await pdf.loadingTask.destroy() }
}

/** @param {Uint8Array} bytes */
async function extractDocx(bytes) {
  const mammoth = (await import('mammoth')).default
  // Node's mammoth reads { buffer }; a { path } input is never used. Images are
  // never decoded and linked external files are never opened.
  const result = await mammoth.convertToHtml({ buffer: Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength) }, { externalFileAccess: false, ignoreEmptyParagraphs: true, convertImage: mammoth.images.imgElement(async () => ({ src: '' })) })
  return { text: htmlToStructuredText(result.value), meta: { messages: result.messages.length } }
}

/** @param {Uint8Array} bytes */
async function extractPptx(bytes) {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(bytes)
  const read = async (/** @type {string} */ path) => { const file = zip.file(path); return file ? file.async('string') : '' }
  const [presentation, rels] = await Promise.all([read('ppt/presentation.xml'), read('ppt/_rels/presentation.xml.rels')])
  /** @type {Record<string, string>} */
  const targets = {}
  for (const match of rels.matchAll(/<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"/g)) targets[match[1]] = match[2]
  for (const match of rels.matchAll(/<Relationship\b[^>]*\bTarget="([^"]+)"[^>]*\bId="([^"]+)"/g)) targets[match[2]] ??= match[1]
  // Slide order comes from the presentation's slide list, not file names.
  let order = [...presentation.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/g)].map(m => targets[m[1]]).filter(Boolean).map(t => `ppt/${t.replace(/^\/?ppt\//, '').replace(/^\.\.\//, '')}`)
  if (!order.length) order = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => Number(a.match(/\d+/g)?.pop()) - Number(b.match(/\d+/g)?.pop()))
  if (order.length > LIMITS.slides) throw new ExtractionError('PAGE_LIMIT', `Presentations are limited to ${LIMITS.slides} slides.`)
  const paragraphs = (/** @type {string} */ xml) => [...xml.matchAll(/<a:p\b[\s\S]*?<\/a:p>/g)].map(p => [...p[0].matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(t => xmlText(t[1])).join('')).map(s => s.trim()).filter(Boolean)
  const pages = []
  for (const [index, path] of order.entries()) {
    const slide = paragraphs(await read(path))
    const slideRels = await read(path.replace(/slides\/(slide\d+\.xml)$/, 'slides/_rels/$1.rels'))
    const notesTarget = slideRels.match(/Target="\.\.\/notesSlides\/(notesSlide\d+\.xml)"/)?.[1]
    const notes = notesTarget ? paragraphs(await read(`ppt/notesSlides/${notesTarget}`)).filter(line => !/^\d+$/.test(line)) : []
    const [title, ...rest] = slide
    pages.push({ page: index + 1, text: [title ? `## ${title}` : '', ...rest, notes.length ? `Speaker notes: ${notes.join(' ')}` : ''].filter(Boolean).join('\n') })
  }
  return { pages, meta: { slideCount: order.length } }
}

/**
 * Extracts structured text. Paged formats insert [[Page n]] / [[Slide n]]
 * markers so chunks keep their location for citations.
 * @param {Uint8Array} bytes @param {string} fileName
 */
export async function extractDocument(bytes, fileName) {
  const type = sniff(bytes, fileName)
  /** @type {{ page: number, text: string }[] | undefined} */
  let pages
  /** @type {Record<string, unknown>} */
  let meta = {}
  let text = ''
  if (type.kind === 'pdf') ({ pages, meta } = await extractPdf(bytes))
  else if (type.kind === 'pptx') ({ pages, meta } = await extractPptx(bytes))
  else if (type.kind === 'docx') ({ text, meta } = await extractDocx(bytes))
  else {
    const decoded = decodeText(bytes)
    meta = { encoding: decoded.encoding }
    text = type.kind === 'html' ? htmlToStructuredText(decoded.text) : decoded.text
  }
  if (pages) {
    const label = type.kind === 'pptx' ? 'Slide' : 'Page'
    text = pages.map(p => `[[${label} ${p.page}]]\n${p.text}`).join('\n\n')
  }
  if (text.length > LIMITS.characters) throw new ExtractionError('TEXT_LIMIT', 'The extracted text exceeds 400,000 characters. Split the document into smaller files.')
  const zip = 'zip' in type && type.zip ? { entries: type.zip.entries, uncompressed: type.zip.uncompressed } : null
  return { kind: type.kind, mime: type.mime, text, pageTexts: pages?.map(p => p.text.length) || [], meta, zip }
}
