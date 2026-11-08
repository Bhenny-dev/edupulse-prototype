import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HERO, ROOM_ORDER, ROOMS, MEASURE, FLIGHTS, LITE_LAYOUT } from '../src/components/landing/classroom/plan.js'

// The plan of the walk through the 3D school: every room is reached, in page order, by a flight
// through sets that exist, and small screens have a stand-in layout for every room's props.
const SETS = ['campus', 'corridor', 'roomA', 'roomB', 'hall', 'yard', 'study']
const rooms: Record<string, { sets: string[]; viewH: number; anchor: string }> = ROOMS
const flights: Record<string, { sets: string[]; via: unknown[]; door?: unknown[]; leave?: number[]; enter?: number[] }> = FLIGHTS

test('the rooms follow the order of the page', () => {
  assert.deepEqual(ROOM_ORDER, ['problem', 'features', 'flow', 'roles', 'ai', 'impact', 'colleges', 'campus', 'faq', 'login'])
})

test('a flight joins every room to the next; the agents and their workspace come between Pulse and Impact', () => {
  const stops = ['hero', ...ROOM_ORDER]
  const expected = stops.slice(0, -1).map((from, i) => `${from}>${stops[i + 1]}`).filter(name => name !== 'ai>impact')
  expected.push('ai>agents', 'workspace>impact')
  assert.deepEqual(Object.keys(FLIGHTS).sort(), expected.sort())
})

test('every room and flight uses sets of the school, and a flight ends in the set of the room it reaches', () => {
  for (const name of HERO.sets) assert.ok(SETS.includes(name), `hero: ${name}`)
  for (const key of ROOM_ORDER) for (const name of rooms[key].sets) assert.ok(SETS.includes(name), `${key}: ${name}`)
  for (const [key, flight] of Object.entries(flights)) {
    for (const name of flight.sets) assert.ok(SETS.includes(name), `${key}: ${name}`)
    const to = rooms[key.split('>')[1]]
    if (to) assert.ok(flight.sets.includes(to.sets[0]), `${key} should draw ${to.sets[0]}`)
  }
})

test('the timings of a flight stay inside it and in order', () => {
  for (const [key, flight] of Object.entries(flights)) {
    for (const span of [flight.leave, flight.enter, flight.door?.slice(1) as number[] | undefined]) {
      if (!span) continue
      assert.ok(span[0] >= 0 && span[0] < span[1] && span[1] <= 1, `${key}: ${span}`)
    }
    if (flight.leave && flight.enter) assert.ok(flight.leave[1] <= flight.enter[0], `${key}: the old sheet has gone before the new one comes`)
    assert.ok(flight.via.length > 0, `${key} has a path`)
  }
})

test('every room says what its props line up with, on the page and in the small-screen stand-in', () => {
  const measure: Record<string, object> = MEASURE
  const standIn: Record<string, { anchor: { w: number }; items?: Record<string, unknown[]> }> = LITE_LAYOUT.rooms
  for (const key of ROOM_ORDER) {
    assert.ok(rooms[key].viewH > 0, `${key} viewH`)
    assert.ok(rooms[key].anchor.startsWith('.'), `${key} anchor`)
    assert.ok(measure[key], `${key} measure`)
    const layout = standIn[key]
    assert.ok(layout?.anchor?.w > 0, `${key} stand-in anchor`)
    for (const name of Object.keys(measure[key])) assert.ok((layout.items?.[name]?.length ?? 0) > 0, `${key} stand-in ${name}`)
  }
})
