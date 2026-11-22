import test from 'node:test'
import assert from 'node:assert/strict'
import {loadSchedule} from '../src/utils/loadSchedule'
test('schedule maps TTh to actual weekdays, duration and split rooms without repeating source rows',()=>{
 const slot={days:'TTh',time:'7:30 - 10:00',room:'A310 / A302'}
 const events=loadSchedule({sections:[{block:'A',slots:[slot,slot]}],sourceRows:[{days:'F',time:'8:00 - 9:00'}]})
 assert.equal(events.length,2);assert.deepEqual(events.map(e=>e.day),['Tuesday','Thursday']);assert.deepEqual(events.map(e=>e.room),['A310','A302']);assert.equal(events[0].start,450);assert.equal(events[0].end,600);assert.equal(events[0].hours,2.5)
})
test('source-only slots retain their block and Saturday; explicit PM is not mapped to morning',()=>{
 const events=loadSchedule({sourceRows:[{subject_code:'IT 204 B',days:'S',time:'7:00 PM - 9:00 PM',room:'A1'}]})
 assert.equal(events[0].day,'Saturday');assert.equal(events[0].block,'B');assert.equal(events[0].start,1140);assert.equal(events[0].end,1260);assert.equal(events[0].hours,2)
 assert.deepEqual(loadSchedule({}),[])
})
