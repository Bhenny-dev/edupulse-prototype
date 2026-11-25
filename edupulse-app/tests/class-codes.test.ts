import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { semesterDatabase } from './semester-fixture'
import { seededSectionRetirement, retireSectionsSql } from '../scripts/lib/seeded-section-retirement'

const term = { academic_year: '2026-2027', semester: '1st Semester' }
const key = (code: string, block: string) => `${code}|${block}|1st Semester|2026-2027`

async function classroomDatabase(blocks = ['A', 'B'], upgrade = true) {
  const fixture = await semesterDatabase()
  const maintenance = () => fixture.db.exec("RESET ROLE;SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','{}',false)")
  await maintenance()
  for (const name of ['20261118061807_historical_teaching_load_backfill', '20261118082233_instructor_load_details', '20261118090000_course_load_block_sections', '20261123120000_class_codes_and_announcements', '20261125010000_automatic_class_codes', '20261125013623_admin_classroom_support', '20261125030000_student_class_schedule', '20261125075102_management_loaded_classes', ...(upgrade ? ['20261125084915_automatic_loaded_class_codes','20261125111555_bounded_roster_projection','20261125112525_distinct_roster_scope_refresh','20261125122500_materialize_workspace_trigger_collections','20261125123200_bounded_workspace_save_timeout'] : [])]) await fixture.db.exec(await readFile(`supabase/migrations/${name}.sql`, 'utf8'))
  const rpc = async (name: string, command?: object) => (await fixture.db.query<{ r: any }>(`SELECT public.${name}(${command ? '$1' : ''}) r`, command ? [JSON.stringify(command)] : [])).rows[0].r
  const records = async (where: string) => { await maintenance(); return (await fixture.db.query<{ record_key: string; data: Record<string, any> }>(`SELECT record_key,data FROM public.edupulse_institutional_records WHERE kind='loads' AND ${where} ORDER BY record_key`)).rows }
  await fixture.as(2)
  await fixture.command({ action: 'course.create', ...term, course: { code: 'IT 101', title: 'Programming', units: 3 } })
  await fixture.command({ action: 'course-load.assign', ...term, course_code: 'IT 101', instructor_id: fixture.ids[0] })
  await maintenance()
  for (const [i, number] of [[3, '2026-0003'], [5, '2026-0005']] as const) await fixture.db.query("INSERT INTO public.edupulse_students(student_number,user_id,email,surname,first_name,full_name,year_level,department,program) VALUES($1,$2,$3,'Learner','Sample','Sample Learner',1,'CIT','BSIT')", [number, fixture.ids[i], fixture.email(i)])
  const [parent] = await records(`data->>'LoadType'='course' AND data->>'CourseCode'='IT 101'`)
  for (const block of blocks) { await fixture.as(2); await fixture.command({ action: 'block.add', assignment: parent.record_key, expected_instructor: fixture.ids[0], block }) }
  return { ...fixture, maintenance, rpc, records, parent }
}

