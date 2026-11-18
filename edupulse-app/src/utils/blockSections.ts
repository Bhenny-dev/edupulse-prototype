/** Block sections of a course load. A teaching-load subject code such as "IT 101 A" is course IT 101, block A;
 * "QA 101-2" is block 2. A code without a printed block (PROF ED 16) takes the next free letter in schedule order. */
export type SectionSource = { subjectCode: string; days?: string; time?: string }

const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
const DAYS: [string, number][] = [['SU', 7], ['SAT', 6], ['TH', 4], ['M', 1], ['T', 2], ['W', 3], ['F', 5], ['S', 6]]

export function sectionOf(subjectCode: string): { course: string; block: string } {
  const code = String(subjectCode || '').trim().replace(/\s+/g, ' ').toUpperCase()
  const letter = code.match(/^(.*\S)\s([A-Z])$/)
  if (letter) return { course: letter[1], block: letter[2] }
  const number = code.match(/^(.*\S)-(\d+)$/)
  return number ? { course: number[1], block: number[2] } : { course: code, block: '' }
}

/** Day of the first meeting, then its start. The CIT forms print no AM/PM, so 1:00 to 6:59 are afternoon classes. */
export function scheduleRank(days = '', time = ''): number {
  const day = String(days).toUpperCase().replace(/[^A-Z]/g, '')
  const start = String(time).match(/(\d{1,2}):(\d{2})/)
  const hour = start ? Number(start[1]) : 99
  return (DAYS.find(([prefix]) => day.startsWith(prefix))?.[1] ?? 9) * 1440 + (hour >= 1 && hour <= 6 ? hour + 12 : hour) * 60 + (start ? Number(start[2]) : 0)
}

/** A printed time such as "7:30 - 10:00" as 24-hour class start and close (1:00 to 6:59 are afternoon). */
export function slotTimes(time = ''): { start: string; end: string } {
  const parts = [...String(time).matchAll(/(\d{1,2}):(\d{2})/g)].map(match => ({ hour: Number(match[1]), minute: match[2] })).map(({ hour, minute }) => ({ hour: hour >= 1 && hour <= 6 ? hour + 12 : hour, minute }))
  if (parts[1] && parts[1].hour * 60 + Number(parts[1].minute) <= parts[0].hour * 60 + Number(parts[0].minute) && parts[1].hour < 12) parts[1].hour += 12
  const clock = (part?: { hour: number; minute: string }) => part && part.hour < 24 ? `${String(part.hour).padStart(2, '0')}:${part.minute}` : ''
  return { start: clock(parts[0]), end: clock(parts[1]) }
}

const DAY_NAMES: [string, string][] = [['SUN', 'Sunday'], ['SU', 'Sunday'], ['SAT', 'Saturday'], ['TH', 'Thursday'], ['M', 'Monday'], ['T', 'Tuesday'], ['W', 'Wednesday'], ['F', 'Friday'], ['S', 'Saturday']]
/** "TTH" as Tuesday and Thursday. */
export function slotDays(days = ''): string[] {
  let rest = String(days).toUpperCase().replace(/[^A-Z]/g, ''); const names: string[] = []
  while (rest) { const hit = DAY_NAMES.find(([prefix]) => rest.startsWith(prefix)); if (!hit) break; if (!names.includes(hit[1])) names.push(hit[1]); rest = rest.slice(hit[0].length) }
  return names
}

/** Printed blocks are kept; the rest take letters not used by another instructor (`taken`) or by this load, earliest class first. */
export function assignBlocks<T extends SectionSource>(rows: T[], taken: Iterable<string> = []): Map<T, string> {
  const used = new Set([...taken].map(block => String(block).toUpperCase())), result = new Map<T, string>()
  for (const row of rows) { const { block } = sectionOf(row.subjectCode); if (block) { result.set(row, block); used.add(block) } }
  for (const row of rows.filter(item => !result.has(item)).sort((a, b) => scheduleRank(a.days, a.time) - scheduleRank(b.days, b.time))) {
    const next = LETTERS.find(letter => !used.has(letter)) || ''
    result.set(row, next); used.add(next)
  }
  return result
}
