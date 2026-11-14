// Deterministic EduSuite intake: reads the downloaded file, finds its header row and builds a
// reviewable plan. No AI is involved; every decision carries a plain reason the Dean can check.
import JSZip from 'jszip'
import { STUDENT_PROGRAMS } from '../../data/studentPrograms.js'

export type Grid = string[][]
export const CIT_DEPARTMENT = 'College of Information Technology'
export const CIT_PROGRAMS: string[] = (STUDENT_PROGRAMS as Record<string, string[]>)[CIT_DEPARTMENT] || []
const MAX_BYTES = 5 * 1024 * 1024

const clean = (value: unknown) => String(value ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
const headerKey = (value: string) => clean(value).toLowerCase().replace(/[^a-z0-9]/g, '')
const decode = (value: string) => value.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))

/** CSV/TSV/semicolon text with quoted fields. The delimiter is the one used most consistently. */
export function delimitedGrid(text: string): Grid {
  text = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const sample = text.split('\n').filter(line => line.trim()).slice(0, 20)
  const delimiter = ['\t', ',', ';', '|'].map(d => ({ d, n: sample.filter(line => line.includes(d)).length })).sort((a, b) => b.n - a.n)[0]?.d || ','
  const rows: Grid = []; let row: string[] = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (ch === '"') quoted = false; else cell += ch }
    else if (ch === '"' && !cell.trim()) { quoted = true; cell = '' }
    else if (ch === delimiter) { row.push(clean(cell)); cell = '' }
    else if (ch === '\n') { row.push(clean(cell)); rows.push(row); row = []; cell = '' }
    else cell += ch
  }
  if (cell || row.length) { row.push(clean(cell)); rows.push(row) }
  return rows.filter(r => r.some(Boolean))
}

/** Many school systems download "Excel" files that are HTML tables. Column spans are kept aligned. */
export function htmlGrid(html: string): Grid {
  const rows: Grid = []
  for (const [, body] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row: string[] = []
    for (const [, attrs, content] of body.matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/gi)) {
      row.push(clean(decode(content)))
      const span = Number(/colspan\s*=\s*"?(\d+)/i.exec(attrs)?.[1] || 1)
      for (let i = 1; i < Math.min(span, 50); i++) row.push('')
    }
    if (row.some(Boolean)) rows.push(row)
  }
  return rows
}

