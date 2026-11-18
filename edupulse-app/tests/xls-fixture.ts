/** Builds small Excel 97-2003 (.xls) files for tests: BIFF8 records inside a version 3 compound file.
 * Synthetic content only; the registrar's real class lists stay outside the repository. */
const END = 0xfffffffe, FREE = 0xffffffff, NO_STREAM = 0xffffffff, FAT_SECTOR = 0xfffffffd

const u16 = (n: number) => [n & 255, n >> 8 & 255]
const u32 = (n: number) => [n & 255, n >>> 8 & 255, n >>> 16 & 255, n >>> 24 & 255]
const f64 = (n: number) => { const bytes = new Uint8Array(8); new DataView(bytes.buffer).setFloat64(0, n, true); return [...bytes] }
const latin = (s: string) => [...s].map(c => c.charCodeAt(0) & 255)
const utf16 = (s: string) => [...s].flatMap(c => u16(c.charCodeAt(0)))
const record = (type: number, body: number[]) => [...u16(type), ...u16(body.length), ...body]
const bof = (kind: number) => record(0x0809, [...u16(0x0600), ...u16(kind), ...u16(0x0dbb), ...u16(0x07cc), ...u32(0), ...u32(6)])

export type XlsCell = string | number | boolean | { formula: string } | null
export type XlsFixture = {
  /** Write text as LABEL records instead of shared strings. */
  labels?: boolean
  /** Split shared string `index` after `at` characters into a CONTINUE record, optionally switching to UTF-16. */
  split?: { index: number; at: number; wide: boolean }
  /** Shared strings written with a formatting run and phonetic data after their characters. */
  rich?: string[]
}

function sharedStrings(strings: string[], options: XlsFixture) {
  const encode = (s: string) => options.rich?.includes(s)
    ? [...u16(s.length), 0x0c, ...u16(1), ...u32(4), ...latin(s), 0, 0, 1, 0, 9, 8, 7, 6]
    : [...u16(s.length), 0, ...latin(s)]
  const head = [...u32(strings.length), ...u32(strings.length)]
  const split = options.split
  if (!split) return record(0x00fc, [...head, ...strings.flatMap(encode)])
  const target = strings[split.index], rest = target.slice(split.at)
  return [
    ...record(0x00fc, [...head, ...strings.slice(0, split.index).flatMap(encode), ...u16(target.length), 0, ...latin(target.slice(0, split.at))]),
    ...record(0x003c, [split.wide ? 1 : 0, ...(split.wide ? utf16(rest) : latin(rest)), ...strings.slice(split.index + 1).flatMap(encode)]),
  ]
}

/** The workbook stream: globals (sheet list, shared strings) followed by one substream per sheet. */
export function workbookStream(sheets: { name: string; rows: XlsCell[][] }[], options: XlsFixture = {}) {
  const strings: string[] = []
  const shared = (s: string) => { const found = strings.indexOf(s); if (found >= 0) return found; strings.push(s); return strings.length - 1 }
  const bodies = sheets.map(sheet => {
    const cells: number[] = []
    sheet.rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const value = row[c], at = [...u16(r), ...u16(c), 0, 0]
        if (value === null || value === '') continue
        if (typeof value === 'string') cells.push(...(options.labels ? record(0x0204, [...at, ...u16(value.length), 0, ...latin(value)]) : record(0x00fd, [...at, ...u32(shared(value))])))
        else if (typeof value === 'boolean') cells.push(...record(0x0205, [...at, value ? 1 : 0, 0]))
        else if (typeof value === 'number') {
          let end = c
          while (Number.isInteger(value) && typeof row[end + 1] === 'number' && Number.isInteger(row[end + 1])) end++
          if (end > c) {
            const body = [...u16(r), ...u16(c)]
            for (let k = c; k <= end; k++) body.push(0, 0, ...u32(((row[k] as number) << 2 | 2) >>> 0))
            cells.push(...record(0x00bd, [...body, ...u16(end)]))
            c = end
          } else if (Number.isInteger(value)) cells.push(...record(0x027e, [...at, ...u32((value << 2 | 2) >>> 0)]))
          else cells.push(...record(0x0203, [...at, ...f64(value)]))
        } else cells.push(...record(0x0006, [...at, 0, 0, 0, 0, 0, 0, 0xff, 0xff, 0, 0, 0, 0, 0, 0, 0, 0]), ...record(0x0207, [...u16(value.formula.length), 0, ...latin(value.formula)]))
      }
    })
    return [...bof(0x0010), ...cells, ...record(0x000a, [])]
  })
  const sheetRecords = sheets.map(sheet => record(0x0085, [...u32(0), 0, 0, sheet.name.length, 0, ...latin(sheet.name)]))
  const before = [...bof(0x0005), ...record(0x005c, [...u16(10), 0, ...latin('LAB 310-35')])]
  const after = [...sharedStrings(strings, options), ...record(0x000a, [])]
  const globals = before.length + sheetRecords.reduce((n, r) => n + r.length, 0) + after.length
  let offset = globals
  sheetRecords.forEach((r, i) => { r.splice(4, 4, ...u32(offset)); offset += bodies[i].length })
  return new Uint8Array([...before, ...sheetRecords.flat(), ...after, ...bodies.flat()])
}

