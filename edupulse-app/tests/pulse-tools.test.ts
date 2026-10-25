import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { pageFor } from '../src/agents/operator.js'
import { parseToolPlan, conversationWindow } from '../src/agents/skills.js'
import { registerEditor, currentEditor, applyEditorProposal, syllabusPatch, literalEdit } from '../src/agents/editorTools.js'
import { conversationCommand, executeConversation, readConversations, conversationRecall, preferenceCandidate, safeMemory } from '../server/domains/conversations.js'
import { localDb } from '../server/database.js'
import type { Identity } from '../server/contracts.js'
import { operatorInput, planValidatedTool } from '../src/agents/toolPlanner.js'
import { quickReply } from '../src/agents/quickReplies.js'
import { buddyReply } from '../src/agents/buddies.js'

test('conversational redirects route to the builder and typed plans reject arbitrary execution', () => {
  for (const message of ['ok then, can you redirect me to where i can start with building my syllabus', 'Could you take me to the syllabus builder?', 'Guide me through building my syllabus']) assert.match(pageFor(message, 'instructor')!.path, /syllabus\?tab=builder/)
  assert.throws(() => parseToolPlan(JSON.stringify({ tool: 'shell', instruction: 'delete everything' })))
  assert.throws(() => parseToolPlan(JSON.stringify({ tool: 'navigate', page: 'https://evil.invalid' })))
  const history = conversationWindow(Array.from({ length: 30 }, (_, i) => ({ role: 'user', content: `${i}:` + 'x'.repeat(3000) })), 10000)
  assert.equal(history.history.length, 3); assert.ok(history.characters <= 10000)
  assert.match(history.history.at(-1)!.content, /^29:/)
})
test('quick replies never absorb real tasks and buddy achievements come only from session events',()=>{
  assert.ok(quickReply('Hello!'))
  for(const text of ['Hello, delete my syllabus','Hi I am feeling hopeless','Thanks, now explain this PDF','What are my grades?']) assert.equal(quickReply(text),null)
  assert.match(buddyReply('ro','What have you accomplished?',[]).text,/haven’t recorded/)
  assert.equal(buddyReply('ro','Open my syllabus builder',[]).handoff,'pip')
  assert.match(buddyReply('luma','What do you do?',[]).text,/PDF and Word/)
})

test('editor tools require exact mounted targets and wait for persisted receipts', async () => {
  let snapshot = { instance: randomUUID(), kind: 'syllabus' as const, label: 'Test syllabus', data: { gradingSystem: 'Before' } }
  let writes = 0
  const unregister = registerEditor(snapshot.instance, { read: () => snapshot, apply: data => { writes++; snapshot = { ...snapshot, data: data as typeof snapshot.data } }, save: async () => { writes++; throw new Error('Database unavailable') } })
  try {
    const expected = currentEditor()!
    await assert.rejects(applyEditorProposal(expected, { gradingSystem: 'After' }, 'student'), /instructor/)
    await assert.rejects(applyEditorProposal(expected, { status: 'active' }, 'instructor'))
    assert.equal(writes, 0)
    await assert.rejects(applyEditorProposal(expected, { gradingSystem: 'After' }, 'instructor', true), /Database unavailable/)
    assert.equal(snapshot.data.gradingSystem, 'Before')
    await applyEditorProposal(expected, { gradingSystem: 'After' }, 'instructor')
    await assert.rejects(applyEditorProposal(expected, { gradingSystem: 'Stale' }, 'instructor'), /changed/)
    assert.equal(snapshot.data.gradingSystem, 'After')
    assert.equal(syllabusPatch.safeParse({ onlineReferences: [{ title: 'unsafe', url: 'javascript:alert(1)' }] }).success, false)
    assert.equal(syllabusPatch.safeParse({ courseOutline: [1, 1].map(week => ({ week, ilos: 'Learn', contents: [] })) }).success, false)
  } finally { unregister() }
  assert.equal(currentEditor(), null)
  const original = { instance: randomUUID(), kind: 'syllabus' as const, label: 'Literal edit', data: { programOutcomes: ['Understand loops'], coursePolicy: ['Understand policy'], courseDescription: 'Understand curriculum' } }
  assert.deepEqual(literalEdit(original, 'Replace \"Understand\" with \"Explain\"', 'programOutcomes'), { programOutcomes: ['Explain loops'] })
  assert.equal(original.data.programOutcomes[0], 'Understand loops')
})

