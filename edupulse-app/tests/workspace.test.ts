import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { readWorkspace, saveWorkspace, workspaceInput } from '../server/workspace.js'
import { localDb } from '../server/database.js'
import { handleRequest } from '../server/http.js'
import type { Identity } from '../server/contracts.js'
import { parseCourseOutline, parseSyllabusText, parsedToFormState } from '../src/utils/syllabusParser.js'

const empty = { syllabi: [], content: {}, registrations: [] }
const syllabi = [{ id: 'syllabus-a', courseCode: 'IT 102', courseTitle: 'Computer Programming 1', status: 'drafted', courseOutline: [] }]
test('local workspace persists per owner and rejects concurrent stale saves', async () => {
  const hosted = process.env.VERCEL
  delete process.env.VERCEL // This suite deliberately exercises the local runtime, also during a hosted build.
  process.env.AI_VECTOR_STORE = 'local'
  process.env.AI_DATA_DIR = join(await mkdtemp(join(tmpdir(), 'edupulse-workspace-')), 'db')
  const a: Identity = { id: 'a', role: 'instructor', local: true }, b: Identity = { ...a, id: 'b' }
  try {
    assert.equal((await readWorkspace(a)).revision, 0)
    const data = workspaceInput.parse({ revision: 0, data: { ...empty, syllabi } })
    const first = await saveWorkspace(a, data)
    assert.equal(first.revision, 1)
    assert.equal((await readWorkspace(b)).data, null)
    const concurrent = await Promise.allSettled([saveWorkspace(a, { ...data, revision: 1 }), saveWorkspace(a, { ...data, revision: 1 })])
    assert.equal(concurrent.filter(result => result.status === 'fulfilled').length, 1)
    const rejected = concurrent.find(result => result.status === 'rejected')
    assert.equal(rejected?.reason.status, 409)
    assert.equal((await readWorkspace(a)).revision, 2)
    assert.equal((await readWorkspace({ ...a, role: 'guest' })).data, null)
    await assert.rejects(saveWorkspace({ ...a, role: 'student' }, data), { status: 403 })
    const invalidAttachment = workspaceInput.parse({ revision: 2, data: { ...empty, syllabi: [{ ...syllabi[0], approvedFile: { name: 'bad.docx', size: 2, base64: 'UEs=', sha256: '0'.repeat(64), uploadedAt: new Date().toISOString(), approvalAttested: true } }] } })
    await assert.rejects(saveWorkspace(a, invalidAttachment), { code: 'INVALID_ATTACHMENT' })
    await assert.rejects(saveWorkspace(a, { revision: 2, data: { ...empty, registrations: [{ excessive: 'x'.repeat(3_000_000) }] } }), { status: 413 })
    process.env.AI_LOCAL_MODE = 'true'
    const put = await handleRequest(new Request('http://localhost/api/ai?action=workspace', { method: 'PUT', body: JSON.stringify({ revision: 0, data: empty }) }))
    assert.equal(put.status, 200)
    const stale = await handleRequest(new Request('http://localhost/api/ai?action=workspace', { method: 'PUT', body: JSON.stringify({ revision: 0, data: empty }) }))
    assert.equal(stale.status, 409)
    const invalid = await handleRequest(new Request('http://localhost/api/ai?action=workspace', { method: 'PUT', body: JSON.stringify({ revision: 1, data: {} }) }))
    assert.equal(invalid.status, 400)
    delete process.env.AI_LOCAL_MODE
    const guest = await handleRequest(new Request('http://localhost/api/ai?action=workspace'))
    assert.deepEqual(await guest.json(), { revision: 0, data: null, updated_at: null, mode: 'preview' })
    const denied = await handleRequest(new Request('http://localhost/api/ai?action=workspace', { method: 'PUT', body: JSON.stringify({ revision: 0, data: empty }) }))
    assert.equal(denied.status, 403)
  } finally { await (await localDb()).close(); if (hosted !== undefined) process.env.VERCEL = hosted }
})

test('cloud workspace SQL enforces ownership, trusted roles, valid snapshots and compare-and-save', async () => {
  const db = new PGlite()
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claims', true)::jsonb $$;
      GRANT USAGE ON SCHEMA auth TO authenticated, anon;
      INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');`)
    const migration = (await readdir('supabase/migrations')).find(name => name.endsWith('_persistent_workspace.sql'))!
    await db.exec(await readFile(`supabase/migrations/${migration}`, 'utf8'))
    const policyMigration = (await readdir('supabase/migrations')).find(name => name.endsWith('_workspace_policy_initplan.sql'))!
    await db.exec(await readFile(`supabase/migrations/${policyMigration}`, 'utf8'))
    const save = (revision: number, data: unknown = empty) => db.query<{ revision: number }>('SELECT * FROM public.edupulse_save_workspace($1,$2::jsonb)', [revision, JSON.stringify(data)])
    await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111'; SET request.jwt.claims='{"app_metadata":{"role":"instructor"}}';`)
    assert.equal((await save(0)).rows[0].revision, 1)
    await assert.rejects(save(0), { code: '40001' })
    assert.equal((await save(1)).rows[0].revision, 2)
    await assert.rejects(save(2, {}), { code: '23514' })
    await db.exec(`SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';`)
    assert.equal((await db.query('SELECT * FROM public.edupulse_workspaces')).rows.length, 0)
    await assert.rejects(save(2), { code: '40001' })
    await assert.rejects(db.query(`INSERT INTO public.edupulse_workspaces(owner_id,revision,data) VALUES('11111111-1111-4111-8111-111111111111',1,$1)`, [JSON.stringify(empty)]))
    await db.exec(`SET request.jwt.claims='{"app_metadata":{"role":"student"},"user_metadata":{"role":"instructor"}}';`)
    await assert.rejects(save(0), { code: '42501' })
    await db.exec('RESET ROLE; SET ROLE anon;')
    await assert.rejects(db.query('SELECT * FROM public.edupulse_workspaces'), { code: '42501' })
    await assert.rejects(save(0), { code: '42501' })
  } finally { await db.close() }
})

test('syllabus parsing never invents missing weeks, policies or a curriculum match', () => {
  assert.deepEqual(parseCourseOutline('No course outline is supplied.'), [])
  const parsed = parseSyllabusText('Section 1: Course Information\nCourse Code: UNKNOWN99\nSection 5: Course Outline\nWeek 1\nContent: Variables\nWeek 2\nILOs: Explain constants\nContent: Constants\nSection 6: Requirements, Grading and Policy')
  assert.equal(parsed.sections[4].parsed.courseOutline[0].ilos, '', 'Week 1 cannot borrow the learning outcome from week 2')
  assert.equal(parsed.sections[4].parsed.courseOutline.length, 2)
  assert.equal(parsedToFormState(parsed).courseCode, '')
  assert.equal(parsed.sections[5].parsed.gradingSystem, '')
  assert.deepEqual(parsed.sections[5].parsed.coursePolicy, [])
})

test('workspace rejects duplicate syllabus IDs and malformed courseware', () => {
  assert.equal(workspaceInput.safeParse({ revision: 0, data: { ...empty, syllabi: [syllabi[0], syllabi[0]] } }).success, false)
  assert.equal(workspaceInput.safeParse({ revision: 0, data: { ...empty, content: { a: { status: 'published' } } } }).success, false)
  assert.equal(workspaceInput.safeParse({ revision: 0, data: { ...empty, syllabi: [{ ...syllabi[0], status: 'active' }] } }).success, false, 'Activation requires an approved file with an extracted outline')
})
