import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

// Owner specification I3: answers and explanations appear right after a recorded submission, never during an open
// attempt, only to the student who answered, and an unmarked written response stays "awaiting review".
test('a student reviews the key and explanations of their own submitted attempt, never during an open retake', async () => {
  const db = new PGlite(); const ids = ['11111111-1111-4111-8111-111111111111', '22222222-1111-4111-8111-111111111111', '33333333-1111-4111-8111-111111111111', '44444444-1111-4111-8111-111111111111']
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_app_meta_data jsonb NOT NULL DEFAULT '{}',raw_user_meta_data jsonb NOT NULL DEFAULT '{}'); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claims',true)::jsonb $$; GRANT USAGE ON SCHEMA auth TO authenticated,anon;`)
    for (const id of ids) await db.query('INSERT INTO auth.users(id) VALUES($1)', [id])
    for (const file of ['20260915042129_persistent_workspace', '20261004054136_system_admin_audit_roles', '20261024064532_academic_projection', '20261024065254_request_leases', '20261024071459_academic_record_labels', '20261024073036_academic_lint_cleanup', '20261028130000_baseline_workflows', '20261028130100_assessment_workflows', '20261028130200_delivery_notices', '20261028130300_offline_review_requests', '20261123090000_assessment_answer_review']) await db.exec(await readFile(`supabase/migrations/${file}.sql`, 'utf8'))
    const as = async (index: number, role: string) => { await db.exec('RESET ROLE'); await db.query(`UPDATE auth.users SET email=$2,raw_app_meta_data=jsonb_build_object('role',$3::text) WHERE id=$1`, [ids[index], `user${index}@example.invalid`, role]); await db.query(`SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)`, [ids[index], JSON.stringify({ email: `user${index}@example.invalid`, app_metadata: { role } })]); await db.exec('SET ROLE authenticated') }
    const command = async (input: object) => (await db.query<{ r: Record<string, any> }>('SELECT public.edupulse_assessment_command($1) r', [JSON.stringify(input)])).rows[0].r
    const review = async (attempt: string) => (await db.query<{ r: Record<string, any> }>('SELECT public.edupulse_attempt_feedback($1) r', [attempt])).rows[0].r
    await as(0, 'instructor'); await as(1, 'student'); await as(3, 'student'); await as(2, 'associate_dean')
    const imp = (kind: string, rows: object[]) => db.query('SELECT public.edupulse_import_records($1,$2,$3)', [kind, JSON.stringify(rows), 'test.csv'])
    await imp('courses', [{ CourseCode: 'IT 102', CourseTitle: 'Programming' }])
    await imp('loads', [{ InstructorID: ids[0], CourseCode: 'IT 102', Block: 'BSIT-1A', Semester: '1' }])
    await imp('rosters', [{ StudentID: 'S1', Name: 'Synthetic learner', Email: 'user1@example.invalid', Block: 'BSIT-1A' }])
    const content = { title: 'Reviewed quiz', assessmentPolicy: { maxAttempts: 2, durationSeconds: 0 }, questions: [
      { text: 'Which keyword declares a constant?', options: ['const', 'var', 'loop', 'print'], correctIndex: 0, topic: 'Variables', explanation: 'const binds a name that cannot be reassigned.' },
      { text: 'Functions can only be called once.', type: 'true_false', options: ['True', 'False'], correctIndex: 1, topic: 'Functions', explanation: 'A function can be called as many times as needed.' },
      { text: 'Explain a variable', type: 'short_answer', topic: 'Variables' },
    ] }
    const snapshot = { syllabi: [{ id: 's1', courseCode: 'IT 102', courseTitle: 'Programming', status: 'active', approvedFile: { approvalAttested: true }, courseOutline: [{ week: 1, contents: ['Variables', 'Functions'], ilos: 'Use functions' }] }], content: { q1: { syllabusId: 's1', week: 1, type: 'assessment', status: 'checked', content, releaseAt: new Date(Date.now() - 60000).toISOString() } }, registrations: [] }
    await as(0, 'instructor')
    const save = (rev: number) => db.query('SELECT public.edupulse_save_workspace($1,$2)', [rev, JSON.stringify(snapshot)])
    await save(0); snapshot.content.q1.status = 'published'; await save(1)
    const p = (await db.query<{ id: string, source_version: string }>('SELECT id,source_version FROM public.edupulse_publications')).rows[0]

    await as(1, 'student')
    const s1 = await command({ operation: 'start', publication: p.id, version: p.source_version })
    const a1 = await command({ operation: 'submit', publication: p.id, version: p.source_version, session: s1.id, responses: [0, 0, 'A variable names a stored value.'] })
    const first = await review(a1.id)
    assert.equal(first.available, true); assert.equal(first.explanations, true)
    assert.deepEqual(first.questions.map((q: any) => [q.status, q.correctIndex, q.response]), [['correct', 0, 0], ['incorrect', 1, 0], ['awaiting_review', null, 'A variable names a stored value.']])
    assert.equal(first.questions[1].explanation, 'A function can be called as many times as needed.')
    assert.equal(first.questions[2].explanation, null, 'no explanation is invented for a question without one')

    await as(3, 'student'); await assert.rejects(review(a1.id), { code: '42501' }, 'another student cannot read this attempt')
    await as(0, 'instructor'); await assert.rejects(review(a1.id), { code: '42501' }, 'the review is the learner\'s own view')
    await command({ operation: 'grade', attempt: a1.id, points: [1, 0, 1], reason: 'Written answer accepted.' })

    await as(1, 'student')
    assert.equal((await review(a1.id)).questions[2].status, 'correct', 'the instructor mark replaces "awaiting review"')
    const s2 = await command({ operation: 'start', publication: p.id, version: p.source_version, retake: true })
    await assert.rejects(review(a1.id), { code: '22023' }, 'the key stays hidden while the next attempt is open')
    const a2 = await command({ operation: 'submit', publication: p.id, version: p.source_version, session: s2.id, responses: [1, 1, 'Second answer.'] })
    assert.deepEqual((await review(a2.id)).questions.map((q: any) => q.status), ['incorrect', 'correct', 'awaiting_review'])
    assert.equal((await review(a1.id)).available, true, 'earlier attempts are reviewable again once nothing is open')

    // A revised assessment no longer matches the attempt: the review says so instead of showing another version's key.
    await as(0, 'instructor'); content.questions[0].text = 'Which keyword declares a constant value?'; snapshot.content.q1.status = 'checked'; await save(2); snapshot.content.q1.status = 'published'; await save(3)
    await as(1, 'student')
    const revised = await review(a2.id)
    assert.equal(revised.available, false); assert.match(revised.reason, /revised after your attempt/)
  } finally { await db.close() }
})
