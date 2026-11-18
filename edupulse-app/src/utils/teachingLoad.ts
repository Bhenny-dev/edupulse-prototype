import { pdfLines } from './pdfTableLayout'

export type LoadEntry = {
  id: string; page: number; row: number; instructor: string; degree: string; semester: string; academicYear: string
  subjectCode: string; title: string; time: string; days: string; units: number | null; lecture: number | null; lab: number | null
  hours: number | null; computedHours: number | null; room: string; students: number | null; program: string; warnings: string[]
}
export type TeachingLoadDocument = { entries: LoadEntry[]; pages: number; warnings: string[]; totals: { instructor: string; page: number; units: number | null; hours: number | null; computedUnits: number; computedHours: number }[] }
type Item = { str?: string; width?: number; transform?: number[] }
type Layout = { number: number; items: Item[]; edges: number[][]; rules?: number[][];text?:string }
const clean = (value: string) => value.replace(/\s+/g, ' ').trim()
const numeric = (value: string): number | null => /^\d+(?:\.\d+)?$/.test(clean(value)) ? Number(value) : null
/** "IT 101 A", "PROF ED 16", "CP 2A": letters, an optional second word, then the course number. */
const COURSE_CODE = /^[A-Z]{2,8}(?:\s+[A-Z]{1,8})?\s*\d/i
/** At most one letter added, dropped or changed: OCR reads DESCRIPTIVE as DRSCRIPTIVE. */
function nearlyEqual(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0, j = 0, edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++edits > 1) return false
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++ }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}
/** The first word of a text item, in capitals (a PDF item can hold "DESCRIPTIVE TITLE"). */
const headingWord = (value: string | undefined) => (value || '').trim().split(/\s+/)[0].toUpperCase().replace(/[^A-Z]/g, '')
const HEADINGS = ['SUBJECT', 'DESCRIPTIVE', 'TITLE', 'TIME', 'DAY', 'UNIT', 'LEC', 'LAB', 'HOURS', 'ROOM', 'STUDENT', 'COURSE']
/** One OCR misread is tolerated: a letter added, dropped or changed in long headings, only changed in short ones (LRC for LEC). */
const misread = (word: string, name: string) => word !== name && !HEADINGS.includes(word) && (name.length >= 5 || word.length === name.length) && nearlyEqual(word, name)
/** The item for a heading: an exact heading first, so a misread DAY ("LAY") never takes LAB's column. */
function headingItem<T extends { str?: string }>(items: T[], name: string) {
  return items.find(item => headingWord(item.str) === name) ?? items.find(item => misread(headingWord(item.str), name))
}
export const CURRENT_TERM = { academicYear: '2026-2027', semester: '1st Semester' }
export const termKey = (year: string, semester: string) => `${year}|${semester}`
export const SEMESTERS = ['1st Semester', '2nd Semester', 'Summer']
export const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Longest day token first: TTH is Tuesday/Thursday, never three Tuesdays. */
export function scheduleDays(value: string): string[] | null {
  let text = value.toUpperCase().replace(/[\s/,;&]+/g, '')
  const days: string[] = []
  const tokens: [string, string][] = [['THURSDAY','Thursday'],['WEDNESDAY','Wednesday'],['SATURDAY','Saturday'],['TUESDAY','Tuesday'],['MONDAY','Monday'],['FRIDAY','Friday'],['SUNDAY','Sunday'],['THU','Thursday'],['TUE','Tuesday'],['MON','Monday'],['WED','Wednesday'],['FRI','Friday'],['SAT','Saturday'],['SUN','Sunday'],['TH','Thursday'],['SU','Sunday'],['SA','Saturday'],['M','Monday'],['T','Tuesday'],['W','Wednesday'],['F','Friday'],['S','Saturday']]
  while (text) { const token = tokens.find(([prefix]) => text.startsWith(prefix)); if (!token) return null; days.push(token[1]); text = text.slice(token[0].length) }
  return days.length && new Set(days).size === days.length ? days : null
}

