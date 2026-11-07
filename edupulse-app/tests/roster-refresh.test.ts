import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('roster refresh preserves instructor choices, projects shared loads, clears stale blocks and skips unchanged summaries', async () => {
  const db = new PGlite()
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA edupulse_private;
      CREATE TABLE public.edupulse_courses(id text PRIMARY KEY,instructor_id text,course_code text,block_info jsonb DEFAULT '[]');
      CREATE TABLE public.edupulse_enrollments(course_id text,instructor_id text,student_email text,student_ref text,display_name text,block_section text,source text DEFAULT 'instructor',UNIQUE(course_id,student_email));
      CREATE TABLE public.edupulse_institutional_records(kind text,data jsonb);
      CREATE TABLE summary_updates(course_id text);
      CREATE FUNCTION log_summary_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO public.summary_updates VALUES(NEW.id); RETURN NEW; END $$;
      CREATE TRIGGER summary_updated AFTER UPDATE ON public.edupulse_courses FOR EACH ROW EXECUTE FUNCTION log_summary_update();
      INSERT INTO public.edupulse_courses VALUES('a','teacher-a','IT 102','[]'),('b','teacher-b','IT 102','[]'),('empty','teacher-a','IT 202','[{"block":"stale"}]');
      INSERT INTO public.edupulse_enrollments VALUES('a','teacher-a','chosen@example.invalid','chosen','Chosen learner','A','instructor'),('a','teacher-a','moved@example.invalid','moved','Reassigned learner','B','instructor');
      INSERT INTO public.edupulse_institutional_records VALUES
        ('loads','{"InstructorID":"teacher-b","CourseCode":"IT 102","Block":"B"}'),
        ('rosters','{"StudentID":"shared","Name":"Shared learner","Email":"SHARED@example.invalid","Block":"B","Schedule":"Mon","YearLevel":"1","Adviser":"Adviser"}'),
        ('rosters','{"StudentID":"withdrawn","Name":"Withdrawn learner","Email":"withdrawn@example.invalid","Block":"B","Status":"withdrawn"}');`)
    await db.exec(await readFile('supabase/migrations/20261107050829_safe_workspace_roster_refresh.sql', 'utf8'))
    const refresh = () => db.exec('SELECT edupulse_private.refresh_imported_enrollments()')
    await refresh()
    const rows = (await db.query<{ course_id: string; student_email: string; source: string }>('SELECT course_id,student_email,source FROM public.edupulse_enrollments ORDER BY course_id')).rows
    assert.deepEqual(rows, [
      { course_id: 'a', student_email: 'chosen@example.invalid', source: 'instructor' },
      { course_id: 'b', student_email: 'shared@example.invalid', source: 'institutional' },
    ])
    const blocks = (await db.query<{ id: string; block_info: { block: string; students: number; schedule: string }[] }>('SELECT id,block_info FROM public.edupulse_courses ORDER BY id')).rows
    assert.equal(blocks[0].block_info[0].students, 1)
    assert.equal(blocks[1].block_info[0].schedule, 'Mon')
    assert.deepEqual(blocks[2].block_info, [], 'stale summary is cleared when its last student leaves')
    await db.exec('TRUNCATE summary_updates')
    await refresh()
    assert.deepEqual((await db.query('SELECT * FROM summary_updates')).rows, [], 'identical summaries do not rewrite course rows')
    await db.exec('SET ROLE authenticated')
    await assert.rejects(refresh(), { code: '42501' }, 'private elevated refresh is not directly callable')
  } finally { await db.close() }
})
