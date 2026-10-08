// Reads a class list (an EduSuite export or any table of students) from the text that the
// sandboxed extractor returns for CSV, PDF, DOCX, HTML or plain-text files. Pure and
// deterministic: nothing is guessed, rows without a student name are reported as skipped.

export const ROSTER_HEADERS = ['StudentID', 'Name', 'Email', 'YearLevel', 'Block']
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/
const STUDENT_ID = /\b(?:[A-Z]{2,4}-)?\d{2,4}-\d{3,7}\b|\b[A-Z]{2,4}-\d{4,8}\b|\b\d{7,12}\b/
const BLOCK = /\bBSIT[\s-]?([1-4])[\s-]?([A-H])\b/i
const ROSTER_WORDS = /\b(class\s*list|roster|master\s*list|enrol(?:l)?ment|enrolled|students?|learners?|block\s*section|edusuite)\b/i

const COLUMNS = [
  ['studentId', /^(?:student\s*)?(?:id|no\.?|number|#)(?:\s*(?:no\.?|number))?$|^(?:student|learner|school)\s*(?:id|no\.?|number|reference)|^lrn$|^id\s*(?:no\.?|number)$/i],
  ['email', /e-?mail/i],
  ['lastName', /^(?:last|family|sur)\s*name$|^surname$/i],
  ['firstName', /^(?:first|given)\s*name$/i],
  ['middleName', /^(?:middle)\s*(?:name|initial|i\.?)$|^m\.?\s*i\.?$/i],
  ['name', /^(?:student\s*|full\s*|learner\s*)?name$|^(?:student|learner)$|^name\s*of\s*students?$/i],
  ['yearLevel', /^year(?:\s*level)?$|^yr\.?(?:\s*level)?$|^level$/i],
  ['block', /^(?:block(?:\s*section)?|section|class|block\/section)$/i],
  ['course', /^(?:course(?:\s*code)?|subject(?:\s*code)?)$/i],
]

const clean = value => String(value ?? '').replace(/^﻿/, '').replace(/\s+/g, ' ').trim()
export const normalizeBlock = value => { const m = BLOCK.exec(value || ''); return m ? `BSIT-${m[1]}${m[2].toUpperCase()}` : '' }
const nameKey = name => clean(name).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '').split(' ').filter(Boolean).sort().join(' ')
/** Identity used to merge class lists: student ID, then email, then the name's words in any order. */
export const studentKey = s => s.StudentID ? `id:${s.StudentID.toLowerCase()}` : s.Email ? `email:${s.Email.toLowerCase()}` : `name:${nameKey(s.Name)}`

/** Splits one delimited line, honouring double quotes ("Santos, Juan"). */
function splitLine(line, delimiter) {
  if (delimiter === '|') return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(clean)
  const cells = []; let cell = '', quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { if (quoted && line[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted }
    else if (ch === delimiter && !quoted) { cells.push(clean(cell)); cell = '' }
    else cell += ch
  }
  cells.push(clean(cell))
  return cells
}

function mapHeader(cells) {
  const map = {}
  cells.forEach((cell, index) => {
    const label = cell.replace(/[*:]+$/, '').trim()
    const found = COLUMNS.find(([key, pattern]) => map[key] === undefined && pattern.test(label))
    if (found) map[found[0]] = index
  })
  return map
}

const isName = value => /^[\p{L}][\p{L}'’.-]*(?:,?\s+[\p{L}][\p{L}'’.-]*){1,5}$/u.test(clean(value)) && !EMAIL.test(value)
function personName(row, map) {
  if (map.name !== undefined && clean(row[map.name])) {
    const name = clean(row[map.name])
    // "Santos, Juan P." becomes "Juan P. Santos", matching how EduPulse shows names.
    const comma = /^([^,]+),\s*(.+)$/.exec(name)
    return comma ? `${comma[2]} ${comma[1]}` : name
  }
  const middle = clean(row[map.middleName])
  return [clean(row[map.firstName]), middle && middle.length <= 2 ? `${middle.replace(/\.$/, '')}.` : middle, clean(row[map.lastName])].filter(Boolean).join(' ')
}

function tableRoster(lines) {
  for (const delimiter of [',', '\t', '|', ';']) {
    const headerIndex = lines.slice(0, 15).findIndex(line => {
      if (!line.includes(delimiter)) return false
      const map = mapHeader(splitLine(line, delimiter))
      return map.name !== undefined || (map.lastName !== undefined && map.firstName !== undefined)
    })
    if (headerIndex < 0) continue
    const headerCells = splitLine(lines[headerIndex], delimiter), map = mapHeader(headerCells)
    const students = [], skipped = []
    for (const [offset, line] of lines.slice(headerIndex + 1).entries()) {
      if (delimiter === '|' && /^\s*\|?[\s:|-]+\|?\s*$/.test(line)) continue
      if (!line.includes(delimiter)) continue
      const row = splitLine(line, delimiter)
      const name = personName(row, map)
      if (!name || !isName(name)) { if (row.some(Boolean)) skipped.push({ line: headerIndex + offset + 2, reason: 'no student name' }); continue }
      const email = (EMAIL.exec(clean(row[map.email])) || [''])[0]
      students.push({ StudentID: clean(row[map.studentId]), Name: name, Email: email, YearLevel: clean(row[map.yearLevel]).replace(/\D/g, '').slice(0, 1), Block: normalizeBlock(row[map.block]) || clean(row[map.block]), Course: clean(row[map.course]) })
    }
    return { students, skipped, headers: headerCells, format: delimiter === ',' ? 'comma-separated table' : delimiter === '\t' ? 'tab-separated table' : delimiter === '|' ? 'table' : 'semicolon-separated table' }
  }
  return null
}

/** Lines such as "1. 2023-00123  Juan P. Santos  juan.santos@kcp.edu.ph" from PDF or DOCX class lists. */
function lineRoster(lines) {
  const students = []
  for (const line of lines) {
    const id = (STUDENT_ID.exec(line) || [''])[0], email = (EMAIL.exec(line) || [''])[0]
    if (!id && !email) continue
    const rest = clean(line.replace(id, ' ').replace(email, ' ').replace(BLOCK, ' ').replace(/^\s*\d{1,3}[.)]\s+/, '').replace(/[|,;\t]+/g, ' '))
    const name = (/[\p{L}][\p{L}'’.-]*(?:\s+[\p{L}][\p{L}'’.-]*){1,5}/u.exec(rest) || [''])[0]
    if (!isName(name)) continue
    students.push({ StudentID: id, Name: name, Email: email, YearLevel: '', Block: normalizeBlock(line), Course: '' })
  }
  return { students, skipped: [], headers: ROSTER_HEADERS, format: 'list of student lines' }
}