/** Duration is computable without guessing AM/PM; clock times remain exactly as printed. */
export function scheduleHours(time: string, days: string): number | null {
  const names = scheduleDays(days)
  const normalized = time.replace(/(\d)\s*:\s*(\d{2})/g,'$1:$2').replace(/[\u2010-\u2015\u2212\u00b1]/g, '-')
  const parts = normalized.split('/').map(clean).filter(Boolean)
  const durations = parts.map(part => {
    const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(part)
    if (!match) return null
    const [, h1, m1, ap1, h2, m2, ap2] = match
    if (+h1 > 23 || +h2 > 23 || +m1 > 59 || +m2 > 59) return null
    const minute = (h: string, m: string, ap?: string) => (ap ? +h % 12 + (ap.toUpperCase() === 'PM' ? 12 : 0) : +h) * 60 + +m
    let duration = minute(h2, m2, ap2) - minute(h1, m1, ap1)
    if (duration <= 0 && !ap1 && !ap2 && +h1 <= 12 && +h2 <= 12) duration += 720
    return duration > 0 && duration <= 720 ? duration / 60 : null
  })
  if (!names || durations.some(n => n === null) || !(parts.length === 1 || names.length === 1 || parts.length === names.length)) return null
  return Math.round((parts.length === 1 ? durations[0]! * names.length : durations.reduce<number>((sum, n) => sum + n!, 0)) * 100) / 100
}

