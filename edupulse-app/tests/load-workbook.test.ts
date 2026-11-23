import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { readWorkbookSheets, readLoadWorkbook, readTimetable, blockLabel, courseCode, workbookTerm } from '../src/utils/loadWorkbook'
import { buildXlsx } from './xlsx-fixture'

const fallback = { semester: '2nd Semester', academicYear: '2025-2026' }

const timetable = [
  ['COLLEGE OF INFORMATION TECHNOLOGY'],
  ['TENTATIVE SCHEDULE FOR First Semester S.Y'],
  ['FIRST YEARS', null, null, null, null, null, null, 'SECOND YEARS'],
  ['BLOCK', 'Subject Code', 'Descriptive Title', 'SCHEDULE', null, null, null, 'BLOCK', 'Subject Code', 'Descriptive Title', 'SCHEDULE'],
  [null, null, null, 'Time', 'Day', 'Room', null, null, null, null, 'Time', 'Day', 'Rooom'],
  ['A', 'IT 101', 'Introduction to Computing', '1:00 - 3:30', 'WF', 'A324', null, 'A', 'IT201', 'Data Structure and Algorithms', '11:00 - 1:30 / 4:00 - 6:30', 'TW', 'A309 / E207'],
  [null, 'IT 102', 'Computer Programming 1', '7:30 - 10:00', 'WTH', 'A324', null, null, 'IT203', 'Object Oriented Programming', '10:30 - 1:00', 'THF', 'A302'],
  [null, 'NSTP 1', 'National Service Training Program 1', '8:00-11:00', 'S', 'A604'],
  [],
  ['BLOCK', 'Subject Code', 'Descriptive Title', 'SCHEDULE'],
  [null, null, null, 'Time', 'Day', 'Room'],
  ['B', 'IT 101', 'Introduction to Computing', '7:30 - 10:00', 'WTH', 'A308'],
  [null, 'IT 102', 'Computer Programming 1', '1:30 - 4:00', 'WF', 'A308', null, 'NOTE: Blocks A and B will be merged for the GE classes.'],
]
const faculty = [
  ['WILFRED MASKAY'],
  ['SC_ID', 'Descriptive Title', 'Hour', 'Day', 'Room', 'Block', 'Units', 'Hours'],
  [' IT 102', 'Fundamentals of Programming', '7:30 - 10:00', 'W/TH', 'A324 / E207', 'BLOCK A-1', '3', '5'],
  [' IT 201', 'Data Structure Algorithms', '11:00 - 1:30 / 7:30 - 10:00', 'TW', 'A309 / E207', 'BLOCK 2-A', '3', '5'],
  [null, null, null, null, null, null, '6', '10'],
  [],
  ['SHARMAINE PANGCOG'],
  [' IT 101', 'Introduction to Computing', '7:30 - 10:00', 'W/TH', 'A308', 'BLOCK B-1', '3', '5'],
  [' IT 101', null, '1:00 - 3:30', 'WF', 'A324', 'BLOCK A', '3', '5'],
  [' TTL', null, '7:30 - 10:30', 'T', 'A324', null, '3', '3'],
  [null, null, null, null, null, null, '10', '13'],
  [],
  ['JOEL GABATIN'],
  ['NSTP 1 ', null, '8:00 - 11:00', 'S', null, 'BLOCK A&B-1', '3', '3'],
  [' IT 102', 'Fundamentals of Programming', '1:30 - 4:00', 'WF', 'A308', 'BLOCK A-1', '3', '5'],
]

test('block labels, course codes and the term are read the way the schedule prints them', () => {
  assert.deepEqual(blockLabel('BLOCK A-1'), { letters: ['A'], year: 1 })
  assert.deepEqual(blockLabel('BLOCK 2-E'), { letters: ['E'], year: 2 })
  assert.deepEqual(blockLabel('BLOCK D'), { letters: ['D'], year: null })
  assert.deepEqual(blockLabel('BLOCK A&B-1'), { letters: ['A', 'B'], year: 1 })
  assert.deepEqual(blockLabel('BSIT-3B'), { letters: ['B'], year: 3 })
  assert.deepEqual(blockLabel(''), { letters: [], year: null })
  assert.equal(courseCode(' IT201'), 'IT 201'); assert.equal(courseCode('WMADE3'), 'WMADE 3'); assert.equal(courseCode('GE ELEC ES'), 'GE ELEC ES')
  assert.deepEqual(workbookTerm(['TENTATIVE SCHEDULE FOR First Semester S.Y', 'CIT-TENTATIVE-SCHEDULE-FOR-First-Semester-S.Y-2026-2027.xlsx']), { semester: '1st Semester', academicYear: '2026-2027' })
  assert.deepEqual(workbookTerm(['no term here']), { semester: '', academicYear: '' })
})