/** A version 3 compound file holding one stream. Streams under 4096 bytes go to the mini stream. */
export function compoundFile(name: string, stream: Uint8Array) {
  const size = 512, sectors: Uint8Array[] = [], fat: number[] = []
  const chain = (bytes: Uint8Array) => {
    const start = sectors.length, count = Math.max(1, Math.ceil(bytes.length / size))
    for (let i = 0; i < count; i++) { const sector = new Uint8Array(size); sector.set(bytes.subarray(i * size, (i + 1) * size)); sectors.push(sector); fat.push(i === count - 1 ? END : start + i + 1) }
    return start
  }
  let entryStart = 0, rootStart = END, rootSize = 0, miniFatStart = END, miniFatCount = 0
  if (stream.length >= 4096) entryStart = chain(stream)
  else {
    const minis = Math.max(1, Math.ceil(stream.length / 64)), mini = new Uint8Array(minis * 64), miniFat = new Uint8Array(size).fill(0xff)
    mini.set(stream)
    for (let i = 0; i < minis; i++) miniFat.set(u32(i === minis - 1 ? END : i + 1), i * 4)
    miniFatStart = chain(miniFat); miniFatCount = 1
    rootStart = chain(mini); rootSize = mini.length
  }
  const directory = new Uint8Array(size)
  const entry = (n: number, entryName: string, type: number, start: number, length: number, child: number) => {
    const at = n * 128
    directory.set(utf16(entryName), at)
    directory.set(u16((entryName.length + 1) * 2), at + 0x40)
    directory[at + 0x42] = type
    directory[at + 0x43] = 1
    directory.set([...u32(NO_STREAM), ...u32(NO_STREAM), ...u32(child)], at + 0x44)
    directory.set([...u32(start), ...u32(length)], at + 0x74)
  }
  entry(0, 'Root Entry', 5, rootStart, rootSize, 1)
  entry(1, name, 2, entryStart, stream.length, NO_STREAM)
  for (const n of [2, 3]) directory.set([...u32(NO_STREAM), ...u32(NO_STREAM), ...u32(NO_STREAM)], n * 128 + 0x44)
  const directoryStart = chain(directory)
  const fatAt = sectors.length
  fat.push(FAT_SECTOR)
  if (fat.length > size / 4) throw new Error('The fixture is too large for one FAT sector.')
  const fatBytes = new Uint8Array(size).fill(0xff)
  fat.forEach((value, i) => fatBytes.set(u32(value), i * 4))
  sectors.push(fatBytes)
  const header = new Uint8Array(size)
  header.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
  header.set([...u16(0x3e), ...u16(3), ...u16(0xfffe), ...u16(9), ...u16(6)], 0x18)
  header.set([...u32(1), ...u32(directoryStart), ...u32(0), ...u32(4096), ...u32(miniFatStart), ...u32(miniFatCount), ...u32(END), ...u32(0)], 0x2c)
  for (let i = 0; i < 109; i++) header.set(u32(i === 0 ? fatAt : FREE), 0x4c + i * 4)
  const out = new Uint8Array(size * (sectors.length + 1))
  out.set(header)
  sectors.forEach((sector, i) => out.set(sector, (i + 1) * size))
  return out
}

export const buildXls = (sheets: { name: string; rows: XlsCell[][] }[], options: XlsFixture = {}) => compoundFile('Workbook', workbookStream(sheets, options))

type ClassListFixture = { code?: string; title?: string; section?: string; time?: string; meetings?: [string, string, string][]; students?: [string, string, string, string?][]; declared?: number; faculty?: string }

/** A class list report laid out like the registrar's export, with made-up students. */
export function classListRows({ code = 'WMADE 3', title = 'Web and Mobile Application Development Elective 3', section = '4', time = '07:30 am', meetings, students = [], declared = students.length, faculty = 'TESTER, Faye' }: ClassListFixture = {}) {
  const schedule = meetings || [['Mon', time, 'A322'], ['Tue', time, 'A322']]
  const rows: XlsCell[][] = [
    ['Date Generated: 09/10/2026 5:36 PM'], ["King's College of the Philippines"], ['College of Information Technology'], [],
    ['First Semester   S.Y. 2026-2027'], [], [`${code} - ${section} - ${code} - ${title} - [3.0]`],
    [`Faculty: ${faculty}`], ...schedule.map(([day, at, room], i) => [i ? null : 'Schedule', `${day} ${at}`, null, room]), [],
    [null, null, 'Student Name', 'Sex', 'Student Number', 'Program Code', 'Enrollment Status'],
    ...students.map(([name, sex, number, status = 'Enrolled'], i) => [null, i + 1, name, sex, number, 'BSIT-WMAD', status]),
    [], [null, `*** [${declared}] student(s) listed ***`], [], [], [], ["Teacher's Signature: ___________________", null, null, "Supervisor's Signature: _____________________"],
  ]
  return rows
}
