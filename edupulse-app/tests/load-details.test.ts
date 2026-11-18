import test from 'node:test'
import assert from 'node:assert/strict'
import{readFile}from'node:fs/promises'
import{semesterDatabase}from'./semester-fixture'
test('manual instructor load details persist atomically and invalid values leave the load unchanged',async()=>{
 const{db,as,ids,command}=await semesterDatabase()
 try{
  await db.exec(await readFile('supabase/migrations/20261118082233_instructor_load_details.sql','utf8'))
  await as(2)
  const scope={academic_year:'2026-2027',semester:'1st Semester'}
  await command({action:'course.create',...scope,course:{code:'QA DETAIL',title:'Load details',units:3}})
  const details={time:'7:30 AM - 10:00 AM',days:'F',units:'3',lecture:'2',lab:'1',hours:'2.5',computed_hours:2.5,room:'A310',students:'',program:'BSIT'}
  const input={action:'course-load.assign',...scope,course_code:'QA DETAIL',instructor_id:ids[0],details}
  await assert.rejects(command({...input,details:{...details,room:''}}),{code:'22023'})
  const result=await command(input)
  const row=(await db.query<{data:Record<string,string>}>("SELECT data FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key=$1",[result.key])).rows[0].data
  assert.equal(row.ScheduleTime,details.time);assert.equal(row.LectureUnits,'2');assert.equal(row.LabUnits,'1');assert.equal(row.StudentCount,'');assert.equal(row.Program,'BSIT')
  await assert.rejects(command({...input,details:{...details,students:'3.5'}}),{code:'22023'})
  assert.equal((await db.query<{n:number}>('SELECT count(*) n FROM public.edupulse_enrollments')).rows[0].n,0)
 }finally{await db.close()}
})