const column = (ref: string) => [...ref.replace(/\d+/g, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1
/** First worksheet of an .xlsx workbook (shared, inline and literal strings; numbers as written). */
export async function xlsxGrid(data: ArrayBuffer): Promise<Grid> {
  const zip = await JSZip.loadAsync(data)
  const text = async (path: string) => (await zip.file(path)?.async('string')) || ''
  const shared = [...(await text('xl/sharedStrings.xml')).matchAll(/<si>([\s\S]*?)<\/si>/g)].map(([, si]) => clean(decode([...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => m[1]).join(''))))
  const workbook = await text('xl/workbook.xml'), rels = await text('xl/_rels/workbook.xml.rels')
  const firstId = /<sheet[^>]*r:id="([^"]+)"/.exec(workbook)?.[1]
  const target = firstId && new RegExp(`<Relationship[^>]*Id="${firstId}"[^>]*Target="([^"]+)"`).exec(rels)?.[1]
  const sheet = await text(target ? `xl/${target.replace(/^\/?xl\//, '')}` : 'xl/worksheets/sheet1.xml')
  if (!sheet) throw new Error('The workbook has no readable worksheet.')
  const rows: Grid = []
  for (const [, body] of sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = []
    for (const [, attrs, inner] of body.matchAll(/<c([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1], type = /t="(\w+)"/.exec(attrs)?.[1]
      const raw = /<v>([\s\S]*?)<\/v>/.exec(inner || '')?.[1] ?? [...(inner || '').matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => m[1]).join('')
      const value = type === 's' ? shared[Number(raw)] ?? '' : clean(decode(raw))
      const index = ref ? column(ref) : row.length
      while (row.length < index) row.push('')
      row[index] = value
    }
    if (row.some(Boolean)) rows.push(row)
  }
  return rows
}

export async function readGrid(file: File): Promise<Grid> {
  if (file.size > MAX_BYTES) throw new Error('Files must be at most 5 MB.')
  const name = file.name.toLowerCase()
  if (/\.(pdf|docx?)$/.test(name)) throw new Error('Save the EduSuite download as CSV or Excel (.xlsx) first.')
  if (name.endsWith('.xlsx')) return xlsxGrid(await file.arrayBuffer())
  const text = await file.text()
  if (/<table[\s>]/i.test(text)) return htmlGrid(text)
  if (name.endsWith('.xls')) throw new Error('This older Excel format cannot be read. Save it as .xlsx or CSV and upload again.')
  return delimitedGrid(text)
}

type Columns<F extends string> = Partial<Record<F, number>>
const ALIASES = {
  studentNumber: ['studentno', 'studentnumber', 'studentid', 'studno', 'studentidno', 'idno', 'idnumber', 'studentnum', 'id'],
  surname: ['surname', 'lastname', 'familyname'], firstName: ['firstname', 'givenname'], middleName: ['middlename', 'middleinitial', 'mi'],
  fullName: ['name', 'studentname', 'fullname', 'nameofstudent', 'studentfullname'], year: ['yearlevel', 'year', 'yrlevel', 'yr', 'level'],
  program: ['programname', 'program', 'degree', 'degreeprogram', 'course', 'courseprogram'], block: ['section', 'block', 'blocksection', 'blocksec', 'classsection', 'sectioncode', 'sectionname'],
  subject: ['subjectcode', 'coursecode', 'subject', 'code', 'subjcode', 'subjectno', 'courseno'], title: ['descriptivetitle', 'description', 'subjectdescription', 'subjecttitle', 'coursetitle', 'title', 'coursedescription'],
  type: ['status', 'type', 'studenttype', 'classification', 'remarks', 'enrollmentstatus', 'regularirregular'], email: ['email', 'emailaddress', 'studentemail'],
  instructor: ['instructor', 'instructorname', 'faculty', 'facultyname', 'teacher', 'professor', 'facultyinstructor', 'assignedinstructor'],
  employeeId: ['employeeid', 'employeeno', 'facultyid', 'facultyno', 'empid', 'empno'], semester: ['semester', 'term', 'sem'], units: ['units', 'unit'],
} as const
type Field = keyof typeof ALIASES

/** The header is the early row that names the most known columns; title rows above it become defaults. */
export function findHeader<F extends Field>(grid: Grid, fields: readonly F[], required: (cols: Columns<F>) => boolean) {
  let best: { index: number; columns: Columns<F>; score: number } | null = null
  for (let index = 0; index < Math.min(grid.length, 40); index++) {
    const columns: Columns<F> = {}
    grid[index].forEach((cell, at) => {
      const key = headerKey(cell)
      const field = fields.find(f => columns[f] === undefined && (ALIASES[f] as readonly string[]).includes(key))
      if (field) columns[field] = at
    })
    const score = Object.keys(columns).length
    if (required(columns) && (!best || score > best.score)) best = { index, columns, score }
  }
  if (!best) return null
  const context: Record<string, string> = {}
  for (const row of grid.slice(0, best.index)) {
    const cells = row.filter(Boolean)
    cells.forEach((cell, at) => {
      const pair = /^([A-Za-z .\/]+?)\s*:\s*(.*)$/.exec(cell)
      if (pair) { const value = clean(pair[2]) || cells[at + 1] || ''; if (value) context[headerKey(pair[1])] = clean(value) }
    })
  }
  return { ...best, context }
}
const fromContext = (context: Record<string, string>, field: Field) => (ALIASES[field] as readonly string[]).map(alias => context[alias]).find(Boolean) || ''

export const normalizeCourseCode = (value: string) => {
  const text = clean(value).toUpperCase()
  const parts = /^([A-Z]{1,8})\s*-?\s*(\d{1,4}[A-Z]?)$/.exec(text)
  return parts ? `${parts[1]} ${parts[2]}` : text
}
export const codeKey = (value: string) => clean(value).toUpperCase().replace(/[\s-]+/g, '')
export const isIrregularMark = (value: string) => /\birr(eg(ular)?)?\b\.?|irregular/i.test(clean(value))
/** "BSIT 1-A", "bsit1a", "1-A" and "IT-1A" all become BSIT-1A; unknown forms stay as written (upper case). */
export function normalizeBlock(value: string, known: string[] = [], prefix = 'BSIT') {
  const text = clean(value).toUpperCase()
  if (!text || isIrregularMark(text)) return ''
  const parts = /^([A-Z]{2,6})?\s*-?\s*([1-5])\s*-?\s*([A-Z])$/.exec(text)
  const formed = parts ? `${parts[1] && parts[1] !== 'IT' ? parts[1] : prefix}-${parts[2]}${parts[3]}` : text
  return known.find(block => codeKey(block) === codeKey(formed)) || formed
}
export const blockYear = (block: string) => Number(/-?([1-5])[A-Z]$/.exec(block)?.[1]) || null
export function parseYear(value: string) {
  const text = clean(value).toUpperCase()
  const digit = /([1-4])/.exec(text)?.[1]
  if (digit) return Number(digit)
  const roman = /\b(IV|III|II|I)\b/.exec(text)?.[1]
  return roman ? ({ I: 1, II: 2, III: 3, IV: 4 } as Record<string, number>)[roman] : null
}
export function mapProgram(value: string) {
  const text = clean(value)
  if (!text) return ''
  return CIT_PROGRAMS.find(program => program.toLowerCase() === text.toLowerCase()) || (/information\s*technology|^bs\s*-?\s*it\b|^it$/i.test(text) ? CIT_PROGRAMS[0] || text : text)
}
/** "Dela Cruz, Juan P." or "Juan P. Dela Cruz". Comma order is the EduSuite form. */
export function splitName(value: string) {
  const text = clean(value)
  if (text.includes(',')) {
    const [surname, rest] = [text.slice(0, text.indexOf(',')), text.slice(text.indexOf(',') + 1)].map(clean)
    const tokens = rest.split(' ').filter(Boolean)
    const middle = tokens.length > 1 && /^[A-Z]\.?$/i.test(tokens[tokens.length - 1]) ? tokens.pop()! : ''
    return { surname, first_name: tokens.join(' '), middle_name: middle.replace(/\.$/, '') }
  }
  const tokens = text.split(' ').filter(Boolean)
  if (tokens.length < 2) return { surname: '', first_name: text, middle_name: '' }
  const surname = tokens.pop()!, middle = tokens.length > 1 && /^[A-Z]\.?$/i.test(tokens[tokens.length - 1]) ? tokens.pop()!.replace(/\.$/, '') : ''
  return { surname, first_name: tokens.join(' '), middle_name: middle }
}
const slug = (value: string) => clean(value).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9-]/g, '')
/** Institutional convention used by the official provisioning script: surname@123. */
export const initialStudentPassword = (surname: string, first: string) => `${slug(surname) || slug(first) || 'student'}@123`
export const studentEmail = (number: string) => `${clean(number).toLowerCase()}@gmail.com`

