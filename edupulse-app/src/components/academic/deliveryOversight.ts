import { termCalendar, weekDeliveries } from '../../utils/blockCalendar'
import type { AcademicData } from './academicData'
import { assignedLoadSyllabus, type courseAssignments } from './deanRecordModel'

export type StaffCourseLoad = ReturnType<typeof courseAssignments>[number]

/** Treat each released week once per assigned block using the same windows as the instructor's class. */
export function courseDelivery(data: AcademicData, load: StaffCourseLoad, now = Date.now() + (data.clockOffset || 0)) {
  const syllabus = assignedLoadSyllabus(data, load)
  const plannedWeeks = new Set((syllabus?.outline || []).filter(row => row.ilos?.trim() && row.contents?.length).map(row => row.week)).size
  const released = syllabus?.active ? data.publications.filter(item => item.course_id === syllabus.id && item.active && (!item.release_at || Date.parse(item.release_at) <= now)) : []
  const weeks = [...new Set(released.map(item => item.week))]
  const legacyWeeks = new Set(released.filter(item => item.delivery_mode !== 'block_schedule').map(item => item.week))
  const schedules = data.deliverySchedules?.filter(item => item.course_id === syllabus?.id) || []
  const calendar = termCalendar(data.institutional, load.semester, load.academicYear)
  const slots = Object.fromEntries(load.sections.map(section => [section.block, section.slots]))
  const blocks = load.sections.map(section => {
    let deliveredWeeks = 0, scheduledWeeks = 0, unscheduledWeeks = 0
    let nextOpening: string | null = null
    for (const week of weeks) {
      const [window] = weekDeliveries(week, [section.block], slots, schedules, calendar, now)
      if (legacyWeeks.has(week) || window?.state === 'open' || window?.state === 'closed') deliveredWeeks++
      else if (window?.state === 'scheduled') {
        scheduledWeeks++
        if (nextOpening === null || Date.parse(window.opensAt) < Date.parse(nextOpening)) nextOpening = window.opensAt
      } else unscheduledWeeks++
    }
    return { block: section.block, students: section.students.length, plannedWeeks, releasedWeeks: weeks.length, deliveredWeeks, scheduledWeeks, unscheduledWeeks, nextOpening }
  })
  return { syllabus, plannedWeeks, releasedItems: released.length, blocks }
}
