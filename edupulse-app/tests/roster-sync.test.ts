import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { changeCourseMembership, courseMemberships, registerCourseStudents } from '../src/utils/courseRoster.js'
import { workspaceData } from '../server/workspace.js'

test('course membership edits preserve other owners, profiles and explicit removal until re-enrollment', () => {
  const member = { courseCode: 'IT 102', courseTitle: 'Programming', blockSection: 'BSIT-1A', student: { Name: 'Synthetic learner', StudentID: 'SYN-1', Email: 'learner@example.invalid', YearLevel: '1', Block: 'BSIT-1A' } }
  const source = { syllabi: [], content: {}, registrations: [{ ...member, id: 'own', uploadedBy: 'owner', status: 'active', students: [member.student], studentCount: 1 }, { ...member, id: 'other', uploadedBy: 'other', status: 'active', students: [member.student], studentCount: 1 }] }
  const academic = { courses: [{ id: 'course', instructor_id: 'owner', course_code: member.courseCode }], enrollments: [{ course_id: 'course', student_email: member.student.Email, display_name: member.student.Name, block_section: member.blockSection }] }
  const removed = changeCourseMembership(source, member, 'owner')
  assert.equal(removed.registrations[1].studentCount, 1)
  assert.equal(courseMemberships(removed, academic, 'owner').length, 0)
  assert.equal(source.registrations[0].studentCount, 1, 'no optimistic mutation of the existing snapshot')
  const moved = changeCourseMembership(removed, member, 'owner', 'BSIT-1B')
  assert.equal(courseMemberships(moved, academic, 'owner')[0].blockSection, 'BSIT-1B')
  const added = registerCourseStudents(removed, { ...member, students: [member.student], fileName: 'Official directory' }, 'owner')
  assert.equal(courseMemberships(added, academic, 'owner').length, 1)
  assert.equal(added.enrollmentOverrides[0].excluded, false)
  assert.deepEqual(source.registrations[0].students[0], member.student)
  assert.equal(workspaceData.safeParse({ ...added, enrollmentOverrides: [added.enrollmentOverrides[0], added.enrollmentOverrides[0]] }).success, false)
})

