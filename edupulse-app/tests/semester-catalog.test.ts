import test from 'node:test'
import assert from 'node:assert/strict'
import {semesterDatabase} from './semester-fixture'
import {createHash} from 'node:crypto'

test('course catalog requires only code/title/units, scopes versions and mutations to the selected current/next semester',async()=>{
 const {db,as,command}=await semesterDatabase()
 const current={academic_year:'2026-2027',semester:'1st Semester'},next={...current,semester:'2nd Semester'},past={academic_year:'2025-2026',semester:'2nd Semester'}
 const course={code:'QA 101',title:'Course without a class year',units:3}
 try{
  await as(2)
  const added=await command({action:'course.create',...current,course})
  assert.ok(added.updated_at)
  const row=(await db.query<{data:Record<string,string>}>("SELECT data FROM public.edupulse_institutional_records WHERE kind='course_terms' AND data->>'CourseCode'='QA 101'")).rows[0].data
  assert.equal(row.Semester,'1st Semester');assert.equal(row.AcademicYear,'2026-2027');assert.equal(row.YearLevel,undefined)
  assert.equal((await db.query<{n:number}>("SELECT count(*) n FROM public.edupulse_institutional_records WHERE kind='loads'")).rows[0].n,0,'catalog creation never loads a class')
  await assert.rejects(command({action:'course.create',...current,course}),{code:'22023'})
  const second=await command({action:'course.create',...next,course:{...course,title:'Next semester title'}})
  await command({action:'course.update',...next,code:course.code,expected_updated_at:second.updated_at,course:{title:'Changed next semester only',units:4}})
  const first=(await db.query<{data:Record<string,string>}>("SELECT data FROM public.edupulse_institutional_records WHERE kind='course_terms' AND data->>'CourseCode'='QA 101' AND data->>'Semester'='1st Semester'")).rows[0].data
  assert.equal(first.CourseTitle,course.title);assert.equal(first.Units,'3')
  await assert.rejects(command({action:'course.status',...current,code:course.code,expected_updated_at:second.updated_at,status:'suspended'}),{code:'40001'})
  await assert.rejects(command({action:'course.create',...past,course:{...course,code:'QA OLD'}}),{code:'42501'})
  await assert.rejects(command({action:'course.create',course:{...course,code:'QA MISSING'}}),{code:'42501'})
  await as(0)
  await assert.rejects(command({action:'course.create',...current,course:{...course,code:'QA DENIED'}}),{code:'42501'})
 }finally{await db.close()}
})

test('course-only grid/PDF imports preserve source facts without creating students or blocks; pending classes expose labels only',async()=>{
 const {db,as,ids,email,command}=await semesterDatabase()
 const scope={academic_year:'2026-2027',semester:'1st Semester'}
 try{
  await db.query(`INSERT INTO public.edupulse_students(student_number,user_id,email,surname,first_name,middle_name,full_name,year_level,department,program,active) VALUES('S-3',$1,$2,'Sample','First','','First Sample',1,'CIT','BSIT',true)`,[ids[3],email(3)])
  await as(2);await command({action:'course.create',...scope,course:{code:'QA 101',title:'QA course',units:3}})
  const input={course_code:'QA 101',instructor_id:ids[0],...scope}
  await command({action:'load.assign',loads:[{...input,block:'IGNORED-1A'}]})
  let loads=(await db.query<{record_key:string;data:Record<string,string>;updated_at:string}>("SELECT record_key,data,updated_at FROM public.edupulse_institutional_records WHERE kind='loads'")).rows
  assert.equal(loads.length,1);assert.equal(loads[0].data.Block,'');assert.equal(loads[0].data.LoadType,'course')
  await command({action:'load.import_document',reviewed:true,filename:'approved.pdf',entries:[{...input,page:1,row:1,subject_code:'QA101-A',source_title:'Printed title',time:'7:30-10:00',computed_hours:2.5,expected_updated_at:loads[0].updated_at}]})
  const retained=(await db.query<{data:Record<string,any>}>("SELECT data FROM public.edupulse_institutional_records WHERE kind='loads'")).rows[0].data
  assert.equal(retained.SourceRows[0].time,'7:30-10:00');assert.equal(retained.SourceRows[0].source_title,'Printed title')
  assert.equal((await db.query<{n:number}>('SELECT count(*) n FROM public.edupulse_enrollments')).rows[0].n,0)
  await assert.rejects(command({action:'load.assign',loads:[{...input,academic_year:'2025-2026'}]}),{code:'42501'})
  await as(0)
  await db.query('SELECT public.edupulse_register_class($1)',[JSON.stringify({assignment:loads[0].record_key,block:'BSIT-1A',revision:0,mode:'replace',students:[{StudentID:'S-3'}]})])
  await as(3)
  const pending=(await db.query<{r:Record<string,any>[]}>('SELECT public.edupulse_student_course_loads() r')).rows[0].r
  assert.equal(pending.length,1);assert.equal(pending[0].course_code,'QA 101');assert.equal(pending[0].active,false);assert.equal(pending[0].units,'3');assert.equal(pending[0].content,undefined)
 }finally{await db.close()}
})

