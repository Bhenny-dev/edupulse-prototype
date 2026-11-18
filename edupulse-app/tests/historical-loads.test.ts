import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {historicalLoadRecords} from '../scripts/lib/historical-loads'
import {recordsForLoadTerm,CURRENT_LOAD_TERM} from '../src/utils/loadTerms'
import {semesterDatabase} from './semester-fixture'
import {courseAssignments} from '../src/components/academic/deanRecordModel'
import type {TeachingLoadDocument} from '../src/utils/teachingLoad'
import type {AcademicData} from '../src/components/academic/academicData'

const source={filename:'approved-past.pdf',sha256:'a'.repeat(64),academicYear:'2025-2026',semester:'2nd Semester'}
const people={'Prior Teacher':{id:'11111111-1111-4111-8111-111111111111',name:'Prior Teacher',email:'past@example.invalid'}}
const row={id:'1:1',page:1,row:1,instructor:'Prior Teacher',degree:'Bachelor',semester:source.semester,academicYear:source.academicYear,subjectCode:'QA 101-1',title:'Prior course',time:'7:30 - 10:30',days:'M',units:3,lecture:3,lab:0,hours:3,computedHours:3,room:'R1',students:60,program:'BSIT',warnings:['AM/PM is not printed.']}
const doc:TeachingLoadDocument={entries:[row,{...row,id:'1:2',row:2,subjectCode:'QA 101-2',days:'T'}],pages:1,warnings:[],totals:[{instructor:row.instructor,page:1,units:6,hours:6,computedUnits:6,computedHours:6}]}
const courses=Object.fromEntries(doc.entries.map(r=>[r.subjectCode,{code:'QA 101',title:'Prior course',units:3}]))

test('reviewed historical forms retain all schedules and headcounts under course-only assignments',()=>{
 const plan=historicalLoadRecords(doc,people,courses,source)
 assert.equal(plan.catalog.length,1);assert.equal(plan.loads.length,1)
 const load=plan.loads[0].data
 assert.equal(load.LoadType,'course');assert.equal(load.Block,'');assert.equal(load.HighestDegree,'Bachelor')
 assert.equal(load.HasMasters,'No');assert.equal(load.AcademicYear,'2025-2026')
 assert.deepEqual((load.SourceRows as Record<string,unknown>[]).map(r=>[r.row,r.subject_code,r.days,r.students]),[[1,'QA 101-1','M',60],[2,'QA 101-2','T',60]])
 assert.deepEqual(historicalLoadRecords(doc,people,courses,source),plan,'reruns have identical keys and payloads')
 assert.deepEqual(load.SourceForms,doc.totals)
})
test('historical import refuses unreviewed identities, course mappings, units, duplicate positions and current terms',()=>{
 assert.throws(()=>historicalLoadRecords(doc,{},courses,source))
 assert.throws(()=>historicalLoadRecords(doc,people,{},source))
 assert.throws(()=>historicalLoadRecords(doc,people,{...courses,'QA 101-1':{...courses['QA 101-1'],units:4}},source))
 assert.throws(()=>historicalLoadRecords({...doc,entries:[row,row]},people,courses,source))
 assert.throws(()=>historicalLoadRecords(doc,people,courses,{...source,academicYear:'2026-2027'}))
 assert.throws(()=>historicalLoadRecords({...doc,warnings:['Page 1: no table rows could be read.']},people,courses,source))
})
test('past staff degrees and teaching identities do not overwrite current qualifications, live roles or account suspension',()=>{
 const plan=historicalLoadRecords(doc,people,courses,source)
 const data={courses:[],enrollments:[],publications:[],attempts:[],accesses:[],institutional:[...plan.catalog,...plan.loads],directory:{instructors:[{...people['Prior Teacher'],degree:'Doctorate',has_masters:true,status:'suspended'}]},faculty:[]} as unknown as AcademicData
 const past=recordsForLoadTerm(data,'2025-2026|2nd Semester')
 assert.deepEqual(past.directory?.instructors,[{...people['Prior Teacher'],degree:'Bachelor',has_masters:false,status:'active',employee_id:'',specialization:'',historical:true}])
 assert.equal((recordsForLoadTerm(data,CURRENT_LOAD_TERM).directory?.instructors?.[0] as {degree:string}).degree,'Doctorate')
 assert.equal(courseAssignments(past)[0].units,'6','loaded teaching units include each retained schedule row')
 assert.equal(courseAssignments(past)[0].computedHours,'6')
 assert.equal((data.directory?.instructors?.[0] as {status:string}).status,'suspended')
 assert.equal(recordsForLoadTerm(data,'all'),data)
})
test('only a no-JWT postgres maintenance session can backfill historical course loads; ordinary past-term writes stay denied',async()=>{
 const {db,as,ids,command}=await semesterDatabase()
 try{
  await db.exec(await readFile('supabase/migrations/20261118061807_historical_teaching_load_backfill.sql','utf8'))
  await db.exec("RESET ROLE;SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','{}',false)")
  const load=historicalLoadRecords(doc,people,courses,source).loads[0]
  await db.query("INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by) VALUES('loads',$1,$2,$3)",[load.record_key,JSON.stringify(load.data),ids[4]])
  assert.equal((await db.query<{n:number}>('SELECT count(*) n FROM public.edupulse_enrollments')).rows[0].n,0)
  for(const role of [0,2,4,6]){
   await as(role)
   await assert.rejects(command({action:'course-load.assign',course_code:'QA 101',instructor_id:ids[0],academic_year:'2025-2026',semester:'2nd Semester'}),{code:'42501'})
  }
  await as(2)
  await assert.rejects(db.query("INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by) VALUES('loads','forged',$1,$2)",[JSON.stringify(load.data),ids[2]]),{code:'42501'})
  await db.exec("RESET ROLE;SELECT set_config('request.jwt.claim.sub','',false);SET ROLE authenticated")
  await assert.rejects(db.query("INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by) VALUES('loads','no-jwt',$1,$2)",[JSON.stringify(load.data),ids[2]]))
  await db.exec('RESET ROLE;ALTER ROLE service_role BYPASSRLS;GRANT USAGE ON SCHEMA auth TO service_role;GRANT SELECT,INSERT ON public.edupulse_institutional_records TO service_role;SET ROLE service_role')
  await assert.rejects(db.query("INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by) VALUES('loads','service-key',$1,$2)",[JSON.stringify(load.data),ids[4]]),{code:'42501'})
 }finally{await db.close()}
})