/** Ruled PDF cells, including wrapped text, are read by their actual column boundaries. */
export function readTeachingLoadLayouts(pages: Layout[]): TeachingLoadDocument | undefined {
  const entries: LoadEntry[] = [], totals: TeachingLoadDocument['totals'] = [], warnings: string[] = []
  let recognized = false
  for (const page of pages) {
    const lines = pdfLines(page.items), text = page.text || lines.map(l => l.text).join('\n')
    if (!/TEACHING\s+LOAD/i.test(text) || !/Instructor\s*[:;]/i.test(text)) continue
    recognized = true
    const instructor = clean(/Instructor\s*[:;]\s*([^\n]+)/i.exec(text)?.[1] || '')
    const degree = clean(/Highest\s+Degree\s+(?:Earned|Eamed)\s*[:;]\s*([^\n]+)/i.exec(text)?.[1] || '')
    const academicYear = /(20\d{2})\s*[-\u2013\u2014]\s*(20\d{2})/.exec(text)?.slice(1).join('-') || ''
    const semester = /(?:First|1st)\s+Semester/i.test(text) ? '1st Semester' : /(?:Second|2nd)\s+Semester/i.test(text) ? '2nd Semester' : /Summer/i.test(text) ? 'Summer' : ''
    const header = headingItem(page.items, 'SUBJECT')
    if (!header?.transform) { warnings.push(`Page ${page.number}: table headings could not be located; review the original page.`); continue }
    const headerY = header.transform[5]
    const headerItems = page.items.filter(i => i.transform && Math.abs(i.transform[5] - headerY) < 22)
    // Each heading, or the other word of a two-word heading ("DESCRIPTIVE TITLE"), locates its column.
    const columns = [header, ...[['DESCRIPTIVE', 'TITLE'], ['TIME'], ['DAY'], ['UNIT'], ['LEC'], ['LAB'], ['HOURS'], ['ROOM'], ['STUDENT'], ['COURSE']].map(names => names.map(name => headingItem(headerItems, name)).find(Boolean))]
    const end = lines.find(l => /^Conforme\s*:/i.test(l.text))?.y ?? 0
    const ys = [...new Set((page.rules || []).filter(r => r[1] < headerY + 20 && r[1] > end).map(r => Math.round(r[1] * 2) / 2))].sort((a,b) => b-a)
    const pageEntries: LoadEntry[] = []
    let printedUnits: number | null = null, printedHours: number | null = null
    for (let r = 0; r < ys.length - 1; r++) {
      const top = ys[r], bottom = ys[r+1], mid = (top + bottom) / 2
      const xs = page.edges.filter(e => e[1] < mid && e[3] > mid).map(e => e[0]).sort((a,b) => a-b).filter((x,i,all) => !i || x-all[i-1] > 2)
      const cell = (left: number, right: number) => clean(pdfLines(page.items.filter(i => i.str?.trim() && i.transform && i.transform[4] >= left-1 && i.transform[4] < right-1 && i.transform[5] > bottom && i.transform[5] < top)).map(l => l.text).join(' '))
      const cells = xs.slice(0,-1).map((x,i) => cell(x,xs[i+1]))
      if (/TOTAL/i.test(cells.join(' '))) {
        const unitX = columns[4]?.transform?.[4], hourX = columns[7]?.transform?.[4]
        const at = (x: number | undefined) => x === undefined ? '' : cells[xs.findIndex((left,i) => x >= left && x < xs[i+1])]
        printedUnits = numeric(at(unitX) || '')
        const hourCell = at(hourX) || ''
        printedHours = numeric(hourCell) ?? numeric(/^\d+(?:\.\d+)?/.exec(hourCell)?.[0] || '')
        continue
      }
      const positions = columns.map(c => {const x=c?.transform?.[4];return x===undefined?-1:xs.findIndex((left,i)=>x>=left&&x<xs[i+1])})
      // Recover a missing OCR heading only when known neighbors leave exactly one ruled cell.
      // Never use an ordinal fallback for merged, missing or ambiguous grid columns.
      const recovered:string[]=[]
      const values = columns.map((_,index) => {
        let position=positions[index]
        if(position<0&&index>0&&index<positions.length-1&&positions[index-1]>=0&&positions[index+1]===positions[index-1]+2){position=positions[index-1]+1;recovered.push(['Subject','Title','Time','Days','Units','Lecture units','Lab units','Listed hours','Room','Students','Program'][index])}
        return position<0?'':cells[position]||''
      })
      const [subjectCode,printedTitle,time,days,units,lecture,lab,hours,room,students,program] = values
      const title = printedTitle.replace(/^[^\p{L}\p{N}(]+/u, '')
      // A printed row number marks a class row. OCR can miss a lone digit, so a row whose cells read as a course code
      // and a title still counts, numbered by its position, with a note to check it against the source.
      const numbered = /^\d+$/.test(cells[0] || '')
      if (!numbered && !(COURSE_CODE.test(subjectCode) && title)) continue
      if (!subjectCode || !title) { warnings.push(`Page ${page.number}, row ${cells[0]}: unreadable course cells.`); continue }
      const position = pageEntries.length + 1
      const computedHours = scheduleHours(time,days), printed = numeric(hours), rowWarnings: string[] = numbered ? [] : ['The row number was not read; this row was found by its course code. Check it against the source.']
      if(recovered.length)rowWarnings.push(`Unreadable ${recovered.join(', ')} heading: values recovered from the ruled column between verified neighboring headings. Compare with the source.`)
      if (computedHours === null) rowWarnings.push('Check the printed days and time; hours could not be computed.')
      else if (printed !== null && Math.abs(computedHours - printed) > 0.02) rowWarnings.push(`Schedule computes to ${computedHours} hours; the document lists ${printed}.`)
      if (!/\b(?:AM|PM)\b/i.test(time)) rowWarnings.push('AM/PM is not printed. Confirm clock times before using this as a delivery schedule.')
      if (!academicYear || !semester) rowWarnings.push('Choose the academic year and semester.')
      pageEntries.push({ id:numbered?`${page.number}:${cells[0]}`:`${page.number}:r${position}`,page:page.number,row:numbered?+cells[0]:position,instructor,degree,semester,academicYear,subjectCode,title,time,days,units:numeric(units),lecture:numeric(lecture),lab:numeric(lab),hours:printed,computedHours,room,students:numeric(students),program,warnings:rowWarnings })
    }
    if (!pageEntries.length) warnings.push(`Page ${page.number}: no table rows could be read. Nothing on this page can be imported until reviewed.`)
    entries.push(...pageEntries)
    const computedUnits = pageEntries.reduce((n,e) => n+(e.units || 0),0), computedHours = pageEntries.reduce((n,e) => n+(e.computedHours || 0),0)
    if(pageEntries.some(e=>e.units===null))warnings.push(`Page ${page.number}: some units could not be read; the units total is incomplete.`)
    else if (printedUnits !== null && printedUnits !== computedUnits) warnings.push(`Page ${page.number}: units total ${computedUnits} differs from printed total ${printedUnits}.`)
    if(pageEntries.some(e=>e.computedHours===null))warnings.push(`Page ${page.number}: some schedule hours could not be computed; the total is incomplete.`)
    else if (printedHours !== null && Math.abs(printedHours - computedHours) > 0.02) warnings.push(`Page ${page.number}: schedule hours total ${computedHours} differs from printed total ${printedHours}.`)
    totals.push({instructor,page:page.number,units:printedUnits,hours:printedHours,computedUnits,computedHours})
  }
  return recognized ? { entries,totals,pages:pages.length,warnings } : undefined
}

const personName = (name: string) => name === name.toUpperCase() ? name.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, gap, letter) => gap + letter.toUpperCase()) : name
/** One sentence to check against the form before reviewing it: whose load, how many classes and units, which term. */
export function loadSummary(doc: TeachingLoadDocument) {
  if (!doc.entries.length) return 'I found a teaching-load form, but none of its class rows could be read. Open the review to see what was read, or attach a sharper copy.'
  const people = [...new Set(doc.entries.map(entry => entry.instructor).filter(Boolean))].map(personName)
  const terms = [...new Set(doc.entries.map(entry => [entry.semester, entry.academicYear && `AY ${entry.academicYear}`].filter(Boolean).join(' ')).filter(Boolean))]
  const units = doc.entries.some(entry => entry.units === null) ? '' : `, ${doc.entries.reduce((sum, entry) => sum + (entry.units || 0), 0)} units`
  const whose = people.length === 1 ? `${people[0]}’s teaching load` : people.length ? `Teaching loads for ${people.join(', ')}` : 'Teaching load'
  return `${whose}: ${doc.entries.length} class${doc.entries.length === 1 ? '' : 'es'}${units}${terms.length ? `, ${terms.join('; ')}` : ''}.`
}

