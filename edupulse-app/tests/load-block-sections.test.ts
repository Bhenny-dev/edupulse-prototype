import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { semesterDatabase } from './semester-fixture'

const term = { academic_year: '2026-2027', semester: '1st Semester' }
const key = (code: string, block: string) => `${code}|${block}|1st Semester|2026-2027`
const row = (over: Record<string, unknown>): Record<string, any> => ({ course_title: 'Programming', page: 1, row: 1, subject_code: 'IT 101 A', source_title: 'Programming', source_instructor: 'Handover account 0', source_year: '2026-2027', source_semester: 'First Semester', degree: 'Masters', time: '7:30 - 10:00', days: 'TTH', room: 'A310', program: 'BSIT', units: 3, lecture: 2, lab: 1, hours: 5, computed_hours: 5, students: 35, expected_updated_at: null, ...term, ...over })

async function blockDatabase() {
  const fixture = await semesterDatabase()
  const maintenance = () => fixture.db.exec("RESET ROLE;SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','{}',false)")
  await maintenance()
  for (const name of ['20261118061807_historical_teaching_load_backfill', '20261118082233_instructor_load_details', '20261118090000_course_load_block_sections']) await fixture.db.exec(await readFile(`supabase/migrations/${name}.sql`, 'utf8'))
  const records = async (where: string) => { await maintenance(); return (await fixture.db.query<{ record_key: string; data: Record<string, any> }>(`SELECT record_key,data FROM public.edupulse_institutional_records WHERE kind='loads' AND ${where} ORDER BY record_key`)).rows }
  await fixture.as(2)
  for (const [code, title] of [['IT 101', 'Programming'], ['PROF ED 16', 'Technology for Teaching'], ['CP 2', 'Computer Programming 2']]) await fixture.command({ action: 'course.create', ...term, course: { code, title, units: 3 } })
  return { ...fixture, maintenance, records }
}

test('a reviewed teaching load saves each block section without a class list, and a reload adds nothing', async () => {
  const { db, ids, as, command, records } = await blockDatabase()
  try {
    const entries = [row({ course_code: 'IT 101', block: 'A', instructor_id: ids[0] }), row({ course_code: 'IT 101', row: 2, subject_code: 'IT 101 B', block: 'B', days: 'MW', instructor_id: ids[0] }),
      row({ course_code: 'PROF ED 16', course_title: 'Technology for Teaching', row: 3, subject_code: 'PROF ED 16', block: 'A', time: '10:00 - 11:30', instructor_id: ids[0] }),
      row({ course_code: 'PROF ED 16', course_title: 'Technology for Teaching', row: 4, subject_code: 'PROF ED 16', block: 'B', time: '1:00 - 2:30', instructor_id: ids[0] })]
    await command({ action: 'load.import_document', filename: 'load.pdf', reviewed: true, entries })
    const classes = await records(`data->>'LoadType'='class'`)
    assert.deepEqual(classes.map(r => [r.record_key, r.data.ScheduleDays, r.data.ScheduleTime, r.data.Room, r.data.AllocationSource, 'Students' in r.data]),
      [[key('IT 101', 'A'), 'TTH', '7:30 - 10:00', 'A310', 'dean-teaching-load', false], [key('IT 101', 'B'), 'MW', '7:30 - 10:00', 'A310', 'dean-teaching-load', false],
        [key('PROF ED 16', 'A'), 'TTH', '10:00 - 11:30', 'A310', 'dean-teaching-load', false], [key('PROF ED 16', 'B'), 'TTH', '1:00 - 2:30', 'A310', 'dean-teaching-load', false]])
    const [parent] = await records(`data->>'LoadType'='course' AND data->>'CourseCode'='IT 101'`)
    assert.equal(classes[0].data.ParentLoadKey, parent.record_key)
    assert.equal(parent.data.SourceRows.length, 2); assert.ok(parent.data.SourceRows.every((source: object) => !('block' in source)), 'the block label stays out of the retained source rows')
    const stamp = (await db.query<{ t: string }>('SELECT updated_at::text t FROM public.edupulse_institutional_records WHERE kind=$1 AND record_key=$2', ['loads', parent.record_key])).rows[0].t
    await as(2)
    await command({ action: 'load.import_document', filename: 'load.pdf', reviewed: true, entries: entries.filter(entry => entry.course_code === 'IT 101').map(entry => ({ ...entry, expected_updated_at: stamp })) })
    const [again] = await records(`data->>'LoadType'='course' AND data->>'CourseCode'='IT 101'`)
    assert.equal(again.data.SourceRows.length, 2, 'reloading the file does not duplicate schedules or units')
    assert.equal((await records(`data->>'LoadType'='class'`)).length, 4)
  } finally { await db.close() }
})