export type CourseRef = { code: string; title: string }
export type LoadRef = { key: string; code: string; block: string; instructorId: string; instructorName: string }
export type DirectoryStudent = { id: string; student_number: string; name: string; status: string; block?: string | null; type?: string | null }
export type DirectoryInstructor = { id: string; name: string; email: string; status: string; employee_id?: string }
export type PlannedClass = { course_code: string; course_title?: string; block: string; instructor?: string }
export type PlannedStudent = {
  student_number: string; surname: string; first_name: string; middle_name: string; name: string; email: string; year_level: number; program: string
  placement: 'block' | 'irregular' | 'none'; block?: string; courses: PlannedClass[]; reasons: string[]; account: 'new' | 'existing' | 'suspended'; password: string
}
export type StudentPlan = { students: PlannedStudent[]; rejected: { row: number; reason: string }[]; header: number; blocks: { block: string; count: number; existing: number }[]; context: Record<string, string> }

export function planStudentList(grid: Grid, input: { courses: CourseRef[]; blocks: string[]; students: DirectoryStudent[]; loads: LoadRef[]; rosterCounts?: Record<string, number> }): StudentPlan {
  const fields = ['studentNumber', 'surname', 'firstName', 'middleName', 'fullName', 'year', 'program', 'block', 'subject', 'title', 'type', 'email'] as const
  const header = findHeader(grid, fields, c => c.studentNumber !== undefined && (c.surname !== undefined || c.fullName !== undefined))
  if (!header) throw new Error('No header row with a student number and a student name was found. Use the EduSuite student list download.')
  const { columns: c, context } = header
  const cell = (row: string[], field: (typeof fields)[number]) => c[field] === undefined ? '' : clean(row[c[field]!])
  const defaultBlock = fromContext(context, 'block'), defaultSubject = fromContext(context, 'subject'), defaultTitle = fromContext(context, 'title')
  const defaultYear = fromContext(context, 'year'), defaultProgram = fromContext(context, 'program')
  const grouped = new Map<string, { rows: string[][]; first: number }>(), rejected: StudentPlan['rejected'] = []
  grid.slice(header.index + 1).forEach((row, offset) => {
    const number = cell(row, 'studentNumber')
    if (!/\d/.test(number)) return // headings, footers and totals carry no student number
    if (!/^[A-Za-z0-9-]{1,80}$/.test(number)) { if (row.filter(Boolean).length > 1) rejected.push({ row: header.index + offset + 2, reason: number ? `Student number "${number}" is not valid` : 'Student number missing' }); return }
    const group = grouped.get(number.toLowerCase()) || { rows: [], first: header.index + offset + 2 }
    group.rows.push(row); grouped.set(number.toLowerCase(), group)
  })
  const existing = new Map(input.students.map(s => [s.student_number.toLowerCase(), s]))
  const loadByClass = new Map(input.loads.map(l => [`${codeKey(l.code)}|${codeKey(l.block)}`, l]))
  const titleOf = (code: string) => input.courses.find(course => codeKey(course.code) === codeKey(code))?.title
  const students: PlannedStudent[] = []
  for (const [, group] of grouped) {
    const first = group.rows[0], pick = (field: (typeof fields)[number]) => group.rows.map(row => cell(row, field)).find(Boolean) || ''
    const number = cell(first, 'studentNumber')
    const named = c.surname !== undefined ? { surname: pick('surname'), first_name: pick('firstName'), middle_name: pick('middleName') } : splitName(pick('fullName'))
    if (!named.first_name) { rejected.push({ row: group.first, reason: `First name missing for ${number}` }); continue }
    const rowsBlocks = group.rows.map(row => ({ raw: cell(row, 'block') || defaultBlock, code: normalizeCourseCode(cell(row, 'subject') || defaultSubject), title: cell(row, 'title') || defaultTitle, type: cell(row, 'type') }))
    const blocks = [...new Set(rowsBlocks.map(r => normalizeBlock(r.raw, input.blocks)).filter(Boolean))]
    const year = parseYear(pick('year') || defaultYear) || (blocks.length === 1 ? blockYear(blocks[0]) : null)
    const program = mapProgram(pick('program') || defaultProgram) || CIT_PROGRAMS[0] || ''
    if (!year) { rejected.push({ row: group.first, reason: `Year level missing for ${number}` }); continue }
    const reasons: string[] = []
    const marked = rowsBlocks.some(r => isIrregularMark(r.type) || isIrregularMark(r.raw))
    if (marked) reasons.push('Marked irregular in the EduSuite list')
    if (blocks.length > 1) reasons.push(`Takes classes in ${blocks.join(' and ')}`)
    if (blocks.length === 1 && blockYear(blocks[0]) && blockYear(blocks[0]) !== year) reasons.push(`Year ${year} student in a Year ${blockYear(blocks[0])} block`)
    const classes = rowsBlocks.filter(r => r.code)
    if (!blocks.length && classes.length) reasons.push('No block section; enrolled per subject')
    const irregular = reasons.length > 0
    const courses: PlannedClass[] = []
    if (irregular) for (const r of classes) {
      const block = normalizeBlock(r.raw, input.blocks) || ''
      if (!block) { reasons.push(`Class section missing for ${r.code}`); continue }
      if (courses.some(x => codeKey(x.course_code) === codeKey(r.code) && x.block === block)) continue
      courses.push({ course_code: r.code, course_title: r.title || titleOf(r.code), block, instructor: loadByClass.get(`${codeKey(r.code)}|${codeKey(block)}`)?.instructorName })
    }
    const prior = existing.get(number.toLowerCase())
    const name = [named.first_name, named.middle_name, named.surname].filter(Boolean).join(' ')
    students.push({ student_number: number, ...named, name, email: clean(pick('email')).toLowerCase() || studentEmail(number), year_level: year, program,
      placement: irregular ? 'irregular' : blocks.length ? 'block' : 'none', block: irregular ? undefined : blocks[0], courses, reasons,
      account: !prior ? 'new' : prior.status === 'suspended' ? 'suspended' : 'existing', password: initialStudentPassword(named.surname, named.first_name) })
  }
  const counts = new Map<string, number>()
  students.filter(s => s.placement === 'block').forEach(s => counts.set(s.block!, (counts.get(s.block!) || 0) + 1))
  const blocks = [...counts].map(([block, count]) => ({ block, count, existing: input.rosterCounts?.[block] || 0 })).sort((a, b) => a.block.localeCompare(b.block))
  return { students: students.sort((a, b) => a.placement.localeCompare(b.placement) || (a.block || '').localeCompare(b.block || '') || a.surname.localeCompare(b.surname)), rejected, header: header.index + 1, blocks, context }
}

