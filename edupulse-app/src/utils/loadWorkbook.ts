/** Course loads from the College's Excel schedule workbook. The faculty-load sheet lists each instructor's
 * classes (instructor name as a heading row, then SC_ID, title, hour, day, room, block, units, hours and a
 * totals row); the block timetable sheet lists every block's classes per year level. Rows become the same
 * reviewable document the teaching-load review already uses, so nothing is saved until the Dean confirms. */
import JSZip from 'jszip'
import { isCompoundFile, readXlsWorkbook } from './xlsWorkbook'
import { scheduleDays, scheduleHours, type LoadEntry, type TeachingLoadDocument } from './teachingLoad'

/** rows[i] is spreadsheet row i + 1; empty rows are kept so row numbers match the file. */
export type Sheet = { name: string; rows: string[][] }
export type TimetableClass = { sheet: string; row: number; year: number | null; block: string; code: string; title: string; time: string; days: string; room: string }
export type LoadWorkbook = TeachingLoadDocument & { source: 'excel'; sheets: string[]; timetable: TimetableClass[]; uncovered: TimetableClass[] }

const MAX_BYTES = 5 * 1024 * 1024
const clean = (value: unknown) => String(value ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
const headerKey = (value: string) => clean(value).toLowerCase().replace(/[^a-z0-9]/g, '')
export const codeKey = (value: string) => clean(value).toUpperCase().replace(/[\s-]+/g, '')
const decode = (value: string) => value.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
const columnIndex = (ref: string) => [...ref.replace(/\d+/g, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1

/** "IT201", " IT 201" and "it-201" are IT 201; codes without a number (GE ELEC ES, TTL) stay as written. */
export const courseCode = (value: string) => {
  const text = clean(value).toUpperCase()
  const parts = /^([A-Z]{1,10})\s*-?\s*(\d{1,4}[A-Z]?)$/.exec(text)
  return parts ? `${parts[1]} ${parts[2]}` : text
}

/** Every worksheet of an .xlsx (or Excel 97-2003 .xls) workbook, in workbook order. */
export async function readWorkbookSheets(data: ArrayBuffer): Promise<Sheet[]> {
  const bytes = new Uint8Array(data)
  if (isCompoundFile(bytes)) return readXlsWorkbook(bytes).map(sheet => ({ name: sheet.name, rows: sheet.rows.map(row => row.map(clean)) }))
  const zip = await JSZip.loadAsync(data)
  const text = async (path: string) => (await zip.file(path)?.async('string')) || ''
  const workbook = await text('xl/workbook.xml')
  if (!workbook) throw new Error('This file is not an Excel workbook. Save it as .xlsx and upload it again.')
  const shared = [...(await text('xl/sharedStrings.xml')).matchAll(/<si>([\s\S]*?)<\/si>/g)].map(([, si]) => clean(decode([...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => m[1]).join(''))))
  const rels = await text('xl/_rels/workbook.xml.rels')
  const sheets: Sheet[] = []
  for (const [, attrs] of workbook.matchAll(/<sheet\b([^>]*?)\/?>/g)) {
    const name = decode(/name="([^"]*)"/.exec(attrs)?.[1] || `Sheet ${sheets.length + 1}`), id = /r:id="([^"]+)"/.exec(attrs)?.[1]
    const relation = id ? [...rels.matchAll(/<Relationship\b([^>]*)\/?>/g)].map(m => m[1]).find(r => r.includes(`Id="${id}"`)) : undefined
    const target = relation && /Target="([^"]+)"/.exec(relation)?.[1]
    const xml = target ? await text(target.startsWith('/') ? target.slice(1) : `xl/${target}`) : ''
    if (!xml) continue
    const rows: string[][] = []
    for (const [, rowAttrs, body] of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
      const number = Number(/\br="(\d+)"/.exec(rowAttrs)?.[1] || rows.length + 1)
      if (number > 5000) break
      const row: string[] = []
      for (const [, cellAttrs, inner] of body.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = /\br="([A-Z]+\d+)"/.exec(cellAttrs)?.[1], type = /\bt="(\w+)"/.exec(cellAttrs)?.[1]
        const raw = /<v>([\s\S]*?)<\/v>/.exec(inner || '')?.[1] ?? [...(inner || '').matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => m[1]).join('')
        const value = type === 's' ? shared[Number(raw)] ?? '' : clean(decode(raw))
        const at = ref ? columnIndex(ref) : row.length
        if (at > 200) continue
        while (row.length < at) row.push('')
        row[at] = value
      }
      while (rows.length < number - 1) rows.push([])
      rows[number - 1] = row
    }
    sheets.push({ name, rows })
  }
  return sheets
}

export async function readWorkbookFile(file: File) {
  if (file.size > MAX_BYTES) throw new Error('Excel files must be at most 5 MB.')
  return readWorkbookSheets(await file.arrayBuffer())
}

/** "First Semester S.Y 2026-2027" from the sheet titles, or from the file name. */
export function workbookTerm(texts: string[]) {
  const text = texts.join(' ').replace(/[_]+/g, ' ')
  const semester = /\b(?:1st|first)[\s-]*sem/i.test(text) ? '1st Semester' : /\b(?:2nd|second)[\s-]*sem/i.test(text) ? '2nd Semester' : /\b(?:summer|mid[\s-]*year)\b/i.test(text) ? 'Summer' : ''
  const year = /\b(20\d{2})\s*[-–/]\s*(20\d{2})\b/.exec(text)
  return { semester, academicYear: year && Number(year[2]) === Number(year[1]) + 1 ? `${year[1]}-${year[2]}` : '' }
}

/** "BLOCK A-1" (block A, Year 1), "BLOCK 2-E", "BLOCK D", "BLOCK A&B-1" (A and B share the class). */
export function blockLabel(value: string) {
  const text = clean(value).toUpperCase().replace(/^(?:BLOCK|BLK|SECTION|SEC)\.?\s*/, '').replace(/^BS[A-Z]{0,4}\s*/, '')
  const letters = [...text.replace(/\d/g, ' ').matchAll(/(?:^|[^A-Z])([A-Z])(?=[^A-Z]|$)/g)].map(m => m[1])
  const year = /([1-5])/.exec(text)?.[1]
  return { letters: [...new Set(letters)], year: year ? Number(year) : null }
}

const YEARS: [RegExp, number][] = [[/\b(?:1st|first)\s*years?\b/i, 1], [/\b(?:2nd|second)\s*years?\b/i, 2], [/\b(?:3rd|third)\s*years?\b/i, 3], [/\b(?:4th|fourth)\s*years?\b/i, 4]]
const SUBJECT = ['scid', 'subjectcode', 'subject', 'subjcode', 'coursecode', 'code', 'courseno', 'subjectno']
const isSubjectHeader = (cell: string) => SUBJECT.includes(headerKey(cell))

/** The block timetable: panels headed BLOCK | Subject Code | Descriptive Title | SCHEDULE (Time, Day, Room). */
export function readTimetable(sheets: Sheet[]): { classes: TimetableClass[]; notes: string[] } {
  const classes: TimetableClass[] = [], notes: string[] = []
  for (const sheet of sheets) {
    const started = new Map<string, number>()
    const labels: { row: number; column: number; year: number }[] = []
    sheet.rows.forEach((row, r) => row.forEach((cell, c) => { const hit = YEARS.find(([pattern]) => pattern.test(cell) && cell.length < 30); if (hit) labels.push({ row: r, column: c, year: hit[1] }) }))
    sheet.rows.forEach((row, r) => row.forEach((cell, c) => {
      if (headerKey(cell) !== 'block' || !isSubjectHeader(row[c + 1] || '')) return
      const year = labels.filter(l => l.row < r && l.column <= c).sort((a, b) => b.row - a.row || b.column - a.column)[0]?.year ?? null
      const find = (names: string[], fallback: number) => {
        for (const line of [row, sheet.rows[r + 1] || []]) for (let at = c + 2; at <= c + 8; at++) if (names.includes(headerKey(line[at] || ''))) return at
        return fallback
      }
      const time = find(['time', 'hour'], c + 3), days = find(['day', 'days'], c + 4), room = find(['room', 'rooom', 'venue'], c + 5)
      let block = ''
      for (let at = r + 1; at < sheet.rows.length; at++) {
        const line = sheet.rows[at] || [], head = clean(line[c]), code = courseCode(line[c + 1] || '')
        if (headerKey(head) === 'block') break
        if (head) {
          const label = blockLabel(head)
          if (head.length <= 14 && label.letters.length) {
            block = label.letters[0]
            // A block letter printed twice in one year usually means a mistyped block (B where C was meant).
            const key = `${year}|${block}`, earlier = started.get(key)
            if (earlier && earlier !== at + 1) notes.push(`The ${year ? `Year ${year} ` : ''}timetable on ${sheet.name} lists block ${block} twice (rows ${earlier} and ${at + 1}); check its block letters.`)
            else started.set(key, at + 1)
          }
          else if (head.length > 14 && !notes.includes(head)) notes.push(head)
        }
        if (!code || isSubjectHeader(code) || ['time', 'day'].includes(headerKey(code)) || !block) continue
        classes.push({ sheet: sheet.name, row: at + 1, year, block, code, title: clean(line[c + 2]), time: clean(line[time]), days: clean(line[days]), room: clean(line[room]) })
      }
    }))
  }
  return { classes, notes }
}

const FIELDS = {
  subject: SUBJECT, title: ['descriptivetitle', 'title', 'description', 'coursetitle', 'subjecttitle', 'subjectdescription'],
  time: ['time', 'hour', 'timeschedule', 'classtime'], days: ['day', 'days'], room: ['room', 'rooom', 'venue', 'roomno'],
  block: ['block', 'section', 'blocksection', 'blk'], units: ['units', 'unit', 'credits', 'creditunits'], hours: ['hours', 'hrs', 'contacthours', 'hoursweek'],
  instructor: ['instructor', 'instructorname', 'faculty', 'facultyname', 'teacher'], students: ['students', 'noofstudents', 'enrolled'],
} as const
type Field = keyof typeof FIELDS
const loadHeader = (row: string[]) => {
  const columns: Partial<Record<Field, number>> = {}
  row.forEach((cell, at) => {
    const key = headerKey(cell), field = (Object.keys(FIELDS) as Field[]).find(f => columns[f] === undefined && (FIELDS[f] as readonly string[]).includes(key))
    if (field) columns[field] = at
  })
  // A block timetable header (BLOCK right before Subject Code, schedule on the next line) is not a load table.
  return columns.subject !== undefined && (columns.time !== undefined || columns.days !== undefined) && columns.block !== columns.subject - 1 ? columns : null
}
const number = (value: string) => /^\d+(?:\.\d+)?$/.test(clean(value)) ? Number(clean(value)) : null
const sameTime = (a: string, b: string) => a.replace(/\s+/g, '').replace(/^0/, '') === b.replace(/\s+/g, '').replace(/^0/, '')
const sameDays = (a: string, b: string) => { const x = scheduleDays(a), y = scheduleDays(b); return Boolean(x && y && x.length === y.length && x.every(d => y.includes(d))) }

/** The workbook as reviewable teaching loads, or undefined when no faculty-load table is found. */
export function readLoadWorkbook(sheets: Sheet[], fileName: string, fallback: { semester: string; academicYear: string }): LoadWorkbook | undefined {
  const titleTexts = [...sheets.flatMap(sheet => sheet.rows.slice(0, 6).flat()), fileName]
  const found = workbookTerm(titleTexts), warnings: string[] = []
  if (!found.semester) warnings.push(`No semester is printed in the workbook; its rows are read as ${fallback.semester}.`)
  if (!found.academicYear) warnings.push(`No school year is printed in the workbook; its rows are read as AY ${fallback.academicYear}.`)
  const semester = found.semester || fallback.semester, academicYear = found.academicYear || fallback.academicYear
  const { classes: timetable, notes } = readTimetable(sheets)
  notes.forEach(note => warnings.push(/^the .*timetable/i.test(note) ? note : `Timetable note: ${note}`))
  const entries: LoadEntry[] = [], totals: TeachingLoadDocument['totals'] = [], printed = new Map<string, { units: number | null; hours: number | null }>(), covered = new Set<string>()
  sheets.forEach((sheet, index) => {
    let columns: ReturnType<typeof loadHeader> = null, instructor = ''
    sheet.rows.forEach((row, r) => {
      const header = loadHeader(row)
      if (header) { columns = header; return }
      const filled = row.map(clean).filter(Boolean)
      if (!filled.length) return
      // An instructor's name stands alone on its row above that instructor's classes.
      if (filled.length === 1 && row.findIndex(cell => clean(cell)) <= Math.max(1, columns?.subject ?? 1) && /[A-Za-z]{2}/.test(filled[0]) && filled[0].length <= 80) {
        const named = /^(?:instructor|faculty|name)\s*:\s*(.+)$/i.exec(filled[0])
        if (columns || named || !/schedule|semester|college|department|s\.?y\.?/i.test(filled[0])) instructor = clean(named ? named[1] : filled[0])
        return
      }
      if (!columns) return
      const cell = (field: Field) => columns![field] === undefined ? '' : clean(row[columns![field]!])
      const code = courseCode(cell('subject')), name = cell('instructor') || instructor
      if (!code) {
        const units = number(cell('units')), hours = number(cell('hours'))
        if (name && (units !== null || hours !== null)) printed.set(name, { units, hours })
        return
      }
      if (/^total/i.test(code)) return
      const label = blockLabel(cell('block')), letter = label.letters[0] || ''
      const entryWarnings: string[] = []
      const matches = timetable.filter(t => codeKey(t.code) === codeKey(code))
      const yearsOf = (list: TimetableClass[]) => [...new Set(list.map(t => t.year).filter((y): y is number => y !== null))]
      const sameBlock = yearsOf(matches.filter(t => !letter || t.block === letter)), years = sameBlock.length ? sameBlock : yearsOf(matches)
      const year = label.year ?? (years.length === 1 ? years[0] : null)
      const listed = letter ? matches.find(t => t.block === letter && (year === null || t.year === year)) : undefined
      const title = cell('title') || listed?.title || matches[0]?.title || ''
      const time = cell('time'), days = cell('days')
      if (!cell('block')) entryWarnings.push('No block is printed for this class; it takes the next free block letter of this course.')
      else if (!letter) entryWarnings.push(`The block "${cell('block')}" could not be read; it takes the next free block letter of this course.`)
      if (label.letters.length > 1) entryWarnings.push(`Blocks ${label.letters.join(' and ')} share this class; it is saved as block ${letter}. Add the other block's class list to the same class.`)
      if (!cell('title')) entryWarnings.push(title ? `No title is printed on this row; "${title}" is taken from the block timetable.` : 'No descriptive title is printed for this subject; check the course before importing.')
      if (timetable.length && letter && !listed) entryWarnings.push(`${code} block ${letter}${year ? ` (Year ${year})` : ''} is not in the block timetable.`)
      if (listed && ((listed.time && time && !sameTime(listed.time, time)) || (listed.days && days && !sameDays(listed.days, days)))) entryWarnings.push(`The block timetable lists ${listed.time || 'no time'} ${listed.days || ''} for this class.`.replace(/\s+\./, '.'))
      if (time && days && scheduleHours(time, days) === null) entryWarnings.push('The weekly hours could not be computed from this time and day.')
      for (const shared of label.letters) covered.add(`${codeKey(`${code} ${shared}`)}|${year ? `BSIT ${year}` : ''}`)
      entries.push({ id: `x${index + 1}-${r + 1}`, page: index + 1, row: r + 1, instructor: name || 'Instructor not named', degree: '', semester, academicYear,
        subjectCode: letter ? `${code} ${letter}` : code, title: title || code, time, days, units: number(cell('units')), lecture: null, lab: null,
        hours: number(cell('hours')), computedHours: time && days ? scheduleHours(time, days) : null, room: cell('room'), students: number(cell('students')),
        program: year ? `BSIT ${year}` : '', warnings: entryWarnings, sheet: sheet.name })
    })
  })
  if (!entries.length) return undefined
  // The same block of a course listed under two instructors is a conflict the Dean resolves before importing.
  const owners = new Map<string, Set<string>>()
  for (const e of entries) { const k = `${codeKey(e.subjectCode)}|${e.program}`; if (/\s[A-Z]$/.test(e.subjectCode)) owners.set(k, new Set([...(owners.get(k) || []), e.instructor])) }
  for (const e of entries) { const k = `${codeKey(e.subjectCode)}|${e.program}`; if ((owners.get(k)?.size || 0) > 1) e.warnings.push(`${e.subjectCode} is also listed under ${[...owners.get(k)!].filter(n => n !== e.instructor).join(', ')}.`) }
  for (const name of [...new Set(entries.map(e => e.instructor))]) {
    const rows = entries.filter(e => e.instructor === name), mark = printed.get(name)
    const computedUnits = rows.reduce((n, e) => n + (e.units || 0), 0), computedHours = Math.round(rows.reduce((n, e) => n + (e.computedHours || 0), 0) * 100) / 100
    const listedHours = rows.reduce((n, e) => n + (e.hours || 0), 0)
    if (mark?.units != null && mark.units !== computedUnits) warnings.push(`${name}: the printed units total is ${mark.units}, the rows add up to ${computedUnits}.`)
    if (mark?.hours != null && mark.hours !== listedHours) warnings.push(`${name}: the printed hours total is ${mark.hours}, the rows add up to ${listedHours}.`)
    totals.push({ instructor: name, page: rows[0].page, units: mark?.units ?? null, hours: mark?.hours ?? null, computedUnits, computedHours })
  }
  const uncovered = timetable.filter((t, i) => !covered.has(`${codeKey(`${t.code} ${t.block}`)}|${t.year ? `BSIT ${t.year}` : ''}`) && timetable.findIndex(o => o.year === t.year && o.block === t.block && codeKey(o.code) === codeKey(t.code)) === i)
  return { entries, totals, pages: sheets.length, warnings, source: 'excel', sheets: sheets.map(s => s.name), timetable, uncovered }
}
