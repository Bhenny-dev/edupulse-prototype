import { slotDays, slotTimes } from './blockSections'

/** One class as the Schedule page receives it: an instructor's block or a student's class, with its recorded meeting slots. */
export type ScheduleClass = { key: string; code: string; title: string; block: string; instructor?: string; courseId?: string; slots: { days?: string; time?: string; room?: string }[] }
/** One meeting of one class on one weekday. `day` is 0 for Sunday to 6 for Saturday; times are minutes after midnight. */
export type Meeting = { key: string; classKey: string; code: string; title: string; block: string; instructor: string; room: string; courseId?: string; day: number; start: number; end: number }
export type LaidOut = Meeting & { lane: number; lanes: number }

const DAY_INDEX: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 }
const DEFAULT_LENGTH = 90

const minutes = (clock: string) => { const [hour, minute] = clock.split(':').map(Number); return hour * 60 + minute }

/** "07:30" style minutes after midnight as "7:30 AM". */
export function clockLabel(total: number) {
  const hour = Math.floor(total / 60) % 24, minute = total % 60
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
}
export const timeRange = (meeting: { start: number; end: number }) => `${clockLabel(meeting.start)} - ${clockLabel(meeting.end)}`

/** Every placeable meeting of the classes, and the classes that have no day and time recorded (they are listed, never guessed). */
export function meetingsOf(classes: ScheduleClass[]): { meetings: Meeting[]; unscheduled: ScheduleClass[] } {
  const meetings: Meeting[] = [], unscheduled: ScheduleClass[] = []
  for (const item of classes) {
    let placed = 0
    for (const slot of item.slots || []) {
      const times = slotTimes(slot.time || ''), days = slotDays(slot.days || '')
      if (!times.start || !days.length) continue
      const start = minutes(times.start), end = times.end ? minutes(times.end) : start + DEFAULT_LENGTH
      for (const name of days) { meetings.push({ key: `${item.key}|${name}|${start}`, classKey: item.key, code: item.code, title: item.title, block: item.block, instructor: item.instructor || '', room: slot.room || '', courseId: item.courseId, day: DAY_INDEX[name], start, end: end > start ? end : start + DEFAULT_LENGTH }); placed++ }
    }
    if (!placed) unscheduled.push(item)
  }
  return { meetings: meetings.sort((a, b) => a.day - b.day || a.start - b.start || a.code.localeCompare(b.code)), unscheduled }
}

/** Meetings of one weekday placed side by side where they overlap, so none hides another. */
export function layoutDay(meetings: Meeting[]): LaidOut[] {
  const sorted = [...meetings].sort((a, b) => a.start - b.start || b.end - a.end), placed: LaidOut[] = []
  let cluster: LaidOut[] = [], clusterEnd = -1
  const close = () => { const lanes = Math.max(1, ...cluster.map(item => item.lane + 1)); for (const item of cluster) item.lanes = lanes; cluster = []; clusterEnd = -1 }
  for (const meeting of sorted) {
    if (cluster.length && meeting.start >= clusterEnd) close()
    const taken = new Set(cluster.filter(item => item.end > meeting.start).map(item => item.lane))
    let lane = 0; while (taken.has(lane)) lane++
    const next: LaidOut = { ...meeting, lane, lanes: 1 }
    cluster.push(next); placed.push(next); clusterEnd = Math.max(clusterEnd, meeting.end)
  }
  if (cluster.length) close()
  return placed
}

/** The hours the week grid shows: the earliest start to the latest end, at least 7 AM to 6 PM. */
export function hourSpan(meetings: Meeting[]) {
  const first = Math.min(7 * 60, ...meetings.map(item => Math.floor(item.start / 60) * 60)), last = Math.max(18 * 60, ...meetings.map(item => Math.ceil(item.end / 60) * 60))
  return { from: first, to: Math.min(24 * 60, last) }
}

/** Monday to Sunday of the week holding `anchor`, as local dates at midnight. */
export function weekOf(anchor: Date) {
  const monday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - ((anchor.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, index) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index))
}
