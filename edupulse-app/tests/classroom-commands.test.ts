import test from 'node:test'
import assert from 'node:assert/strict'
import { academicCommand, executeAcademic } from '../server/domains/academic'
import type { Identity } from '../server/contracts'

test('class code, join and announcement commands validate their input before any database call', () => {
  assert.equal(academicCommand.safeParse({ operation: 'class-code', action: 'create', assignment: 'course:1', block: 'A' }).success, true)
  assert.equal(academicCommand.safeParse({ operation: 'class-code', action: 'create', assignment: 'course:1', block: '<b>' }).success, false)
  assert.equal(academicCommand.safeParse({ operation: 'class-code', action: 'publish', assignment: 'course:1', block: 'A' }).success, false)
  assert.equal(academicCommand.safeParse({ operation: 'class-join', action: 'lookup', code: 'k7m 2qx' }).success, true)
  assert.equal(academicCommand.safeParse({ operation: 'class-join', action: 'join', code: 'k7' }).success, false)
  const post = { action: 'save', course_code: 'IT 101', academic_year: '2026-2027', semester: '1st Semester', title: 'Welcome', body: 'Bring your laptop.' }
  assert.equal(academicCommand.safeParse({ operation: 'announcement', command: { ...post, attachments: [{ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', provider: 'youtube' }] } }).success, true)
  assert.equal(academicCommand.safeParse({ operation: 'announcement', command: { ...post, attachments: [{ url: 'javascript:alert(1)' }] } }).success, false, 'only web links are attached')
  assert.equal(academicCommand.safeParse({ operation: 'announcement', command: { ...post, title: ' ' } }).success, false)
  assert.equal(academicCommand.safeParse({ operation: 'announcement', command: { ...post, body: 'x'.repeat(5001) } }).success, false)
  assert.equal(academicCommand.safeParse({ operation: 'announcement', command: { action: 'delete', id: 'not-an-id' } }).success, false)
})

test('only a student joins with a code and only an instructor or verified instructor support view manages classroom controls', async () => {
  const as = (role: Identity['role'], extra: Partial<Identity> = {}): Identity => ({ id: '11111111-1111-4111-8111-111111111111', role, local: false, ...extra })
  const join = academicCommand.parse({ operation: 'class-join', action: 'join', code: 'K7M2QXP' })
  const code = academicCommand.parse({ operation: 'class-code', action: 'create', assignment: 'course:1', block: 'A' })
  const announce = academicCommand.parse({ operation: 'announcement', command: { action: 'delete', id: '22222222-1111-4111-8111-111111111111' } })
  await assert.rejects(executeAcademic(as('instructor'), join), { status: 403 })
  await assert.rejects(executeAcademic(as('dean'), join), { status: 403 })
  await assert.rejects(executeAcademic(as('student'), code), { status: 403 })
  await assert.rejects(executeAcademic(as('student'), announce), { status: 403 })
  await assert.rejects(executeAcademic(as('student', { supportActor: 'admin-id' }), join), { status: 403 })
  await assert.rejects(executeAcademic(as('guest'), join), { status: 403 })
})

test('instructor support classroom commands use the Admin token and audited subject gateway', async t => {
  const old = { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY }
  t.after(() => { for (const [name, value] of Object.entries(old)) { if (value === undefined) delete process.env[name]; else process.env[name] = value } })
  process.env.SUPABASE_URL = 'https://classroom.example.invalid'; process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_synthetic'
  const input = academicCommand.parse({ operation: 'class-code', action: 'create', assignment: 'course:1', block: 'A' })
  t.mock.method(globalThis, 'fetch', async (value: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(value), 'https://classroom.example.invalid/rest/v1/rpc/edupulse_support_action')
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer synthetic-admin-token')
    assert.deepEqual(JSON.parse(String(init?.body)), { subject: '11111111-1111-4111-8111-111111111111', operation: 'classroom.command', input })
    return Response.json({ code: 'K7M2QXP' })
  })
  assert.deepEqual(await executeAcademic({ id: '11111111-1111-4111-8111-111111111111', role: 'instructor', local: false, supportActor: 'admin-id', token: 'synthetic-admin-token' }, input), { code: 'K7M2QXP' })
})