test('retiring only attributed seed sections preserves confirmed classes, answers and archived membership',async()=>{
 const {db,ids,as,email,maintenance,rpc}=await classroomDatabase()
 try{
  await maintenance()
  for(const name of ['20261123231913_classroom_topic_work','20261125103432_academic_population_audit'])await db.exec(await readFile(`supabase/migrations/${name}.sql`,'utf8'))
  const syllabus={id:'retained-course',courseCode:'IT 101',courseTitle:'Programming',status:'active',approvedFile:{approvalAttested:true},courseInfo:{academicYear:term.academic_year,periodOffered:term.semester},courseOutline:[{week:1,ilos:'Explain foundations.',contents:['Foundations']}]}
  const data={syllabi:[syllabus],content:{assessment:{syllabusId:syllabus.id,week:1,type:'assessment',status:'checked',deliveryMode:'block_schedule',content:{title:'Foundations check',questions:Array.from({length:3},(_,n)=>({text:'Choose evidence '+n,topic:'Foundations',type:'multiple_choice',options:['Observation','Guess','Title','Opinion'],correctIndex:0}))}}},registrations:['A','B'].map((block,n)=>({id:'roster-'+block,courseCode:'IT 101',academicYear:term.academic_year,semester:term.semester,blockSection:block,status:'active',students:[{Email:email(n?5:3),StudentID:n?'2026-0005':'2026-0003',Name:'Registered learner'}]}))}
  await as(0);await db.query('SELECT revision FROM public.edupulse_save_workspace(0,$1)',[JSON.stringify(data)])
  for(const block of ['A','B'])await rpc('edupulse_delivery_schedule',{syllabus:syllabus.id,block,revision:0,windows:[{week:1,date:'2026-11-02',start:'08:00',end:''}]})
  data.content.assessment.status='published';await db.query('SELECT revision FROM public.edupulse_save_workspace(1,$1)',[JSON.stringify(data)])
  const pub=(await db.query<{id:string;source_version:string}>('SELECT id,source_version FROM public.edupulse_publications WHERE active')).rows[0]
  await as(5)
  const session=await rpc('edupulse_assessment_command',{operation:'start',publication:pub.id,version:pub.source_version})
  await rpc('edupulse_assessment_command',{operation:'submit',publication:pub.id,version:pub.source_version,session:session.id,responses:[0,0,0]})
  await maintenance()
  const original=(await db.query<{data:any}>('SELECT data FROM public.edupulse_workspaces WHERE owner_id=$1',[ids[0]])).rows[0].data
  const attempts=(await db.query('SELECT * FROM public.edupulse_attempts')).rows
  assert.equal(attempts.length,1)
  const loads=(await db.query<any>("SELECT record_key,data,updated_at::text FROM public.edupulse_institutional_records WHERE kind='loads'")).rows
  const baseline={edupulse_institutional_records:loads.filter(l=>l.data.Block!=='B').map(l=>({...l,kind:'loads'}))}
  const manifest={owner:ids[0],course:'IT 101',blocks:[{block:'B'}]},batch={id:'academic-population-2026-11-25-scoped:classes:0:0',manifest}
  assert.throws(()=>seededSectionRetirement({loads,batchManifests:[]},baseline,ids[0]),/provenance/)
  const plan=seededSectionRetirement({loads,batchManifests:[batch]},baseline,ids[0])
  assert.deepEqual(plan.kept,[key('IT 101','A')]);assert.equal(plan.retired.length,1)
  await db.query("INSERT INTO edupulse_private.population_batches(id,actor_id,provenance,manifest) VALUES($1,$2,'owner-authorized-generated-population',$3)",[batch.id,ids[2],JSON.stringify(manifest)])
  await db.query("UPDATE auth.users SET raw_app_meta_data='{}' WHERE id=$1",[ids[1]])
  await assert.rejects(db.exec(retireSectionsSql(plan,ids[1],'0'.repeat(64),false)),/active management actor/)
  await db.exec('ROLLBACK')
  await db.exec(retireSectionsSql(plan,ids[2],'0'.repeat(64),true))
  assert.equal((await db.query("SELECT * FROM public.edupulse_institutional_records WHERE kind='loads' AND data->>'LoadType'='class'")).rows.length,2,'rehearsal must roll back')
  await db.exec(retireSectionsSql(plan,ids[2],'0'.repeat(64),false))
  assert.deepEqual((await db.query('SELECT * FROM public.edupulse_attempts')).rows,attempts)
  assert.deepEqual((await db.query<{data:any}>('SELECT data FROM public.edupulse_workspaces WHERE owner_id=$1',[ids[0]])).rows[0].data,original)
  assert.deepEqual((await db.query<{block:string}>("SELECT data->>'Block' block FROM public.edupulse_institutional_records WHERE kind='loads' AND data->>'LoadType'='class'")).rows,[{block:'A'}])
  assert.deepEqual((await db.query<{student_email:string}>('SELECT student_email FROM public.edupulse_enrollments')).rows,[{student_email:email(3)}])
  assert.equal((await db.query<{n:number}>("SELECT count(*)::int n FROM edupulse_private.class_codes WHERE load_key=$1 AND disabled_at IS NULL",[key('IT 101','B')])).rows[0].n,0)
  const archive=(await db.query<{memberships:any[]}>("SELECT memberships FROM edupulse_private.teaching_load_continuity WHERE load_key=$1",[key('IT 101','B')])).rows[0]
  assert.equal(archive.memberships[0].student_email,email(5))
 }finally{await db.close()}
})

test('large workspace projection keeps roster decisions and private proof ends with the projection',async()=>{
 const {db,ids,as,email,maintenance}=await classroomDatabase()
 try{
  const syllabus={id:'owned-course',courseCode:'IT 101',courseTitle:'Introduction to Computing',status:'active',approvedFile:{approvalAttested:true},courseInfo:{academicYear:term.academic_year,periodOffered:term.semester},courseOutline:[{week:1,ilos:'Explain computing foundations.',contents:['Computing foundations']}]}
  const data={syllabi:[syllabus],content:{notes:{syllabusId:syllabus.id,week:1,type:'material',status:'draft',content:{title:'Reading companion',sections:[{heading:'Notes',body:'Evidence and reasoning. '.repeat(25000)}]}}},registrations:[{id:'class-roster',courseCode:'IT 101',academicYear:term.academic_year,semester:term.semester,blockSection:'A',status:'active',students:[3,5].map(n=>({Email:email(n),StudentID:`2026-000${n}`,Name:'Registered learner'}))}],enrollmentOverrides:[{courseCode:'IT 101',studentEmail:email(5),excluded:true}]}
  await as(0)
  await db.query('SELECT revision FROM public.edupulse_save_workspace(0,$1)',[JSON.stringify(data)])
  assert.deepEqual((await db.query<{student_email:string}>('SELECT student_email FROM public.edupulse_enrollments ORDER BY student_email')).rows.map(r=>r.student_email),[email(3)])
  await maintenance()
  assert.equal((await db.query<{n:number}>('SELECT count(*)::int n FROM edupulse_private.roster_projection_context')).rows[0]!.n,0)
  assert.equal((await db.query<{allowed:boolean}>("SELECT has_table_privilege('authenticated','edupulse_private.roster_projection_context','INSERT') allowed")).rows[0]!.allowed,false)
  await as(0)
  syllabus.status='archived'
  await db.query('SELECT revision FROM public.edupulse_save_workspace(1,$1)',[JSON.stringify(data)])
  assert.equal((await db.query<{n:number}>('SELECT count(*)::int n FROM public.edupulse_enrollments')).rows[0]!.n,0,'removing the active basis must revoke its projected roster')
  await maintenance()
  assert.equal((await db.query<{n:number}>('SELECT count(*)::int n FROM edupulse_private.roster_projection_context')).rows[0]!.n,0)
 }finally{await db.close()}
})

