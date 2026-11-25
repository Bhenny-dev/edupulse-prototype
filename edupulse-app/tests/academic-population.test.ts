import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { populationPlan } from '../scripts/lib/academic-population-plan.js'
import { commonCourses } from '../scripts/lib/population-content.js'
import { academicRows } from '../server/domains/academic.js'

test('populated academic reads retain records beyond the former 50,000-row cutoff and fail rather than return a partial prefix',async()=>{
 const rows=Array.from({length:51123},(_,id)=>({id}))
 const client=(fail=false)=>({from:()=>({select(){return this},order(){return this},async range(from:number,to:number){return fail&&from>=500?{data:null,error:{code:'unavailable'}}:{data:rows.slice(from,to+1),error:null}}})})
 assert.deepEqual(await academicRows(client() as never,'attempts'),rows)
 await assert.rejects(academicRows(client(true) as never,'attempts'),/could not be loaded completely/)
})

test('academic population uses active registered identities once per course, preserves inputs and fits real class capacity',()=>{
 const snapshot:any={accounts:[{id:'teacher-a',app_metadata:{role:'instructor'}},{id:'teacher-b',app_metadata:{role:'instructor'}},{id:'suspended-teacher',app_metadata:{role:'instructor',suspended:true}},...Array.from({length:72},(_,n)=>({id:`student-${n}`,app_metadata:{role:'student'},...(n===71?{banned_until:'infinity'}:{})}))],edupulse_students:Array.from({length:72},(_,n)=>({user_id:`student-${n}`,student_number:`S${n}`,email:`learner${n}@example.invalid`,full_name:`Learner ${n}`,active:true,department:'CIT',program:'Information Technology',year_level:1})),edupulse_institutional_records:commonCourses.map(code=>({kind:'courses',record_key:code,data:{CourseTitle:`Learning ${code}`}})),edupulse_workspaces:[],edupulse_enrollments:[],edupulse_courses:[]}
 for(const s of snapshot.edupulse_students)s.department='College of Information Technology'
 for(const r of snapshot.edupulse_institutional_records)r.data.CourseCode=r.record_key
 const before=structuredClone(snapshot),plan=populationPlan(snapshot)
 assert.equal(plan.studentCount,71);assert.equal(plan.owners.length,2)
 assert.equal(plan.courses.length,0,'a course catalog is not an instructor assignment')
 const term={AcademicYear:'2026-2027',Semester:'1st Semester',CourseCode:'GE 1',InstructorID:'teacher-a'}
 snapshot.edupulse_institutional_records.push({kind:'loads',record_key:'parent',data:{...term,LoadType:'course',CourseTitle:'Communication'}},...['A','B'].map(Block=>({kind:'loads',record_key:Block,data:{...term,LoadType:'class',Block}})))
 const bounded=populationPlan(snapshot)
 assert.equal(bounded.courses.length,1);assert.equal(bounded.summary.classes,2)
 assert.equal(bounded.summary.addedMemberships,70);assert.equal(bounded.summary.unplacedMemberships,1)
 assert.equal(bounded.allocationPolicy,'loaded-sections-only')
 assert.ok(bounded.courses[0].blocks.every((b:any)=>b.students.length===35))
 assert.equal(new Set(bounded.courses[0].blocks.flatMap((b:any)=>b.students.map((s:any)=>s.StudentID))).size,70,'the two loaded sections must not duplicate a learner')
 snapshot.edupulse_institutional_records.splice(-3)
 assert.deepEqual(snapshot,before);assert.deepEqual(populationPlan(snapshot),plan)
 assert.throws(()=>populationPlan({...snapshot,edupulse_students:[...snapshot.edupulse_students,snapshot.edupulse_students[0]]}),/Duplicate/)
})

test('population provenance remains private and grants no browser role read/write access',async()=>{
 const db=await PGlite.create()
 try{
  await db.exec('CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE SCHEMA edupulse_private;GRANT USAGE ON SCHEMA edupulse_private TO authenticated;CREATE TABLE auth.users(id uuid PRIMARY KEY)')
  await db.exec(await readFile('supabase/migrations/20261125103432_academic_population_audit.sql','utf8'))
  const row=(await db.query<{read:boolean;write:boolean}>("SELECT has_table_privilege('authenticated','edupulse_private.population_batches','SELECT') AS read,has_table_privilege('authenticated','edupulse_private.population_batches','INSERT') AS write")).rows[0]!
  assert.deepEqual(row,{read:false,write:false})
  await db.exec('SET ROLE authenticated')
  await assert.rejects(db.query('SELECT * FROM edupulse_private.population_batches'),/permission denied/)
 }finally{await db.close()}
})

test('department population follows retained load programs and never uses unrelated students as filler',()=>{
 const term={AcademicYear:'2026-2027',Semester:'1st Semester'}
 const people=[['cit','College of Information Technology'],['ctela','College of Teacher Education and Liberal Arts'],['unrelated','College of Criminal Justice Education']]
 const snapshot:any={accounts:[{id:'teacher',app_metadata:{role:'instructor'}},...people.map(([id])=>({id,app_metadata:{role:'student'}}))],edupulse_students:people.map(([id,department])=>({user_id:id,student_number:id,email:id+'@example.invalid',department,program:department,year_level:1,active:true})),edupulse_institutional_records:[...commonCourses.map(code=>({kind:'courses',record_key:code,data:{CourseCode:code,CourseTitle:code,YearLevel:'1'}})),{kind:'courses',record_key:'PROF ED 16',data:{CourseCode:'PROF ED 16',CourseTitle:'Technology for Teaching'}},{kind:'loads',record_key:'teaching',data:{...term,CourseCode:'PROF ED 16',CourseTitle:'Technology for Teaching',InstructorID:'teacher',LoadType:'course',SourceRows:[{program:'CTELA'}]}},{kind:'loads',record_key:'teaching-A',data:{...term,CourseCode:'PROF ED 16',InstructorID:'teacher',LoadType:'class',Block:'A',TeachingSyllabusID:'retained-outline'}}],edupulse_workspaces:[],edupulse_enrollments:[],edupulse_courses:[]}
 const plan=populationPlan(snapshot)
 assert.equal(plan.studentCount,2)
 assert.equal(plan.courses.length,1,'unassigned catalog courses must never be fabricated')
 for(const course of plan.courses){
  const members=course.blocks.flatMap((b:any)=>b.students.map((s:any)=>s.StudentID))
  assert.deepEqual(members,course.code==='PROF ED 16'?['ctela']:['cit'])
  if(course.code==='PROF ED 16')assert.equal(course.teachingSyllabusId,'retained-outline')
 }
})
