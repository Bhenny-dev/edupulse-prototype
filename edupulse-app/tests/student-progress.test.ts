import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { AcademicData, Publication } from '../src/components/academic/academicData'
import { courseProgress, isDelivered, itemProgress, manilaDay, pendingReminders, recordsNow, reminderState } from '../src/components/academic/studentProgress'

const at = (value: string) => Date.parse(value)
const NOW = at('2026-11-02T04:00:00Z') // Nov 2, 12:00 in Manila
const publication = (id: string, extra: Partial<Publication> = {}): Publication => ({ id, course_id: 'c1', active: true, type: 'material', week: 1, title: id, source_version: 'v1', ...extra })
const records = (publications: Publication[], extra: Partial<AcademicData> = {}): AcademicData => ({ courses: [], publications, enrollments: [], attempts: [], accesses: [], reading: [], ...extra })
const attempt = (id: string, extra: Record<string, unknown> = {}) => ({ publication_id: id, source_version: 'v1', score: 8, max_score: 10, submitted_at: '2026-11-01T00:00:00Z', ...extra })

test('a pending item is blue until 3 Manila days remain, orange until the due moment, then red', () => {
  const due = '2026-11-25T15:59:00Z' // Nov 25, 23:59 in Manila
  assert.equal(reminderState(due, false, at('2026-11-21T15:59:00Z')), 'blue') // Nov 21, 23:59 in Manila: 4 days left
  assert.equal(reminderState(due, false, at('2026-11-21T16:00:00Z')), 'orange') // Nov 22, 00:00 in Manila: 3 days left
  assert.equal(reminderState(due, false, at('2026-11-25T15:59:00Z')), 'orange') // the due moment itself is not missed yet
  assert.equal(reminderState(due, false, at('2026-11-25T15:59:01Z')), 'red')
  assert.equal(reminderState(due, true, at('2026-12-30T00:00:00Z')), 'done')
  assert.equal(reminderState(null, false, at('2026-11-21T00:00:00Z')), 'blue')
  assert.equal(reminderState('not a date', false, at('2026-11-21T00:00:00Z')), 'blue')
})

test('days are counted on the Manila calendar, not the UTC one', () => {
  const due = '2026-11-24T16:30:00Z' // Nov 25, 00:30 in Manila but still Nov 24 in UTC
  assert.equal(reminderState(due, false, at('2026-11-21T15:59:00Z')), 'blue') // Nov 21 in Manila: 4 days (UTC days would say 3)
  assert.equal(reminderState(due, false, at('2026-11-21T16:00:00Z')), 'orange') // Nov 22 in Manila: 3 days
  assert.equal(manilaDay(at('2026-11-24T16:00:00Z')) - manilaDay(at('2026-11-24T15:59:59Z')), 1)
})

test('records time follows the server clock when the records carry an offset', () => {
  assert.equal(recordsNow({}, 1000), 1000)
  assert.equal(recordsNow({ clockOffset: 5000 }, 1000), 6000)
  assert.equal(recordsNow({ clockOffset: Number.NaN }, 1000), 1000)
})

test('material progress counts confirmed sections of the current version; an assessment is done once an attempt is saved', () => {
  const lesson = publication('lesson', { content: { sections: [{}, {}, {}, {}] } })
  const reading = (read: number, version = 'v1') => ({ publication_id: 'lesson', source_version: version, sections_read: read, total_sections: 4, updated_at: '2026-11-01T00:00:00Z' })
  assert.deepEqual(itemProgress(records([lesson], { reading: [reading(1), reading(4, 'v0')] }), lesson), { id: 'lesson', week: 1, kind: 'material', done: false, percent: 25, read: 1, total: 4 })
  assert.deepEqual(itemProgress(records([lesson], { reading: [reading(4)] }), lesson), { id: 'lesson', week: 1, kind: 'material', done: true, percent: 100, read: 4, total: 4 })
  const file = publication('file')
  assert.deepEqual([itemProgress(records([file]), file).done, itemProgress(records([file], { accesses: [{ publication_id: 'file', first_opened_at: '2026-11-01T00:00:00Z' }] }), file).done], [false, true])
  const quiz = publication('quiz', { type: 'assessment' })
  assert.equal(itemProgress(records([quiz]), quiz).done, false)
  assert.equal(itemProgress(records([quiz], { attempts: [attempt('quiz', { score: 0, grading_status: 'pending_review' })] }), quiz).done, true)
  assert.equal(itemProgress(records([quiz], { attempts: [attempt('quiz', { student_email: 'two@example.invalid' })] }), quiz, 'one@example.invalid').done, false)
})