test('the faculty-load sheet becomes reviewable loads, checked against the block timetable', async () => {
  const sheets = await readWorkbookSheets(await buildXlsx([{ name: 'Sheet3', rows: timetable }, { name: 'Sheet4', rows: faculty }]))
  assert.deepEqual(sheets.map(s => s.name), ['Sheet3', 'Sheet4'])
  const { classes, notes } = readTimetable(sheets)
  assert.equal(classes.length, 7)
  assert.deepEqual(classes.find(c => c.code === 'IT 201'), { sheet: 'Sheet3', row: 6, year: 2, block: 'A', code: 'IT 201', title: 'Data Structure and Algorithms', time: '11:00 - 1:30 / 4:00 - 6:30', days: 'TW', room: 'A309 / E207' })
  assert.deepEqual(notes, ['NOTE: Blocks A and B will be merged for the GE classes.'])

  const doc = readLoadWorkbook(sheets, 'CIT-TENTATIVE-SCHEDULE-FOR-First-Semester-S.Y-2026-2027.xlsx', fallback)!
  assert.ok(doc)
  assert.equal(doc.entries.length, 7)
  assert.deepEqual([...new Set(doc.entries.map(e => e.instructor))], ['WILFRED MASKAY', 'SHARMAINE PANGCOG', 'JOEL GABATIN'])
  assert.ok(doc.entries.every(e => e.semester === '1st Semester' && e.academicYear === '2026-2027'))
  const first = doc.entries[0]
  assert.equal(first.subjectCode, 'IT 102 A'); assert.equal(first.program, 'BSIT 1'); assert.equal(first.sheet, 'Sheet4'); assert.equal(first.page, 2); assert.equal(first.row, 3)
  assert.equal(first.units, 3); assert.equal(first.hours, 5); assert.equal(first.computedHours, 5)
  // IT 201 block A: the timetable's second meeting differs from the faculty sheet.
  const dsa = doc.entries.find(e => e.subjectCode === 'IT 201 A')!
  assert.equal(dsa.program, 'BSIT 2')
  assert.ok(dsa.warnings.some(w => w.includes('timetable lists 11:00 - 1:30 / 4:00 - 6:30 TW')))
  // A missing title comes from the timetable; a block without a year takes the timetable's year.
  const intro = doc.entries.find(e => e.subjectCode === 'IT 101 A')!
  assert.equal(intro.title, 'Introduction to Computing'); assert.equal(intro.program, 'BSIT 1')
  assert.ok(intro.warnings.some(w => w.includes('taken from the block timetable')))
  // A subject without a block keeps its code; the review assigns the next free letter.
  const ttl = doc.entries.find(e => e.subjectCode === 'TTL')!
  assert.ok(ttl.warnings.some(w => w.startsWith('No block is printed')))
  // Shared blocks are flagged and both blocks count as covered.
  const nstp = doc.entries.find(e => e.subjectCode === 'NSTP 1 A')!
  assert.ok(nstp.warnings.some(w => w.startsWith('Blocks A and B share this class')))
  // The same block under two instructors is a conflict.
  assert.ok(doc.entries.filter(e => e.subjectCode === 'IT 102 A').every(e => e.warnings.some(w => w.includes('is also listed under'))))
  // Totals: Maskay's printed totals match; Pangcog's printed 10 units against 9 listed.
  assert.deepEqual(doc.totals.find(t => t.instructor === 'WILFRED MASKAY'), { instructor: 'WILFRED MASKAY', page: 2, units: 6, hours: 10, computedUnits: 6, computedHours: 10 })
  assert.ok(doc.warnings.some(w => w === 'SHARMAINE PANGCOG: the printed units total is 10, the rows add up to 9.'))
  assert.ok(doc.warnings.some(w => w.startsWith('Timetable note:')))
  // Timetable classes nobody teaches yet: IT 203 block A and IT 102 block B.
  assert.deepEqual(doc.uncovered.map(c => `${c.code} ${c.block}`).sort(), ['IT 102 B', 'IT 203 A'])
})

test('a workbook without a faculty-load table is not read as loads, and a missing term falls back to the selected one', async () => {
  const onlyTimetable = await readWorkbookSheets(await buildXlsx([{ name: 'Sheet3', rows: timetable }]))
  assert.equal(readLoadWorkbook(onlyTimetable, 'timetable.xlsx', fallback), undefined)
  const plain = await readWorkbookSheets(await buildXlsx([{ name: 'Loads', rows: faculty.slice(0, 4) }]))
  const doc = readLoadWorkbook(plain, 'loads.xlsx', fallback)!
  assert.ok(doc.entries.every(e => e.semester === '2nd Semester' && e.academicYear === '2025-2026'))
  assert.equal(doc.warnings.filter(w => w.startsWith('No semester') || w.startsWith('No school year')).length, 2)
  assert.equal(doc.entries[0].program, 'BSIT 1')
})

const official = 'C:/Users/Benny/OneDrive/Documents/EduPulse/Course Load/CIT Sample Schedule/CIT-TENTATIVE-SCHEDULE-FOR-First-Semester-S.Y-2026-2027.xlsx'
test('the College sample schedule reads every instructor class with no unreadable rows', { skip: !existsSync(official) }, async () => {
  const bytes = readFileSync(official)
  const sheets = await readWorkbookSheets(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
  const doc = readLoadWorkbook(sheets, 'CIT-TENTATIVE-SCHEDULE-FOR-First-Semester-S.Y-2026-2027.xlsx', fallback)!
  assert.equal(doc.entries.length, 55)
  assert.equal(doc.totals.length, 11)
  assert.ok(doc.entries.every(e => e.semester === '1st Semester' && e.academicYear === '2026-2027' && e.title))
  assert.equal(doc.entries.filter(e => e.instructor === 'ROGELIO GUISDAN').length, 6)
  assert.ok(doc.timetable.length > 100)
  // The source's own mistakes are surfaced: Year 3 prints block B twice, and one printed total disagrees with its rows.
  assert.ok(doc.warnings.some(w => w.startsWith('The Year 3 timetable on Sheet3 lists block B twice')))
  assert.ok(doc.warnings.includes('LIBBY TEOFILO: the printed units total is 27, the rows add up to 15.'))
  assert.equal(doc.entries.find(e => e.subjectCode === 'WMAD 302 C')?.program, 'BSIT 3')
})
