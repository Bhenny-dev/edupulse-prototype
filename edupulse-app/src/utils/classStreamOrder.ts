import { termCalendar, weekDeliveries, type BlockSlot } from './blockCalendar'
import type { AcademicData, Publication } from '../components/academic/academicData'

type StreamWeekOrder = {
  weeks: { week: number; entries: { publication?: Pick<Publication, 'delivery_mode' | 'release_at'> | null }[] }[]
  posts: { week?: number | null }[]
  data: Pick<AcademicData, 'institutional' | 'deliverySchedules'>
  course: { block?: string; semester: string; academicYear: string; slots?: Record<string, BlockSlot[]> }
  syllabus?: { id: string } | null
  now: number
}


/** Show the latest opened teaching week first, with upcoming weeks ordered by their opening. */
export function classStreamWeekOrder({ weeks, posts, data, course, syllabus, now }: StreamWeekOrder) {
  const weeksByNumber = new Map(weeks.map(week => [week.week, week]))
  const postedWeeks = new Set(posts.flatMap(post => post.week ? [post.week] : []))
  const calendar = termCalendar(data.institutional, course.semester, course.academicYear)
  const schedules = (data.deliverySchedules || []).filter(row => row.syllabus_id === syllabus?.id)
  const weekNumbers = new Set([...weeksByNumber.keys(), ...postedWeeks])

  return [...weekNumbers].map(week => {
    const [window] = weekDeliveries(week, course.block ? [course.block] : [], course.slots || {}, schedules, calendar, now)
    if (window && Number.isFinite(Date.parse(window.opensAt))) {
      return { week, group: window.state === 'scheduled' ? 1 : 0, opening: Date.parse(window.opensAt) }
    }

    const legacy = (weeksByNumber.get(week)?.entries || []).flatMap(({ publication }) =>
      publication && publication.delivery_mode !== 'block_schedule' ? [publication] : [])
    if (postedWeeks.has(week) || legacy.some(item => !item.release_at || Date.parse(item.release_at) <= now)) {
      return { week, group: 0, opening: 0 }
    }
    const opening = Math.min(...legacy.map(item => Date.parse(item.release_at || '')).filter(at => at > now))
    return { week, group: Number.isFinite(opening) ? 1 : 2, opening }
  }).sort((a, b) => a.group - b.group || (a.group === 0 ? b.week - a.week : a.opening - b.opening || a.week - b.week))
    .map(({ week }) => week)
}