test('persisted roster overrides survive shared imports and sync, revoke access, retain attempts and enforce owner RLS', async () => {
  const db = new PGlite()
  const ids = ['11111111-1111-4111-8111-111111111111', '22222222-1111-4111-8111-111111111111', '33333333-1111-4111-8111-111111111111', '44444444-1111-4111-8111-111111111111']
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_app_meta_data jsonb NOT NULL DEFAULT '{}',raw_user_meta_data jsonb NOT NULL DEFAULT '{}'); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claims',true)::jsonb $$; GRANT USAGE ON SCHEMA auth TO authenticated,anon;`)
    for (let i = 0; i < ids.length; i++) await db.query('INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES($1,$2,$3)', [ids[i], `user${i}@example.invalid`, JSON.stringify({ role: ['instructor', 'student', 'associate_dean', 'instructor'][i] })])
    for (const file of ['20260915042129_persistent_workspace', '20261004054136_system_admin_audit_roles', '20261024064532_academic_projection', '20261024065254_request_leases', '20261024071459_academic_record_labels', '20261024073036_academic_lint_cleanup', '20261028130000_baseline_workflows', '20261028130100_assessment_workflows', '20261028130200_delivery_notices', '20261028130300_offline_review_requests', '20261107050829_safe_workspace_roster_refresh', '20261107131810_instructor_roster_overrides', '20261107141745_validate_course_membership_decisions']) await db.exec(await readFile(`supabase/migrations/${file}.sql`, 'utf8'))
    const as = async (index: number) => {
      await db.exec('RESET ROLE')
      await db.query(`SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)`, [ids[index], JSON.stringify({ email: `user${index}@example.invalid`, app_metadata: { role: ['instructor', 'student', 'associate_dean', 'instructor'][index] } })])
      await db.exec('SET ROLE authenticated')
    }
    let snapshot: any = { syllabi: [{ id: 's1', courseCode: 'IT 102', courseTitle: 'Programming', status: 'active', approvedFile: { approvalAttested: true }, courseOutline: [{ week: 1, contents: ['Variables'], ilos: 'Explain variables' }] }], content: { q1: { syllabusId: 's1', week: 1, type: 'assessment', status: 'checked', content: { title: 'Reviewed quiz', questions: [0, 1, 2].map(correctIndex => ({ text: 'Choose the answer', topic: 'Variables', options: ['A', 'B', 'C', 'D'], correctIndex, explanation: 'Reviewed explanation' })) } } }, registrations: [] }
    let revision = 0
    const save = async () => { await db.query('SELECT public.edupulse_save_workspace($1,$2)', [revision, JSON.stringify(snapshot)]); revision++ }
    await as(0); await save(); snapshot.content.q1.status = 'published'; await save()
    const publication = (await db.query<any>('SELECT * FROM public.edupulse_publications')).rows[0]
    await as(2)
    const imp = (kind: string, rows: object[]) => db.query('SELECT public.edupulse_import_records($1,$2,$3)', [kind, JSON.stringify(rows), 'synthetic.csv'])
    await imp('courses', [{ CourseCode: 'IT 102', CourseTitle: 'Programming' }])
    await imp('loads', [{ InstructorID: ids[0], CourseCode: 'IT 102', Block: 'BSIT-1A', Semester: '1' }])
    const roster = { StudentID: 'S1', Name: 'Synthetic learner', Email: 'user1@example.invalid', Block: 'BSIT-1A' }
    await imp('rosters', [roster])
    await as(1)
    const command = async (input: object) => (await db.query<any>('SELECT public.edupulse_assessment_command($1) result', [JSON.stringify(input)])).rows[0].result
    const session = await command({ operation: 'start', publication: publication.id, version: publication.source_version })
    await command({ operation: 'submit', publication: publication.id, version: publication.source_version, session: session.id, responses: [0, 1, 2] })
    await as(0)
    const member = { courseCode: 'IT 102', courseTitle: 'Programming', blockSection: 'BSIT-1A', student: { Name: roster.Name, Email: roster.Email, StudentID: roster.StudentID, YearLevel: '1', Block: 'BSIT-1A' } }
    snapshot = changeCourseMembership(snapshot, member, ids[0]); await save()
    await db.query('SELECT public.edupulse_sync_academic_workspace()')
    assert.equal((await db.query('SELECT * FROM public.edupulse_enrollments')).rows.length, 0)
    assert.equal(Number((await db.query<any>('SELECT revision FROM public.edupulse_workspaces')).rows[0].revision), revision, 'sync does not advance authoring revision')
    await as(2); await imp('rosters', [{ ...roster, Status: 'active' }])
    await as(1)
    assert.equal((await db.query('SELECT * FROM public.edupulse_publications')).rows.length, 0, 'removed student loses released content')
    assert.equal((await db.query('SELECT * FROM public.edupulse_attempts')).rows.length, 1, 'own historical attempt is retained')
    await assert.rejects(command({ operation: 'start', publication: publication.id, version: publication.source_version }), { code: '42501' })
    await as(0); snapshot = changeCourseMembership(snapshot, member, ids[0], 'BSIT-1B'); await save()
    assert.equal((await db.query<any>('SELECT block_section FROM public.edupulse_enrollments')).rows[0].block_section, 'BSIT-1B')
    await assert.rejects(db.query('DELETE FROM public.edupulse_enrollments'), { code: '42501' })
    await assert.rejects(db.query('SELECT edupulse_private.apply_roster_overrides()'), { code: '42501' })
    await as(3)
    await db.query('SELECT public.edupulse_save_workspace(0,$1)', [JSON.stringify({ syllabi: [], content: {}, registrations: [], enrollmentOverrides: [{ courseCode: 'IT 102', studentEmail: roster.Email, excluded: true }] })])
    await as(0)
    assert.equal((await db.query('SELECT * FROM public.edupulse_enrollments')).rows.length, 1, 'another instructor cannot remove this membership')
    for (const invalid of [{ excluded: 'true' }, { blockSection: 'x'.repeat(81) }]) {
      const malformed = { ...snapshot, enrollmentOverrides: [{ courseCode: 'IT 102', studentEmail: roster.Email, excluded: true, ...invalid }] }
      await assert.rejects(db.query('SELECT public.edupulse_save_workspace($1,$2)', [revision, JSON.stringify(malformed)]), { code: '22023' })
    }
    snapshot.registrations = [{ courseCode: 'IT 102', blockSection: 'FULL-1A', status: 'active', students: Array.from({ length: 36 }, (_, index) => ({ Name: `Synthetic learner ${index}`, Email: `capacity-${index}@example.invalid`, StudentID: `SYN-${index}` })) }]
    await assert.rejects(save(), { code: '22023' }, 'block capacity is enforced by the database, not just the UI')
    assert.equal((await db.query('SELECT * FROM public.edupulse_enrollments')).rows.length, 1, 'invalid roster rolls back atomically')
  } finally { await db.close() }
})