test('completed-semester workspaces, catalog and projected history cannot be altered through current saves',async()=>{
 const {db,as,ids,command}=await semesterDatabase()
 const scope={academic_year:'2026-2027',semester:'1st Semester'}
 try{
  await as(2);await command({action:'course.create',...scope,course:{code:'QA 101',title:'Retained course',units:3}})
  await command({action:'course-load.assign',...scope,course_code:'QA 101',instructor_id:ids[0]})
  await as(0);await db.query('SELECT public.edupulse_save_workspace(0,$1)',[JSON.stringify({syllabi:[source('old')],content:{},registrations:[]})])
  const original=(await db.query<{data:Record<string,any>;revision:number}>('SELECT data,revision FROM public.edupulse_workspaces WHERE owner_id=$1',[ids[0]])).rows[0]
  const before=(await db.query<{r:string}>("SELECT md5(string_agg(to_jsonb(c)::text,'' ORDER BY id)) r FROM public.edupulse_courses c WHERE syllabus_id='old'")).rows[0].r
  await db.exec("RESET ROLE;CREATE OR REPLACE FUNCTION edupulse_private.editable_course_term(year text,semester text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT year='2027-2028' AND edupulse_private.canonical_semester(semester) IN ('1st Semester','2nd Semester') $$;")
  await as(0)
  await assert.rejects(db.query('SELECT public.edupulse_save_workspace($1,$2)',[original.revision,JSON.stringify({...original.data,syllabi:[{...original.data.syllabi[0],courseTitle:'Altered past'}]})]),{code:'42501'})
  await db.query('SELECT public.edupulse_save_workspace($1,$2)',[original.revision,JSON.stringify({...original.data,syllabi:[...original.data.syllabi,{id:'new-draft',courseCode:'QA NEW',courseTitle:'New draft',status:'drafted'}]})])
  assert.equal((await db.query<{r:string}>("SELECT md5(string_agg(to_jsonb(c)::text,'' ORDER BY id)) r FROM public.edupulse_courses c WHERE syllabus_id='old'")).rows[0].r,before)
  await as(2);await assert.rejects(command({action:'course.create',...scope,course:{code:'QA OLD',title:'No past edits',units:3}}),{code:'42501'})
 }finally{await db.close()}
})

