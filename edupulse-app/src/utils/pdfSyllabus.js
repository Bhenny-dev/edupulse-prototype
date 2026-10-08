/** Keep PDF lines and table columns instead of joining the whole page into one paragraph. */
export async function readPdfSyllabus(file, onProgress = () => {}) {
  const { getDocumentProxy } = await import('unpdf')
  const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()), { verbosity: 0 })
  const pages = []
  try {
    if (pdf.numPages > 60) throw new Error('Split syllabi longer than 60 pages before importing.')
    for (let number = 1; number <= pdf.numPages; number++) {
      onProgress(`Reading PDF page ${number} of ${pdf.numPages}…`)
      const content = await (await pdf.getPage(number)).getTextContent()
      const rows = []
      for (const item of content.items) {
        if (!('str' in item) || !item.str.trim()) continue
        const y = item.transform[5], x = item.transform[4]
        let row = rows.find(value => Math.abs(value.y - y) < 3)
        if (!row) { row = { y, cells: [] }; rows.push(row) }
        row.cells.push({ x, end: x + item.width, text: item.str })
      }
      pages.push(rows.sort((a, b) => b.y - a.y).map(row => {
        const cells = row.cells.sort((a, b) => a.x - b.x)
        return cells.map((cell, index) => `${index ? cell.x - cells[index - 1].end > 18 ? '\t' : ' ' : ''}${cell.text}`).join('').trim()
      }).join('\n'))
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
  return { text, scannedPages }
}