export type PlannedLoad = { row: number; instructorText: string; instructor?: DirectoryInstructor; match?: string; course_code: string; course_title: string; block: string; semester: string; status: 'new' | 'reassign' | 'unchanged' | 'problem'; previous?: string; problem?: string }
const TITLES = /^(mr|mrs|ms|miss|dr|engr|prof|sir|maam|madam|atty|rev|fr|sr)\.?$/i
const nameTokens = (value: string) => {
  const text = clean(value).toLowerCase()
  const ordered = text.includes(',') ? `${text.slice(text.indexOf(',') + 1)} ${text.slice(0, text.indexOf(','))}` : text
  return ordered.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s-]/g, ' ').split(/\s+/).filter(t => t && !TITLES.test(t) && t.length > 1)
}
/** Email, then employee ID, then full name, then a unique surname. Ambiguous names are never guessed. */
export function matchInstructor(text: string, instructors: DirectoryInstructor[], extra: { email?: string; employeeId?: string } = {}) {
  const active = instructors
  if (extra.email) { const hit = active.find(i => i.email.toLowerCase() === extra.email!.toLowerCase()); if (hit) return { instructor: hit, match: 'email' } }
  if (extra.employeeId) { const hit = active.find(i => i.employee_id && i.employee_id.toLowerCase() === extra.employeeId!.toLowerCase()); if (hit) return { instructor: hit, match: 'employee ID' } }
  const wanted = nameTokens(text)
  if (!wanted.length) return { problem: 'Instructor name missing' }
  const full = active.filter(i => { const have = nameTokens(i.name); return wanted.every(t => have.includes(t)) || have.every(t => wanted.includes(t)) })
  if (full.length === 1) return { instructor: full[0], match: 'name' }
  const surname = text.includes(',') ? nameTokens(text.slice(0, text.indexOf(','))).pop() : wanted[wanted.length - 1]
  const bySurname = active.filter(i => nameTokens(i.name).slice(-1)[0] === surname)
  if (bySurname.length === 1) return { instructor: bySurname[0], match: 'surname' }
  return { problem: bySurname.length > 1 || full.length > 1 ? `Several instructors match "${text}"` : `No instructor account matches "${text}"` }
}

