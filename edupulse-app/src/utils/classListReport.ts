import { slotDays, slotTimes } from './blockSections'

/** The registrar's "Class List Report" (exported as .xls): a title naming the subject and the
 * registrar's section ("WMADE 3 - 4"), the term, the subject line, the faculty, the meeting schedule,
 * then one row per student and a closing line with the number of students listed. */
export type ClassListStudent = { name: string; sex: string; studentNumber: string; program: string; status: string }
export type ClassListMeeting = { day: string; start: string; room: string }
export type ClassListReport = {
  label: string; courseCode: string; section: string; title: string; units: number | null
  faculty: string; semester: string; academicYear: string; generated: string
  schedule: ClassListMeeting[]; students: ClassListStudent[]; declared: number | null; warnings: string[]
}

const DAYS: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }
const SEMESTERS: [RegExp, string][] = [[/^(first|1st)$/i, '1st Semester'], [/^(second|2nd)$/i, '2nd Semester'], [/^summer$/i, 'Summer']]
const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()

/** A 12-hour time such as "02:00 pm" as "14:00". */
function clock(value: string) {
  const match = /^(\d{1,2}):(\d{2})\s*([ap])\.?m\.?$/i.exec(value.trim())
  if (!match) return ''
  const hour = Number(match[1]) % 12 + (match[3].toLowerCase() === 'p' ? 12 : 0)
  return `${String(hour).padStart(2, '0')}:${match[2]}`
}

/** Reads a class list report from a worksheet's rows, or returns null when the sheet is not one. */
export function readClassListReport(rows: string[][], sheetName = ''): ClassListReport | null {
  const cells = rows.flatMap((row, r) => row.map((value, c) => ({ r, c, value: clean(value) }))).filter(cell => cell.value)
  const find = (pattern: RegExp) => cells.find(cell => pattern.test(cell.value))
  const subject = cells.map(cell => /^(?<code>.+?)\s*-\s*(?<section>[0-9A-Z]{1,6})\s*-\s*\k<code>\s*-\s*(?<title>.+?)\s*-\s*\[(?<units>\d+(?:\.\d+)?)\]$/i.exec(cell.value)?.groups).find(Boolean)
  const titled = /^class list for\s+(.+?)\s*-\s*([0-9A-Z]{1,6})$/i.exec(clean(find(/^class list for /i)?.value || sheetName))
  const headerCell = find(/^student name$/i)
  if (!headerCell || (!subject && !titled)) return null
  const warnings: string[] = []
  const courseCode = clean(subject?.code || titled?.[1]).toUpperCase(), section = clean(subject?.section || titled?.[2]).toUpperCase()
  const term = cells.map(cell => /\b(first|1st|second|2nd|summer)\b.*?s\.?\s*y\.?\s*(\d{4})\s*-\s*(\d{4})/i.exec(cell.value)).find(Boolean)
  const semester = term ? SEMESTERS.find(([pattern]) => pattern.test(term[1]))?.[1] || '' : ''
  const academicYear = term ? `${term[2]}-${term[3]}` : ''
  const faculty = clean(/^faculty:\s*(.*)$/i.exec(find(/^faculty:/i)?.value || '')?.[1])
  const generated = clean(/^date generated:\s*(.*)$/i.exec(find(/^date generated:/i)?.value || '')?.[1])
  // Meetings sit between the "Schedule" label and the student header: a day and time, then a room.
  const scheduleRow = find(/^schedule$/i)?.r ?? headerCell.r
  const schedule: ClassListMeeting[] = []
  for (let r = scheduleRow; r < headerCell.r; r++) {
    const row = (rows[r] || []).map(clean)
    row.forEach((value, c) => {
      const meeting = /^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?\s+(.+)$/i.exec(value)
      const start = meeting ? clock(meeting[2]) : ''
      if (!meeting || !start) return
      const room = row.slice(c + 1).find(next => next && !/^(mon|tue|wed|thu|fri|sat|sun)/i.test(next)) || ''
      schedule.push({ day: DAYS[meeting[1].toLowerCase()], start, room })
    })
  }
  const header = (rows[headerCell.r] || []).map(clean)
  const column = (pattern: RegExp) => header.findIndex(value => pattern.test(value))
  const columns = { name: headerCell.c, sex: column(/^(sex|gender)$/i), number: column(/^student\s*(number|no\.?|id)$/i), program: column(/^program/i), status: column(/status/i) }
  const students: ClassListStudent[] = []
  let declared: number | null = null
  for (let r = headerCell.r + 1; r < rows.length; r++) {
    const row = (rows[r] || []).map(clean)
    const closing = row.map(value => /\[(\d+)\]\s*student\(s\)\s*listed/i.exec(value)).find(Boolean)
    if (closing) { declared = Number(closing[1]); break }
    const name = row[columns.name] || ''
    if (!name || /signature/i.test(row.join(' '))) continue
    const at = (index: number) => index >= 0 ? row[index] || '' : ''
    students.push({ name, sex: at(columns.sex), studentNumber: at(columns.number), program: at(columns.program), status: at(columns.status) })
  }
  if (declared !== null && declared !== students.length) warnings.push(`The list says ${declared} student${declared === 1 ? '' : 's'}, but ${students.length} row${students.length === 1 ? ' was' : 's were'} read. Check the file before adding it.`)
  if (!students.length) warnings.push('No student rows were found under the column headings.')
  const unnumbered = students.filter(student => !student.studentNumber).length
  if (unnumbered) warnings.push(`${unnumbered} student${unnumbered === 1 ? ' has' : 's have'} no student number and cannot be matched to an account.`)
  if (!semester || !academicYear) warnings.push('The term (semester and school year) was not found in the file.')
  return { label: section ? `${courseCode} - ${section}` : courseCode, courseCode, section, title: clean(subject?.title), units: subject ? Number(subject.units) : null, faculty, semester, academicYear, generated, schedule, students, declared, warnings }
}

