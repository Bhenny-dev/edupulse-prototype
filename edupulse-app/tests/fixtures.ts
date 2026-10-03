import JSZip from 'jszip'
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow } from 'docx'

// Real, standards-conformant files built in memory. Extraction tests read
// them through the same sandboxed parsers used for uploads; nothing is mocked.

/** A minimal PDF 1.4 with a genuine text layer (Helvetica, one content stream per page). */
export function makePdf(pages: string[][]): Uint8Array {
  const escape = (s: string) => s.replace(/[\\()]/g, m => `\\${m}`)
  const objects: string[] = []
  const pageIds = pages.map((_, i) => 3 + i * 2)
  const fontId = 3 + pages.length * 2
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`
  pages.forEach((lines, i) => {
    const content = `BT /F1 12 Tf 72 720 Td 16 TL ${lines.map(line => `(${escape(line)}) Tj T*`).join(' ')} ET`
    objects[pageIds[i]!] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${pageIds[i]! + 1} 0 R >>`
    objects[pageIds[i]! + 1] = `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`
  })
  objects[fontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  for (let id = 1; id < objects.length; id++) { offsets[id] = Buffer.byteLength(pdf, 'latin1'); pdf += `${id} 0 obj\n${objects[id]}\nendobj\n` }
  const xref = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new Uint8Array(Buffer.from(pdf, 'latin1'))
}

export async function makeDocx(): Promise<Uint8Array> {
  const cell = (text: string) => new TableCell({ children: [new Paragraph(text)] })
  const document = new Document({ sections: [{ children: [
    new Paragraph({ text: 'IT 102 Course Policy', heading: HeadingLevel.HEADING_1 }),
    new Paragraph('Late laboratory submissions lose ten percent of the score for each day of delay.'),
    new Paragraph({ text: 'Grading Components', heading: HeadingLevel.HEADING_2 }),
    new Table({ rows: [new TableRow({ children: [cell('Component'), cell('Weight')] }), new TableRow({ children: [cell('Laboratory exercises'), cell('40%')] }), new TableRow({ children: [cell('Major examinations'), cell('60%')] })] }),
  ] }] })
  return new Uint8Array(await Packer.toBuffer(document))
}

const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
const textBody = (paragraphs: string[]) => `<p:sp><p:txBody>${paragraphs.map(p => `<a:p><a:r><a:t>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</a:t></a:r></a:p>`).join('')}</p:txBody></p:sp>`

/** A PPTX whose presentation order differs from file names, with speaker notes on one slide. */
export async function makePptx(): Promise<Uint8Array> {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>')
  zip.file('ppt/presentation.xml', `<?xml version="1.0"?><p:presentation ${NS}><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId1"/></p:sldIdLst></p:presentation>`)
  zip.file('ppt/_rels/presentation.xml.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="slide" Target="slides/slide1.xml"/><Relationship Id="rId2" Type="slide" Target="slides/slide2.xml"/></Relationships>')
  zip.file('ppt/slides/slide2.xml', `<?xml version="1.0"?><p:sld ${NS}><p:cSld><p:spTree>${textBody(['Bounded Loops'])}${textBody(['A bounded loop runs a known number of times.', 'Its stopping condition is checked on every iteration.'])}</p:spTree></p:cSld></p:sld>`)
  zip.file('ppt/slides/_rels/slide2.xml.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId9" Type="notesSlide" Target="../notesSlides/notesSlide1.xml"/></Relationships>')
  zip.file('ppt/notesSlides/notesSlide1.xml', `<?xml version="1.0"?><p:notes ${NS}><p:cSld><p:spTree>${textBody(['Ask students to trace the counter by hand.', '1'])}</p:spTree></p:cSld></p:notes>`)
  zip.file('ppt/slides/slide1.xml', `<?xml version="1.0"?><p:sld ${NS}><p:cSld><p:spTree>${textBody(['Sentinel Loops'])}${textBody(['A sentinel loop stops when a special value & marker appears.'])}</p:spTree></p:cSld></p:sld>`)
  return new Uint8Array(await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }))
}

/** Overwrites a ZIP central-directory entry's declared uncompressed size (archive-bomb simulation). */
export function inflateDeclaredSize(zip: Uint8Array, declared: number) {
  const bytes = zip.slice()
  const view = new DataView(bytes.buffer)
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) !== 0x06054b50) continue
    const directory = view.getUint32(i + 16, true)
    view.setUint32(directory + 24, declared, true)
    return bytes
  }
  throw new Error('No ZIP directory found')
}
