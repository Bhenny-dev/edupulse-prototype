import test from 'node:test'
import assert from 'node:assert/strict'
import { sectionOf, scheduleRank, assignBlocks, slotTimes, slotDays } from '../src/utils/blockSections'

test('a load schedule presets the weekly class pattern', () => {
  assert.deepEqual(slotTimes('7:30 - 10:00'), { start: '07:30', end: '10:00' })
  assert.deepEqual(slotTimes('11:00 - 1:00'), { start: '11:00', end: '13:00' })
  assert.deepEqual(slotTimes('5:30 - 7:00'), { start: '17:30', end: '19:00' })
  assert.deepEqual(slotTimes(''), { start: '', end: '' })
  assert.deepEqual(slotDays('TTH'), ['Tuesday', 'Thursday'])
  assert.deepEqual(slotDays('MWF'), ['Monday', 'Wednesday', 'Friday'])
  assert.deepEqual(slotDays('SAT'), ['Saturday'])
})

test('the printed letter or number after a subject code is its block section', () => {
  assert.deepEqual(sectionOf('IT 101 A'), { course: 'IT 101', block: 'A' })
  assert.deepEqual(sectionOf(' wmade  4 b '), { course: 'WMADE 4', block: 'B' })
  assert.deepEqual(sectionOf('QA 101-2'), { course: 'QA 101', block: '2' })
  assert.deepEqual(sectionOf('PROF ED 16'), { course: 'PROF ED 16', block: '' })
})

test('schedule order reads the first meeting day and treats 1:00 to 6:59 as afternoon', () => {
  assert.ok(scheduleRank('MW', '7:30 - 9:00') < scheduleRank('TTH', '7:30 - 10:00'))
  assert.ok(scheduleRank('TTH', '7:30 - 10:00') < scheduleRank('TH', '7:30 - 10:00'), 'Tuesday comes before Thursday')
  assert.ok(scheduleRank('F', '10:00 - 12:00') < scheduleRank('F', '1:00 - 4:00'), '1:00 is after noon')
  assert.ok(scheduleRank('SAT', '8:00') < scheduleRank('SUN', '8:00'))
})

test('unprinted blocks take free letters by schedule; printed and other instructors’ blocks are kept', () => {
  const late = { subjectCode: 'PROF ED 16', days: 'TTH', time: '1:00 - 2:30' }, early = { subjectCode: 'PROF ED 16', days: 'TTH', time: '10:00 - 11:30' }
  const blocks = assignBlocks([late, early])
  assert.equal(blocks.get(early), 'A'); assert.equal(blocks.get(late), 'B')
  const lettered = [{ subjectCode: 'IT 101 A' }, { subjectCode: 'IT 101 C' }, { subjectCode: 'IT 101', days: 'M', time: '7:30' }]
  assert.deepEqual([...assignBlocks(lettered, ['b']).values()], ['A', 'C', 'D'])
})
