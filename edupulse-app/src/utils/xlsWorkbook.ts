/** Reads the Excel 97-2003 workbook format (.xls): BIFF8 (or BIFF5) records inside a compound file.
 * The registrar's class lists are exported in this format. Cell text, numbers, booleans and formula
 * results are read; styles, charts and macros are ignored. Nothing in the file is executed. */

export type XlsSheet = { name: string; rows: string[][] }

const SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
const END_OF_CHAIN = 0xfffffffe
const FREE_SECTOR = 0xffffffff
const MAX_ROWS = 65536, MAX_COLUMNS = 256, MAX_CELLS = 200_000

export const isCompoundFile = (bytes: Uint8Array) => bytes.length >= 512 && SIGNATURE.every((value, index) => bytes[index] === value)

const damaged = () => new Error('This Excel file is damaged or incomplete. Open it in Excel, save it again and upload it.')
const word = (bytes: Uint8Array, at: number) => bytes[at] | bytes[at + 1] << 8
const dword = (bytes: Uint8Array, at: number) => (bytes[at] | bytes[at + 1] << 8 | bytes[at + 2] << 16 | bytes[at + 3] << 24) >>> 0
const table = (bytes: Uint8Array) => { const out = new Uint32Array(bytes.length >> 2); for (let i = 0; i < out.length; i++) out[i] = dword(bytes, i * 4); return out }

/** The bytes of the workbook stream ("Workbook" for BIFF8, "Book" for BIFF5). */
function workbookStream(bytes: Uint8Array): Uint8Array {
  if (!isCompoundFile(bytes)) throw new Error('This file is not an Excel 97-2003 workbook.')
  const header = (at: number) => dword(bytes, at)
  const sectorShift = word(bytes, 0x1e), miniShift = word(bytes, 0x20)
  if ((sectorShift !== 9 && sectorShift !== 12) || miniShift !== 6) throw damaged()
  const sectorSize = 2 ** sectorShift, miniSize = 2 ** miniShift, perSector = sectorSize / 4
  const sectorCount = Math.ceil(bytes.length / sectorSize) - 1
  const sector = (index: number) => {
    if (index >= sectorCount) throw damaged()
    return bytes.subarray((index + 1) * sectorSize, (index + 2) * sectorSize)
  }
  // The FAT sectors are listed in the header (109 of them), then in a chain of DIFAT sectors.
  const fatCount = header(0x2c), fatSectors: number[] = []
  for (let i = 0; i < 109 && fatSectors.length < fatCount; i++) fatSectors.push(header(0x4c + i * 4))
  for (let next = header(0x44), left = header(0x48), seen = new Set<number>(); fatSectors.length < fatCount && left > 0 && next < END_OF_CHAIN; left--) {
    if (seen.has(next)) throw damaged()
    seen.add(next)
    const difat = sector(next)
    for (let i = 0; i < perSector - 1 && fatSectors.length < fatCount; i++) fatSectors.push(dword(difat, i * 4))
    next = dword(difat, (perSector - 1) * 4)
  }
  const fatBytes = new Uint8Array(fatSectors.length * sectorSize)
  fatSectors.forEach((index, n) => fatBytes.set(sector(index), n * sectorSize))
  const fat = table(fatBytes)
  const chain = (start: number, links: Uint32Array) => {
    const list: number[] = []
    for (let at = start, seen = new Set<number>(); at !== END_OF_CHAIN && at !== FREE_SECTOR; at = links[at]) {
      if (at >= links.length || seen.has(at)) throw damaged()
      seen.add(at); list.push(at)
    }
    return list
  }
  const read = (start: number, size?: number) => {
    const sectors = chain(start, fat), out = new Uint8Array(sectors.length * sectorSize)
    sectors.forEach((index, n) => out.set(sector(index), n * sectorSize))
    if (size !== undefined && size > out.length) throw damaged()
    return out.subarray(0, size ?? out.length)
  }
  // Directory entries are 128 bytes each: UTF-16 name, object type, first sector and size.
  const directory = read(header(0x30))
  const entries = Array.from({ length: directory.length >> 7 }, (_, n) => {
    const at = n * 128, nameBytes = Math.min(64, word(directory, at + 0x40))
    let name = ''
    for (let i = 0; i + 2 < nameBytes; i += 2) name += String.fromCharCode(word(directory, at + i))
    return { name: name.toLowerCase(), type: directory[at + 0x42], start: dword(directory, at + 0x74), size: dword(directory, at + 0x78) }
  })
  const entry = entries.find(e => e.type === 2 && e.name === 'workbook') || entries.find(e => e.type === 2 && e.name === 'book')
  if (!entry) throw new Error('No worksheet data was found in this Excel file.')
  if (entry.size >= header(0x38)) return read(entry.start, entry.size)
  // Small streams live in the mini stream (64-byte sectors) held by the root entry.
  const root = entries.find(e => e.type === 5)
  if (!root) throw damaged()
  const miniStream = read(root.start, root.size)
  const miniFat = table(header(0x40) ? read(header(0x3c)) : new Uint8Array(0))
  const out = new Uint8Array(entry.size)
  chain(entry.start, miniFat).forEach((index, n) => {
    const start = index * miniSize, take = Math.min(miniSize, entry.size - n * miniSize)
    if (take <= 0 || start + take > miniStream.length) throw damaged()
    out.set(miniStream.subarray(start, start + take), n * miniSize)
  })
  return out
}