/**
 * Parses a class list. Returns null when the text is not a class list (fewer
 * than two students, or a free-text document without IDs, emails or a name column).
 */
export function parseRoster(text, fileName = '') {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map(line => line.replace(/^\[\[(?:Page|Slide) \d+\]\]$/, '')).filter(line => line.trim())
  let result = tableRoster(lines)
  if (!result || result.students.length < 2) {
    // Free-text lists are accepted only when the file presents itself as a class list.
    if (!ROSTER_WORDS.test(`${fileName} ${lines.slice(0, 8).join(' ')}`)) return null
    result = lineRoster(lines)
  }
  if (result.students.length < 2) return null
  const seen = new Set(), students = []
  let duplicates = 0
  for (const student of result.students) {
    const key = studentKey(student)
    if (seen.has(key)) { duplicates++; continue }
    seen.add(key); students.push(student)
  }
  const blocks = students.map(s => normalizeBlock(s.Block)).filter(Boolean)
  const block = blocks.length ? mode(blocks) : normalizeBlock(`${fileName} ${lines.slice(0, 10).join(' ')}`)
  const warnings = []
  if (result.skipped.length) warnings.push(`${result.skipped.length} row${result.skipped.length === 1 ? '' : 's'} without a student name ${result.skipped.length === 1 ? 'was' : 'were'} skipped (line${result.skipped.length === 1 ? '' : 's'} ${result.skipped.slice(0, 5).map(s => s.line).join(', ')}${result.skipped.length > 5 ? ', …' : ''}).`)
  if (duplicates) warnings.push(`${duplicates} duplicate row${duplicates === 1 ? '' : 's'} in the file ${duplicates === 1 ? 'was' : 'were'} merged.`)
  const missingIds = students.filter(s => !s.StudentID).length
  if (missingIds) warnings.push(`${missingIds} student${missingIds === 1 ? ' has' : 's have'} no student ID; ${missingIds === 1 ? 'that row is' : 'those rows are'} matched by email or name.`)
  if (new Set(blocks).size > 1) warnings.push(`The file lists more than one block (${[...new Set(blocks)].join(', ')}).`)
  return { students: students.map(({ Course: _course, ...s }) => ({ ...s, Block: normalizeBlock(s.Block) || s.Block || block })), courseValues: [...new Set(result.students.map(s => s.Course).filter(Boolean))], block, warnings, format: result.format, skipped: result.skipped.length, duplicates }
}

