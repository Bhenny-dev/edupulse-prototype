import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readXlsWorkbook } from '../src/utils/xlsWorkbook'
import { readClassListReport, rankClassListBlocks, bestClassListBlock, studentNumberKey, isEnrolled, type BlockCandidate, type ClassListReport } from '../src/utils/classListReport'
import { sectionOf } from '../src/utils/blockSections'
import { buildXls, classListRows } from './xls-fixture'

const students: [string, string, string, string?][] = [['LEARNER, ANA', 'F', '2024-1-0001'], ['STUDENT, BEN', 'M', '2023-01-0702'], ['TRANSFEREE, CY', 'M', '192000014600'], ['DROPPED, DEE', 'F', '2024-1-0009', 'Dropped']]
const text = (rows: ReturnType<typeof classListRows>) => rows.map(row => row.map(cell => cell === null ? '' : String(cell)))
const block = (block: string, days: string, time: string, room = 'A322', instructorName = 'Faye Q. Tester', over: Partial<BlockCandidate> = {}): BlockCandidate =>
  ({ assignment: 'course:wmade-3', code: 'WMADE 3', instructorId: 'teacher', instructorName, semester: '1st Semester', academicYear: '2026-2027', block, slots: [{ days, time, room }], students: [], ...over })

test('the registrar class list layout is read: section, term, faculty, meetings, students and the declared count', () => {
  const report = readClassListReport(readXlsWorkbook(buildXls([{ name: 'Class List for WMADE 3 - 4', rows: classListRows({ students }) }]))[0].rows)
  assert.ok(report)
  assert.deepEqual({ ...report, students: report.students.length }, {
    label: 'WMADE 3 - 4', courseCode: 'WMADE 3', section: '4', title: 'Web and Mobile Application Development Elective 3', units: 3,
    faculty: 'TESTER, Faye', semester: '1st Semester', academicYear: '2026-2027', generated: '09/10/2026 5:36 PM',
    schedule: [{ day: 'Monday', start: '07:30', room: 'A322' }, { day: 'Tuesday', start: '07:30', room: 'A322' }], students: 4, declared: 4, warnings: [],
  })
  assert.deepEqual(report.students[2], { name: 'TRANSFEREE, CY', sex: 'M', studentNumber: '192000014600', program: 'BSIT-WMAD', status: 'Enrolled' })
  assert.deepEqual(report.students.filter(isEnrolled).map(s => s.name), ['LEARNER, ANA', 'STUDENT, BEN', 'TRANSFEREE, CY'])
})

test('a declared count that differs from the rows read, missing numbers and a non-report sheet are reported', () => {
  const short = readClassListReport(text(classListRows({ students: [['NO NUMBER, EVE', 'F', '']], declared: 2, time: '02:00 pm' })))
  assert.ok(short)
  assert.deepEqual(short.schedule.map(m => m.start), ['14:00', '14:00'])
  assert.deepEqual(short.warnings, ['The list says 2 students, but 1 row was read. Check the file before adding it.', '1 student has no student number and cannot be matched to an account.'])
  assert.equal(readClassListReport([['Student Number', 'Name'], ['2026-1-0001', 'Ana']]), null)
})

test('a class list goes to the block with the same instructor, days, start time and room, not by its section number', () => {
  const morning = readClassListReport(text(classListRows({ section: '4', time: '07:30 am' }))) as ClassListReport
  const afternoon = readClassListReport(text(classListRows({ section: '5', time: '02:00 pm' }))) as ClassListReport
  const candidates = [block('A', 'MT', '2:00 - 4:30'), block('B', 'MT', '7:30 - 10:00'), block('A', 'TTH', '7:30 - 10:00', 'A310', 'Other Person', { code: 'IT 101' })]
  assert.deepEqual(rankClassListBlocks(morning, candidates).map(m => [m.candidate.block, m.score, m.reasons.join(', ')]), [['B', 8, 'same instructor, same days, same start time, same room'], ['A', 6, 'same instructor, same days, same room']])
  assert.equal(bestClassListBlock(rankClassListBlocks(afternoon, candidates))?.candidate.block, 'A')
  assert.equal(bestClassListBlock(rankClassListBlocks(morning, [block('A', 'MT', '7:30 - 10:00'), block('B', 'MT', '7:30 - 10:00')])), null, 'a tie is left for the Dean to choose')
  assert.deepEqual(rankClassListBlocks(morning, [block('B', 'MT', '7:30 - 10:00', 'A322', 'Faye Tester', { semester: '2nd Semester' })]), [], 'another term never matches')
  assert.deepEqual(sectionOf('WMADE 3 - 4'), { course: 'WMADE 3', block: '4' })
  assert.deepEqual(sectionOf('IT 101 A'), { course: 'IT 101', block: 'A' })
})

test('student numbers match without spaces or leading zeros in each part', () => {
  assert.equal(studentNumberKey('2023-01-0702'), studentNumberKey(' 2023-1-702 '))
  assert.notEqual(studentNumberKey('2024-1-0001'), studentNumberKey('2024-1-0010'))
  assert.equal(studentNumberKey('192000014600'), '192000014600')
})

// Local check against the registrar's own exports. They hold real student data, so they are never copied into the
// repository; this test reads them in place when this machine has them and is skipped everywhere else.
const officialFolder = process.env.EDUPULSE_CLASS_LISTS || 'C:/Users/Benny/OneDrive/Documents/EduPulse/Class List'
test('the official class list exports are read in full and land on their teaching-load blocks', { skip: !existsSync(officialFolder) && 'official class lists are not on this machine' }, () => {
  const files = readdirSync(officialFolder).filter(name => name.toLowerCase().endsWith('.xls'))
  assert.ok(files.length >= 2)
  for (const name of files) {
    const [sheet] = readXlsWorkbook(readFileSync(join(officialFolder, name)))
    const report = readClassListReport(sheet.rows, sheet.name) as ClassListReport
    assert.ok(report, name)
    assert.deepEqual([report.courseCode, report.semester, report.academicYear, report.warnings], ['WMADE 3', '1st Semester', '2026-2027', []], name)
    assert.equal(report.students.length, report.declared, `${name}: every listed student is read`)
    assert.ok(report.students.every(s => s.name && s.studentNumber), name)
    // The teaching load prints WMADE 3 B at 7:30 - 10:00 and WMADE 3 A at 2:00 - 4:30 (MT, A322) for this faculty member.
    const teacher = report.faculty.split(',').reverse().join(' ')
    const best = bestClassListBlock(rankClassListBlocks(report, [block('A', 'MT', '2:00 - 4:30', 'A322', teacher), block('B', 'MT', '7:30 - 10:00', 'A322', teacher)]))
    assert.equal(best?.candidate.block, report.schedule[0].start === '07:30' ? 'B' : 'A', name)
  }
})