/** Reads across a record and the CONTINUE records after it. Character data split between records
 * restarts with one byte that says whether the rest is 8-bit or UTF-16. */
class Pieces {
  private index = 0
  private at = 0
  constructor(private readonly parts: Uint8Array[]) {}
  private current() {
    while (this.index < this.parts.length && this.at >= this.parts[this.index].length) { this.index++; this.at = 0 }
    if (this.index >= this.parts.length) throw damaged()
    return this.parts[this.index]
  }
  byte() { const part = this.current(); return part[this.at++] }
  u16() { return this.byte() | this.byte() << 8 }
  u32() { return this.u16() + this.u16() * 65536 }
  skip(count: number) { for (let left = count; left > 0;) { const part = this.current(), take = Math.min(left, part.length - this.at); this.at += take; left -= take } }
  chars(count: number, wide: boolean) {
    let text = ''
    while (text.length < count) {
      if (this.at >= this.parts[this.index].length && this.index + 1 < this.parts.length) { this.index++; this.at = 0; wide = (this.parts[this.index][this.at++] & 1) === 1 }
      const part = this.current()
      if (wide) { if (this.at + 1 >= part.length) throw damaged(); text += String.fromCharCode(word(part, this.at)); this.at += 2 }
      else text += String.fromCharCode(part[this.at++])
    }
    return text
  }
}

/** A BIFF8 Unicode string: count, option flags, optional rich-text and phonetic sizes, characters. */
function unicodeString(reader: Pieces, countBytes: 1 | 2) {
  const count = countBytes === 1 ? reader.byte() : reader.u16(), flags = reader.byte()
  const runs = flags & 0x08 ? reader.u16() : 0, extended = flags & 0x04 ? reader.u32() : 0
  const text = reader.chars(count, (flags & 0x01) === 1)
  reader.skip(runs * 4 + extended)
  return text
}

const numberText = (value: number) => Number.isFinite(value) ? String(Number.isInteger(value) ? value : Math.round(value * 1e10) / 1e10) : ''
const double = (bytes: Uint8Array, at: number) => new DataView(bytes.buffer, bytes.byteOffset + at, 8).getFloat64(0, true)

/** An RK number: a 30-bit integer or the high bits of a double, optionally divided by 100. */
function rk(bytes: Uint8Array, at: number) {
  const raw = bytes[at] | bytes[at + 1] << 8 | bytes[at + 2] << 16 | bytes[at + 3] << 24
  let value: number
  if (raw & 0x02) value = raw >> 2
  else { const view = new DataView(new ArrayBuffer(8)); view.setInt32(4, raw & ~0x03, true); value = view.getFloat64(0, true) }
  return raw & 0x01 ? value / 100 : value
}

