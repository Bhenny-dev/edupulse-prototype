import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { randomUUID } from 'node:crypto'

test('DATA-001/AUTH-001: reviewed publication, enrollment, answer-key secrecy, scoring and role RLS', async () => {
  const db = new PGlite()
  try {
    const ids = Array.from({ length: 6 }, (_, index) => `${index + 1}`.repeat(8) + '-1111-4111-8111-111111111111')
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_app_meta_data jsonb NOT NULL DEFAULT '{}');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claims',true)::jsonb $$;
      GRANT USAGE ON SCHEMA auth TO authenticated,anon;`)
    for (const id of ids) await db.query('INSERT INTO auth.users(id) VALUES($1)', [id])
    await db.exec(await readFile('supabase/migrations/20260915042129_persistent_workspace.sql', 'utf8'))
    await db.exec(await readFile('supabase/migrations/20261024064532_academic_projection.sql', 'utf8'))
    await db.exec(await readFile('supabase/migrations/20261024065254_request_leases.sql', 'utf8'))
    await db.exec(await readFile('supabase/migrations/20261024071459_academic_record_labels.sql', 'utf8'))
    await db.exec(await readFile('supabase/migrations/20261024073036_academic_lint_cleanup.sql', 'utf8'))
    const as = async (index: number, role: string, email = 'canary.student@example.invalid') => {
      await db.exec('RESET ROLE')
      await db.query(`UPDATE auth.users SET raw_app_meta_data=jsonb_build_object('role',$2::text) WHERE id=$1`, [ids[index], role])
      await db.query('UPDATE auth.users SET email=$2 WHERE id=$1', [ids[index], email])
      await db.query(`SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)`, [ids[index], JSON.stringify({ email, app_metadata: { role }, user_metadata: { role: 'dean' } })])
      await db.exec('SET ROLE authenticated')
    }
    const content = { title: 'Reviewed variables assessment', questions: [0, 1, 2].map(correctIndex => ({ text: `Question ${correctIndex + 1} about variables`, options: ['A', 'B', 'C', 'D'], correctIndex, explanation: 'Instructor-reviewed answer explanation' })) }
    const item = { syllabusId: 's1', week: 1, type: 'assessment', status: 'checked', content }
    const snapshot = { syllabi: [{ id: 's1', courseCode: 'IT 102', courseTitle: 'Programming', status: 'active', approvedFile: { approvalAttested: true } }], content: { q1: item }, registrations: [{ courseCode: 'IT 102', blockSection: 'BSIT-1A', status: 'active', students: [{ Name: 'Canary Student', Email: 'canary.student@example.invalid', StudentID: 'canary-01' }, { Name: 'Other Student', Email: 'other@example.invalid' }] }] }
    const save = (revision: number) => db.query('SELECT * FROM public.edupulse_save_workspace($1,$2)', [revision, JSON.stringify(snapshot)])
    await as(0, 'instructor')
    item.status = 'published'
    await assert.rejects(save(0), { code: '22023' }, 'unreviewed direct publication rejected')
    item.status = 'checked'; await save(0)
    item.status = 'published'; await save(1)
    const publication = (await db.query<{ id: string; source_version: string; content: typeof content }>('SELECT * FROM public.edupulse_publications')).rows[0]
    assert.equal('correctIndex' in publication.content.questions[0], false)
    assert.equal('explanation' in publication.content.questions[0], false)
    await assert.rejects(db.query('SELECT * FROM edupulse_private.assessment_keys'), { code: '42501' })
    const submit = (answers: number[]) => db.query<{ result: { id: string; score: number } }>(`SELECT public.edupulse_academic_action($1,$2,$3,'submit') AS result`, [publication.id, publication.source_version, JSON.stringify(answers)])
    await as(2, 'student')
    assert.equal((await db.query('SELECT * FROM public.edupulse_courses')).rows.length, 1)
    assert.equal((await db.query('SELECT * FROM public.edupulse_enrollments')).rows.length, 1, 'no classmate data')
    const first = (await submit([0, 1, 2])).rows[0].result
    assert.equal(first.score, 3)
    assert.deepEqual((await submit([3, 3, 3])).rows[0].result, first, 'retries return the saved attempt without rescoring')
    await assert.rejects(db.query(`INSERT INTO public.edupulse_attempts(publication_id,instructor_id,student_id,source_version,answers,score,max_score) VALUES($1,$2,$3,'forged','[]',100,100)`, [publication.id, ids[0], ids[2]]), { code: '42501' })
    await as(3, 'student', 'outsider@example.invalid')
    assert.equal((await db.query('SELECT * FROM public.edupulse_publications')).rows.length, 0)
    assert.equal((await db.query('SELECT * FROM public.edupulse_attempts')).rows.length, 0)
    await assert.rejects(submit([0, 1, 2]), { code: '42501' })
    await as(1, 'instructor')
    assert.equal((await db.query('SELECT * FROM public.edupulse_attempts')).rows.length, 0)
    await as(4, 'dean')
    assert.equal((await db.query('SELECT * FROM public.edupulse_attempts')).rows.length, 1)
    await as(5, 'associate_dean')
    assert.equal((await db.query('SELECT * FROM public.edupulse_courses')).rows.length, 1)
    assert.equal((await db.query('SELECT * FROM public.edupulse_attempts')).rows.length, 0)
    await assert.rejects(submit([0, 1, 2]), { code: '42501' })
    await as(0, 'instructor')
    content.title = 'Changed without re-review'
    await assert.rejects(save(2), { code: '22023' })
    const lease = randomUUID()
    const acquire = (id: string, release = false) => db.query<{ ok: boolean }>('SELECT public.edupulse_ai_lease($1,$2) AS ok', [id, release])
    assert.equal((await acquire(lease)).rows[0].ok, true)
    assert.equal((await acquire(randomUUID())).rows[0].ok, false, 'another function instance cannot overlap the account lease')
    await acquire(randomUUID(), true)
    assert.equal((await acquire(randomUUID())).rows[0].ok, false, 'wrong lease cannot release a running request')
    await acquire(lease, true)
    for (let count = 1; count < 20; count++) { assert.equal((await acquire(lease)).rows[0].ok, true); await acquire(lease, true) }
    assert.equal((await acquire(lease)).rows[0].ok, false, 'twenty requests exhaust the shared window')
    await as(4, 'dean')
    await db.exec('RESET ROLE')
    await db.query(`UPDATE auth.users SET raw_app_meta_data='{}' WHERE id=$1`, [ids[4]])
    await db.exec('SET ROLE authenticated')
    assert.equal((await db.query('SELECT * FROM public.edupulse_attempts')).rows.length, 0, 'stale privileged JWT cannot retain reassigned role access')
  } finally { await db.close() }
})