test('course progress counts delivered items only, per course and per week', () => {
  const lesson = publication('lesson', { content: { sections: [{}, {}] } })
  const data = records([
    lesson,
    publication('quiz', { type: 'assessment' }),
    publication('reading', { week: 2 }),
    publication('later', { week: 3, release_at: '2026-11-09T00:00:00Z' }),
    publication('next-class', { week: 3, type: 'assessment', delivery_mode: 'block_schedule', delivery_open_at: '2026-11-09T00:00:00Z' }),
    publication('hidden', { active: false }),
    publication('elsewhere', { course_id: 'c2' }),
  ], { reading: [{ publication_id: 'lesson', source_version: 'v1', sections_read: 2, total_sections: 2, updated_at: '2026-11-01T00:00:00Z' }] })
  const progress = courseProgress(data, 'c1', NOW)
  assert.deepEqual([progress.done, progress.total, progress.percent, progress.label], [1, 3, 33, '1 of 3 items done'])
  assert.deepEqual(progress.weeks, [{ week: 1, done: 1, total: 2 }, { week: 2, done: 0, total: 1 }])
  assert.equal(courseProgress(data, 'c3', NOW).percent, null)
  assert.equal(isDelivered(data.publications[3], NOW), false)
  assert.equal(isDelivered(data.publications[4], NOW), false)
})

test('pending work is listed most urgent first with Manila due text', () => {
  const data = records([
    publication('plain'),
    publication('week-away', { type: 'assessment', due_at: '2026-11-09T00:00:00Z' }),
    publication('today', { type: 'assessment', due_at: '2026-11-02T10:00:00Z' }),
    publication('tomorrow', { type: 'assessment', due_at: '2026-11-03T10:00:00Z' }),
    publication('in-two', { type: 'assessment', due_at: '2026-11-04T10:00:00Z' }),
    publication('missed', { type: 'assessment', due_at: '2026-10-01T00:00:00Z' }),
    publication('answered', { type: 'assessment', due_at: '2026-10-01T00:00:00Z' }),
    publication('seen'),
  ], { attempts: [attempt('answered')], accesses: [{ publication_id: 'seen', first_opened_at: '2026-11-01T00:00:00Z' }] })
  const list = pendingReminders(data, NOW)
  assert.deepEqual(list.map(item => [item.id, item.state]), [['missed', 'red'], ['today', 'orange'], ['tomorrow', 'orange'], ['in-two', 'orange'], ['plain', 'blue'], ['week-away', 'blue']])
  assert.deepEqual(list.map(item => item.path), ['/assessment', '/assessment', '/assessment', '/assessment', '/courseware', '/assessment'])
  assert.match(list[0].when, /^Due date missed: .*\(Philippine time\)$/)
  assert.match(list[1].when, /^Due today: /)
  assert.match(list[2].when, /^Due tomorrow: /)
  assert.match(list[3].when, /^Due in 2 days: /)
  assert.equal(list[4].when, '')
  assert.match(list[5].when, /^Due Nov 9, 2026/)
})

test('a class window that has closed is a missed deadline, and one that has not opened gives no reminder', () => {
  const data = records([
    publication('closed-quiz', { type: 'assessment', delivery_mode: 'block_schedule', delivery_open_at: '2026-10-01T00:00:00Z', delivery_close_at: '2026-10-02T00:00:00Z' }),
    publication('next-week', { type: 'assessment', delivery_mode: 'block_schedule', delivery_open_at: '2026-11-09T00:00:00Z' }),
    publication('unset', { type: 'assessment', delivery_mode: 'block_schedule' }),
  ])
  assert.deepEqual(pendingReminders(data, NOW).map(item => [item.id, item.state]), [['closed-quiz', 'red']])
})