function mode(values) {
  const counts = new Map()
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

/**
 * Merges a parsed class list into an existing registration's students.
 * Returns the merged list plus how many were new and how many were already registered.
 */
export function mergeStudents(existing = [], incoming = []) {
  const byKey = new Map(existing.map(s => [studentKey(s), s]))
  let added = 0, already = 0
  for (const student of incoming) {
    const key = studentKey(student)
    // A student listed without an ID is recognised again by email or name; two different IDs are two students.
    const match = byKey.get(key) || [...byKey.values()].find(s => (!s.StudentID || !student.StudentID || s.StudentID.toLowerCase() === student.StudentID.toLowerCase()) && ((student.Email && s.Email?.toLowerCase() === student.Email.toLowerCase()) || nameKey(s.Name) === nameKey(student.Name)))
    if (match) { already++; continue }
    byKey.set(key, student); added++
  }
  return { students: [...byKey.values()], added, already }
}

/**
 * Registers a class list for a course and block. A second list for the same course and
 * block (by the same instructor) is merged into the first, so students are never duplicated.
 * Returns the new registrations and what changed, including what Undo needs.
 */
export function applyRegistration(registrations, { courseCode, courseTitle = '', blockSection, students, fileName, uploadedBy, date = new Date().toISOString().slice(0, 10), id = `reg-${crypto.randomUUID().slice(0, 8)}` }) {
  const index = registrations.findIndex(r => r.courseCode === courseCode && r.blockSection === blockSection && r.uploadedBy === uploadedBy)
  if (index < 0) {
    const registration = { id, courseCode, courseTitle, blockSection, studentCount: students.length, fileName, students, headers: ROSTER_HEADERS, uploadedBy, uploadedDate: date, status: 'active' }
    return { registrations: [...registrations, registration], registration, previous: null, added: students.length, already: 0 }
  }
  const previous = registrations[index]
  const merge = mergeStudents(previous.students || [], students)
  const registration = { ...previous, courseTitle: previous.courseTitle || courseTitle, students: merge.students, headers: ROSTER_HEADERS, studentCount: merge.students.length, fileName, uploadedDate: date, status: 'active' }
  return { registrations: registrations.map((r, i) => i === index ? registration : r), registration, previous, added: merge.added, already: merge.already }
}

/** Reverses one applyRegistration result, leaving every other registration as it is now. */
export function undoRegistration(registrations, result) {
  return result.previous ? registrations.map(r => r.id === result.registration.id ? result.previous : r) : registrations.filter(r => r.id !== result.registration.id)
}
