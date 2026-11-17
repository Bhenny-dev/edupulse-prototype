import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const DEAN = '00000000-0000-4000-8000-000000000001', TEACHER = '00000000-0000-4000-8000-000000000002', OUTSIDER = '00000000-0000-4000-8000-000000000003'

async function database() {
  const db = new PGlite()
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA storage; CREATE TABLE storage.objects(name text,bucket_id text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; GRANT USAGE ON SCHEMA storage TO authenticated; GRANT SELECT ON storage.objects TO authenticated; CREATE SCHEMA auth; CREATE SCHEMA extensions; CREATE SCHEMA edupulse_private;
    CREATE TABLE auth.users(instance_id uuid,id uuid PRIMARY KEY,aud text,role text,email text,encrypted_password text,email_confirmed_at timestamptz,
      raw_app_meta_data jsonb DEFAULT '{}',raw_user_meta_data jsonb DEFAULT '{}',created_at timestamptz DEFAULT now(),updated_at timestamptz,last_sign_in_at timestamptz,banned_until timestamptz,
      confirmation_token text,recovery_token text,email_change_token_new text,email_change text);
    CREATE TABLE auth.identities(id uuid PRIMARY KEY,user_id uuid,provider_id text NOT NULL,identity_data jsonb,provider text,last_sign_in_at timestamptz,created_at timestamptz,updated_at timestamptz);
    CREATE TABLE auth.sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION extensions.gen_salt(text) RETURNS text LANGUAGE sql AS $$ SELECT 'salt' $$;
    CREATE FUNCTION extensions.crypt(text,text) RETURNS text LANGUAGE sql AS $$ SELECT 'hash:'||$1 $$;
    CREATE FUNCTION edupulse_private.academic_role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id=auth.uid() $$;
    CREATE TABLE public.edupulse_workspaces(owner_id uuid PRIMARY KEY,revision bigint DEFAULT 1,data jsonb NOT NULL);
    CREATE TABLE public.edupulse_courses(id text PRIMARY KEY,instructor_id uuid,course_code text,course_title text,updated_at timestamptz DEFAULT now(),block_info jsonb DEFAULT '[]');
    CREATE TABLE public.edupulse_enrollments(course_id text,instructor_id uuid,student_email text,student_ref text,display_name text,block_section text,source text DEFAULT 'instructor',PRIMARY KEY(course_id,student_email,block_section));
    CREATE TABLE public.edupulse_institutional_records(kind text NOT NULL CHECK(kind IN ('courses','loads','rosters')),record_key text NOT NULL,data jsonb NOT NULL,updated_by uuid,updated_at timestamptz DEFAULT now(),
      CONSTRAINT edupulse_institutional_records_pkey PRIMARY KEY(kind,record_key));
    CREATE TABLE public.edupulse_students(student_number text PRIMARY KEY,user_id uuid NOT NULL UNIQUE,email text NOT NULL UNIQUE,surname text NOT NULL,first_name text NOT NULL,middle_name text NOT NULL DEFAULT '',
      full_name text NOT NULL,year_level smallint NOT NULL,department text NOT NULL,program text NOT NULL,active boolean NOT NULL DEFAULT true);
    CREATE TABLE public.edupulse_academic_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL,kind text,title text,detail text,created_at timestamptz DEFAULT now());
    INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data) VALUES
      ('${DEAN}','dean@example.invalid','{"role":"dean"}','{"full_name":"Sample Dean"}'),
      ('${TEACHER}','teacher@example.invalid','{"role":"instructor"}','{"full_name":"Alex Sample"}'),
      ('${OUTSIDER}','taken@example.invalid','{"role":"associate_dean"}','{}');
    CREATE FUNCTION public.edupulse_support_action(subject uuid,operation text,input jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER AS $stub$ DECLARE result jsonb; subject_role text:='dean'; BEGIN IF operation NOT IN ('enter','academic.read','students.read') THEN RAISE EXCEPTION 'no'; END IF; IF operation IN ('enter','academic.read') THEN NULL; END IF; CASE operation WHEN 'academic.read' THEN result:=jsonb_build_object('mode','cloud','courses','[]'::jsonb); WHEN 'students.read' THEN result:='{}'; ELSE NULL; END CASE; RETURN result; END $stub$;
    INSERT INTO public.edupulse_institutional_records(kind,record_key,data) VALUES('courses','IT 102','{"CourseCode":"IT 102","CourseTitle":"Programming foundations","Semester":"1st Semester"}');
    INSERT INTO public.edupulse_courses(id,instructor_id,course_code,course_title) VALUES('c102','${TEACHER}','IT 102','Programming foundations');`)
  await db.exec(await readFile('supabase/migrations/20261114080000_dean_course_loads_and_accounts.sql', 'utf8'))
  await db.exec(await readFile('supabase/migrations/20261114090000_dean_support_directory_fix.sql', 'utf8'))
  await db.exec(await readFile('supabase/migrations/20261115080000_program_coordinator_dean_parity.sql', 'utf8'))
  await db.exec(await readFile('supabase/migrations/20261115131427_unified_dean_courses.sql', 'utf8'))
  await db.exec(await readFile('supabase/migrations/20261117073840_teaching_load_document_intake.sql', 'utf8'))
  await db.exec(await readFile('supabase/migrations/20261117083004_teaching_load_source_context.sql', 'utf8'))
  await db.exec(await readFile('supabase/migrations/20261117094641_active_teaching_load_accounts.sql', 'utf8'))
  return db
}
const as = (db: PGlite, id: string) => db.query(`SELECT set_config('request.jwt.claim.sub',$1,false)`, [id])
const dean = async <T = Record<string, unknown>>(db: PGlite, command: unknown) => (await db.query<{ r: T }>('SELECT public.edupulse_dean_command($1::jsonb) r', [JSON.stringify(command)])).rows[0].r
const enrolled = async (db: PGlite) => (await db.query<{ course_id: string; student_email: string; block_section: string }>('SELECT course_id,student_email,block_section FROM public.edupulse_enrollments ORDER BY student_email,course_id')).rows

test('reviewed document loads retain schedules and term history, reject stale imports, and enroll only current classes',async()=>{
 const db=await database()
 try{
  await as(db,DEAN)
  await db.exec(`INSERT INTO public.edupulse_institutional_records(kind,record_key,data) VALUES('rosters','SYN-RESTORED','{"StudentID":"SYN-RESTORED","Name":"Restored Example","Email":"restored@example.invalid","Block":"BSIT-1A"}');`)
  const entry={course_code:'IT 102',course_title:'Programming foundations',instructor_id:TEACHER,block:'BSIT-1A',academic_year:'2025-2026',semester:'2nd Semester',page:1,row:1,subject_code:'IT 102 A',source_instructor:'Alex Sample',source_year:'2025-2026',source_semester:'2nd Semester',degree:'Masters',time:'7:30 - 10:00',days:'TTH',room:'A310',units:3,lecture:2,lab:1,hours:5,computed_hours:5,students:35,program:'BSIT',expected_updated_at:null}
  const command={action:'load.import_document',filename:'reviewed-load.pdf',reviewed:true,entries:[entry]}
  assert.equal((await dean<{imported:number}>(db,command)).imported,1)
  assert.equal((await enrolled(db)).length,0,'past loads never create current enrollments')
  await dean(db,{...command,entries:[{...entry,academic_year:'2026-2027'}]})
  assert.equal((await enrolled(db)).length,0,'next-semester loads remain separate records')
  const current={...entry,academic_year:'2026-2027',semester:'1st Semester'}
  await dean(db,{...command,entries:[current]})
  assert.equal((await enrolled(db)).length,1)
  const loads=(await db.query<{record_key:string;data:Record<string,string>}>("SELECT * FROM public.edupulse_institutional_records WHERE kind='loads'")).rows
  assert.equal(loads.length,3)
  const saved=loads.find(r=>r.record_key==='IT 102|BSIT-1A|1st Semester|2026-2027')!
  assert.equal(saved.data.ScheduleTime,'7:30 - 10:00');assert.equal(saved.data.ComputedHours,'5');assert.equal(saved.data.SourceAcademicYear,'2025-2026');assert.equal(saved.data.LabUnits,'1')
  await assert.rejects(dean(db,command),{code:'40001'})
  await assert.rejects(dean(db,{...command,entries:[{...current,block:'BSIT-1B'},{...current,block:'BSIT-1B'}]}),{code:'22023'})
  await assert.rejects(dean(db,{...command,reviewed:false}),{code:'22023'})
  await assert.rejects(dean(db,{...command,entries:[{...current,academic_year:'2026-2028'}]}),{code:'22023'})
  const edited=await dean<{key:string}>(db,{action:'load.update',key:saved.record_key,expected_instructor:TEACHER,instructor_id:TEACHER,block:'BSIT-1B',semester:'1st Semester'})
  assert.equal(edited.key,'IT 102|BSIT-1B|1st Semester|2026-2027')
  assert.equal((await db.query<{data:Record<string,string>}>("SELECT data FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key=$1",[edited.key])).rows[0].data.SourceFile,'reviewed-load.pdf')
  const student=await dean<{id:string}>(db,{action:'account.create',account:{role:'student',surname:'Restored',first_name:'Sam',student_number:'SYN-OTHER',year_level:1,program:'Bachelor of Science in Accountancy',email:'other@example.invalid',password:'Ep9!sample-pass'}})
  await db.query("UPDATE public.edupulse_students SET department='College of Accountancy and Business Management' WHERE user_id=$1",[student.id])
  const directory=await dean<{students:{id:string;department:string}[]}>(db,{action:'directory'})
  assert.equal(directory.students.find(s=>s.id===student.id)?.department,'College of Accountancy and Business Management')
  await db.query("UPDATE auth.users SET banned_until='infinity' WHERE id=$1",[TEACHER])
  assert.equal((await dean<{instructors:{id:string}[]}>(db,{action:'directory'})).instructors.some(i=>i.id===TEACHER),false,'retired teachers are excluded without needing a separate suspension flag')
  await assert.rejects(dean(db,{...command,entries:[{...current,block:'BSIT-1C'}]}),{code:'22023'})
  await assert.rejects(dean(db,{action:'load.assign',loads:[{course_code:'IT 102',instructor_id:TEACHER,block:'BSIT-1C'}]}),{code:'22023'})
  await db.query("UPDATE auth.users SET banned_until=now()+interval '1 day' WHERE id=$1",[TEACHER])
  assert.equal((await dean<{instructors:{id:string;status:string}[]}>(db,{action:'directory'})).instructors.find(i=>i.id===TEACHER)?.status,'suspended')
  await db.query('UPDATE auth.users SET banned_until=NULL WHERE id=$1',[TEACHER])
  await as(db,TEACHER);await assert.rejects(dean(db,{...command,entries:[current]}),{code:'42501'})
 }finally{await db.close()}
})

test('Dean manages instructor accounts, recorded degrees and course loads', async () => {
  const db = await database()
  try {
    await as(db, TEACHER)
    await assert.rejects(dean(db, { action: 'directory' }), { code: '42501' }, 'only the Dean reads the directory')
    await db.exec(`UPDATE auth.users SET raw_app_meta_data='{"role":"associate_dean"}' WHERE id='${OUTSIDER}'`)
    await as(db, OUTSIDER)
    assert.ok(Array.isArray((await dean<{ instructors: unknown[] }>(db, { action: 'directory' })).instructors), 'the Program Coordinator uses the same actions')
    await db.exec(`UPDATE auth.users SET raw_app_meta_data='{"role":"admin"}' WHERE id='${OUTSIDER}'`)
    await as(db, OUTSIDER)
    assert.ok(Array.isArray((await dean<{ instructors: unknown[] }>(db, { action: 'directory' })).instructors), 'the System Admin bypasses the Dean role')
    await as(db, DEAN)
    const added = await dean<{ id: string }>(db, { action: 'account.create', account: { role: 'instructor', surname: 'Rivera', first_name: 'Morgan', email: 'Morgan@Example.invalid', password: 'Ep9!sample-pass', has_masters: true, degree: 'MIT', specialization: 'Networking' } })
    const user = (await db.query<{ email: string; app: { role: string }; identities: number }>(`SELECT email,raw_app_meta_data app,(SELECT count(*)::int FROM auth.identities WHERE user_id=u.id) identities FROM auth.users u WHERE id=$1`, [added.id])).rows[0]
    assert.deepEqual([user.email, user.app.role, user.identities], ['morgan@example.invalid', 'instructor', 1])
    await assert.rejects(dean(db, { action: 'account.create', account: { role: 'instructor', surname: 'Again', first_name: 'Morgan', email: 'morgan@example.invalid', password: 'Ep9!sample-pass' } }), { code: '22023' })
    await assert.rejects(dean(db, { action: 'account.create', account: { role: 'dean', surname: 'Nope', first_name: 'No', email: 'n@example.invalid', password: 'Ep9!sample-pass' } }), { code: '22023' }, 'never creates privileged roles')
    const directory = await dean<{ instructors: { name: string; has_masters: boolean | null; degree: string }[] }>(db, { action: 'directory' })
    assert.deepEqual(directory.instructors.map(i => [i.name, i.has_masters, i.degree]), [['Alex Sample', null, ''], ['Morgan Rivera', true, 'MIT']])

    const loads = await dean(db, { action: 'load.assign', loads: [{ course_code: 'IT102', instructor_id: TEACHER, block: 'bsit-1a' }, { course_code: 'IT 102', instructor_id: added.id, block: 'BSIT-1B' }, { course_code: 'IT 999', course_title: 'Capstone seminar', instructor_id: added.id, block: 'BSIT-4A' }] })
    assert.deepEqual(loads, { created: 3, updated: 0, unchanged: 0 })
    const keys = (await db.query<{ record_key: string }>(`SELECT record_key FROM public.edupulse_institutional_records WHERE kind='loads' ORDER BY record_key`)).rows.map(r => r.record_key)
    assert.deepEqual(keys, ['IT 102|BSIT-1A|1st Semester', 'IT 102|BSIT-1B|1st Semester', 'IT 999|BSIT-4A|'], 'codes and blocks normalise; semester comes from the course record')
    assert.equal((await db.query(`SELECT 1 FROM public.edupulse_institutional_records WHERE kind='courses' AND record_key='IT 999'`)).rows.length, 1, 'a titled new course joins the course list')
    await assert.rejects(dean(db, { action: 'load.assign', loads: [{ course_code: 'IT 555', instructor_id: TEACHER, block: 'BSIT-1A' }] }), { code: '22023' }, 'an unknown course needs its title')
    assert.deepEqual(await dean(db, { action: 'load.assign', loads: [{ course_code: 'IT 102', instructor_id: added.id, block: 'BSIT-1A' }] }), { created: 0, updated: 1, unchanged: 0 }, 'reassigning a class replaces its instructor')
    assert.deepEqual(await dean(db, { action: 'load.remove', keys: ['IT 102|BSIT-1A|1st Semester'] }), { removed: 1 })

    await dean(db, { action: 'account.update', account: { id: added.id, surname: 'Rivera-Cruz', first_name: 'Morgan', email: 'morgan.rivera@example.invalid', has_masters: false, degree: '', specialization: 'Security' } })
    const load = (await db.query<{ data: Record<string, string> }>(`SELECT data FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key='IT 102|BSIT-1B|1st Semester'`)).rows[0].data
    assert.deepEqual([load.InstructorName, load.Email, load.HasMasters, load.Specialization], ['Morgan Rivera-Cruz', 'morgan.rivera@example.invalid', 'No', 'Security'])

    await assert.rejects(dean(db, { action: 'account.status', id: added.id, status: 'removed' }), /Suspend the account before removing it/)
    await dean(db, { action: 'account.status', id: added.id, status: 'suspended' })
    await as(db, added.id)
    assert.equal((await db.query<{ role: string | null }>('SELECT edupulse_private.academic_role() role')).rows[0].role, null, 'a suspended account has no academic role')
    await as(db, DEAN)
    await assert.rejects(dean(db, { action: 'load.assign', loads: [{ course_code: 'IT 102', instructor_id: added.id, block: 'BSIT-1C' }] }), /Reactivate/)
    await dean(db, { action: 'account.status', id: added.id, status: 'removed' })
    assert.equal((await db.query(`SELECT 1 FROM public.edupulse_institutional_records WHERE kind='loads' AND data->>'InstructorID'=$1`, [added.id])).rows.length, 0, 'removal releases the instructor loads')
    assert.equal((await dean<{ instructors: unknown[] }>(db, { action: 'directory' })).instructors.length, 1)
    await assert.rejects(dean(db, { action: 'account.status', id: OUTSIDER, status: 'suspended' }), { code: '22023' }, 'other roles are out of the Dean scope')

    await db.exec('SET ROLE authenticated')
    await assert.rejects(db.query('SELECT edupulse_private.dean_directory()'), /permission denied/)
  } finally { await db.close() }
})

test('EduSuite student intake creates accounts, fills blocks and places irregular students in their classes', async () => {
  const db = await database()
  try {
    await as(db, DEAN)
    await dean(db, { action: 'load.assign', loads: [{ course_code: 'IT 102', instructor_id: TEACHER, block: 'BSIT-1A' }] })
    const student = (number: string, surname: string, placement: string, extra = {}) => ({ student_number: number, surname, first_name: 'Sample', middle_name: '', year_level: 1, program: 'Bachelor of Science in Information Technology', password: `${surname.toLowerCase()}@123`, placement, ...extra })
    const result = await dean<Record<string, unknown>>(db, { action: 'students.import', filename: 'edusuite.csv', students: [
      student('2026-0001', 'Ramos', 'block', { block: 'bsit-1a' }),
      student('2026-0002', 'Lim', 'block', { block: 'BSIT-1A' }),
      student('2025-0100', 'Cruz', 'irregular', { year_level: 2, courses: [{ course_code: 'IT102', block: 'BSIT-1A' }] }),
      student('2026-0003', 'Taken', 'block', { block: 'BSIT-1A', email: 'taken@example.invalid' })] })
    assert.deepEqual([result.created, result.regular, result.irregular, (result.skipped as unknown[]).length], [3, 2, 1, 1])
    assert.deepEqual((await enrolled(db)).map(e => [e.student_email, e.block_section]), [['2025-0100@gmail.com', 'BSIT-1A'], ['2026-0001@gmail.com', 'BSIT-1A'], ['2026-0002@gmail.com', 'BSIT-1A']], 'irregular student appears in the loaded class')
    const roster = (await db.query<{ data: Record<string, string> }>(`SELECT data FROM public.edupulse_institutional_records WHERE kind='rosters' AND record_key='2025-0100'`)).rows[0].data
    assert.deepEqual([roster.Block, roster.Type], ['IRREGULAR', 'Irregular'], 'irregular students stay out of block rosters')
    const directory = await dean<{ students: { student_number: string; block: string; type: string; status: string }[]; irregular: unknown[] }>(db, { action: 'directory' })
    assert.deepEqual(directory.students.map(s => [s.student_number, s.block, s.type, s.status]), [['2025-0100', 'IRREGULAR', 'Irregular', 'active'], ['2026-0002', 'BSIT-1A', 'Regular', 'active'], ['2026-0001', 'BSIT-1A', 'Regular', 'active']])
    assert.equal(directory.irregular.length, 1)

    const again = await dean<Record<string, unknown>>(db, { action: 'students.import', filename: 'again.csv', students: [student('2025-0100', 'Cruz', 'block', { year_level: 2, block: 'BSIT-2A' })] })
    assert.deepEqual([again.created, again.updated], [0, 1], 'a repeated list updates instead of duplicating accounts')
    assert.equal((await dean<{ irregular: unknown[] }>(db, { action: 'directory' })).irregular.length, 0, 'moving into a block clears irregular classes')

    const id = (await db.query<{ user_id: string }>(`SELECT user_id FROM public.edupulse_students WHERE student_number='2026-0001'`)).rows[0].user_id
    await dean(db, { action: 'account.update', account: { id, surname: 'Ramos', first_name: 'Sample', email: '2026-0001@gmail.com', year_level: 1, program: 'Bachelor of Science in Information Technology', placement: 'irregular' } })
    assert.equal((await enrolled(db)).some(e => e.student_email === '2026-0001@gmail.com'), false, 'an irregular student without classes leaves the block class')
    await dean(db, { action: 'account.status', id, status: 'suspended' })
    assert.ok((await db.query<{ banned: boolean }>(`SELECT banned_until>now() banned FROM auth.users WHERE id=$1`, [id])).rows[0].banned)
    await dean(db, { action: 'account.status', id, status: 'active' })
    await dean(db, { action: 'account.status', id, status: 'suspended' })
    await dean(db, { action: 'account.status', id, status: 'removed' })
    assert.equal((await db.query<{ active: boolean }>(`SELECT active FROM public.edupulse_students WHERE user_id=$1`, [id])).rows[0].active, false)
    const capacity = Array.from({ length: 36 }, (_, i) => student(`2027-${String(i).padStart(4, '0')}`, `Full${i}`, 'block', { block: 'BSIT-1C' }))
    await assert.rejects(dean(db, { action: 'students.import', filename: 'full.csv', students: capacity }), /would exceed 35/)
  } finally { await db.close() }
})


test('course inspection is scoped to a current load, strips private keys and never writes learner/workspace activity', async () => {
  const db = await database()
  try {
    await as(db, DEAN)
    await dean(db, { action: 'load.assign', loads: [{ course_code: 'IT 102', instructor_id: TEACHER, block: 'BSIT-1A' }] })
    const key = 'IT 102|BSIT-1A|1st Semester', path = `${TEACHER}/00000000-0000-4000-8000-000000000050/lesson.pdf`
    const snapshot = { syllabi: [
      { id: 'basis', courseCode: 'IT 102', courseTitle: 'Programming', status: 'active', courseInfo: { periodOffered: 'First Semester' }, courseOutline: [{ week: 1, contents: ['Functions'] }], approvedFile: { name: 'approved.pdf', base64: 'JVBERg==' } },
      { id: 'draft', courseCode: 'IT102', status: 'drafted', lastUpdated: '2099-01-01' },
      { id: 'other-term', courseCode: 'IT102', status: 'active', courseInfo: { periodOffered: 'Second Semester' }, lastUpdated: '2099-01-02' },
      { id: 'other-course', courseCode: 'IT202', status: 'active' }],
      content: { lesson: { syllabusId: 'basis', week: 1, type: 'material', status: 'draft', content: { title: 'Functions', sections: [{ heading: 'Function calls', body: 'A function can be called again.' }], attachments: [{ path, name: 'lesson.pdf' }], ai: { sources: ['PRIVATE SOURCE'] } } },
        quiz: { syllabusId: 'basis', week: 1, type: 'assessment', status: 'checked', content: { title: 'Functions quiz', answerKey: ['PRIVATE KEY'], questions: [{ text: 'A function can be called again?', type: 'multiple_choice', options: [{ text: 'Yes', correct: true }, { text: 'No', correct: false }], correctIndex: 0, explanation: 'PRIVATE MARKING GUIDE', answer: 'Yes' }] } },
        other: { syllabusId: 'other-course', week: 1, type: 'material', content: { title: 'PRIVATE OTHER COURSE', attachments: [{ path: `${TEACHER}/other/file.pdf` }] } } },
      registrations: [{ password: 'PRIVATE REGISTRATION' }] }
    await db.query('INSERT INTO public.edupulse_workspaces(owner_id,data) VALUES($1,$2)', [TEACHER, JSON.stringify(snapshot)])
    await db.query("INSERT INTO storage.objects(name,bucket_id) VALUES($1,'edupulse-teaching-files'),($2,'edupulse-teaching-files')", [path, `${TEACHER}/other/file.pdf`])
    const before = (await db.query('SELECT * FROM public.edupulse_academic_events')).rows
    for (const role of ['dean', 'associate_dean', 'admin']) {
      await db.query("UPDATE auth.users SET raw_app_meta_data=jsonb_build_object('role',$1::text) WHERE id=$2", [role, DEAN])
      const scan = await dean<{ syllabus: { id: string }; items: { content: { questions: { options: string[] }[] } }[] }>(db, { action: 'load.inspect', key, expected_instructor: TEACHER })
      assert.equal(scan.syllabus.id, 'basis'); assert.equal(scan.items.length, 2)
      assert.deepEqual(scan.items[1].content.questions[0].options, ['Yes', 'No'])
      assert.doesNotMatch(JSON.stringify(scan), /PRIVATE|correctIndex|explanation|answerKey|registrations/)
    }
    await db.query("UPDATE auth.users SET raw_app_meta_data=jsonb_build_object('role','dean') WHERE id=$1", [DEAN])
    await db.exec('SET ROLE authenticated')
    assert.deepEqual((await db.query('SELECT name FROM storage.objects')).rows, [{ name: path }], 'scan file policy includes only the selected course basis')
    await assert.rejects(db.query('SELECT edupulse_private.dean_inspect_load($1,$2)', [key, TEACHER]), /permission denied/)
    await db.exec('RESET ROLE')
    assert.deepEqual((await db.query('SELECT * FROM public.edupulse_academic_events')).rows, before)
    assert.deepEqual((await db.query<{ data: unknown }>('SELECT data FROM public.edupulse_workspaces')).rows[0].data, snapshot)
    await as(db, TEACHER)
    await assert.rejects(dean(db, { action: 'load.inspect', key, expected_instructor: TEACHER }), { code: '42501' })
    await as(db, DEAN)
    await assert.rejects(dean(db, { action: 'load.inspect', key, expected_instructor: OUTSIDER }), { code: '22023' })
    await dean(db, { action: 'load.remove', keys: [key] })
    await assert.rejects(dean(db, { action: 'load.inspect', key, expected_instructor: TEACHER }), { code: '22023' })
    await db.exec('SET ROLE authenticated')
    assert.deepEqual((await db.query('SELECT name FROM storage.objects')).rows, [], 'removed assignment revokes draft file inspection')
    await db.exec('RESET ROLE')
  } finally { await db.close() }
})

test('load edits atomically move or reassign a class and reject collisions, stale selections and invalid teachers', async () => {
  const db = await database()
  try {
    await as(db, DEAN)
    const added = await dean<{ id: string }>(db, { action: 'account.create', account: { role: 'instructor', surname: 'Rivera', first_name: 'Morgan', email: 'morgan@example.invalid', password: 'Ep9!sample-pass' } })
    await dean(db, { action: 'load.assign', loads: [{ course_code: 'IT 102', instructor_id: TEACHER, block: 'BSIT-1A' }, { course_code: 'IT 102', instructor_id: TEACHER, block: 'BSIT-1B' }] })
    const command = { action: 'load.update', key: 'IT 102|BSIT-1A|1st Semester', expected_instructor: TEACHER, instructor_id: added.id, block: 'BSIT-1C', semester: '2nd Semester' }
    await assert.rejects(dean(db, { ...command, block: 'BSIT-1B', semester: '1st Semester' }), { code: '22023' })
    await assert.rejects(dean(db, { ...command, instructor_id: OUTSIDER }), { code: '22023' })
    assert.equal((await db.query("SELECT 1 FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key=$1", [command.key])).rows.length, 1, 'failed destination assignment rolls back the old load removal')
    await assert.rejects(dean(db, { ...command, expected_instructor: added.id }), { code: '40001' })
    const edited = await dean<{ key: string }>(db, command)
    assert.equal(edited.key, 'IT 102|BSIT-1C|2nd Semester')
    assert.equal((await db.query("SELECT 1 FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key=$1", [command.key])).rows.length, 0)
    assert.equal((await db.query<{ id: string }>("SELECT data->>'InstructorID' id FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key=$1", [edited.key])).rows[0].id, added.id)
    await assert.rejects(dean(db, command), { code: '40001' })
    await as(db, TEACHER)
    await assert.rejects(dean(db, { ...command, key: edited.key, expected_instructor: added.id }), { code: '42501' })
  } finally { await db.close() }
})