export function planCourseLoads(grid: Grid, input: { instructors: DirectoryInstructor[]; courses: CourseRef[]; loads: LoadRef[]; blocks: string[] }) {
  const fields = ['instructor', 'employeeId', 'email', 'subject', 'title', 'block', 'semester', 'units'] as const
  const header = findHeader(grid, fields, c => c.subject !== undefined && (c.block !== undefined || c.instructor !== undefined))
  if (!header) throw new Error('No header row with a subject (course) code was found. Use the EduSuite faculty load download.')
  const { columns: c, context } = header
  const cell = (row: string[], field: (typeof fields)[number]) => c[field] === undefined ? '' : clean(row[c[field]!])
  const defaultInstructor = fromContext(context, 'instructor') || (c.instructor === undefined ? context.name || '' : ''), defaultBlock = fromContext(context, 'block'), defaultSemester = fromContext(context, 'semester')
  const loads: PlannedLoad[] = [], seen = new Set<string>()
  grid.slice(header.index + 1).forEach((row, offset) => {
    const code = normalizeCourseCode(cell(row, 'subject'))
    if (!code || /^total/i.test(code)) return
    const rowNumber = header.index + offset + 2, instructorText = cell(row, 'instructor') || defaultInstructor
    const known = input.courses.find(course => codeKey(course.code) === codeKey(code))
    const title = known?.title || cell(row, 'title')
    const block = normalizeBlock(cell(row, 'block') || defaultBlock, input.blocks)
    const semester = cell(row, 'semester') || defaultSemester
    const plan: PlannedLoad = { row: rowNumber, instructorText, course_code: known?.code || code, course_title: title, block, semester, status: 'problem' }
    const matched = matchInstructor(instructorText, input.instructors, { email: cell(row, 'email'), employeeId: cell(row, 'employeeId') })
    if ('instructor' in matched && matched.instructor) { plan.instructor = matched.instructor; plan.match = matched.match }
    if (!plan.instructor) plan.problem = 'problem' in matched ? matched.problem : 'Instructor not found'
    else if (plan.instructor.status === 'suspended') plan.problem = `${plan.instructor.name} is suspended`
    else if (!block) plan.problem = 'Block section missing'
    else if (!known && !title) plan.problem = `${code} is not in the course list and has no title`
    else {
      const key = `${codeKey(plan.course_code)}|${codeKey(block)}|${plan.instructor.id}`
      if (seen.has(key)) return
      seen.add(key)
      const prior = input.loads.find(l => codeKey(l.code) === codeKey(plan.course_code) && codeKey(l.block) === codeKey(block))
      plan.status = !prior ? 'new' : prior.instructorId === plan.instructor.id ? 'unchanged' : 'reassign'
      if (prior && plan.status === 'reassign') plan.previous = prior.instructorName
    }
    loads.push(plan)
  })
  return { loads, header: header.index + 1, context }
}

export const chunk = <T,>(items: T[], size: number) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size))