test('the Dean adds a block section with home-block and irregular students as the instructor would confirm them', async () => {
  const { db, ids, email, as, command, records, maintenance } = await blockDatabase()
  try {
    await command({ action: 'course-load.assign', ...term, course_code: 'IT 101', instructor_id: ids[0] })
    await command({ action: 'course-load.assign', ...term, course_code: 'IT 101', instructor_id: ids[1] })
    const parents = await records(`data->>'LoadType'='course' AND data->>'CourseCode'='IT 101'`)
    const mine = parents.find(r => r.data.InstructorID === ids[0])!, theirs = parents.find(r => r.data.InstructorID === ids[1])!
    for (const [i, number] of [[3, '2026-0003'], [5, '2026-0005']] as const) await db.query("INSERT INTO public.edupulse_students(student_number,user_id,email,surname,first_name,full_name,year_level,department,program) VALUES($1,$2,$3,'Learner','Sample','Sample Learner',1,'CIT','BSIT')", [number, ids[i], email(i)])
    await as(0)
    await assert.rejects(command({ action: 'block.add', assignment: mine.record_key, expected_instructor: ids[0], block: 'Z' }), { code: '42501' })
    await as(2)
    const added = await command({ action: 'block.add', assignment: mine.record_key, expected_instructor: ids[0], block: 'c', days: 'F', time: '1:00 - 4:00', room: 'Lab 2', students: [{ StudentID: '2026-0003' }, { Email: email(5) }] })
    assert.deepEqual(added, { key: key('IT 101', 'C'), block: 'C', students: 2 })
    assert.equal((await db.query<{ uid: string }>('SELECT auth.uid()::text uid')).rows[0].uid, ids[2], 'the Dean identity is restored after the class list is registered')
    const [block] = await records(`record_key='${key('IT 101', 'C')}'`)
    assert.equal(block.data.AllocationSource, 'dean-block-section'); assert.equal(block.data.ClassListAddedBy, ids[2]); assert.equal(block.data.ScheduleDays, 'F')
    assert.deepEqual(block.data.Students.map((s: { StudentID: string; Block: string }) => [s.StudentID, s.Block]).sort(), [['2026-0003', 'C'], ['2026-0005', 'C']])
    await maintenance()
    const workspace = (await db.query<{ data: { registrations: { blockSection: string; assignmentKey: string; students: unknown[] }[] } }>('SELECT data FROM public.edupulse_workspaces WHERE owner_id=$1', [ids[0]])).rows[0].data
    assert.deepEqual(workspace.registrations.map(r => [r.blockSection, r.assignmentKey, r.students.length]), [['C', mine.record_key, 2]], 'the class list is the instructor’s own registration')
    assert.equal((await db.query<{ n: number }>(`SELECT count(*)::int n FROM public.edupulse_academic_events WHERE actor_id=$1 AND title='Block class list added'`, [ids[2]])).rows[0].n, 1)
    await as(2)
    assert.deepEqual(await command({ action: 'block.add', assignment: mine.record_key, expected_instructor: ids[0], block: 'D' }), { key: key('IT 101', 'D'), block: 'D', students: 0 })
    await assert.rejects(command({ action: 'block.add', assignment: theirs.record_key, expected_instructor: ids[1], block: 'C' }), { code: '40001' })
    await assert.rejects(command({ action: 'block.add', assignment: mine.record_key, expected_instructor: ids[1], block: 'E' }), { code: '40001' })
  } finally { await db.close() }
})

test('existing course loads read from teaching-load files receive their block sections in schedule order', async () => {
  const { db, ids, as, command, records, maintenance } = await blockDatabase()
  try {
    await command({ action: 'load.import_document', filename: 'older.pdf', reviewed: true, entries: [row({ course_code: 'CP 2', course_title: 'Computer Programming 2', subject_code: 'CP 2', time: '1:00 - 2:30', instructor_id: ids[1] }), row({ course_code: 'CP 2', course_title: 'Computer Programming 2', row: 2, subject_code: 'CP 2 A', instructor_id: ids[1] }), row({ course_code: 'CP 2', course_title: 'Computer Programming 2', row: 3, subject_code: 'CP 2', time: '10:00 - 11:30', instructor_id: ids[1] })] })
    assert.equal((await records(`data->>'LoadType'='class'`)).length, 0)
    await as(2)
    await assert.rejects(db.query('SELECT edupulse_private.backfill_load_block_sections()'))
    await maintenance()
    assert.equal((await db.query<{ n: number }>('SELECT edupulse_private.backfill_load_block_sections() n')).rows[0].n, 3)
    assert.deepEqual((await records(`data->>'LoadType'='class'`)).map(r => [r.record_key, r.data.ScheduleTime, r.data.AllocationSource]),
      [[key('CP 2', 'A'), '7:30 - 10:00', 'teaching-load-backfill'], [key('CP 2', 'B'), '10:00 - 11:30', 'teaching-load-backfill'], [key('CP 2', 'C'), '1:00 - 2:30', 'teaching-load-backfill']])
    assert.equal((await db.query<{ n: number }>('SELECT edupulse_private.backfill_load_block_sections() n')).rows[0].n, 0, 'a second run changes nothing')
  } finally { await db.close() }
})
