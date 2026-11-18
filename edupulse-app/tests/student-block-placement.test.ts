import test from 'node:test'
import assert from 'node:assert/strict'
import {planStudentBlocks} from '../scripts/lib/student-blocks'
import {readFile} from 'node:fs/promises'
import {semesterDatabase} from './semester-fixture'
import {directoryBlocks} from '../src/components/academic/deanRecordModel'
import {accountStudentModel} from '../src/pages/dashboardModels'
const program='Bachelor of Science in Accountancy'
const student=(i:number,year=3)=>({student_number:'2027-1-'+String(i).padStart(4,'0'),surname:'Student',first_name:String(i).padStart(4,'0'),year_level:year,department:'College of Accountancy and Business Management',program,active:true})
test('department blocks use the confirmed 2027 intake rule, retain individuals and valid placements, and never exceed 35',()=>{
 const students=Array.from({length:72},(_,i)=>student(i)),rosters=[{record_key:students[0].student_number,data:{Block:'BSA-1A'}},{record_key:students[1].student_number,data:{Block:'IRREGULAR',Type:'Irregular'}}]
 const result=planStudentBlocks(students,rosters)
 assert.equal(result.placements.length,72);assert.equal(result.blocks,3)
 assert.ok(result.placements.every(p=>p.year===1));assert.equal(result.placements.find(p=>p.number===students[0].student_number)?.block,'BSA-1A')
 assert.equal(result.placements.find(p=>p.number===students[1].student_number)?.block,'IRREGULAR')
 const counts=result.placements.filter(p=>p.block!=='IRREGULAR').reduce((m,p)=>m.set(p.block,(m.get(p.block)||0)+1),new Map<string,number>())
 assert.equal(Math.max(...counts.values()),35)
 const retained=planStudentBlocks([{...student(90),student_number:'2025-1-0090',year_level:2}],[])
 assert.equal(retained.placements[0].year,2,'other IDs preserve the recorded year instead of guessing advancement')
 assert.throws(()=>planStudentBlocks([{...student(1),program:'Unknown'}],[]),/unrecognized program/)
 assert.throws(()=>planStudentBlocks([student(1),student(1)],[]),/Duplicate/)
})

test('home blocks remain visible without course enrollments and do not expose another student profile',async()=>{
 const {db,as,ids,email}=await semesterDatabase()
 try{
  await db.exec(await readFile('supabase/migrations/20261118024239_student_home_block_metadata.sql','utf8'))
  await db.query(`INSERT INTO public.edupulse_students(student_number,user_id,email,surname,first_name,middle_name,full_name,year_level,department,program,active) VALUES('2027-1-0001',$1,$2,'Example','One','','One Example',1,'Business',$5,true),('2025-1-0002',$3,$4,'Example','Two','','Two Example',2,'Business',$5,true)`,[ids[3],email(3),ids[5],email(5),program])
  await db.query(`INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by) VALUES('rosters','2027-1-0001','{"StudentID":"2027-1-0001","Block":"BSA-1A"}','${ids[2]}'),('rosters','2025-1-0002','{"StudentID":"2025-1-0002","Block":"BSA-2A"}','${ids[2]}')`)
  await as(3)
  const home=(await db.query<{r:{code:string;year_level:number;students:number;department:string;program:string}}>('SELECT public.edupulse_student_home_block() r')).rows[0].r
  assert.equal(home.code,'BSA-1A');assert.equal(home.students,1);assert.equal(home.year_level,1)
  const data={homeBlock:home,courses:[],enrollments:[],publications:[],attempts:[],accesses:[]}
  assert.equal(accountStudentModel(data,{email:email(3)}).block?.code,'BSA-1A')
  assert.equal(accountStudentModel(data,{email:email(3)}).kpis.enrolled,0)
  assert.equal(JSON.stringify(home).includes(email(5)),false)
  await as(5);assert.equal((await db.query<{r:{code:string}}>('SELECT public.edupulse_student_home_block() r')).rows[0].r.code,'BSA-2A')
  await as(4)
  const support=(await db.query<{r:{homeBlock:{code:string}}}>('SELECT public.edupulse_support_action($1,\'academic.read\',\'{}\') r',[ids[3]])).rows[0].r
  assert.equal(support.homeBlock.code,'BSA-1A')
  await as(0);await assert.rejects(db.query('SELECT public.edupulse_student_home_block()'),{code:'42501'})
  const students=[{id:'one',student_number:'2027-1-0001',name:'One Example',surname:'Example',first_name:'One',middle_name:'',email:email(3),year_level:1,department:'Business',program,status:'active' as const,block:'BSA-1A',type:'Regular'}]
  const groups=directoryBlocks(students,data)
  assert.equal(groups.length,1);assert.equal(groups[0].students.length,1);assert.equal(groups[0].courseIds.size,0)
 }finally{await db.close()}
})
