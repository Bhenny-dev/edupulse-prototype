import test from 'node:test'
import assert from 'node:assert/strict'
import { courseDelivery } from '../src/components/academic/deliveryOversight.js'
import { courseAssignments } from '../src/components/academic/deanRecordModel.js'
import type { AcademicData } from '../src/components/academic/academicData.js'

const now = Date.parse('2026-11-27T04:00:00Z')
const course = { id: 'c1', syllabus_id: 's1', course_code: 'IT 102', course_title: 'Programming', active: true, instructor_id: 't1',
  outline: [{ week: 1, contents: ['Variables'], ilos: 'Explain' }, { week: 2, contents: ['Loops'], ilos: 'Trace' }, { week: 3, contents: ['Arrays'], ilos: 'Index' }, { week: 4, contents: [], ilos: '' }] }
const pub = (week: number, extra: Partial<AcademicData['publications'][number]> = {}) => ({
  id: `p${week}`, course_id: 'c1', active: true, type: 'material', week, title: `W${week}`, source_version: 'v', ...extra,
})
const load = (record_key: string, fields: Record<string, string>) => ({
  kind: 'loads', record_key, data: { CourseCode: 'IT 102', InstructorID: 't1', AcademicYear: '2026-2027', Semester: '1st Semester', ...fields },
})
const data: AcademicData = {
  courses: [course, { ...course, id: 'other', syllabus_id: 's2' }],
  publications: [pub(1), pub(1, { id: 'p1-scheduled', delivery_mode: 'block_schedule' }), pub(2, { delivery_mode: 'block_schedule' }), pub(3, { delivery_mode: 'block_schedule' }),
    pub(5, { release_at: '2026-12-01T00:00:00Z' }), pub(4, { active: false }), pub(1, { id: 'other-pub', course_id: 'other' })],
  enrollments: [{ course_id: 'c1', student_email: 'A@x', block_section: 'A' }, { course_id: 'c1', student_email: 'a@x', block_section: 'A' }, { course_id: 'other', student_email: 'other@x', block_section: 'A' }],
  deliverySchedules: [{ course_id: 'c1', instructor_id: 't1', syllabus_id: 's1', block_section: 'A', revision: 1, updated_at: '',
    windows: [{ week: 2, opens_at: '2026-11-20T00:00:00Z', closes_at: '2026-11-20T02:00:00Z' }, { week: 3, opens_at: '2026-12-04T00:00:00Z', closes_at: null }] }],
  institutional: [
    load('parent', { LoadType: 'course', TeachingSyllabusID: 's1' }),
    load('a', { Block: 'A', ParentLoadKey: 'parent' }),
    load('b', { Block: 'B', ParentLoadKey: 'parent', ScheduleDays: 'M', ScheduleTime: '7:30 AM - 10:00 AM' }),
    load('c', { Block: 'C', ParentLoadKey: 'parent' }),
    load('separate', { LoadType: 'course', TeachingSyllabusID: 's2' }),
    { kind: 'term_calendar', record_key: '1st Semester|2026-2027', data: { ClassesStart: '2026-11-16', Weeks: '18' } },
  ],
  attempts: [], accesses: [],
}

test('delivery uses saved windows, term-calendar defaults and legacy releases per assigned block', () => {
  const assignment = courseAssignments(data).find(item => item.key === 'parent')!
  const summary = courseDelivery(data, assignment, now)
  assert.equal(summary.releasedItems, 4)
  assert.deepEqual(summary.blocks, [
    { block: 'A', students: 1, plannedWeeks: 3, releasedWeeks: 3, deliveredWeeks: 2, scheduledWeeks: 1, unscheduledWeeks: 0, nextOpening: '2026-12-04T00:00:00Z' },
    { block: 'B', students: 0, plannedWeeks: 3, releasedWeeks: 3, deliveredWeeks: 2, scheduledWeeks: 1, unscheduledWeeks: 0, nextOpening: '2026-11-29T23:30:00.000Z' },
    { block: 'C', students: 0, plannedWeeks: 3, releasedWeeks: 3, deliveredWeeks: 1, scheduledWeeks: 0, unscheduledWeeks: 2, nextOpening: null },
  ])
})

test('delivery uses the bound syllabus and excludes another teaching copy of the same course', () => {
  const assignments = courseAssignments(data)
  const separate = assignments.find(item => item.key === 'separate')!
  assert.equal(courseDelivery(data, separate, now).releasedItems, 1)
  assert.equal(courseDelivery(data, { ...separate, instructorId: 't2' }, now).syllabus, undefined)
})