/** True when the registrar lists the student as enrolled (an empty status counts as enrolled). */
export const isEnrolled = (student: ClassListStudent) => !student.status || /^enrol+ed$/i.test(student.status)

/** Student numbers are compared without spaces or leading zeros in each part: 2023-01-0704 is 2023-1-704. */
export const studentNumberKey = (value: unknown) => clean(value).toUpperCase().split(/[^0-9A-Z]+/).filter(Boolean).map(part => /^\d+$/.test(part) ? String(Number(part)) : part).join('-')

export type BlockCandidate = {
  assignment: string; code: string; instructorId: string; instructorName: string; semester: string; academicYear: string
  block: string; slots: { days: string; time: string; room: string }[]; students: { email: string; name: string; id: string }[]
}
export type BlockMatch = { candidate: BlockCandidate; score: number; reasons: string[] }

const codeKey = (value: string) => clean(value).toUpperCase().replace(/\s+/g, '')
const roomKey = (value: string) => clean(value).toUpperCase().replace(/[^0-9A-Z]/g, '')
const words = (value: string) => clean(value).toUpperCase().replace(/[^A-Z\s]/g, ' ').split(/\s+/).filter(Boolean)

/** Blocks of the same course and term, best first. The registrar numbers sections (WMADE 3 - 4) while the
 * teaching load letters them (WMADE 3 B), so the faculty, the meeting days and start time, and the room
 * decide which block a class list belongs to. */
export function rankClassListBlocks(report: ClassListReport, candidates: BlockCandidate[]): BlockMatch[] {
  const surname = words(report.faculty.split(',')[0] || '')
  const days = [...new Set(report.schedule.map(meeting => meeting.day))].sort().join(',')
  const start = report.schedule[0]?.start || '', rooms = new Set(report.schedule.map(meeting => roomKey(meeting.room)).filter(Boolean))
  return candidates
    .filter(candidate => codeKey(candidate.code) === codeKey(report.courseCode)
      && (!report.semester || candidate.semester === report.semester) && (!report.academicYear || candidate.academicYear === report.academicYear))
    .map(candidate => {
      const reasons: string[] = []
      let score = 0
      const teacher = new Set(words(candidate.instructorName))
      if (surname.length && surname.every(part => teacher.has(part))) { score += 3; reasons.push('same instructor') }
      const slotDaysText = [...new Set(candidate.slots.flatMap(slot => slotDays(slot.days)))].sort().join(',')
      if (days && slotDaysText === days) { score += 2; reasons.push('same days') }
      if (start && candidate.slots.some(slot => slotTimes(slot.time).start === start)) { score += 2; reasons.push('same start time') }
      if (candidate.slots.some(slot => rooms.has(roomKey(slot.room)))) { score += 1; reasons.push('same room') }
      return { candidate, score, reasons }
    })
    .sort((a, b) => b.score - a.score || a.candidate.block.localeCompare(b.candidate.block))
}

/** The block to preselect: the best match when it is clearly ahead of the next one. */
export function bestClassListBlock(matches: BlockMatch[]): BlockMatch | null {
  const [first, second] = matches
  if (!first || first.score < 2 || (second && second.score === first.score)) return null
  return first
}
