import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const DEAN = '00000000-0000-4000-8000-000000000001', TEACHER = '00000000-0000-4000-8000-000000000002', OUTSIDER = '00000000-0000-4000-8000-000000000003'

async function database() {
  const db = new PGlite()
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE SCHEMA extensions; CREATE SCHEMA edupulse_private;
    CREATE TABLE auth.users(instance_id uuid,id uuid PRIMARY KEY,aud text,role text,email text,encrypted_password text,email_confirmed_at timestamptz,
      raw_app_meta_data jsonb DEFAULT '{}',raw_user_meta_data jsonb DEFAULT '{}',created_at timestamptz DEFAULT now(),updated_at timestamptz,last_sign_in_at timestamptz,banned_until timestamptz,
      confirmation_token text,recovery_token text,email_change_token_new text,email_change text);
    CREATE TABLE auth.identities(id uuid PRIMARY KEY,user_id uuid,provider_id text NOT NULL,identity_data jsonb,provider text,last_sign_in_at timestamptz,created_at timestamptz,updated_at timestamptz);
    CREATE TABLE auth.sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION extensions.gen_salt(text) RETURNS text LANGUAGE sql AS $$ SELECT 'salt' $$;
    CREATE FUNCTION extensions.crypt(text,text) RETURNS text LANGUAGE sql AS $$ SELECT 'hash:'||$1 $$;
    CREATE FUNCTION edupulse_private.academic_role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id=auth.uid() $$;
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
    INSERT INTO public.edupulse_institutional_records(kind,record_key,data) VALUES('courses','IT 102','{"CourseCode":"IT 102","CourseTitle":"Programming foundations","Semester":"1st Semester"}');
    INSERT INTO public.edupulse_courses(id,instructor_id,course_code,course_title) VALUES('c102','${TEACHER}','IT 102','Programming foundations');`)
  await db.exec(await readFile('supabase/migrations/20261114080000_dean_course_loads_and_accounts.sql', 'utf8'))
  return db
}
const as = (db: PGlite, id: string) => db.query(`SELECT set_config('request.jwt.claim.sub',$1,false)`, [id])
const dean = async <T = Record<string, unknown>>(db: PGlite, command: unknown) => (await db.query<{ r: T }>('SELECT public.edupulse_dean_command($1::jsonb) r', [JSON.stringify(command)])).rows[0].r
const enrolled = async (db: PGlite) => (await db.query<{ course_id: string; student_email: string; block_section: string }>('SELECT course_id,student_email,block_section FROM public.edupulse_enrollments ORDER BY student_email,course_id')).rows

test('Dean manages instructor accounts, recorded degrees and course loads', async () => {
  const db = await database()
  try {
    await as(db, TEACHER)
    await assert.rejects(dean(db, { action: 'directory' }), { code: '42501' }, 'only the Dean reads the directory')
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
