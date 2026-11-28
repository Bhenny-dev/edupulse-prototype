// Student progress and reminder states (core flow goal G5, requirements R-S2 and R-S6).
// A student's records hold that student's own opens, reading progress and attempts.
// Days are read on the Asia/Manila calendar (UTC+8, no daylight saving), and "now" comes
// from the server's clock when the records carry one, so a wrong device clock cannot move
// a reminder from blue to orange or red.
import { deliveryState, deliveryTimeLabel } from '../../utils/blockDelivery'
import { teachingFileKind } from '../../utils/teachingFileKind'
import { percent, readingPercent, studentAttempt, type AcademicData, type Publication } from './academicData'

export type ReminderState = 'done' | 'blue' | 'orange' | 'red'
export type ItemProgress = { id: string; week: number; kind: 'material' | 'assessment'; done: boolean; percent: number; read: number; total: number }
export type CourseProgress = { done: number; total: number; percent: number | null; label: string; weeks: { week: number; done: number; total: number }[]; items: ItemProgress[] }
export type Reminder = { id: string; key: string; kind: 'assessment' | 'material'; title: string; text: string; path: string; state: Exclude<ReminderState, 'done'>; when: string }

const DAY = 86_400_000
const MANILA_OFFSET = 8 * 3_600_000
export const REMINDER_DAYS = 3

export const manilaDay = (time: number) => Math.floor((time + MANILA_OFFSET) / DAY)
/** The server's clock: the device clock moved by the offset recorded when the records were read. */
export const recordsNow = (data: { clockOffset?: number }, device = Date.now()) => device + (Number.isFinite(data.clockOffset) ? data.clockOffset as number : 0)

export const dueOf = (item: Publication) => [item.due_at,item.delivery_mode === 'block_schedule' ? item.delivery_close_at : null]
  .filter((value): value is string => Boolean(value && Number.isFinite(Date.parse(value))))
  .sort((a,b) => Date.parse(a) - Date.parse(b))[0] || null

/** Blue: pending, no due date or more than 3 Manila days left. Orange: 3 days or less. Red: the due moment has passed. */
export function reminderState(dueAt: string | null | undefined, done: boolean, now: number): ReminderState {
  if (done) return 'done'
  const due = dueAt ? Date.parse(dueAt) : NaN
  if (!Number.isFinite(due)) return 'blue'
  if (now > due) return 'red'
  return manilaDay(due) - manilaDay(now) <= REMINDER_DAYS ? 'orange' : 'blue'
}

function whenText(dueAt: string | null | undefined, state: ReminderState, now: number) {
  const due = dueAt ? Date.parse(dueAt) : NaN
  if (!Number.isFinite(due) || state === 'done') return ''
  const date = `${deliveryTimeLabel(new Date(due).toISOString())} (Philippine time)`
  if (state === 'red') return `Due date missed: ${date}`
  if (state === 'blue') return `Due ${date}`
  const days = manilaDay(due) - manilaDay(now)
  return `${days <= 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`}: ${date}`
}

/** Released and, for a block's timed delivery, already open or closed (not still scheduled). */
export const isDelivered = (item: Publication, now: number) =>
  item.active && (!item.release_at || Date.parse(item.release_at) <= now) && !['scheduled', 'unconfigured'].includes(deliveryState(item, now))

const mine = (email?: string) => (row: { student_email?: string }) => !email || !row.student_email || row.student_email.toLowerCase() === email.toLowerCase()
const opened = (data: AcademicData, item: Publication, email?: string) => data.accesses.some(entry => entry.publication_id === item.id && mine(email)(entry))

export function materialHasReader(item: Publication) {
  const content = item.content
  if (!content || content.submissionOnly) return false
  return Boolean(
    Array.isArray(content.sections) && content.sections.length ||
    [content.instructions, content.description].some(value => typeof value === 'string' && value.trim()) ||
    Array.isArray(content.attachments) && content.attachments.some(file => file?.path && teachingFileKind(file))
  )
}

export function itemProgress(data: AcademicData, item: Publication, email?: string): ItemProgress {
  const base = { id: item.id, week: item.week }
  if (item.type === 'assessment') {
    const done = Boolean(studentAttempt(data, item, email))
    return { ...base, kind: 'assessment', done, percent: done ? 100 : 0, read: 0, total: 0 }
  }
  const row = (data.reading || []).find(entry => entry.publication_id === item.id && String(entry.source_version) === String(item.source_version) && mine(email)(entry))
  const sections = item.content?.sections
  const total = materialHasReader(item) ? Math.max(1, Array.isArray(sections) ? sections.length : row?.total_sections || 0) : 0
  const read = Math.min(row?.sections_read || 0, total)
  const progress = total > 0 || row ? readingPercent(row) : opened(data, item, email) ? 100 : 0
  return { ...base, kind: 'material', done: progress === 100, percent: progress, read, total }
}

export function courseProgress(data: AcademicData, courseId: string, now: number, email?: string): CourseProgress {
  const items = data.publications.filter(item => item.course_id === courseId && isDelivered(item, now)).map(item => itemProgress(data, item, email))
  const done = items.filter(item => item.done).length
  const weeks = [...new Set(items.map(item => item.week))].sort((a, b) => a - b).map(week => {
    const inWeek = items.filter(item => item.week === week)
    return { week, done: inWeek.filter(item => item.done).length, total: inWeek.length }
  })
  return { done, total: items.length, percent: percent(done, items.length), label: `${done} of ${items.length} ${items.length === 1 ? 'item' : 'items'} done`, weeks, items }
}

export function pendingAssessments(data: AcademicData, now: number, courseId?: string) {
  return data.publications.filter(item => item.type === 'assessment' && (!courseId || item.course_id === courseId) &&
    isDelivered(item,now) && !studentAttempt(data,item)).map(item => {
      const due = dueOf(item)
      const reminder = reminderState(due,false,now)
      const category: 'missing'|'upcoming'|'open' = reminder === 'red' || deliveryState(item,now) === 'closed' ? 'missing' : due ? 'upcoming' : 'open'
      return {item,due,category,when:whenText(due,category === 'missing' ? 'red' : reminder,now)}
    }).sort((a,b) => {
      const order = {upcoming:0,open:1,missing:2}
      return order[a.category] - order[b.category] ||
        ((a.category === 'missing' ? -1 : 1) * (Date.parse(a.due || '') - Date.parse(b.due || ''))) ||
        a.item.week - b.item.week
    })
}

const RANK = { red: 0, orange: 1, blue: 2 } as const
/** Delivered materials not opened and assessments not answered, most urgent first. */
export function pendingReminders(data: AcademicData, now: number, email?: string): Reminder[] {
  return data.publications.filter(item => isDelivered(item, now)).flatMap((item): Reminder[] => {
    const assessment = item.type === 'assessment'
    if (assessment ? studentAttempt(data, item, email) : opened(data, item, email)) return []
    const state = reminderState(dueOf(item), false, now) as Reminder['state']
    return [{
      id: item.id,
      key: `${assessment ? 'assessment' : 'material'}:${item.id}:${item.source_version}`,
      kind: assessment ? 'assessment' : 'material',
      title: item.title,
      text: assessment ? `Unanswered assessment: "${item.title}".` : `You haven't opened "${item.title}" yet.`,
      path: assessment ? '/assessment' : '/courseware',
      state,
      when: whenText(dueOf(item), state, now),
    }]
  }).sort((a, b) => RANK[a.state] - RANK[b.state])
}