test('materialized workspace collections preserve checked delivery, private keys and idempotent notices',async()=>{
 const {db,ids,as,email,maintenance,rpc}=await classroomDatabase()
 try{
  const syllabus={id:'cached-course',courseCode:'IT 101',courseTitle:'Programming',status:'active',approvedFile:{approvalAttested:true},courseInfo:{academicYear:term.academic_year,periodOffered:term.semester},courseOutline:[{week:1,ilos:'Explain foundations.',contents:['Foundations']}]}
  const data={syllabi:[syllabus],content:{reading:{syllabusId:syllabus.id,week:1,type:'material',status:'checked',deliveryMode:'block_schedule',content:{title:'Foundations reading',sections:[{heading:'Evidence',body:'Explain and evaluate. '.repeat(25000)}]}},assessment:{syllabusId:syllabus.id,week:1,type:'assessment',status:'checked',deliveryMode:'block_schedule',content:{title:'Foundations check',coverage:{materialIds:['reading']},questions:Array.from({length:3},(_,n)=>({text:`Checkable claim ${n+1}?`,topic:'Foundations',type:'multiple_choice',options:['Evidence','Assumption','Title','Opinion'],correctIndex:0}))}}},registrations:[{id:'cached-roster',courseCode:'IT 101',academicYear:term.academic_year,semester:term.semester,blockSection:'A',status:'active',students:[{Email:email(3),StudentID:'2026-0003',Name:'Registered learner'}]}]}
  await as(0);await db.query('SELECT revision FROM public.edupulse_save_workspace(0,$1)',[JSON.stringify(data)])
  await rpc('edupulse_delivery_schedule',{syllabus:syllabus.id,block:'A',revision:0,windows:[{week:1,date:'2026-11-02',start:'08:00',end:''}]})
  data.content.reading.status='published';data.content.assessment.status='published'
  await db.query('SELECT revision FROM public.edupulse_save_workspace(1,$1)',[JSON.stringify(data)])
  const publications=(await db.query<{id:string;content:any;source_version:string}>('SELECT id,content,source_version FROM public.edupulse_publications WHERE active ORDER BY id')).rows
  assert.equal(publications.length,2);assert.ok(!JSON.stringify(publications).includes('correctIndex'))
  await maintenance()
  assert.deepEqual((await db.query<{answers:number[]}>('SELECT answers FROM edupulse_private.assessment_keys')).rows[0].answers,[0,0,0])
  const notices=(await db.query<{recipient_id:string;event_key:string}>('SELECT recipient_id::text,event_key FROM public.edupulse_notices ORDER BY event_key')).rows
  assert.equal(notices.length,2);assert.ok(notices.every(n=>n.recipient_id===ids[3]))
  await as(0);await db.query('SELECT revision FROM public.edupulse_save_workspace(2,$1)',[JSON.stringify(data)])
  assert.deepEqual((await db.query<{id:string;content:any;source_version:string}>('SELECT id,content,source_version FROM public.edupulse_publications WHERE active ORDER BY id')).rows,publications)
  await maintenance();assert.deepEqual((await db.query<{recipient_id:string;event_key:string}>('SELECT recipient_id::text,event_key FROM public.edupulse_notices ORDER BY event_key')).rows,notices)
  data.content.assessment.content.title='Revised foundations check'
  await as(0);await assert.rejects(db.query('SELECT revision FROM public.edupulse_save_workspace(3,$1)',[JSON.stringify(data)]),{code:'22023'},'changed content still requires another checked save')
 }finally{await db.close()}
})

