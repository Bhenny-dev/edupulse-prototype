import type { AcademicData } from './academicData'

export type BlockDelivery = { block: string; students: number; plannedWeeks: number; releasedWeeks: number; deliveredWeeks: number; scheduledWeeks: number; unscheduledWeeks: number; nextOpening: string | null }

/** Read-only delivery state per block for one instructor's course (T7.4). A week counts once per block:
 * delivered when a released item exists and the block's window has opened (or the item is not on a block schedule),
 * scheduled when its window opens later, unscheduled when the item waits on a block schedule the block lacks. */
export function blockDelivery(data: AcademicData, courseCode: string, instructorId: string, blocks: string[], now = Date.now()): BlockDelivery[] {
  const course = data.courses.find(item => item.course_code === courseCode && String(item.instructor_id) === String(instructorId))
  const released = course ? data.publications.filter(item => item.course_id === course.id && item.active && (!item.release_at || Date.parse(item.release_at) <= now)) : []
  const weeks = [...new Set(released.map(item => item.week))]
  const planned = (course?.outline || []).filter(row => row.ilos?.trim() && row.contents?.length).length
  return blocks.map(block => {
    const roster = course ? new Set(data.enrollments.filter(item => item.course_id === course.id && item.block_section === block).map(item => item.student_email.toLowerCase())) : new Set()
    const schedule = course ? (data.deliverySchedules || []).find(item => item.course_id === course.id && item.block_section === block) : undefined
    let delivered = 0, scheduled = 0, unscheduled = 0
    for (const week of weeks) {
      const onSchedule = released.some(item => item.week === week && item.delivery_mode === 'block_schedule')
      const window = schedule?.windows.find(item => item.week === week)
      if (!onSchedule || (window && Date.parse(window.opens_at) <= now)) delivered++
      else if (window) scheduled++
      else unscheduled++
    }
    const upcoming = (schedule?.windows || []).map(item => item.opens_at).filter(at => Date.parse(at) > now).sort()
    return { block, students: roster.size, plannedWeeks: planned, releasedWeeks: weeks.length, deliveredWeeks: delivered, scheduledWeeks: scheduled, unscheduledWeeks: unscheduled, nextOpening: upcoming[0] || null }
  })
}
