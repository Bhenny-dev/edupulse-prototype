import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { semesterDatabase } from './semester-fixture'

const term = { academic_year: '2026-2027', semester: '1st Semester' }
const key = (code: string, block: string) => `${code}|${block}|1st Semester|2026-2027`

async function classroomDatabase() {
  const fixture = await semesterDatabase()
  const maintenance = () => fixture.db.exec("RESET ROLE;SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','{}',false)")
  await maintenance()
  for (const name of ['20261118061807_historical_teaching_load_backfill', '20261118082233_instructor_load_details', '20261118090000_course_load_block_sections', '20261123120000_class_codes_and_announcements']) await fixture.db.exec(await readFile(`supabase/migrations/${name}.sql`, 'utf8'))
  const rpc = async (name: string, command?: object) => (await fixture.db.query<{ r: any }>(`SELECT public.${name}(${command ? '$1' : ''}) r`, command ? [JSON.stringify(command)] : [])).rows[0].r
  const records = async (where: string) => { await maintenance(); return (await fixture.db.query<{ record_key: string; data: Record<string, any> }>(`SELECT record_key,data FROM public.edupulse_institutional_records WHERE kind='loads' AND ${where} ORDER BY record_key`)).rows }
  await fixture.as(2)
  await fixture.command({ action: 'course.create', ...term, course: { code: 'IT 101', title: 'Programming', units: 3 } })
  await fixture.command({ action: 'course-load.assign', ...term, course_code: 'IT 101', instructor_id: fixture.ids[0] })
  await maintenance()
  for (const [i, number] of [[3, '2026-0003'], [5, '2026-0005']] as const) await fixture.db.query("INSERT INTO public.edupulse_students(student_number,user_id,email,surname,first_name,full_name,year_level,department,program) VALUES($1,$2,$3,'Learner','Sample','Sample Learner',1,'CIT','BSIT')", [number, fixture.ids[i], fixture.email(i)])
  const [parent] = await records(`data->>'LoadType'='course' AND data->>'CourseCode'='IT 101'`)
  return { ...fixture, maintenance, rpc, records, parent }
}