test('Admin support reads and manages the selected instructor class codes and announcements with live checks and attribution', async () => {
  const { db, ids, as, rpc, maintenance, parent } = await classroomDatabase()
  const support = async (subject: string, operation: string, input = {}) => (await db.query<{ r: any }>('SELECT public.edupulse_support_action($1,$2,$3) r', [subject, operation, JSON.stringify(input)])).rows[0].r
  try {
    await as(0)
    const code = await rpc('edupulse_class_code_command', { action: 'create', assignment: parent.record_key, block: 'A' })
    await as(4)
    const before = await support(ids[0], 'academic.read')
    assert.deepEqual(before.classCodes.filter((c: any) => c.block === 'A').map((c: any) => c.code), [code.code])
    assert.deepEqual((await support(ids[1], 'academic.read')).classCodes, [], 'another instructor has no access to this class')
    const changed = await support(ids[0], 'classroom.command', { operation: 'class-code', action: 'regenerate', assignment: parent.record_key, block: 'A' })
    assert.notEqual(changed.code, code.code)
    const post = await support(ids[0], 'classroom.command', { operation: 'announcement', command: { action: 'save', course_code: 'IT 101', ...term, title: 'Class reminder', body: 'Bring the worksheet.' } })
    assert.equal((await support(ids[0], 'academic.read')).announcements[0].id, post.id)
    await assert.rejects(support(ids[1], 'classroom.command', { operation: 'class-code', action: 'create', assignment: parent.record_key, block: 'A' }), { code: '42501' })
    await assert.rejects(support(ids[3], 'classroom.command', { operation: 'class-code', action: 'create', assignment: parent.record_key, block: 'A' }), { code: '42501' })
    assert.equal((await db.query<{ uid: string }>('SELECT auth.uid()::text uid')).rows[0].uid, ids[4], 'success and failure restore the actual Admin identity')
    await maintenance()
    assert.deepEqual((await db.query<{ actor_id: string; subject_id: string }>("SELECT actor_id::text,subject_id::text FROM public.edupulse_support_events WHERE operation='classroom.command'")).rows, [{ actor_id: ids[4], subject_id: ids[0] }, { actor_id: ids[4], subject_id: ids[0] }])
    assert.equal((await db.query<{ n: number }>('SELECT count(*)::int n FROM edupulse_private.class_joins')).rows[0].n, 0, 'viewing and managing codes never enrolls a learner')
    await db.query("UPDATE auth.users SET banned_until=now()+interval '1 day' WHERE id=$1", [ids[0]])
    await as(4)
    await assert.rejects(support(ids[0], 'academic.read'), { code: '42501' }, 'a suspended subject cannot be restored')
    await as(1)
    await assert.rejects(support(ids[0], 'academic.read'), { code: '42501' }, 'an ordinary instructor cannot use support')
  } finally { await db.close() }
})

