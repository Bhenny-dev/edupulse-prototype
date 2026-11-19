import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { semesterDatabase } from './semester-fixture'

const term = { academic_year: '2026-2027', semester: '1st Semester' }
const DAY = 86400000
// The Monday two weeks before this week's Monday (Manila calendar): teaching weeks 1 and 2 are over, week 10 is ahead.
function mondayWeeksAgo(weeks: number) {
  const manila = new Date(Date.now() + 8 * 3600000), offset = (manila.getUTCDay() + 6) % 7
  return new Date(Date.UTC(manila.getUTCFullYear(), manila.getUTCMonth(), manila.getUTCDate()) - (offset + weeks * 7) * DAY).toISOString().slice(0, 10)
}

test('courseware follows each block class schedule from the Dean classes-start date, and a saved block schedule still wins', async () => {
  const { db, ids, email, as, command } = await semesterDatabase()
  const maintenance = () => db.exec("RESET ROLE;SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','{}',false)")
  const rpc = async (fn: string, input: object) => (await db.query<{ value: any }>(`SELECT public.${fn}($1) value`, [JSON.stringify(input)])).rows[0].value
  try {
    await maintenance()
    for (const name of ['20261118061807_historical_teaching_load_backfill', '20261118082233_instructor_load_details', '20261118090000_course_load_block_sections', '20261119010000_term_calendar_default_delivery']) await db.exec(await readFile(`supabase/migrations/${name}.sql`, 'utf8'))
    await as(2)
    await command({ action: 'course.create', ...term, course: { code: 'IT 101', title: 'Programming', units: 3 } })
    const row = (block: string, days: string, time: string, n: number) => ({ course_code: 'IT 101', course_title: 'Programming', block, page: 1, row: n, subject_code: `IT 101 ${block}`, source_title: 'Programming', source_instructor: 'Handover account 0', source_year: '2026-2027', source_semester: 'First Semester', degree: 'Masters', time, days, room: 'A322', program: 'BSIT', units: 3, lecture: 2, lab: 1, hours: 5, computed_hours: 5, students: 35, expected_updated_at: null, instructor_id: ids[0], ...term })
    await command({ action: 'load.import_document', filename: 'load.pdf', reviewed: true, entries: [row('A', 'MT', '7:30 - 10:00', 1), row('B', 'TTH', '2:00 - 4:30', 2)] })
    await maintenance()
    const parent = (await db.query<{ record_key: string }>("SELECT record_key FROM public.edupulse_institutional_records WHERE kind='loads' AND data->>'LoadType'='course'")).rows[0].record_key
    await db.query("INSERT INTO public.edupulse_students(student_number,user_id,email,surname,first_name,full_name,year_level,department,program) VALUES('2026-0003',$1,$2,'Learner','Sample','Sample Learner',1,'CIT','BSIT')", [ids[3], email(3)])
    await as(2)
    await command({ action: 'block.add', assignment: parent, expected_instructor: ids[0], block: 'A', students: [{ StudentID: '2026-0003' }] })

    // The instructor publishes week 1 and week 10 lessons in block-schedule mode without saving any block dates.
    await maintenance()
    const saved = (await db.query<{ revision: string; data: Record<string, unknown> }>('SELECT revision,data FROM public.edupulse_workspaces WHERE owner_id=$1', [ids[0]])).rows[0]
    const approved = Buffer.from('%PDF-1.4\nApproved syllabus\n%%EOF')
    const lesson = (week: number, title: string) => ({ syllabusId: 's-it101', week, type: 'material', status: 'checked', content: { title, sections: [{ heading: title, body: `${title} explained.` }] } })
    const snapshot = { ...saved.data, content: { first: lesson(1, 'Week one lesson'), later: lesson(10, 'Week ten lesson') }, syllabi: [{ id: 's-it101', courseCode: 'IT 101', courseTitle: 'Programming', status: 'active', courseInfo: { academicYear: '2026-2027', periodOffered: '1', noOfHours: '90 Hours' },
      approvedFile: { approvalAttested: true, name: 'approved.pdf', size: approved.length, sha256: createHash('sha256').update(approved).digest('hex'), base64: approved.toString('base64') }, courseOutline: [{ week: 1, contents: ['Variables'] }, { week: 10, contents: ['Loops'] }] }] }
    let revision = Number(saved.revision)
    await as(0)
    await db.query('SELECT public.edupulse_save_workspace($1,$2)', [revision++, JSON.stringify(snapshot)])
    for (const item of Object.values(snapshot.content)) Object.assign(item, { status: 'published', deliveryMode: 'block_schedule' })
    await assert.rejects(db.query('SELECT public.edupulse_save_workspace($1,$2)', [revision, JSON.stringify(snapshot)]), /Save a block-section opening date/, 'without a classes-start date nothing tells the course when to open')

    const start = mondayWeeksAgo(2)
    await assert.rejects(command({ action: 'term.calendar', ...term, classes_start: start, weeks: 18 }), { code: '42501' }, 'instructors do not set the calendar')
    await as(2)
    await assert.rejects(command({ action: 'term.calendar', ...term, classes_start: '2026-02-30', weeks: 18 }), { code: '22023' })
    await assert.rejects(command({ action: 'term.calendar', ...term, classes_start: start, weeks: 40 }), { code: '22023' })
    assert.deepEqual(await command({ action: 'term.calendar', ...term, classes_start: start, weeks: 18 }), { semester: '1st Semester', academic_year: '2026-2027', classes_start: start, weeks: 18 })
    await as(0)
    assert.deepEqual((await db.query<{ record_key: string }>("SELECT record_key FROM public.edupulse_institutional_records WHERE kind='term_calendar'")).rows.map(r => r.record_key), ['1st Semester|2026-2027'], 'the instructor reads the calendar')
    await db.query('SELECT public.edupulse_save_workspace($1,$2)', [revision++, JSON.stringify(snapshot)])

    // Block A meets Monday and Tuesday at 7:30: week 1 opened on the first Monday at 7:30 Manila time; week 10 is still ahead.
    await as(3)
    const delivered = async () => ((await db.query<{ value: any[] }>('SELECT public.edupulse_student_publications() value')).rows[0].value || [])
      .map(p => [p.title, p.delivery_state, p.delivery_open_at && new Date(p.delivery_open_at).toISOString(), Boolean(p.content)]).sort()
    const tenth = new Date(Date.parse(`${start}T07:30:00+08:00`) + 63 * DAY).toISOString()
    assert.deepEqual(await delivered(), [['Week one lesson', 'open', new Date(`${start}T07:30:00+08:00`).toISOString(), true], ['Week ten lesson', 'scheduled', tenth, false]])
    assert.deepEqual((await db.query<{ title: string }>('SELECT title FROM public.edupulse_publications ORDER BY title')).rows.map(r => r.title), ['Week one lesson'], 'only the opened week can be read')

    // G3: block B meets Tuesday and Thursday at 2:00, so the same lessons open for its students on Tuesday afternoons.
    await maintenance()
    await db.query("INSERT INTO public.edupulse_students(student_number,user_id,email,surname,first_name,full_name,year_level,department,program) VALUES('2026-0005',$1,$2,'Learner','Other','Other Learner',1,'CIT','BSIT')", [ids[5], email(5)])
    await as(2)
    await command({ action: 'block.add', assignment: parent, expected_instructor: ids[0], block: 'B', students: [{ StudentID: '2026-0005' }] })
    await as(5)
    const tuesday = (days: number) => new Date(Date.parse(`${start}T14:00:00+08:00`) + (days + 1) * DAY).toISOString()
    assert.deepEqual(await delivered(), [['Week one lesson', 'open', tuesday(0), true], ['Week ten lesson', 'scheduled', tuesday(63), false]])

    // G3: revising one delivered lesson makes a new version of that lesson only; the other lesson and the reading record stay.
    const publication = async (title: string) => { await maintenance(); return (await db.query<{ id: string; source_version: string }>('SELECT id,source_version FROM public.edupulse_publications WHERE title=$1', [title])).rows[0] }
    const firstLesson = await publication('Week one lesson'), tenthLesson = await publication('Week ten lesson')
    await as(3)
    await db.query("SELECT public.edupulse_academic_action($1,$2,'[]','open')", [firstLesson.id, firstLesson.source_version])
    for (const status of ['draft', 'checked', 'published']) {
      await maintenance()
      const current = (await db.query<{ revision: string; data: any }>('SELECT revision,data FROM public.edupulse_workspaces WHERE owner_id=$1', [ids[0]])).rows[0]
      const item = { ...current.data.content.first, status, content: { ...current.data.content.first.content, sections: [{ heading: 'Week one lesson', body: 'Week one lesson explained again, with an example.' }] } }
      await as(0)
      await db.query('SELECT public.edupulse_save_workspace($1,$2)', [Number(current.revision), JSON.stringify({ ...current.data, content: { ...current.data.content, first: item } })])
    }
    const revised = await publication('Week one lesson')
    assert.equal(revised.id, firstLesson.id)
    assert.notEqual(revised.source_version, firstLesson.source_version, 'the revised lesson is a new version')
    assert.deepEqual(await publication('Week ten lesson'), tenthLesson, 'the other lesson is untouched')
    assert.equal((await db.query<{ n: number }>('SELECT count(*)::int n FROM public.edupulse_material_access WHERE publication_id=$1', [firstLesson.id])).rows[0].n, 1, 'the student reading record stays')

    // A schedule the instructor saves for the block replaces the class schedule: week 1 now opens next month.
    await as(0)
    const later = new Date(Date.now() + 30 * DAY).toISOString().slice(0, 10)
    await rpc('edupulse_delivery_schedule', { operation: 'delivery-schedule', syllabus: 's-it101', block: 'A', revision: 0, windows: [{ week: 1, date: later, start: '07:30', end: '' }, { week: 10, date: later, start: '08:00', end: '' }] })
    await as(3)
    assert.deepEqual((await delivered()).map(([title, state]) => [title, state]), [['Week one lesson', 'scheduled'], ['Week ten lesson', 'scheduled']])
  } finally { await db.close() }
})
