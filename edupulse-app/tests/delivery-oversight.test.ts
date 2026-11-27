import test from 'node:test'
import assert from 'node:assert/strict'
import {blockDelivery} from '../src/components/academic/deliveryOversight.js'
import type {AcademicData} from '../src/components/academic/academicData.js'

const now=Date.parse('2026-11-27T04:00:00Z')
const course={id:'c1',course_code:'IT 102',course_title:'Programming',active:true,instructor_id:'t1',outline:[{week:1,contents:['Variables'],ilos:'Explain'},{week:2,contents:['Loops'],ilos:'Trace'},{week:3,contents:['Arrays'],ilos:'Index'},{week:4,contents:[],ilos:''}]}
const pub=(week:number,extra:Record<string,unknown>={})=>({id:`p${week}${JSON.stringify(extra).length}`,course_id:'c1',active:true,type:'material',week,title:`W${week}`,source_version:'v',...extra})
const data={
 courses:[course,{...course,id:'c2',instructor_id:'t2'}],
 publications:[pub(1),pub(2,{delivery_mode:'block_schedule'}),pub(3,{delivery_mode:'block_schedule'}),pub(5,{release_at:'2026-12-01T00:00:00Z'}),pub(4,{active:false}),{...pub(1),id:'other',course_id:'c2'}],
 enrollments:[{course_id:'c1',student_email:'A@x',block_section:'A'},{course_id:'c1',student_email:'a@x',block_section:'A'},{course_id:'c1',student_email:'b@x',block_section:'B'}],
 deliverySchedules:[{course_id:'c1',instructor_id:'t1',syllabus_id:'s',block_section:'A',revision:1,updated_at:'',windows:[{week:2,opens_at:'2026-11-20T00:00:00Z',closes_at:null},{week:3,opens_at:'2026-12-04T00:00:00Z',closes_at:null}]}],
 attempts:[],accesses:[],
} as unknown as AcademicData

test('per-block delivery separates delivered, scheduled and unscheduled weeks for one instructor course',()=>{
 const [a,b]=blockDelivery(data,'IT 102','t1',['A','B'],now)
 assert.deepEqual(a,{block:'A',students:1,plannedWeeks:3,releasedWeeks:3,deliveredWeeks:2,scheduledWeeks:1,unscheduledWeeks:0,nextOpening:'2026-12-04T00:00:00Z'},'week 1 is not on a block schedule; week 2 opened; week 3 opens later; unreleased and hidden items are left out')
 assert.deepEqual(b,{block:'B',students:1,plannedWeeks:3,releasedWeeks:3,deliveredWeeks:1,scheduledWeeks:0,unscheduledWeeks:2,nextOpening:null},'a block without a schedule cannot receive block-scheduled weeks')
})

test('another instructor or an unknown course reports no delivery',()=>{
 assert.deepEqual(blockDelivery(data,'IT 102','t9',['A'],now)[0],{block:'A',students:0,plannedWeeks:0,releasedWeeks:0,deliveredWeeks:0,scheduledWeeks:0,unscheduledWeeks:0,nextOpening:null})
 assert.equal(blockDelivery(data,'IT 102','t2',['A'],now)[0].releasedWeeks,1,'each instructor reads only their own course record')
})