/** OCR word boxes supply columns when the original scan has no PDF text/path cells. */
export function ocrLoadLayout(words: { text: string; x0: number; x1: number; y0: number; y1: number;baseline?:number }[], page: number, grid?: import('../lib/ocrText').OcrGrid,text?:string): Layout {
  const heights=words.filter(w=>/^[a-z]{3,}$/i.test(w.text)).map(w=>w.y1-w.y0).sort((a,b)=>a-b)
  const scale=10/(heights[Math.floor(heights.length/2)]||40),maxY=Math.max(0,...words.map(w=>w.y1),...(grid?.horizontal||[]))
  const items=words.map(w=>({str:w.text,width:(w.x1-w.x0)*scale,transform:[1,0,0,1,w.x0*scale,(maxY-(w.baseline??w.y1))*scale]}))
  if(!grid?.horizontal.length||!grid.vertical.length)return {number:page,items,edges:[],rules:[],text}
  const top=(maxY-grid.horizontal[0])*scale,bottom=(maxY-grid.horizontal.at(-1)!)*scale
  return {number:page,items,edges:grid.vertical.map(x=>[x*scale,bottom,x*scale,top]),rules:grid.horizontal.map(y=>[grid.vertical[0]*scale,(maxY-y)*scale,grid.vertical.at(-1)!*scale,(maxY-y)*scale]),text}
}
