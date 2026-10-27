import { pdfLines, readRuledOutline, readRuledPolicies, readInstitutionalContext } from './pdfTableLayout'
/** Keep PDF lines and table columns instead of joining the whole page into one paragraph.
 * @param {File} file @param {(message: string) => void} [onProgress]
 */
export async function readPdfSyllabus(file, onProgress = () => {}) {
  const { getDocumentProxy, getResolvedPDFJS } = await import('unpdf')
  const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()), { verbosity: 0 })
  const pages = [], layouts = []
  const { OPS } = await getResolvedPDFJS()
  try {
    if (pdf.numPages > 60) throw new Error('Split syllabi longer than 60 pages before importing.')
    for (let number = 1; number <= pdf.numPages; number++) {
      onProgress(`Reading PDF page ${number} of ${pdf.numPages}…`)
      const page = await pdf.getPage(number)
      const content = await page.getTextContent(), operators = await page.getOperatorList()
      const boxes = operators.argsArray.flatMap((args, i) => {
        if (operators.fnArray[i] !== OPS.constructPath || !args[2]) return []
        const box = Array.from(args[2])
        return box.length === 4 ? [box] : []
      })
      const edges = boxes.filter(box => box[2]-box[0] < 2 && box[3]-box[1] > 4)
      const rules = boxes.filter(box => box[3]-box[1] < 2 && box[2]-box[0] > 4)
      const items = content.items.filter(item => 'str' in item)
      layouts.push({ number, items, edges, rules })
      pages.push(pdfLines(items).filter(line => !/COURSE SYLLABUS.*\bPAGE\s*\d|CIT.*College of Information Technology/i.test(line.text)).map(line=>line.text).join('\n'))
    }
  } finally { await pdf.loadingTask.destroy() }
  let scannedPages = 0
  if (pages.some(text => text.trim().length < 20)) {
    const { ocrScannedPages } = await import('../lib/ocr')
    const result = await ocrScannedPages(file, {
      signal: AbortSignal.timeout(300000),
      onProgress: progress => onProgress(progress.page ? `Reading scanned PDF page ${progress.page} with OCR…` : progress.status),
    })
    for (const page of result.pages) pages[page.page - 1] = page.text
    scannedPages = result.pages.length
  }
  const text = pages.join('\n')
  if (text.trim().length < 20) throw new Error('No readable syllabus text was found. Use a clearer PDF scan or a DOCX file.')
  if (text.length > 2_000_000) throw new Error('The extracted document is too large.')
  const table = readRuledOutline(layouts)
  if (scannedPages) table.warnings.push('OCR text needs comparison with the original scan, especially tables and mathematical notation.')
  return { text, scannedPages, ...table, policies: readRuledPolicies(layouts), institutionalContext: readInstitutionalContext(layouts) }
}
