import test from 'node:test'
import assert from 'node:assert/strict'
import { clockLabel, hourSpan, layoutDay, meetingsOf, timeRange, weekOf } from '../src/utils/classSchedule'

const klass = (key: string, code: string, slots: { days?: string; time?: string; room?: string }[]) => ({ key, code, title: code, block: 'A', slots })

test('a class meets on every printed day at its printed time, with afternoon hours read as PM', () => {
  const { meetings, unscheduled } = meetingsOf([klass('a', 'IT 101', [{ days: 'TTH', time: '7:30 - 9:00', room: 'A310' }]), klass('b', 'IT 102', [{ days: 'MW', time: '1:00 - 2:30' }])])
  assert.deepEqual(unscheduled, [])
  assert.deepEqual(meetings.map(m => [m.code, m.day, timeRange(m), m.room]), [
    ['IT 102', 1, '1:00 PM - 2:30 PM', ''], ['IT 101', 2, '7:30 AM - 9:00 AM', 'A310'], ['IT 102', 3, '1:00 PM - 2:30 PM', ''], ['IT 101', 4, '7:30 AM - 9:00 AM', 'A310']])
})

test('a class without a recorded day or time is listed apart, never guessed onto the calendar', () => {
  const { meetings, unscheduled } = meetingsOf([klass('a', 'IT 101', []), klass('b', 'IT 102', [{ days: 'MW' }]), klass('c', 'IT 103', [{ time: '7:30 - 9:00' }]), klass('d', 'IT 104', [{ days: 'F', time: '8:00' }])])
  assert.deepEqual(unscheduled.map(item => item.code), ['IT 101', 'IT 102', 'IT 103'])
  assert.deepEqual(meetings.map(m => [m.code, timeRange(m)]), [['IT 104', '8:00 AM - 9:30 AM']], 'a start without an end lasts an hour and a half')
})

test('meetings that overlap on one day sit side by side and the others keep the whole column', () => {
  const { meetings } = meetingsOf([klass('a', 'IT 101', [{ days: 'M', time: '8:00 - 10:00' }]), klass('b', 'IT 102', [{ days: 'M', time: '9:00 - 11:00' }]), klass('c', 'IT 103', [{ days: 'M', time: '10:00 - 11:00' }]), klass('d', 'IT 104', [{ days: 'M', time: '1:00 - 2:00' }])])
  const laid = layoutDay(meetings)
  assert.deepEqual(laid.map(m => [m.code, m.lane, m.lanes]), [['IT 101', 0, 2], ['IT 102', 1, 2], ['IT 103', 0, 2], ['IT 104', 0, 1]])
})

test('the week grid covers 7 AM to 6 PM and grows later for evening classes (1:00 to 6:59 print as afternoon, so none start before 7 AM)', () => {
  assert.deepEqual(hourSpan([]), { from: 7 * 60, to: 18 * 60 })
  const { meetings } = meetingsOf([klass('a', 'IT 101', [{ days: 'M', time: '7:00 - 8:00' }]), klass('b', 'IT 102', [{ days: 'F', time: '5:30 - 8:30' }])])
  assert.deepEqual(hourSpan(meetings), { from: 7 * 60, to: 21 * 60 })
})

test('a week runs Monday to Sunday and clock labels use 12 hours', () => {
  const week = weekOf(new Date(2026, 10, 25))
  assert.deepEqual(week.map(date => date.getDate()), [23, 24, 25, 26, 27, 28, 29])
  assert.deepEqual(week.map(date => date.getDay()), [1, 2, 3, 4, 5, 6, 0])
  assert.deepEqual([0, 7 * 60 + 5, 12 * 60, 13 * 60 + 30].map(clockLabel), ['12:00 AM', '7:05 AM', '12:00 PM', '1:30 PM'])
})