test('an instructor manages an automatically loaded class code; a registered student joins that class list once, and only through the code', async () => {
  const { db, ids, as, rpc, records, maintenance, parent } = await classroomDatabase(['A', 'B', 'C'])
  try {
    await as(0)
    const made = await rpc('edupulse_class_code_command', { action: 'create', assignment: parent.record_key, block: 'a' })
    assert.match(made.code, /^[A-HJKMNP-Z2-9]{7}$/); assert.equal(made.block, 'A'); assert.equal(made.created, false); assert.equal(made.block_added, undefined)
    const [block] = await records(`record_key='${key('IT 101', 'A')}'`)
    assert.equal(block.data.InstructorID, ids[0]); assert.equal(block.data.LoadType, 'class'); assert.equal(block.data.AllocationSource, 'automatic-loaded-class')
    await as(0)
    assert.equal((await rpc('edupulse_class_code_command', { action: 'create', assignment: parent.record_key, block: 'A' })).code, made.code, 'creating again returns the active code')
    assert.equal((await rpc('edupulse_class_code_command', { action: 'create', assignment: key('IT 101', 'A'), block: 'C' })).parent_key, parent.record_key, 'a block key resolves to its course load')
    await rpc('edupulse_class_code_command', { action: 'disable', assignment: parent.record_key, block: 'C' })
    await maintenance()
    const definition = async (fn: string) => (await db.query<{ d: string }>(`SELECT pg_get_functiondef('${fn}'::regprocedure) d`)).rows[0].d
    assert.match(await definition('edupulse_private.continue_load_teaching()'), /nullif\(a->>'path',''\) IS NOT NULL/, 'the instructor handover copies file paths only, never links')
    assert.match(await definition('edupulse_private.dean_inspect_load(text,text)'), /WHEN a->>'kind'='link'/, 'the Dean inspection keeps links')
    await as(0)
    await as(1)
    await assert.rejects(rpc('edupulse_class_code_command', { action: 'create', assignment: parent.record_key, block: 'C' }), { code: '42501' }, 'only the assigned instructor makes codes')
    await assert.rejects(rpc('edupulse_class_join', { action: 'lookup', code: made.code }), { code: '42501' }, 'an instructor account cannot join as a student')

    await as(3)
    const spoken = `${made.code.slice(0, 3).toLowerCase()} ${made.code.slice(3)}`
    const lookup = await rpc('edupulse_class_join', { action: 'lookup', code: spoken })
    assert.deepEqual([lookup.status, lookup.course_code, lookup.course_title, lookup.block, lookup.instructor_name, lookup.students, lookup.course_open], ['joinable', 'IT 101', 'Programming', 'A', 'Handover account 0', 0, false])
    await maintenance()
    assert.equal((await db.query<{ n: number }>('SELECT count(*)::int n FROM edupulse_private.class_joins')).rows[0].n, 0, 'a lookup changes nothing')
    await as(3)
    const joined = await rpc('edupulse_class_join', { action: 'join', code: made.code })
    assert.deepEqual([joined.status, joined.students, joined.course_open], ['joined', 1, false])
    assert.equal((await db.query<{ uid: string }>('SELECT auth.uid()::text uid')).rows[0].uid, ids[3], 'the student identity is restored after registering')
    assert.equal((await rpc('edupulse_class_join', { action: 'join', code: made.code })).status, 'member', 'joining again adds nobody twice')
    await maintenance()
    const workspace = async () => (await db.query<{ revision: string; data: any }>('SELECT revision,data FROM public.edupulse_workspaces WHERE owner_id=$1', [ids[0]])).rows[0]
    assert.deepEqual((await workspace()).data.registrations.map((r: any) => [r.blockSection, r.assignmentKey, r.students.map((s: any) => s.StudentID)]), [['A', parent.record_key, ['2026-0003']]], 'the student is on the instructor’s own class list')
    const events = (await db.query<{ actor_id: string; title: string }>("SELECT actor_id::text,title FROM public.edupulse_academic_events WHERE kind='enrollments' ORDER BY created_at")).rows
    assert.deepEqual(events.filter(e => /class list|Joined/.test(e.title)).map(e => [e.actor_id, e.title]), [[ids[3], 'Joined a class with its code']], 'the join is recorded under the student, not as an instructor confirmation')

    await as(0)
    const replaced = await rpc('edupulse_class_code_command', { action: 'regenerate', assignment: parent.record_key, block: 'A' })
    assert.notEqual(replaced.code, made.code)
    const second = await rpc('edupulse_class_code_command', { action: 'create', assignment: parent.record_key, block: 'B' })
    await as(3)
    await assert.rejects(rpc('edupulse_class_join', { action: 'lookup', code: made.code }), (error: any) => error.code === '22023' && /turned off or replaced/.test(error.message))
    assert.equal((await rpc('edupulse_class_join', { action: 'lookup', code: replaced.code })).status, 'member', 'a new code keeps the students who joined')
    assert.deepEqual([(await rpc('edupulse_class_join', { action: 'lookup', code: second.code })).status, (await rpc('edupulse_class_join', { action: 'lookup', code: second.code })).other_block], ['other_block', 'A'])
    await assert.rejects(rpc('edupulse_class_join', { action: 'join', code: second.code }), (error: any) => error.code === '22023' && /already in IT 101 block A/.test(error.message), 'a student in block A is not moved by another block’s code')
    await assert.rejects(rpc('edupulse_class_join', { action: 'lookup', code: 'ABC' }), { code: '22023' })
    await assert.rejects(rpc('edupulse_class_join', { action: 'lookup', code: replaced.code === 'ZZZZZZZ' ? 'YYYYYYY' : 'ZZZZZZZ' }), (error: any) => /No class uses this code/.test(error.message))
    await as(5)
    assert.equal((await rpc('edupulse_class_join', { action: 'join', code: second.code })).status, 'joined')
    await as(0)
    assert.equal((await rpc('edupulse_class_code_command', { action: 'disable', assignment: parent.record_key, block: 'B' })).disabled, true)
    const read = await rpc('edupulse_class_codes')
    assert.deepEqual(read.codes.map((c: any) => [c.block, c.code]), [['A', replaced.code]], 'a turned-off code is no longer listed')
    assert.deepEqual(read.joins.map((j: any) => j.student_number).sort(), ['2026-0003', '2026-0005'])
    await as(5)
    await assert.rejects(rpc('edupulse_class_join', { action: 'lookup', code: second.code }), { code: '22023' })
    await as(3)
    const mine = await rpc('edupulse_class_codes')
    assert.deepEqual(mine.codes, [], 'students read no codes')
    assert.deepEqual(mine.joins.map((j: any) => [j.course_code, j.course_title, j.block, j.instructor_name]), [['IT 101', 'Programming', 'A', 'Handover account 0']], 'a student sees the class they joined while it waits for its syllabus')
    // Removed from the class list by the instructor, the joined class no longer shows.
    await maintenance()
    const current = await workspace()
    await as(0)
    await db.query('SELECT public.edupulse_save_workspace($1,$2)', [Number(current.revision), JSON.stringify({ ...current.data, registrations: current.data.registrations.map((r: any) => r.blockSection === 'A' ? { ...r, students: [] } : r) })])
    await as(3)
    assert.deepEqual((await rpc('edupulse_class_codes')).joins, [])
  } finally { await db.close() }
})

