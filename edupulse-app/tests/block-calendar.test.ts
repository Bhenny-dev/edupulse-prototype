import test from 'node:test'
import assert from 'node:assert/strict'
import { slotHours, weeklyContactHours, weekMeetings, classScheduleDates, termHours, termCalendar } from '../src/utils/blockCalendar'

const calendar = { classesStart: '2026-08-10', weeks: 18 } // a Monday

test('weekly contact hours count every meeting day of every slot, with afternoon times read as PM', () => {
  assert.equal(slotHours('7:30 - 10:00'), 2.5)
  assert.equal(slotHours('2:00 - 4:30'), 2.5)
  assert.equal(slotHours('10:30 - 1:00'), 2.5, 'a class that runs past noon')
  assert.equal(slotHours('7:30'), 0, 'no end printed')
  assert.equal(weeklyContactHours([{ days: 'MT', time: '7:30 - 10:00' }]), 5)
  assert.equal(weeklyContactHours([{ days: 'TTH', time: '1:00 - 2:30' }, { days: 'F', time: '8:00 - 11:00' }]), 6, 'lecture and laboratory slots add up')
})

test('each teaching week lists its class meetings from the term start date', () => {
  assert.deepEqual(weekMeetings([{ days: 'MT', time: '7:30 - 10:00', room: 'A322' }], calendar, 1), [
    { date: '2026-08-10', start: '07:30', end: '10:00', room: 'A322' }, { date: '2026-08-11', start: '07:30', end: '10:00', room: 'A322' }])
  assert.deepEqual(weekMeetings([{ days: 'TTH', time: '2:00 - 4:30' }, { days: 'F', time: '8:00 - 11:00' }], calendar, 2).map(m => `${m.date} ${m.start}`), ['2026-08-18 14:00', '2026-08-20 14:00', '2026-08-21 08:00'])
  assert.deepEqual(weekMeetings([{ days: 'MT', time: '7:30 - 10:00' }], { classesStart: 'soon', weeks: 18 }, 1), [], 'no valid start date, no meetings')
})

test('default delivery opens each week at its first class meeting, also when classes start mid-week', () => {
  assert.deepEqual(classScheduleDates([{ days: 'MT', time: '7:30 - 10:00' }], calendar, [3, 1, 2, 2]), [
    { week: 1, date: '2026-08-10', start: '07:30', end: '' }, { week: 2, date: '2026-08-17', start: '07:30', end: '' }, { week: 3, date: '2026-08-24', start: '07:30', end: '' }])
  // Classes start on a Wednesday: a Monday-Tuesday block first meets on the next Monday, still within week 1.
  assert.deepEqual(classScheduleDates([{ days: 'MT', time: '2:00 - 4:30' }], { classesStart: '2026-08-12', weeks: 18 }, [1]), [{ week: 1, date: '2026-08-17', start: '14:00', end: '' }])
})

test('the term total is compared with the syllabus hours', () => {
  assert.deepEqual(termHours([{ days: 'MT', time: '7:30 - 10:00' }], calendar, '90 Hours'), { weekly: 5, weeks: 18, scheduled: 90, planned: 90, short: false })
  assert.equal(termHours([{ days: 'W', time: '7:30 - 10:00' }], calendar, 90).short, true, '2.5 hours a week cannot cover 90 hours')
  assert.equal(termHours([{ days: 'W', time: '7:30 - 10:00' }], null, 90).short, false, 'without a calendar nothing is claimed')
})

test('the Dean term calendar is read for the semester shown', () => {
  const records = [{ kind: 'term_calendar', record_key: '1st Semester|2026-2027', data: { ClassesStart: '2026-08-10', Weeks: 18 } }, { kind: 'loads', record_key: 'x', data: {} }]
  assert.deepEqual(termCalendar(records, '1st Semester', '2026-2027'), calendar)
  assert.deepEqual(termCalendar(records, '1', '2026-2027'), calendar, 'a load that prints the semester as "1"')
  assert.equal(termCalendar(records, '2nd Semester', '2026-2027'), null)
})

test('canonical TTh and S day selections drive the actual delivery calendar',()=>{
 assert.equal(weeklyContactHours([{days:'TTh',time:'7:30 - 10:00'}]),5)
 assert.deepEqual(weekMeetings([{days:'TTh',time:'7:30 - 10:00'}],calendar,1).map(m=>m.date),['2026-08-11','2026-08-13'])
 assert.deepEqual(weekMeetings([{days:'S',time:'7:30 - 10:00'}],calendar,1).map(m=>m.date),['2026-08-15'])
})
