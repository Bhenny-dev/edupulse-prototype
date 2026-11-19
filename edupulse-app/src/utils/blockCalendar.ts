import { slotDays, slotTimes } from './blockSections'
import type { DeliveryDate } from './blockDelivery'

/** A block's class meetings come from its course load (meeting days and time); the Dean's term calendar says
 * when classes start. Teaching week N begins N-1 weeks after that date, and the week's first class meeting
 * opens its courseware. The database computes the same default (edupulse_private.default_block_window). */
export type BlockSlot = { days: string; time: string; room?: string }
export type TermCalendar = { classesStart: string; weeks: number }
export type ClassMeeting = { date: string; start: string; end: string; room: string }

const DAY_NUMBER: Record<string, number> = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 }
const DATE = /^\d{4}-\d{2}-\d{2}$/
const minutes = (clock: string) => { const [hour, minute] = clock.split(':').map(Number); return hour * 60 + minute }
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
const isoDay = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay() || 7

/** Hours of one meeting, from a printed time such as "7:30 - 10:00" (0 when the end is not printed). */
export function slotHours(time: string): number {
  const { start, end } = slotTimes(time)
  return start && end && minutes(end) > minutes(start) ? (minutes(end) - minutes(start)) / 60 : 0
}

/** Contact hours in a regular week: every meeting day of every slot (MT 7:30 - 10:00 is 2 x 2.5 = 5 hours). */
export function weeklyContactHours(slots: BlockSlot[]): number {
  return Math.round(slots.reduce((sum, slot) => sum + slotDays(slot.days).length * slotHours(slot.time), 0) * 100) / 100
}

/** The class meetings of one teaching week, in date and time order. */
export function weekMeetings(slots: BlockSlot[], calendar: TermCalendar, week: number): ClassMeeting[] {
  if (!DATE.test(calendar.classesStart) || week < 1) return []
  const first = addDays(calendar.classesStart, (week - 1) * 7)
  return Array.from({ length: 7 }, (_, offset) => addDays(first, offset))
    .flatMap(date => slots.filter(slot => slotDays(slot.days).some(name => DAY_NUMBER[name] === isoDay(date))).map(slot => ({ date, ...slotTimes(slot.time), room: slot.room || '' })))
    .filter(meeting => meeting.start)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
}

/** Default delivery dates: each week opens at its first class meeting and stays open. */
export function classScheduleDates(slots: BlockSlot[], calendar: TermCalendar, weeks: number[]): DeliveryDate[] {
  return [...new Set(weeks)].sort((a, b) => a - b).flatMap(week => {
    const first = weekMeetings(slots, calendar, week)[0]
    return first ? [{ week, date: first.date, start: first.start, end: '' }] : []
  })
}

/** Scheduled contact hours for the term next to the syllabus's total hours ("No. of Hours: 90 Hours"). */
export function termHours(slots: BlockSlot[], calendar: TermCalendar | null, syllabusHours: unknown) {
  const weekly = weeklyContactHours(slots), weeks = calendar?.weeks || 0
  const planned = Number(String(syllabusHours ?? '').match(/\d+(?:\.\d+)?/)?.[0] || 0)
  const scheduled = Math.round(weekly * weeks * 100) / 100
  return { weekly, weeks, scheduled, planned, short: Boolean(planned && weeks && scheduled < planned) }
}

/** "Mon, Aug 10, 2026" for a calendar date. */
export const calendarDate = (date: string) => new Intl.DateTimeFormat('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
/** "Mon, Aug 10, 7:30 AM" for a class meeting, in Philippine time. */
export const meetingTime = (date: string, start: string) => new Intl.DateTimeFormat('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' }).format(new Date(`${date}T${start}:00+08:00`))

type SavedWindow = { week: number; opens_at: string; closes_at: string | null }
type SavedSchedule = { block_section: string; windows: SavedWindow[] }
export type BlockDelivery = { block: string; opensAt: string; closesAt: string | null; state: 'open' | 'scheduled' | 'closed'; source: 'saved' | 'class schedule' }

/** When each block opens a teaching week: its saved window, otherwise its first class meeting (the database default). */
export function weekDeliveries(week: number, blocks: string[], slots: Record<string, BlockSlot[]>, saved: SavedSchedule[], calendar: TermCalendar | null, now = Date.now()): BlockDelivery[] {
  return blocks.flatMap((block): BlockDelivery[] => {
    const schedule = saved.find(row => row.block_section === block)
    let opensAt = '', closesAt: string | null = null
    if (schedule) {
      const window = schedule.windows.find(row => row.week === week)
      if (!window) return []
      opensAt = window.opens_at; closesAt = window.closes_at || null
    } else {
      const first = calendar ? weekMeetings(slots[block] || [], calendar, week)[0] : undefined
      if (!first) return []
      opensAt = new Date(`${first.date}T${first.start}:00+08:00`).toISOString()
    }
    const opens = Date.parse(opensAt), closes = closesAt ? Date.parse(closesAt) : Infinity
    return [{ block, opensAt, closesAt, state: now < opens ? 'scheduled' : now >= closes ? 'closed' : 'open', source: schedule ? 'saved' : 'class schedule' }]
  })
}

/** "Mon, Aug 10, 7:30 AM" for a moment, in Philippine time. */
export const manilaTime = (iso: string) => new Intl.DateTimeFormat('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' }).format(new Date(iso))

/** "BSIT-1A open since Mon, Aug 10, 7:30 AM · BSIT-1B opens Tue, Aug 11, 2:00 PM" */
export const deliveryLine = (rows: BlockDelivery[]) => rows.map(row => `${row.block} ${row.state === 'open' ? 'open since' : row.state === 'scheduled' ? 'opens' : 'closed'} ${manilaTime(row.state === 'closed' && row.closesAt ? row.closesAt : row.opensAt)}`).join(' · ')

type CalendarRecord = { kind: string; record_key: string; data: Record<string, unknown> }
/** The term calendar the Dean recorded for a semester, if any. Load records may print the semester as "1". */
export function termCalendar(records: CalendarRecord[] = [], semester: string, academicYear: string): TermCalendar | null {
  const canonical = /^(?:1|first)/i.test(semester) ? '1st Semester' : /^(?:2|second)/i.test(semester) ? '2nd Semester' : /summer/i.test(semester) ? 'Summer' : semester
  const record = records.find(row => row.kind === 'term_calendar' && row.record_key === `${canonical}|${academicYear}`)
  const classesStart = String(record?.data.ClassesStart || ''), weeks = Number(record?.data.Weeks) || 18
  return DATE.test(classesStart) ? { classesStart, weeks } : null
}