test('a class gets its own unique code the moment the Dean loads it; a turned-off code stays off and a handover re-issues it', async () => {
  const { db, ids, as, rpc, records, maintenance, parent, command } = await classroomDatabase([])
  try {
    await as(2)
    await command({ action: 'course.create', ...term, course: { code: 'IT 102', title: 'Data Structures', units: 3 } })
    await command({ action: 'course-load.assign', ...term, course_code: 'IT 102', instructor_id: ids[0] })
    const [other] = await records(`data->>'LoadType'='course' AND data->>'CourseCode'='IT 102'`)
    for (const [assignment, block] of [[parent.record_key, 'A'], [parent.record_key, 'B'], [other.record_key, 'A']] as const) { await as(2); await command({ action: 'block.add', assignment, expected_instructor: ids[0], block }) }
    await as(0)
    const codes = (await rpc('edupulse_class_codes')).codes as { course_code: string; block: string; code: string }[]
    assert.deepEqual(codes.map(c => `${c.course_code} ${c.block}`).sort(), ['IT 101 A', 'IT 101 B', 'IT 102 A'], 'every loaded class has a code without the instructor asking')
    assert.equal(new Set(codes.map(c => c.code)).size, 3, 'no two classes share a code')
    codes.forEach(c => assert.match(c.code, /^[A-HJKMNP-Z2-9]{7}$/))
    assert.equal((await rpc('edupulse_class_code_command', { action: 'create', assignment: parent.record_key, block: 'A' })).created, false, 'the instructor’s create returns the automatic code')

    // Joining with the automatic code reaches exactly that class.
    await as(3)
    const code = codes.find(c => c.course_code === 'IT 102')!.code
    assert.deepEqual([(await rpc('edupulse_class_join', { action: 'lookup', code })).course_code, (await rpc('edupulse_class_join', { action: 'lookup', code })).block], ['IT 102', 'A'])

    // The student reads only the meeting times of the classes they are in: nothing before joining, then that class.
    assert.deepEqual(await rpc('edupulse_student_class_schedule'), [])
    await as(2)
    await command({ action: 'block.add', assignment: other.record_key, expected_instructor: ids[0], block: 'A', days: 'TTH', time: '7:30 - 9:00', room: 'A310' })
    await as(3)
    await rpc('edupulse_class_join', { action: 'join', code })
    const schedule = await rpc('edupulse_student_class_schedule')
    assert.deepEqual(schedule.map((row: any) => [row.course_code, row.course_title, row.block, row.academic_year, row.semester, row.slots]), [['IT 102', 'Data Structures', 'A', '2026-2027', '1st Semester', [{ days: 'TTH', time: '7:30 - 9:00', room: 'A310' }]]])
    assert.deepEqual(Object.keys(schedule[0]).sort(), ['academic_year', 'block', 'course_code', 'course_title', 'instructor_name', 'load_key', 'semester', 'slots'], 'only meeting data is exposed')
    await as(5)
    assert.deepEqual(await rpc('edupulse_student_class_schedule'), [], 'a student who is not in the class sees nothing of it')
    await as(0)
    await assert.rejects(rpc('edupulse_student_class_schedule'), { code: '42501' }, 'instructors read their own loads, not this student read')
    await as(3)

    // Turned off by the instructor, a code is not made again when the class changes (the Dean adds its room).
    await as(0)
    await rpc('edupulse_class_code_command', { action: 'disable', assignment: parent.record_key, block: 'B' })
    await as(2)
    await command({ action: 'block.add', assignment: parent.record_key, expected_instructor: ids[0], block: 'B', room: 'Lab 4' })
    await as(0)
    assert.deepEqual(((await rpc('edupulse_class_codes')).codes as any[]).map(c => `${c.course_code} ${c.block}`).sort(), ['IT 101 A', 'IT 102 A'])

    // The Dean hands IT 101 to another instructor: the old codes stop working and the new instructor holds fresh ones.
    await as(2)
    await command({ action: 'course-load.update', key: parent.record_key, expected_instructor: ids[0], instructor_id: ids[1], ...term })
    await as(0)
    assert.deepEqual(((await rpc('edupulse_class_codes')).codes as any[]).map(c => `${c.course_code} ${c.block}`), ['IT 102 A'], 'the previous instructor keeps only their own class')
    await as(1)
    const handed = (await rpc('edupulse_class_codes')).codes as { course_code: string; block: string; code: string }[]
    assert.deepEqual(handed.map(c => `${c.course_code} ${c.block}`).sort(), ['IT 101 A', 'IT 101 B'])
    assert.ok(handed.every(c => !codes.some(old => old.code === c.code)), 'the new instructor’s codes are not the old ones')
    await as(3)
    await assert.rejects(rpc('edupulse_class_join', { action: 'lookup', code: codes.find(c => c.course_code === 'IT 101' && c.block === 'A')!.code }), (error: any) => error.code === '22023', 'the old code no longer opens the class')

    // Classes loaded before this change are given codes by the backfill.
    await maintenance()
    await db.exec('DELETE FROM edupulse_private.class_joins;DELETE FROM edupulse_private.class_codes')
    await db.query('SELECT edupulse_private.backfill_class_codes()')
    assert.equal((await db.query<{ n: number }>('SELECT count(DISTINCT code)::int n FROM edupulse_private.class_codes WHERE disabled_at IS NULL')).rows[0].n, 3, 'one active code for each of the three classes')  } finally { await db.close() }
})