test('an instructor makes a class code for a block; a registered student joins that class list once, and only through the code', async () => {
  const { db, ids, as, rpc, records, maintenance, parent } = await classroomDatabase()
  try {
    await as(0)
    const made = await rpc('edupulse_class_code_command', { action: 'create', assignment: parent.record_key, block: 'a' })
    assert.match(made.code, /^[A-HJKMNP-Z2-9]{7}$/); assert.equal(made.block, 'A'); assert.equal(made.created, true); assert.equal(made.block_added, true)
    const [block] = await records(`record_key='${key('IT 101', 'A')}'`)
    assert.equal(block.data.InstructorID, ids[0]); assert.equal(block.data.LoadType, 'class'); assert.equal(block.data.AllocationSource, 'instructor-class-code')
    await as(0)
    assert.equal((await rpc('edupulse_class_code_command', { action: 'create', assignment: parent.record_key, block: 'A' })).code, made.code, 'creating again returns the active code')
    assert.equal((await rpc('edupulse_class_code_command', { action: 'create', assignment: key('IT 101', 'A'), block: 'C' })).parent_key, parent.record_key, 'a block key resolves to its course load')
    await rpc('edupulse_class_code_command', { action: 'disable', assignment: parent.record_key, block: 'C' })
    await maintenance()
    const definition = async (fn: string) => (await db.query<{ d: string }>(`SELECT pg_get_functiondef('${fn}'::regprocedure) d`)).rows[0].d
    assert.match(await definition('edupulse_private.continue_load_teaching()'), /nullif\(a->>'path',''\) IS NOT NULL/, 'the instructor handover copies file paths only, never links')
    assert.match(await definition('edupulse_private.dean_inspect_load(text,text)'), /WHEN a->>'kind'='link'/, 'the Dean inspection keeps links')
    await as(0)
    await as(1)
    await assert.rejects(rpc('edupulse_class_code_command', { action: 'create', assignment: parent.record_key, block: 'C' }), { code: '42501' }, 'only the assigned instructor makes codes')
    await assert.rejects(rpc('edupulse_class_join', { action: 'lookup', code: made.code }), { code: '42501' }, 'an instructor account cannot join as a student')

    await as(3)
    const spoken = `${made.code.slice(0, 3).toLowerCase()} ${made.code.slice(3)}`
    const lookup = await rpc('edupulse_class_join', { action: 'lookup', code: spoken })
    assert.deepEqual([lookup.status, lookup.course_code, lookup.course_title, lookup.block, lookup.instructor_name, lookup.students, lookup.course_open], ['joinable', 'IT 101', 'Programming', 'A', 'Handover account 0', 0, false])
    await maintenance()
    assert.equal((await db.query<{ n: number }>('SELECT count(*)::int n FROM edupulse_private.class_joins')).rows[0].n, 0, 'a lookup changes nothing')
    await as(3)
    const joined = await rpc('edupulse_class_join', { action: 'join', code: made.code })
    assert.deepEqual([joined.status, joined.students, joined.course_open], ['joined', 1, false])
    assert.equal((await db.query<{ uid: string }>('SELECT auth.uid()::text uid')).rows[0].uid, ids[3], 'the student identity is restored after registering')
    assert.equal((await rpc('edupulse_class_join', { action: 'join', code: made.code })).status, 'member', 'joining again adds nobody twice')
    await maintenance()
    const workspace = async () => (await db.query<{ revision: string; data: any }>('SELECT revision,data FROM public.edupulse_workspaces WHERE owner_id=$1', [ids[0]])).rows[0]
    assert.deepEqual((await workspace()).data.registrations.map((r: any) => [r.blockSection, r.assignmentKey, r.students.map((s: any) => s.StudentID)]), [['A', parent.record_key, ['2026-0003']]], 'the student is on the instructor’s own class list')
    const events = (await db.query<{ actor_id: string; title: string }>("SELECT actor_id::text,title FROM public.edupulse_academic_events WHERE kind='enrollments' ORDER BY created_at")).rows
    assert.deepEqual(events.filter(e => /class list|Joined/.test(e.title)).map(e => [e.actor_id, e.title]), [[ids[3], 'Joined a class with its code']], 'the join is recorded under the student, not as an instructor confirmation')

    await as(0)
    const replaced = await rpc('edupulse_class_code_command', { action: 'regenerate', assignment: parent.record_key, block: 'A' })
    assert.notEqual(replaced.code, made.code)
    const second = await rpc('edupulse_class_code_command', { action: 'create', assignment: parent.record_key, block: 'B' })
    await as(3)
    await assert.rejects(rpc('edupulse_class_join', { action: 'lookup', code: made.code }), (error: any) => error.code === '22023' && /turned off or replaced/.test(error.message))
    assert.equal((await rpc('edupulse_class_join', { action: 'lookup', code: replaced.code })).status, 'member', 'a new code keeps the students who joined')
    assert.deepEqual([(await rpc('edupulse_class_join', { action: 'lookup', code: second.code })).status, (await rpc('edupulse_class_join', { action: 'lookup', code: second.code })).other_block], ['other_block', 'A'])
    await assert.rejects(rpc('edupulse_class_join', { action: 'join', code: second.code }), (error: any) => error.code === '22023' && /already in IT 101 block A/.test(error.message), 'a student in block A is not moved by another block’s code')
    await assert.rejects(rpc('edupulse_class_join', { action: 'lookup', code: 'ABC' }), { code: '22023' })
    await assert.rejects(rpc('edupulse_class_join', { action: 'lookup', code: replaced.code === 'ZZZZZZZ' ? 'YYYYYYY' : 'ZZZZZZZ' }), (error: any) => /No class uses this code/.test(error.message))
    await as(5)
    assert.equal((await rpc('edupulse_class_join', { action: 'join', code: second.code })).status, 'joined')
    await as(0)
    assert.equal((await rpc('edupulse_class_code_command', { action: 'disable', assignment: parent.record_key, block: 'B' })).disabled, true)
    const read = await rpc('edupulse_class_codes')
    assert.deepEqual(read.codes.map((c: any) => [c.block, c.code]), [['A', replaced.code]], 'a turned-off code is no longer listed')
    assert.deepEqual(read.joins.map((j: any) => j.student_number).sort(), ['2026-0003', '2026-0005'])
    await as(5)
    await assert.rejects(rpc('edupulse_class_join', { action: 'lookup', code: second.code }), { code: '22023' })
    await as(3)
    const mine = await rpc('edupulse_class_codes')
    assert.deepEqual(mine.codes, [], 'students read no codes')
    assert.deepEqual(mine.joins.map((j: any) => [j.course_code, j.course_title, j.block, j.instructor_name]), [['IT 101', 'Programming', 'A', 'Handover account 0']], 'a student sees the class they joined while it waits for its syllabus')
    // Removed from the class list by the instructor, the joined class no longer shows.
    await maintenance()
    const current = await workspace()
    await as(0)
    await db.query('SELECT public.edupulse_save_workspace($1,$2)', [Number(current.revision), JSON.stringify({ ...current.data, registrations: current.data.registrations.map((r: any) => r.blockSection === 'A' ? { ...r, students: [] } : r) })])
    await as(3)
    assert.deepEqual((await rpc('edupulse_class_codes')).joins, [])
  } finally { await db.close() }
})