const source=(id:string,year='2026-2027',semester='1st Semester')=>{
 const bytes=Buffer.from('%PDF-1.4\nApproved native fixture\n%%EOF')
 return {id,courseCode:'QA 101',courseTitle:'QA course',status:'active',courseInfo:{academicYear:year,periodOffered:semester},approvedFile:{approvalAttested:true,name:'approved.pdf',size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),base64:bytes.toString('base64')},courseOutline:[{week:1,contents:['Variables'],ilos:'Explain variables'}]}
}
test('Dean course-only loads let only the assigned instructor confirm real class members, with independent semester rosters',async()=>{
 const {db,as,ids,email,command}=await semesterDatabase()
 const current={academic_year:'2026-2027',semester:'1st Semester'},next={...current,semester:'2nd Semester'}
 const rpc=async(input:object)=>(await db.query<{r:Record<string,any>}>('SELECT public.edupulse_register_class($1) r',[JSON.stringify(input)])).rows[0].r
 const own=async()=>(await db.query<{data:Record<string,any>;revision:number}>('SELECT data,revision FROM public.edupulse_workspaces WHERE owner_id=$1',[ids[0]])).rows[0]
 try{
  await db.query(`INSERT INTO public.edupulse_students(student_number,user_id,email,surname,first_name,middle_name,full_name,year_level,department,program,active) VALUES('S-3',$1,$2,'Sample','First','','First Sample',1,'CIT','BSIT',true),('S-5',$3,$4,'Sample','Other','','Other Sample',2,'CBA','BSBA',true)`,[ids[3],email(3),ids[5],email(5)])
  await as(2)
  await command({action:'course.create',...current,course:{code:'QA 101',title:'QA course',units:3}})
  const assigned=await command({action:'course-load.assign',...current,course_code:'QA 101',instructor_id:ids[0]})
  const parent=(await db.query<{data:Record<string,string>}>("SELECT data FROM public.edupulse_institutional_records WHERE kind='loads'")).rows[0].data
  assert.equal(parent.LoadType,'course');assert.equal(parent.Block,'')
  assert.equal((await db.query<{n:number}>('SELECT count(*) n FROM public.edupulse_enrollments')).rows[0].n,0)
  await as(1);await assert.rejects(rpc({assignment:assigned.key,block:'BSIT-1A',revision:0,mode:'replace',students:[{StudentID:'S-3'}]}),{code:'42501'})
  await as(0)
  await assert.rejects(rpc({assignment:assigned.key,block:'BSIT-1A',revision:0,mode:'replace',students:[{StudentID:'UNKNOWN'}]}),{code:'22023'})
  await db.query('SELECT public.edupulse_save_workspace(0,$1)',[JSON.stringify({syllabi:[source('s1')],content:{},registrations:[]})])
  await rpc({assignment:assigned.key,block:'BSIT-1A',revision:1,mode:'replace',students:[{StudentID:'S-3',Email:'forged@example.invalid'}]})
  let saved=await own()
  await rpc({assignment:assigned.key,block:'BSIT-1A',revision:saved.revision,mode:'append',students:[{StudentID:'S-5'}]})
  const members=(await db.query<{student_email:string;block_section:string}>('SELECT student_email,block_section FROM public.edupulse_enrollments ORDER BY student_email')).rows
  assert.deepEqual(new Set(members.map(row=>row.student_email)),new Set([email(3),email(5)]));assert.ok(members.every(row=>row.block_section==='BSIT-1A'))
  assert.equal((await db.query<{department:string;year_level:number}>("SELECT department,year_level FROM public.edupulse_students WHERE student_number='S-5'")).rows[0].department,'CBA','individual selection does not overwrite the home department')
  await as(2)
  await command({action:'course.create',...next,course:{code:'QA 101',title:'QA next course',units:4}})
  const second=await command({action:'course-load.assign',...next,course_code:'QA 101',instructor_id:ids[0]})
  await as(0);saved=await own()
  await db.query('SELECT public.edupulse_save_workspace($1,$2)',[saved.revision,JSON.stringify({...saved.data,syllabi:[...saved.data.syllabi,source('s2','2026-2027','2nd Semester')]})])
  saved=await own();await rpc({assignment:second.key,block:'BSIT-1A',revision:saved.revision,mode:'replace',students:[{StudentID:'S-5'}]})
  const scopes=(await db.query<{semester:string;student_email:string}>(`SELECT c.semester,e.student_email FROM public.edupulse_enrollments e JOIN public.edupulse_courses c ON c.id=e.course_id ORDER BY c.semester,e.student_email`)).rows
  assert.equal(scopes.filter(row=>row.semester==='1st Semester').length,2)
  assert.deepEqual(scopes.filter(row=>row.semester==='2nd Semester').map(row=>row.student_email),[email(5)])
  await as(2)
  await command({action:'course-load.update',...current,key:assigned.key,expected_instructor:ids[0],instructor_id:ids[1]})
  assert.equal((await db.query<{n:number}>('SELECT count(*) n FROM public.edupulse_enrollments WHERE instructor_id=$1',[ids[1]])).rows[0].n,2)
  assert.equal((await db.query<{n:number}>('SELECT count(*) n FROM public.edupulse_enrollments WHERE instructor_id=$1',[ids[0]])).rows[0].n,1,'next-semester roster stays with the original instructor')
  await command({action:'course-load.remove',...current,key:assigned.key,expected_instructor:ids[1]})
  const retained=await command({action:'course-load.continuations',...current,course_code:'QA 101'})
  assert.ok(retained.continuations.some((r:{key:string})=>r.key===assigned.key))
  await command({action:'course-load.assign',...current,course_code:'QA 101',instructor_id:ids[0],continuation:assigned.key})
  assert.equal((await db.query<{n:number}>('SELECT count(*) n FROM public.edupulse_enrollments WHERE instructor_id=$1',[ids[0]])).rows[0].n,3,'restoring a retained assignment restores actual child classes')
  await as(0)
  saved=await own();await assert.rejects(rpc({assignment:second.key,block:'BSIT-1B',revision:saved.revision-1,mode:'replace',students:[{StudentID:'S-3'}]}),{code:'40001'})
  await db.exec('RESET ROLE');assert.equal((await db.query<{n:number}>('SELECT count(*) n FROM edupulse_private.class_load_writes')).rows[0].n,0)
 }finally{await db.close()}
})
