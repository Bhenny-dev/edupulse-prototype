import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { planStudents } from '../scripts/lib/student-import.mjs'

const header='Student No.\tSurname\tFirst Name\tMiddle Name\tYear Level\tProgram Name\n'
const program='Bachelor of Science in Information Technology with Specialization in Web and Mobile Application Development'
test('official student import keeps IDs and groups, separates duplicate surnames, and quarantines a missing surname',()=>{
 const {students,rejected}=planStudents(header+`2026-1-001\tDEMO\tRILEY\tA\t1st Year\t${program}\n2026-1-002\tDEMO\tTAYLOR\t\t2ND YEAR\t${program}\n2026-1-003\tSAMPLE\tJORDAN\t\t3rd Year\t${program}\n2026-1-004\t\tUNKNOWN\t\t4th Year\t${program}`)
 assert.equal(students.length,3);assert.equal(rejected.length,1)
 assert.deepEqual(students.map(s=>s.email),['2026-1-001@gmail.com','2026-1-002@gmail.com','2026-1-003@gmail.com'])
 const fallback=planStudents(header+`2026-1-004\t\tRILEY DEMO\t\t4th Year\t${program}`,{'2026-1-004':'first-name'})
 assert.equal(fallback.students[0].password,'rileydemo@123');assert.equal(fallback.students[0].surname,'');assert.equal(fallback.rejected.length,0)
 assert.equal(students[0].password,'demo@123');assert.equal(students[0].department,'College of Information Technology');assert.equal(students[1].year_level,2)
 assert.throws(()=>planStudents(header+`same\tDEMO\tRILEY\t\t1st Year\t${program}\nsame\tTEST\tTAYLOR\t\t2nd Year\t${program}`),/duplicate ID/)
})

test('student directory RLS permits staff selection and each student own profile, without permitting profile writes',async()=>{
 const db=new PGlite()
 try {
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;
   CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_app_meta_data jsonb NOT NULL DEFAULT '{}');
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claims',true)::jsonb $$;
   GRANT USAGE ON SCHEMA auth TO authenticated,anon;`)
  for(const file of ['20260915042129_persistent_workspace.sql','20261024064532_academic_projection.sql','20261102074226_student_directory.sql','20261102081005_student_name_fallback.sql'])await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'))
  const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333']
  for(const [i,id] of ids.entries())await db.query(`INSERT INTO auth.users VALUES($1,$2,$3)`,[id,`synthetic${i}@example.invalid`,JSON.stringify({role:i===2?'instructor':'student'})])
  for(const [i,id] of ids.slice(0,2).entries())await db.query(`INSERT INTO public.edupulse_students(student_number,user_id,email,surname,first_name,full_name,year_level,department,program) VALUES($1,$2,$3,'DEMO','RILEY','RILEY DEMO',1,'Synthetic department','Synthetic program')`,[`S${i}`,id,`synthetic${i}@example.invalid`])
  const as=async(i:number)=>{await db.exec('RESET ROLE');await db.query(`SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)`,[ids[i],JSON.stringify({email:`synthetic${i}@example.invalid`,app_metadata:{role:i===2?'instructor':'student'},user_metadata:{role:'admin'}})]);await db.exec('SET ROLE authenticated')}
  await as(0);assert.equal((await db.query('SELECT * FROM public.edupulse_students')).rows.length,1)
  await assert.rejects(db.query(`UPDATE public.edupulse_students SET department='Forged'`),{code:'42501'})
  await assert.rejects(db.query(`DELETE FROM public.edupulse_students`),{code:'42501'})
  assert.equal((await db.query('SELECT * FROM public.edupulse_publications')).rows.length,0,'A directory profile alone grants no material access')
  await as(2);assert.equal((await db.query('SELECT * FROM public.edupulse_students')).rows.length,2)
  const item={syllabusId:'directory-course',week:1,type:'material',status:'checked',content:{title:'Synthetic released lesson',sections:[{heading:'Example',body:'Synthetic instructor-reviewed content.'}]}}
  const snapshot={syllabi:[{id:'directory-course',courseCode:'IT 102',courseTitle:'Synthetic course',status:'active',approvedFile:{approvalAttested:true}}],content:{lesson:item},registrations:[{courseCode:'IT 102',status:'active',blockSection:'SYNTHETIC-1A',students:[{StudentID:'S0',Name:'RILEY DEMO',Email:'synthetic0@example.invalid'}]}]}
  await db.query('SELECT * FROM public.edupulse_save_workspace($1,$2)',[0,JSON.stringify(snapshot)])
  item.status='published';await db.query('SELECT * FROM public.edupulse_save_workspace($1,$2)',[1,JSON.stringify(snapshot)])
  await as(0);assert.equal((await db.query('SELECT * FROM public.edupulse_publications')).rows.length,1,'Selected roster student can read the released material')
  await as(1);assert.equal((await db.query('SELECT * FROM public.edupulse_publications')).rows.length,0,'Other registered students cannot read another course')
  await db.exec('RESET ROLE;SET ROLE anon');await assert.rejects(db.query('SELECT * FROM public.edupulse_students'),{code:'42501'})
 } finally {await db.close()}
})