test('model tool proposals reject forged roles, invalid fields and edits outside the selected section', async () => {
  const input = operatorInput.parse({ operation: 'revise', message: 'Revise the grading system', viewRole: 'instructor', editor: { instance: randomUUID(), kind: 'syllabus', label: 'Test', data: { gradingSystem: 'Before' } }, section: 'gradingSystem' })
  let invoked = 0
  const model = (patch: unknown) => async () => { invoked++; return JSON.stringify(patch) }
  await assert.rejects(planValidatedTool(input, { id: 'student', role: 'student', local: false }, AbortSignal.timeout(1000), model({ gradingSystem: 'After' })), { status: 403 })
  assert.equal(invoked, 0)
  const identity: Identity = { id: 'instructor', role: 'instructor', local: false }
  await assert.rejects(planValidatedTool(input, identity, AbortSignal.timeout(1000), model({ status: 'active' })), { code: 'TOOL_OUTPUT_INVALID' })
  await assert.rejects(planValidatedTool(input, identity, AbortSignal.timeout(1000), model({ coursePolicy: ['Invented'] })), { code: 'TOOL_SCOPE_MISMATCH' })
  const valid = await planValidatedTool(input, identity, AbortSignal.timeout(1000), model({ gradingSystem: 'Proposed draft.' }))
  assert.deepEqual(valid, { patch: { gradingSystem: 'Proposed draft.' }, generated: true, requiresConfirmation: true })
  assert.equal(input.editor!.data.gradingSystem, 'Before')
})

test('local archive is private, idempotent, ordered, recallable and forgettable', async () => {
  const hosted = process.env.VERCEL
  delete process.env.VERCEL
  process.env.AI_VECTOR_STORE = 'local'
  process.env.AI_DATA_DIR = join(await mkdtemp(join(tmpdir(), 'edupulse-pulse-')), 'db')
  const owner: Identity = { id: 'pulse-owner', role: 'instructor', local: true }, other: Identity = { ...owner, id: 'other' }
  const thread = randomUUID(), userMessage = randomUUID()
  const command = (input: unknown) => executeConversation(owner, conversationCommand.parse(input))
  try {
    await command({ operation: 'create', id: thread, title: 'Programming syllabus' })
    const append = { operation: 'append', id: thread, messages: [{ id: userMessage, role: 'user', text: 'I prefer concise bullet points.' }, { id: randomUUID(), role: 'assistant', text: 'Programming syllabus outline draft. api_key=sk-testABCDEFGHIJKLMNOP123456' }] }
    await command(append); await command(append)
    let result = await readConversations(owner, thread)
    assert.equal(result.messages.length, 2); assert.equal(result.messages[0].id, userMessage)
    assert.match(result.messages[1].text, /redacted/); assert.doesNotMatch(result.messages[1].text, /ABCDEFGHIJKLMNOP/)
    assert.equal(result.memories.length, 1)
    assert.equal((await readConversations(other)).threads.length, 0)
    await assert.rejects(readConversations(other, thread), { status: 404 })
    assert.equal((await conversationRecall(other, 'recall programming')).matches.length, 0)
    assert.equal((await conversationRecall(owner, 'Can you recall our earlier programming discussion?')).matches.length, 1)
    await command({ operation: 'preferences', automaticMemory: false })
    await command({ operation: 'append', id: thread, messages: [{ id: randomUUID(), role: 'user', text: 'Please use detailed examples.' }] })
    assert.equal((await readConversations(owner)).memories.length, 1)
    await command({ operation: 'forget', id: result.memories[0].id })
    assert.equal((await readConversations(owner)).memories.length, 0)
    await command({ operation: 'append', id: thread, messages: [{ id: randomUUID(), role: 'user', text: 'Remember that I prefer Tagalog examples.' }] })
    assert.equal((await readConversations(owner)).memories.length, 1)
    await command({ operation: 'archive', id: thread, archived: true })
    assert.equal((await readConversations(owner)).threads[0].archived, true)
    const pg = await localDb()
    await pg.query(`INSERT INTO ep_pulse_messages(id,thread_id,owner_id,role,text) SELECT gen_random_uuid(),$1,$2,'user','Capacity fixture' FROM generate_series(1,496)`, [thread, owner.id])
    await assert.rejects(command({ operation: 'append', id: thread, messages: [{ id: randomUUID(), role: 'user', text: 'Overflow' }] }), { code: 'CONVERSATION_FULL' })
    await command({ operation: 'delete', id: thread })
    result = await readConversations(owner)
    assert.equal(result.threads.length, 0); assert.equal(result.memories.length, 0)
    assert.equal(preferenceCandidate('A student prefers concise bullet points.'), null)
    assert.equal(safeMemory('Remember student grades are 90'), false)
    await assert.rejects(command({ operation: 'remember', text: 'password=secret-value' }), { status: 400 })
  } finally { await (await localDb()).close(); if (hosted !== undefined) process.env.VERCEL = hosted }
})