test('announcements stay in the instructor’s assigned course and reach only enrolled students of the named block', async () => {
  const { db, ids, as, rpc, maintenance, parent } = await classroomDatabase()
  try {
    await as(0)
    const a = await rpc('edupulse_class_code_command', { action: 'create', assignment: parent.record_key, block: 'A' })
    const b = await rpc('edupulse_class_code_command', { action: 'create', assignment: parent.record_key, block: 'B' })
    await as(3); await rpc('edupulse_class_join', { action: 'join', code: a.code })
    await as(5); await rpc('edupulse_class_join', { action: 'join', code: b.code })
    await as(0)
    const post = (over: object) => rpc('edupulse_announcement_command', { action: 'save', course_code: 'IT 101', ...term, title: 'Welcome to IT 101', body: 'Bring your laptop on Monday.', ...over })
    const welcome = await post({ attachments: [{ url: 'https://docs.google.com/presentation/d/abc/edit', title: 'Orientation slides', provider: 'google-slides' }] })
    assert.deepEqual(welcome.attachments, [{ kind: 'link', url: 'https://docs.google.com/presentation/d/abc/edit', title: 'Orientation slides', provider: 'google-slides' }])
    assert.equal('instructor_id' in welcome, false)
    const onlyB = await post({ title: 'Block B room change', block: 'b' })
    assert.equal(onlyB.block, 'B')
    const weekTwo = await post({ title: 'Week 2 reading', week: 2 })
    assert.equal(weekTwo.week, 2)
    await assert.rejects(post({ attachments: [{ url: 'javascript:alert(1)' }] }), { code: '22023' })
    await assert.rejects(post({ block: 'Z' }), { code: '22023' }, 'a block that is not the instructor’s is refused')
    await assert.rejects(post({ title: '' }), { code: '22023' })
    await as(1)
    await assert.rejects(post({}), { code: '42501' }, 'an instructor without this course load cannot post in it')
    await assert.rejects(rpc('edupulse_announcement_command', { action: 'delete', id: welcome.id }), { code: '22023' }, 'another instructor cannot remove it')
    await as(3)
    await assert.rejects(post({}), { code: '42501' })
    assert.deepEqual(await rpc('edupulse_class_announcements'), [], 'without the syllabus there is no course yet, so nothing is visible')

    // The instructor saves the syllabus: the class lists become enrollments and the announcements reach them.
    await maintenance()
    const saved = (await db.query<{ revision: string; data: Record<string, unknown> }>('SELECT revision,data FROM public.edupulse_workspaces WHERE owner_id=$1', [ids[0]])).rows[0]
    const approved = Buffer.from('%PDF-1.4\nApproved syllabus\n%%EOF')
    await as(0)
    await db.query('SELECT public.edupulse_save_workspace($1,$2)', [Number(saved.revision), JSON.stringify({ ...saved.data, syllabi: [{ id: 's-it101', courseCode: 'IT 101', courseTitle: 'Programming', status: 'active', courseInfo: { academicYear: '2026-2027', periodOffered: '1' },
      approvedFile: { approvalAttested: true, name: 'approved.pdf', size: approved.length, sha256: createHash('sha256').update(approved).digest('hex'), base64: approved.toString('base64') } }] })])
    const titles = async (i: number) => { await as(i); return (await rpc('edupulse_class_announcements')).map((item: any) => item.title).sort() }
    assert.deepEqual(await titles(3), ['Week 2 reading', 'Welcome to IT 101'])
    assert.deepEqual(await titles(5), ['Block B room change', 'Week 2 reading', 'Welcome to IT 101'])
    await as(3)
    const [first] = await rpc('edupulse_class_announcements')
    assert.ok(first.course_id, 'each announcement names the student’s course'); assert.equal('instructor_id' in first, false)
    assert.equal((await rpc('edupulse_class_join', { action: 'lookup', code: a.code })).course_open, true, 'once the syllabus exists the joined class opens')
    await as(0)
    assert.equal((await rpc('edupulse_class_announcements')).length, 3, 'the instructor reads their own announcements')
    await rpc('edupulse_announcement_command', { action: 'delete', id: welcome.id })
    assert.deepEqual(await titles(5), ['Block B room change', 'Week 2 reading'])
    await as(2)
    assert.deepEqual(await rpc('edupulse_class_announcements'), [], 'other roles read none through this view')
  } finally { await db.close() }
})