test('announcements stay in the instructor’s assigned course and reach only enrolled students of the named block', async () => {
  const { db, ids, as, rpc, maintenance, parent } = await classroomDatabase()
  try {
    await as(0)
    const a = await rpc('edupulse_class_code_command', { action: 'create', assignment: parent.record_key, block: 'A' })
    const b = await rpc('edupulse_class_code_command', { action: 'create', assignment: parent.record_key, block: 'B' })
    await as(3); await rpc('edupulse_class_join', { action: 'join', code: a.code })
    await as(5); await rpc('edupulse_class_join', { action: 'join', code: b.code })
    await as(0)
    const post = (over: object) => rpc('edupulse_announcement_command', { action: 'save', course_code: 'IT 101', ...term, title: 'Welcome to IT 101', body: 'Bring your laptop on Monday.', ...over })
    const welcome = await post({ attachments: [{ url: 'https://docs.google.com/presentation/d/abc/edit', title: 'Orientation slides', provider: 'google-slides' }] })
    assert.deepEqual(welcome.attachments, [{ kind: 'link', url: 'https://docs.google.com/presentation/d/abc/edit', title: 'Orientation slides', provider: 'google-slides' }])
    assert.equal('instructor_id' in welcome, false)
    const onlyB = await post({ title: 'Block B room change', block: 'b' })
    assert.equal(onlyB.block, 'B')
    const weekTwo = await post({ title: 'Week 2 reading', week: 2 })
    assert.equal(weekTwo.week, 2)
    await assert.rejects(post({ attachments: [{ url: 'javascript:alert(1)' }] }), { code: '22023' })
    await assert.rejects(post({ block: 'Z' }), { code: '22023' }, 'a block that is not the instructor’s is refused')
    await assert.rejects(post({ title: '' }), { code: '22023' })
    await as(1)
    await assert.rejects(post({}), { code: '42501' }, 'an instructor without this course load cannot post in it')
    await assert.rejects(rpc('edupulse_announcement_command', { action: 'delete', id: welcome.id }), { code: '22023' }, 'another instructor cannot remove it')
    await as(3)
    await assert.rejects(post({}), { code: '42501' })
    assert.deepEqual(await rpc('edupulse_class_announcements'), [], 'without the syllabus there is no course yet, so nothing is visible')

    // The instructor saves the syllabus: the class lists become enrollments and the announcements reach them.
    await maintenance()
    const saved = (await db.query<{ revision: string; data: Record<string, unknown> }>('SELECT revision,data FROM public.edupulse_workspaces WHERE owner_id=$1', [ids[0]])).rows[0]
    const approved = Buffer.from('%PDF-1.4\nApproved syllabus\n%%EOF')
    await as(0)
    await db.query('SELECT public.edupulse_save_workspace($1,$2)', [Number(saved.revision), JSON.stringify({ ...saved.data, syllabi: [{ id: 's-it101', courseCode: 'IT 101', courseTitle: 'Programming', status: 'active', courseInfo: { academicYear: '2026-2027', periodOffered: '1' },
      approvedFile: { approvalAttested: true, name: 'approved.pdf', size: approved.length, sha256: createHash('sha256').update(approved).digest('hex'), base64: approved.toString('base64') } }] })])
    const titles = async (i: number) => { await as(i); return (await rpc('edupulse_class_announcements')).map((item: any) => item.title).sort() }
    assert.deepEqual(await titles(3), ['Week 2 reading', 'Welcome to IT 101'])
    assert.deepEqual(await titles(5), ['Block B room change', 'Week 2 reading', 'Welcome to IT 101'])
    await as(3)
    const [first] = await rpc('edupulse_class_announcements')
    assert.ok(first.course_id, 'each announcement names the student’s course'); assert.equal('instructor_id' in first, false)
    assert.equal((await rpc('edupulse_class_join', { action: 'lookup', code: a.code })).course_open, true, 'once the syllabus exists the joined class opens')
    await as(0)
    assert.equal((await rpc('edupulse_class_announcements')).length, 3, 'the instructor reads their own announcements')
    await rpc('edupulse_announcement_command', { action: 'delete', id: welcome.id })
    assert.deepEqual(await titles(5), ['Block B room change', 'Week 2 reading'])
    await as(2)
    assert.deepEqual(await rpc('edupulse_class_announcements'), [], 'other roles read none through this view')
  } finally { await db.close() }
})