test('Supabase migration enforces owner RLS, immutable transcripts, provenance and capacity', async () => {
  const pg = new PGlite()
  const a = randomUUID(), b = randomUUID(), thread = randomUUID(), message = randomUUID()
  try {
    await pg.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated;`)
    await pg.query('INSERT INTO auth.users VALUES($1),($2)', [a, b])
    await pg.exec(await readFile('supabase/migrations/20261024163740_pulse_conversations.sql', 'utf8'))
    await pg.exec(await readFile('supabase/migrations/20261024213422_pulse_history_privileges.sql', 'utf8'))
    await pg.exec(`SET ROLE authenticated; SET request.jwt.claim.sub='${a}'`)
    await pg.query('INSERT INTO edupulse_pulse_threads(id,owner_id,title) VALUES($1,$2,$3)', [thread, a, 'Private test'])
    await pg.query('INSERT INTO edupulse_pulse_messages(id,thread_id,owner_id,role,text) VALUES($1,$2,$3,$4,$5)', [message, thread, a, 'user', 'Programming syllabus'])
    await assert.rejects(pg.query('UPDATE edupulse_pulse_messages SET text=$1 WHERE id=$2', ['Altered', message]), /permission denied/)
    await pg.exec(`SET request.jwt.claim.sub='${b}'`)
    assert.equal((await pg.query('SELECT * FROM edupulse_pulse_messages')).rows.length, 0)
    assert.equal((await pg.query("SELECT * FROM edupulse_recall_pulse('programming')")).rows.length, 0)
    await assert.rejects(pg.query('INSERT INTO edupulse_pulse_memories(id,owner_id,text,source_message_id) VALUES($1,$2,$3,$4)', [randomUUID(), b, 'Cross owner', message]), /foreign key/)
    await assert.rejects(pg.query('INSERT INTO edupulse_pulse_threads(id,owner_id,title) VALUES($1,$2,$3)', [randomUUID(), a, 'Forbidden']), /row-level security/)
    await pg.exec(`SET request.jwt.claim.sub='${a}'`)
    assert.equal((await pg.query("SELECT * FROM edupulse_recall_pulse('programming OR nonexistent')")).rows.length, 1)
    await pg.query('INSERT INTO edupulse_pulse_memories(id,owner_id,text,source_message_id) VALUES($1,$2,$3,$4)', [randomUUID(), a, 'My preference', message])
    for (let i = 1; i < 100; i++) await pg.query('INSERT INTO edupulse_pulse_threads(id,owner_id,title) VALUES($1,$2,$3)', [randomUUID(), a, 'Capacity test'])
    await assert.rejects(pg.query('INSERT INTO edupulse_pulse_threads(id,owner_id,title) VALUES($1,$2,$3)', [randomUUID(), a, 'Over limit']), /limit reached/)
    await pg.query('DELETE FROM edupulse_pulse_threads WHERE id=$1', [thread])
    assert.equal((await pg.query('SELECT * FROM edupulse_pulse_memories')).rows.length, 0)
    await pg.exec('RESET ROLE; SET ROLE anon')
    await assert.rejects(pg.query('SELECT * FROM edupulse_pulse_messages'), /permission denied/)
  } finally { await pg.close() }
})
