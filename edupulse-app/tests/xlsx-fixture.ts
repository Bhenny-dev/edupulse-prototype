import JSZip from 'jszip'

const column = (index: number) => { let name = ''; for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + (n - 1) % 26) + name; return name }
const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
export type XlsxSheet = { name: string; rows: (string | number | null)[][] }

/** A small .xlsx with inline strings and numbers: the shape Excel saves, without styles. */
export async function buildXlsx(sheets: XlsxSheet[]) {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
  zip.file('xl/workbook.xml', `<workbook xmlns:r="r"><sheets>${sheets.map((s, i) => `<sheet name="${escape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`)
  zip.file('xl/_rels/workbook.xml.rels', `<Relationships>${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`)
  sheets.forEach((sheet, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, `<worksheet><sheetData>${sheet.rows.map((row, r) => row.some(c => c !== null && c !== '') ? `<row r="${r + 1}">${row.map((cell, c) => cell === null || cell === '' ? '' : typeof cell === 'number' ? `<c r="${column(c)}${r + 1}"><v>${cell}</v></c>` : `<c r="${column(c)}${r + 1}" t="inlineStr"><is><t>${escape(cell)}</t></is></c>`).join('')}</row>` : '').join('')}</sheetData></worksheet>`))
  return zip.generateAsync({ type: 'arraybuffer' })
}

/** The College's faculty-load sheet for one fictional instructor and one class. */
export async function teachingLoadXlsx(subject: [string, string] = ['IT 102', 'Programming foundations'], block = 'BLOCK A-1') {
  return Buffer.from(await buildXlsx([{ name: 'Faculty load', rows: [
    ['ALEX SAMPLE'],
    ['SC_ID', 'Descriptive Title', 'Hour', 'Day', 'Room', 'Block', 'Units', 'Hours'],
    [subject[0], subject[1], '7:30 - 10:00', 'TTH', 'A310', block, '3', '5'],
    [null, null, null, null, null, null, '3', '5'],
  ] }]))
}
export const xlsxMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