test('instructors can add students to a loaded class but cannot create a class through codes or registration', async () => {
  const { db, as, rpc, maintenance, parent } = await classroomDatabase()
  try {
    await as(0)
    await assert.rejects(rpc('edupulse_class_code_command', { action: 'create', assignment: parent.record_key, block: 'Z' }), { code: '42501' })
    await maintenance()
    const revision = Number((await db.query<{ revision: number }>('SELECT revision FROM public.edupulse_workspaces WHERE owner_id=$1', [parent.data.InstructorID])).rows[0]?.revision || 0)
    await as(0)
    const command = { assignment: parent.record_key, revision, mode: 'append', block: 'Z', academicYear: term.academic_year, semester: term.semester, students: [{ StudentID: '2026-0003', Email: 'handover3@example.invalid', StudentName: 'Sample Learner' }] }
    await assert.rejects(rpc('edupulse_register_class', command), (e: any) => /load this class first/.test(e.message))
    await maintenance()
    assert.equal((await db.query<{ n: number }>("SELECT count(*)::int n FROM public.edupulse_institutional_records WHERE kind='loads' AND data->>'Block'='Z'")).rows[0].n, 0)
    await as(0)
    const enrolled = await rpc('edupulse_register_class', { ...command, block: 'A' })
    assert.equal(enrolled.students, 1, 'the instructor adds an official student to an existing class')
    const codes = (await rpc('edupulse_class_codes')).codes
    await as(3)
    assert.equal((await rpc('edupulse_class_join', { action: 'join', code: codes.find((c: any) => c.block === 'A').code })).status, 'member', 'an invitation does not duplicate the instructor-enrolled student')
  } finally { await db.close() }
})


test('course assignment commits its initial class and code automatically, and code failure rolls the load back', async () => {
 const { db, ids, as, rpc, records, command, maintenance, parent } = await classroomDatabase([])
 try {
  const [block] = await records(`data->>'CourseCode'='IT 101' AND data->>'LoadType'='class'`)
  assert.equal(block.data.Block, 'A');assert.equal(block.data.ParentLoadKey,parent.record_key)
  assert.equal(block.data.Schedules,undefined,'an unrecorded meeting is not a fabricated empty slot')
  await as(0)
  const before=(await rpc('edupulse_class_codes')).codes
  assert.equal(before.length,1);assert.match(before[0].code,/^[A-HJKMNP-Z2-9]{7}$/)
  await rpc('edupulse_class_code_command',{action:'disable',assignment:parent.record_key,block:'A'})
  await as(2);await command({action:'block.add',assignment:parent.record_key,expected_instructor:ids[0],block:'A',room:'Lab 3'})
  await as(0);assert.deepEqual((await rpc('edupulse_class_codes')).codes,[],'an ordinary update preserves an explicit disable')
  await as(2);await command({action:'course.create',...term,course:{code:'IT 999',title:'Atomic load',units:3}})
  await maintenance()
  await db.exec("CREATE OR REPLACE FUNCTION edupulse_private.new_class_code() RETURNS text LANGUAGE plpgsql SET search_path='' AS $$ BEGIN RAISE EXCEPTION 'Synthetic code failure'; END $$")
  await as(2)
  await assert.rejects(command({action:'course-load.assign',...term,course_code:'IT 999',instructor_id:ids[0]}),/Synthetic code failure/)
  assert.deepEqual(await records(`data->>'CourseCode'='IT 999'`),[],'a failed code cannot leave a successful-looking course load')
 } finally {await db.close()}
})

test('the deferred course initializer respects explicit blocks supplied by a reviewed batch',async()=>{
 const {db,ids,as,command,records}=await classroomDatabase([])
 try {
  await as(2);await command({action:'course.create',...term,course:{code:'IT 998',title:'Explicit section',units:3}})
  await db.exec('BEGIN')
  const loaded=await command({action:'course-load.assign',...term,course_code:'IT 998',instructor_id:ids[0]})
  await command({action:'block.add',assignment:loaded.key,expected_instructor:ids[0],block:'BSIT-2C'})
  await db.exec('COMMIT')
  const blocks=await records(`data->>'CourseCode'='IT 998' AND data->>'LoadType'='class'`)
  assert.deepEqual(blocks.map(row=>row.data.Block),['BSIT-2C'],'no default A is inserted before the explicit batch section')
 } finally {await db.close()}
})


test('migration backfills an already-loaded course with no block or code, without making student activity',async()=>{
 const {db,as,rpc,maintenance,parent,records}=await classroomDatabase([],false)
 try {
  await maintenance();await db.exec(await readFile('supabase/migrations/20261125084915_automatic_loaded_class_codes.sql','utf8'))
  const blocks=await records(`data->>'ParentLoadKey'='${parent.record_key}'`)
  assert.deepEqual(blocks.map(row=>row.data.Block),['A'])
  await as(0);assert.equal((await rpc('edupulse_class_codes')).codes.length,1)
  await maintenance();assert.equal((await db.query<{n:number}>('SELECT count(*)::int n FROM edupulse_private.class_joins')).rows[0].n,0)
 } finally {await db.close()}
})
