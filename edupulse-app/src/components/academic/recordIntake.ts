export const INTAKE_FIELDS = {
  courses: ['CourseCode', 'CourseTitle', 'Units', 'Classification', 'Hours', 'Prerequisites', 'YearLevel', 'Semester'],
  loads: ['InstructorID', 'InstructorName', 'Email', 'CourseCode', 'Block', 'Semester'],
  rosters: ['StudentID', 'Name', 'Email', 'YearLevel', 'Block', 'Schedule', 'Status'],
} as const
export type IntakeKind = keyof typeof INTAKE_FIELDS
export type IntakeRow = Record<string, string>
// Quoted commas/newlines and escaped quotes are supported; malformed CSV is rejected.
export function parseIntake(text: string, kind: IntakeKind) {
  if (new TextEncoder().encode(text).length > 1_000_000) throw new Error('CSV files must be at most 1 MB.')
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false, closed = false
  const finishCell = () => { row.push(cell.trim()); cell = ''; closed = false }
  const finishRow = () => { finishCell(); if (row.some(Boolean)) rows.push(row); row = [] }
  text = text.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n')
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index++ }
      else if (char === '"') { quoted = false; closed = true }
      else cell += char
    } else if (char === '"') { if (cell || closed) throw new Error('Unexpected quote in CSV.'); quoted = true }
    else if (char === ',') finishCell()
    else if (char === '\n' || char === '\r') finishRow()
    else if (closed && char.trim()) throw new Error('Unexpected text after a quoted CSV field.')
    else if (!closed) cell += char
  }
  if (quoted) throw new Error('Unclosed quoted CSV field.')
  if (cell || row.length || closed) finishRow()
  const headers = rows.shift() || []
  const fields = INTAKE_FIELDS[kind]
  const optional=kind==='loads' ? ['HasMasters','Specialization'] : kind==='rosters'?['Adviser']:[]
  if (new Set(headers).size !== headers.length || fields.some(field => !headers.includes(field)) || headers.some(header => ![...fields,...optional].includes(header))) throw new Error(`Expected these columns: ${fields.join(', ')}. ${optional.length ? `Optional: ${optional.join(', ')}.` : ''}`)
  if (!rows.length || rows.length > 1000) throw new Error('Provide between 1 and 1,000 data rows.')
  const required = kind === 'courses' ? ['CourseCode', 'CourseTitle'] : kind === 'loads' ? ['InstructorID', 'InstructorName', 'Email', 'CourseCode', 'Block'] : ['StudentID', 'Name', 'Email', 'Block']
  const accepted: IntakeRow[] = [], errors: { row: number; message: string }[] = []
  const keys = new Set<string>()
  rows.forEach((values, index) => {
    const record = Object.fromEntries(headers.map((header, column) => [header, values[column] || '']))
    const key = intakeKey(record, kind)
    const message = values.length !== headers.length ? 'Column count mismatch' : values.some(value => value.length > 500) ? 'A field exceeds 500 characters' : required.some(field => !record[field]) ? 'Required field missing' : record.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.Email) ? 'Invalid email' : keys.has(key) ? 'Duplicate row key in this file' : ''
    if (message) errors.push({ row: index + 2, message })
    else { keys.add(key); accepted.push(record) }
  })
  return { headers, accepted, errors, total: rows.length }
}
export function intakeKey(row: IntakeRow, kind: IntakeKind) {
  return (kind === 'courses' ? row.CourseCode : kind === 'loads' ? [row.CourseCode, row.Block, row.Semester].join('|') : row.StudentID).toLowerCase()
}
export function mergeIntake(previous: IntakeRow[], next: IntakeRow[], kind: IntakeKind) {
  const map = new Map(previous.map(row => [intakeKey(row, kind), row]))
  let created = 0, updated = 0
  next.forEach(row => { if (map.has(intakeKey(row, kind))) updated++; else created++; map.set(intakeKey(row, kind), row) })
  if (map.size > 1000) throw new Error('This import would exceed 1,000 saved rows. Export and reduce the intake file first.')
  return { rows: [...map.values()], created, updated }
}
