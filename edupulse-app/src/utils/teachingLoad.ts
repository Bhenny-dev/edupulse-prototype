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
  const normalized = time.replace(/[\u2010-\u2015\u2212\u00b1]/g, '-')
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
    const header = page.items.find(i => /^SUBJECT$/i.test(i.str?.trim() || ''))
    if (!header?.transform) { warnings.push(`Page ${page.number}: table headings could not be located; review the original page.`); continue }
    const headerY = header.transform[5]
    const headerItems = page.items.filter(i => i.transform && Math.abs(i.transform[5] - headerY) < 22)
    const columns = [header, ...['DESCRIPTIVE', 'TIME', 'DAY', 'UNIT', 'LEC', 'LAB', 'HOURS', 'ROOM', 'STUDENT', 'COURSE'].map(name => headerItems.find(i => new RegExp(`^${name}(?:\\s|$)`, 'i').test(i.str?.trim() || '')))]
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
      if (!/^\d+$/.test(cells[0] || '')) continue
      const values = columns.map(c => { const x = c?.transform?.[4]; return x === undefined ? '' : cells[xs.findIndex((left,i) => x >= left && x < xs[i+1])] || '' })
      const [subjectCode,title,time,days,units,lecture,lab,hours,room,students,program] = values
      if (!subjectCode || !title) { warnings.push(`Page ${page.number}, row ${cells[0]}: unreadable course cells.`); continue }
      const computedHours = scheduleHours(time,days), printed = numeric(hours), rowWarnings: string[] = []
      if (computedHours === null) rowWarnings.push('Check the printed days and time; hours could not be computed.')
      else if (printed !== null && Math.abs(computedHours - printed) > 0.02) rowWarnings.push(`Schedule computes to ${computedHours} hours; the document lists ${printed}.`)
      if (!/\b(?:AM|PM)\b/i.test(time)) rowWarnings.push('AM/PM is not printed. Confirm clock times before using this as a delivery schedule.')
      if (!academicYear || !semester) rowWarnings.push('Choose the academic year and semester.')
      pageEntries.push({ id:`${page.number}:${cells[0]}`,page:page.number,row:+cells[0],instructor,degree,semester,academicYear,subjectCode,title,time,days,units:numeric(units),lecture:numeric(lecture),lab:numeric(lab),hours:printed,computedHours,room,students:numeric(students),program,warnings:rowWarnings })
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

/** OCR word boxes supply columns when the original scan has no PDF text/path cells. */
export function ocrLoadLayout(words: { text: string; x0: number; x1: number; y0: number; y1: number;baseline?:number }[], page: number, grid?: import('../lib/ocrText').OcrGrid,text?:string): Layout {
  const heights=words.filter(w=>/^[a-z]{3,}$/i.test(w.text)).map(w=>w.y1-w.y0).sort((a,b)=>a-b)
  const scale=10/(heights[Math.floor(heights.length/2)]||40),maxY=Math.max(0,...words.map(w=>w.y1),...(grid?.horizontal||[]))
  const items=words.map(w=>({str:w.text,width:(w.x1-w.x0)*scale,transform:[1,0,0,1,w.x0*scale,(maxY-(w.baseline??w.y1))*scale]}))
  if(!grid?.horizontal.length||!grid.vertical.length)return {number:page,items,edges:[],rules:[],text}
  const top=(maxY-grid.horizontal[0])*scale,bottom=(maxY-grid.horizontal.at(-1)!)*scale
  return {number:page,items,edges:grid.vertical.map(x=>[x*scale,bottom,x*scale,top]),rules:grid.horizontal.map(y=>[grid.vertical[0]*scale,(maxY-y)*scale,grid.vertical.at(-1)!*scale,(maxY-y)*scale]),text}
}
