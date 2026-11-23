import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { semesterDatabase } from './semester-fixture'

test('topic work protects block comments, private replies, and immutable submissions under live roles', async () => {
  const { db, ids, as, email } = await semesterDatabase()
  const publication = 'a'.repeat(32), version = 'v1'
  const invoke = async (operation: string, extra = {}) => (await db.query<{ result: any }>(
    'SELECT public.edupulse_topic_work($1) result', [JSON.stringify({ publication, version, operation, ...extra })],
  )).rows[0].result
  const comment = (body: string, extra = {}) => invoke('comment', { id: randomUUID(), body, ...extra })
  const storageCount = async () => (await db.query("SELECT name FROM storage.objects WHERE bucket_id='edupulse-student-work'")).rows.length
  const insertFile = (path: string) => db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('edupulse-student-work',$1)", [path])
  try {
    await db.exec(await readFile('supabase/migrations/20261123231913_classroom_topic_work.sql', 'utf8'))
    await db.query("INSERT INTO public.edupulse_courses(id,instructor_id,syllabus_id,course_code,course_title,active,source_revision,academic_year,semester) VALUES('class',$1,'s1','IT 101','Programming',true,1,'2026-2027','1st Semester')", [ids[0]])
    await db.query("INSERT INTO public.edupulse_publications(id,course_id,instructor_id,workspace_item_id,week,type,title,content,source_version,active) VALUES($1,'class',$2,'item',1,'material','Project',$3,$4,true)", [publication, ids[0], '{"submissionBin":true}', version])
    // Seed the two confirmed memberships for this isolated permission test.
    await db.exec('ALTER TABLE public.edupulse_enrollments DISABLE TRIGGER edupulse_guard_roster_membership')
    for (const [index, block] of [[3, 'A'], [5, 'A']] as const) {
      await db.query("INSERT INTO public.edupulse_enrollments(course_id,instructor_id,student_email,display_name,block_section) VALUES('class',$1,$2,$3,$4)", [ids[0], email(index), 'Student ' + index, block])
    }

    await as(3)
    await db.exec('RESET ROLE')
    await db.query("UPDATE public.edupulse_publications SET release_at=now()+interval '1 hour' WHERE id=$1", [publication])
    await as(3)
    await assert.rejects(invoke('read'), { code: '42501' })
    await db.exec('RESET ROLE')
    await db.query('UPDATE public.edupulse_publications SET release_at=NULL WHERE id=$1', [publication])
    await as(3)
    const root = randomUUID(), privateRoot = randomUUID()
    const publicInput = { id: root, body: 'Class discussion', private: false }
    await invoke('comment', publicInput)
    await invoke('comment', publicInput)
    await comment('Private question', { id: privateRoot, private: true })
    assert.equal((await invoke('read')).comments.length, 2)
    await assert.rejects(db.exec('SELECT * FROM edupulse_private.topic_comments'), { code: '42501' })
    await assert.rejects(invoke('submit', { files: [{ path: 'missing' }] }), { code: '22023' })

    const path = [ids[3], publication, randomUUID(), 'project.txt'].join('/')
    const peerPath = [ids[5], publication, randomUUID(), 'peer.txt'].join('/')
    await invoke('upload')
    await insertFile(path)
    await assert.rejects(insertFile(peerPath), { code: '42501' })
    await as(0)
    assert.equal(await storageCount(), 0, 'Only confirmed student files can be read by the instructor')
    await comment('Private reply', { replyTo: privateRoot })

    await as(5)
    assert.deepEqual((await invoke('read')).comments.map((entry: any) => entry.body), ['Class discussion'])
    await comment('Classmate reply', { replyTo: root })
    await assert.rejects(comment('Other private thread', { replyTo: privateRoot }), { code: '42501' })
    await assert.rejects(invoke('submit', { files: [{ path }] }), { code: '22023' })

    await as(3)
    await assert.rejects(invoke('submit', { version: 'stale', body: 'Attempt' }), { code: '40001' })
    await invoke('submit', { body: 'My submission', files: [{ path }] })
    await invoke('submit', { body: 'Replacement' })
    const own = await invoke('read')
    assert.equal(own.submissions.length, 1)
    assert.equal(own.submissions[0].body, 'My submission')
    assert.deepEqual(own.submissions[0].files, [{ path, name: 'project.txt' }])
    assert.equal(await storageCount(), 1)
    assert.deepEqual((await db.query("UPDATE storage.objects SET name='changed' RETURNING id")).rows, [])
    assert.deepEqual((await db.query("DELETE FROM storage.objects RETURNING id")).rows, [])
    await assert.rejects(invoke('upload'), { code: '22023' })

    await as(5)
    assert.equal(await storageCount(), 0)
    assert.equal((await invoke('read')).submissions.length, 0)
    await db.exec('RESET ROLE')
    await db.query("UPDATE public.edupulse_enrollments SET block_section='B' WHERE student_email=$1", [email(5)])
    await as(5)
    assert.equal((await invoke('read')).comments.length, 0)
    await assert.rejects(comment('Other block', { replyTo: root }), { code: '42501' })
    await as(0)
    assert.equal((await invoke('read')).submissions.length, 1)
    assert.equal(await storageCount(), 1)
    await as(1)
    await assert.rejects(invoke('read'), { code: '42501' })
    assert.equal(await storageCount(), 0)
    await as(4)
    await assert.rejects(invoke('read'), { code: '42501' })

    await db.exec('RESET ROLE')
    await db.query("UPDATE public.edupulse_publications SET due_at=now()-interval '1 hour' WHERE id=$1", [publication])
    await as(5)
    assert.equal((await invoke('read')).canSubmit, false)
    await assert.rejects(invoke('submit', { body: 'After closing' }), { code: '42501' })
    await db.exec('RESET ROLE')
    await db.query("UPDATE public.edupulse_enrollments SET suspended=true WHERE student_email=$1", [email(3)])
    await as(3)
    await assert.rejects(invoke('read'), { code: '42501' })
    assert.equal(await storageCount(), 0)
  } finally { await db.close() }
})