/** Every worksheet of a .xls file as rows of cell text, in sheet order. */
export function readXlsWorkbook(data: ArrayBuffer | Uint8Array): XlsSheet[] {
  const stream = workbookStream(data instanceof Uint8Array ? data : new Uint8Array(data))
  const records: { type: number; offset: number; data: Uint8Array }[] = []
  for (let at = 0; at + 4 <= stream.length;) {
    const type = word(stream, at), size = word(stream, at + 2)
    if (at + 4 + size > stream.length) break
    records.push({ type, offset: at, data: stream.subarray(at + 4, at + 4 + size) })
    at += 4 + size
  }
  const latin = (bytes: Uint8Array) => new TextDecoder('windows-1252').decode(bytes)
  const strings: string[] = [], names = new Map<number, string>(), sheets: XlsSheet[] = [], open: (XlsSheet | null)[] = []
  let biff8 = true, sheet: XlsSheet | null = null, cells = 0, pending: [number, number] | null = null
  const set = (row: number, column: number, text: string) => {
    if (!sheet || row >= MAX_ROWS || column >= MAX_COLUMNS || !text) return
    if (++cells > MAX_CELLS) throw new Error('This workbook has too many cells to read here.')
    while (sheet.rows.length <= row) sheet.rows.push([])
    const line = sheet.rows[row]
    while (line.length < column) line.push('')
    line[column] = text
  }
  for (let i = 0; i < records.length; i++) {
    const { type, data, offset } = records[i]
    if (type === 0x0809) {
      // Each substream opens with BOF and closes with EOF; a chart inside a sheet is a nested substream.
      biff8 = word(data, 0) === 0x0600
      sheet = word(data, 2) === 0x0010 ? { name: names.get(offset) || `Sheet${sheets.length + 1}`, rows: [] } : null
      if (sheet) sheets.push(sheet)
      open.push(sheet)
      continue
    }
    if (type === 0x000a) { open.pop(); sheet = open[open.length - 1] ?? null; continue }
    if (type === 0x002f) throw new Error('This workbook is password protected. Remove the password in Excel, save it and upload it again.')
    try {
      if (type === 0x0085) names.set(dword(data, 0), biff8 ? unicodeString(new Pieces([data.subarray(6)]), 1) : latin(data.subarray(7, 7 + data[6])))
      else if (type === 0x00fc) {
        const parts = [data]
        while (records[i + 1]?.type === 0x003c) parts.push(records[++i].data)
        const reader = new Pieces(parts)
        reader.skip(4)
        const unique = reader.u32()
        try { for (let n = 0; n < unique; n++) strings.push(unicodeString(reader, 2)) } catch { /* keep the strings read before a damaged entry */ }
      }
      else if (!sheet) continue
      else if (type === 0x00fd) set(word(data, 0), word(data, 2), strings[dword(data, 6)] ?? '')
      else if (type === 0x0204 || type === 0x00d6) set(word(data, 0), word(data, 2), biff8 ? unicodeString(new Pieces([data.subarray(6)]), 2) : latin(data.subarray(8, 8 + word(data, 6))))
      else if (type === 0x0203) set(word(data, 0), word(data, 2), numberText(double(data, 6)))
      else if (type === 0x027e) set(word(data, 0), word(data, 2), numberText(rk(data, 6)))
      else if (type === 0x00bd) for (let at = 4, column = word(data, 2); at + 6 <= data.length - 2; at += 6, column++) set(word(data, 0), column, numberText(rk(data, at + 2)))
      else if (type === 0x0205) { if (!data[7]) set(word(data, 0), word(data, 2), data[6] ? 'TRUE' : 'FALSE') }
      else if (type === 0x0006) {
        // A formula keeps its last result: a number, or a flag saying a STRING record follows.
        pending = null
        if (word(data, 12) !== 0xffff) set(word(data, 0), word(data, 2), numberText(double(data, 6)))
        else if (data[6] === 0) pending = [word(data, 0), word(data, 2)]
        else if (data[6] === 1) set(word(data, 0), word(data, 2), data[8] ? 'TRUE' : 'FALSE')
      }
      else if (type === 0x0207 && pending) { set(pending[0], pending[1], biff8 ? unicodeString(new Pieces([data]), 2) : latin(data.subarray(2, 2 + word(data, 0)))); pending = null }
    } catch (failure) {
      if (failure instanceof Error && /too many cells/.test(failure.message)) throw failure
    }
  }
  if (!sheets.length) throw new Error('No worksheet was found in this Excel file.')
  for (const each of sheets) each.rows = each.rows.map(row => Array.from(row, cell => (cell ?? '').replace(/\s+/g, ' ').trim()))
  return sheets
}
