import test from 'node:test'
import assert from 'node:assert/strict'
import { readXlsWorkbook, isCompoundFile } from '../src/utils/xlsWorkbook'
import { readGrid } from '../src/components/academic/eduSuiteImport'
import { buildXls, compoundFile, workbookStream } from './xls-fixture'

test('a small .xls (mini stream) yields sheet names, shared strings, numbers, booleans and formula text', () => {
  const file = buildXls([
    { name: 'Roster', rows: [['Name', 'Units', 'Hours', 'Grade', 'Active', 'Label'], ['Ana Cruz', 3, 5, 1.25, true, { formula: 'Ana / A' }], [null, null, -7, null, false, '']] },
    { name: 'Second sheet', rows: [[], ['', 'only cell']] },
  ])
  assert.ok(file.length < 4096 + 2048 && isCompoundFile(file))
  const [first, second] = readXlsWorkbook(file)
  assert.equal(first.name, 'Roster')
  assert.deepEqual(first.rows, [['Name', 'Units', 'Hours', 'Grade', 'Active', 'Label'], ['Ana Cruz', '3', '5', '1.25', 'TRUE', 'Ana / A'], ['', '', '-7', '', 'FALSE']])
  assert.deepEqual(second, { name: 'Second sheet', rows: [[], ['', 'only cell']] })
  assert.ok(!first.rows.flat().includes('LAB 310-35'), 'the file author (WRITEACCESS) is not a cell')
})

test('shared strings split across a CONTINUE record switch to UTF-16 mid-string; rich and phonetic data is skipped', () => {
  const rows = [['ABIÑON, RHODE', 'Second'], ['Third', 'Rich text']]
  for (const wide of [true, false]) {
    const text = (s: string) => wide ? s : s.replace('Ñ', 'N')
    const file = buildXls([{ name: 'Split', rows: rows.map(row => row.map(text)) }], { split: { index: 0, at: 3, wide }, rich: ['Rich text'] })
    assert.deepEqual(readXlsWorkbook(file)[0].rows, rows.map(row => row.map(text)), wide ? 'UTF-16 after the break' : '8-bit after the break')
  }
})

test('LABEL records and a workbook over 4096 bytes (regular sectors) are read', () => {
  const rows = Array.from({ length: 300 }, (_, i) => [`Student ${i + 1}`, `2026-1-${String(i + 1).padStart(4, '0')}`, i % 4 + 1])
  const file = buildXls([{ name: 'Big', rows }], { labels: true })
  assert.ok(workbookStream([{ name: 'Big', rows }], { labels: true }).length >= 4096)
  const [sheet] = readXlsWorkbook(file)
  assert.equal(sheet.rows.length, 300)
  assert.deepEqual(sheet.rows[299], ['Student 300', '2026-1-0300', '4'])
})

test('files that are not compound documents, truncated files and missing workbook streams are refused with a reason', () => {
  assert.throws(() => readXlsWorkbook(new TextEncoder().encode('<table><tr><td>x</td></tr></table>')), /not an Excel 97-2003 workbook/)
  const file = buildXls([{ name: 'Big', rows: Array.from({ length: 300 }, (_, i) => [`Row ${i}`]) }])
  assert.throws(() => readXlsWorkbook(file.subarray(0, 1536)), /damaged or incomplete/)
  assert.throws(() => readXlsWorkbook(compoundFile('Other', new Uint8Array(100))), /No worksheet data/)
})

test('readGrid reads a binary .xls upload as the first sheet, and still reads HTML saved as .xls', async () => {
  const file = new File([buildXls([{ name: 'S', rows: [['Student Number', 'Name'], ['2026-1-0001', 'Ana Cruz']] }])], 'roster.xls')
  assert.deepEqual(await readGrid(file), [['Student Number', 'Name'], ['2026-1-0001', 'Ana Cruz']])
  const html = new File(['<table><tr><td>Student Number</td><td>Name</td></tr><tr><td>2026-1-0002</td><td>Ben Dela</td></tr></table>'], 'export.xls')
  assert.deepEqual(await readGrid(html), [['Student Number', 'Name'], ['2026-1-0002', 'Ben Dela']])
})
