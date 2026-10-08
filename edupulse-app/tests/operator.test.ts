import test from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { mergeStudents, parseRoster, studentKey } from '../src/utils/rosterParser.js'
import { courseCatalog, findCourseMentions, pageFor, planOperator, rankCourses, refineCourses, searchQuery, searchRecords, syllabusReference } from '../src/agents/operator.js'
// The real BSIT curriculum; mockData.js is plain data and is not type-checked.
const { CURRICULUM_COURSES } = await import(String('../src/data/mockData.js')) as { CURRICULUM_COURSES: { code: string; title: string; description: string; programOutcomes: string[] }[] }
import { extractUpload } from '../server/ingest/prepare.js'

const signal = () => AbortSignal.timeout(30000)
// Invented names for tests only; no real student records.
const csv = `StudentID,Name,Email,YearLevel,Block
2026-00101,Ana T. Ramos,ana.ramos@example.edu,1,BSIT-1A
2026-00102,"Cruz, Ben L.",ben.cruz@example.edu,1,BSIT-1A
2026-00103,Carla Mendoza,carla.mendoza@example.edu,1,BSIT-1A
,,,,
2026-00101,Ana T. Ramos,ana.ramos@example.edu,1,BSIT-1A`

test('a class list is read from CSV with names, IDs, emails and the block; blanks and duplicates are reported', () => {
  const roster = parseRoster(csv, 'IT102_BSIT1A.csv')!
  assert.equal(roster.students.length, 3)
  assert.deepEqual(roster.students[1], { StudentID: '2026-00102', Name: 'Ben L. Cruz', Email: 'ben.cruz@example.edu', YearLevel: '1', Block: 'BSIT-1A' })
  assert.equal(roster.block, 'BSIT-1A')
  assert.equal(roster.duplicates, 1)
  assert.match(roster.warnings.join(' '), /duplicate/)
})

test('class lists with separate name columns, tabs or plain numbered lines are read; ordinary documents are not class lists', () => {
  const split = parseRoster('Student No\tLast Name\tFirst Name\tMiddle Initial\tSection\n001\tRamos\tAna\tT\tBSIT 2B\n002\tCruz\tBen\tL\tBSIT 2B', 'list.txt')!
  assert.deepEqual(split.students.map(s => s.Name), ['Ana T. Ramos', 'Ben L. Cruz'])
  assert.equal(split.block, 'BSIT-2B')
  const lines = parseRoster('BSIT-3A Class List\n1. 2026-00201 Dana Flores dana.flores@example.edu\n2. 2026-00202 Eli Navarro\n3. 2026-00203 Fe Santos', 'classlist.pdf')!
  assert.equal(lines.students.length, 3)
  assert.equal(lines.students[0].StudentID, '2026-00201')
  assert.equal(lines.students[0].Email, 'dana.flores@example.edu')
  assert.equal(parseRoster('Loops repeat statements. A for loop runs a fixed number of times.\nA while loop checks its condition first.', 'notes.txt'), null)
  assert.equal(parseRoster('Component,Weight\nQuizzes,30%\nExams,70%', 'grading.csv'), null)
})

test('merging a class list keeps registered students once and recognises them by ID, email or name', () => {
  const first = parseRoster(csv, 'a.csv')!.students
  const second = [{ StudentID: '', Name: 'Ana T. Ramos', Email: '', YearLevel: '1', Block: 'BSIT-1A' }, { StudentID: '2026-00104', Name: 'Gio Bautista', Email: '', YearLevel: '1', Block: 'BSIT-1A' }]
  const merged = mergeStudents(first, second)
  assert.equal(merged.added, 1); assert.equal(merged.already, 1); assert.equal(merged.students.length, 4)
  // Same name, different student IDs: two different students.
  const twins = mergeStudents([{ StudentID: 'A-1', Name: 'Jo Cruz', Email: '', YearLevel: '', Block: '' }], [{ StudentID: 'A-2', Name: 'Jo Cruz', Email: '', YearLevel: '', Block: '' }])
  assert.equal(twins.added, 1)
  assert.notEqual(studentKey(twins.students[0]), studentKey(twins.students[1]))
})

test('Excel workbooks are read in the sandbox as comma-separated rows and become class lists', async () => {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
  zip.file('xl/workbook.xml', '<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="BSIT-1A" sheetId="1" r:id="rId1"/><sheet name="Hidden" sheetId="2" state="hidden" r:id="rId2"/></sheets></workbook>')
  zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0"?><Relationships><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="worksheet" Target="worksheets/sheet2.xml"/></Relationships>')
  zip.file('xl/sharedStrings.xml', '<?xml version="1.0"?><sst><si><t>Student ID</t></si><si><t>Name</t></si><si><t>Ana T. Ramos</t></si><si><t>Ben L. Cruz</t></si><si><r><t>Carla </t></r><r><t>Mendoza</t></r></si></sst>')
  const row = (n: number, cells: string) => `<row r="${n}">${cells}</row>`
  zip.file('xl/worksheets/sheet1.xml', `<?xml version="1.0"?><worksheet><sheetData>${row(1, '<c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c>')}${row(2, '<c r="A2" t="inlineStr"><is><t>2026-00101</t></is></c><c r="B2" t="s"><v>2</v></c>')}${row(3, '<c r="A3"><v>202600102</v></c><c r="B3" t="s"><v>3</v></c>')}${row(4, '<c r="A4"><v>202600103</v></c><c r="B4" t="s"><v>4</v></c>')}</sheetData></worksheet>`)
  zip.file('xl/worksheets/sheet2.xml', `<?xml version="1.0"?><worksheet><sheetData>${row(1, '<c r="A1" t="inlineStr"><is><t>secret</t></is></c>')}</sheetData></worksheet>`)
  const bytes = new Uint8Array(await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }))
  const report = await extractUpload(bytes, 'IT 102 BSIT-1A.xlsx', signal())
  assert.equal(report.kind, 'xlsx')
  assert.match(report.text, /^## BSIT-1A\nStudent ID,Name\n2026-00101,Ana T\. Ramos/)
  assert.doesNotMatch(report.text, /secret/)
  const roster = parseRoster(report.text, 'IT 102 BSIT-1A.xlsx')!
  assert.deepEqual(roster.students.map(s => s.Name), ['Ana T. Ramos', 'Ben L. Cruz', 'Carla Mendoza'])
  await assert.rejects(extractUpload(bytes, 'list.docx', signal()), (error: { code?: string }) => error.code === 'TYPE_MISMATCH')
})

const syllabus = { id: 'syl-1', courseCode: 'IT 102', courseTitle: 'Computer Programming 1', status: 'active', version: 2, lastUpdated: '2026-10-01', instructorId: 'u1',
  courseOutline: [
    { week: 1, ilos: 'Explain how programs run', contents: ['Introduction to programming', 'Algorithms and flowcharts'] },
    { week: 2, ilos: 'Use variables and data types', contents: ['Variables', 'Data types', 'Operators'] },
    { week: 3, ilos: 'Write selection and repetition statements', contents: ['Conditional statements', 'Loops: for, while'] },
    { week: 9, ilos: '', contents: [], assessments: 'Midterm Examination' },
  ] }
const catalog = courseCatalog({ curriculum: CURRICULUM_COURSES, syllabi: [syllabus], registrations: [], role: 'instructor', userId: 'u1' })

test('courses are recognised by code in any spacing or by title', () => {
  assert.deepEqual(findCourseMentions('register these to it-102 please', catalog).map(c => c.code), ['IT 102'])
  assert.deepEqual(findCourseMentions('notes for Computer Programming 1', catalog).map(c => c.code), ['IT 102'])
  assert.equal(findCourseMentions('item 1022 is unrelated', catalog).length, 0)
})

test('a material is matched to its course with the words and syllabus weeks that support the match', async () => {
  const notes = 'Lecture notes. A loop repeats statements. The for loop and the while loop are repetition statements. Conditional statements choose a path. Variables store values of a data type.'
  const ranked = rankCourses(notes, catalog)
  assert.equal(ranked[0]?.code, 'IT 102')
  assert.ok(ranked[0]!.matched.some(m => /^Week \d topics$/.test(m.where)), JSON.stringify(ranked[0]!.matched))
  // A course named in the file name wins over word overlap.
  assert.equal(rankCourses('Balance sheets and journal entries.', catalog, { fileName: 'IT 102 handout.pdf' })[0]?.strength, 'named')
  // The embedding model reorders the shortlist when it is available, and is skipped when it fails.
  const refined = await refineCourses(notes, ranked, catalog, async (_left: string[], right: string[]) => [right.map((_, i) => i === right.length - 1 ? 0.9 : 0.1)], signal())
  assert.equal(refined.method, 'meaning (embeddings) and keyword match')
  assert.equal((await refineCourses(notes, ranked, catalog, async () => { throw new Error('offline') }, signal())).method, 'keyword match')
  // Requests stay within the similarity action's limits: one excerpt of 800 characters, profiles of 2,000.
  await refineCourses(notes.repeat(40), rankCourses(notes, catalog, { limit: 10, floor: 0 }), catalog, async (left: string[], right: string[]) => {
    assert.ok(left.length === 1 && left[0]!.length <= 800 && right.length <= 12 && right.every(r => r.length <= 2000))
    return [right.map(() => 0.2)]
  }, signal())
})

test('a course syllabus becomes a cited reference with its outline', () => {
  const ref = syllabusReference(catalog.find(c => c.code === 'IT 102')!)!
  assert.equal(ref.title, 'IT 102 syllabus (your workspace)')
  assert.match(ref.text, /Week 3: topics Conditional statements; Loops: for, while\. Learning outcomes: Write selection and repetition statements\./)
  assert.match(ref.text, /Week 9: Midterm Examination/)
})

// Proposals are a union; the tests read the fields of the first one directly.
const first = (plan: { proposals: unknown[] }) => plan.proposals[0] as Record<string, unknown>

test('the Operator proposes confirmable actions and never registers without an attachment', () => {
  const roster = { title: 'list.csv', fileName: 'list.csv', text: csv, roster: parseRoster(csv, 'list.csv'), detectedCourse: '' }
  const register = planOperator({ message: 'register these students to IT 102', attachments: [roster], role: 'instructor', catalog })
  assert.deepEqual(register.proposals.map(p => p.type), ['register'])
  assert.equal(first(register).courseCode, 'IT 102'); assert.equal(register.chat, false)
  assert.equal(planOperator({ message: 'register these students', attachments: [roster], role: 'student', catalog }).proposals[0].type, 'notice')
  const asked = planOperator({ message: 'is Ben Cruz in this list?', attachments: [roster], role: 'instructor', catalog })
  assert.deepEqual(asked.proposals.map(p => p.type), ['search'])
  assert.equal(first(asked).query, 'Ben Cruz')
  const noFile = planOperator({ message: 'Register my students in IT 102', role: 'instructor', catalog })
  assert.equal(noFile.proposals[0].type, 'notice'); assert.equal(first(noFile).attach, true); assert.equal(noFile.chat, false)

  const material = { title: 'loops.pdf', fileName: 'loops.pdf', text: 'Loops and conditional statements.' }
  assert.deepEqual(planOperator({ message: 'which course is this for?', attachments: [material], role: 'student', catalog }).proposals.map(p => p.type), ['file'])
  const empty = planOperator({ message: '', attachments: [material], role: 'student', catalog })
  assert.deepEqual(empty.proposals.map(p => p.type), ['file', 'study']); assert.equal(empty.chat, false)
  const study = planOperator({ message: 'make a reviewer from this', attachments: [material], role: 'student', catalog })
  assert.equal(study.chat, true); assert.equal(study.task, 'draft'); assert.equal(first(study).after, true)

  const week = planOperator({ message: 'Generate week 3 materials for IT 102', role: 'instructor', catalog })
  assert.deepEqual(week.proposals[0], { type: 'generate-week', courseCode: 'IT 102', week: 3, request: 'Generate week 3 materials for IT 102' })
  assert.equal(planOperator({ message: 'Generate week 3 materials for IT 102', role: 'student', catalog }).proposals.length, 0)
  assert.equal(planOperator({ message: 'Find books about loops for my course', role: 'instructor', catalog }).chat, true)
})

test('navigation requests open only the pages a role may see', () => {
  assert.equal(pageFor('take me to the scoring sheet', 'instructor')?.path, '/student-monitoring')
  assert.equal(pageFor('open my courses', 'student')?.path, '/courseware')
  assert.equal(pageFor('open my courses', 'instructor')?.path, '/syllabus?tab=register')
  assert.equal(pageFor('go to course loading', 'student')?.denied, true)
  assert.equal(pageFor('what is a loop?', 'student'), null)
})

test('search finds students, courses, courseware and documents and says where each comes from', () => {
  assert.equal(searchQuery('Is Maria Reyes registered?'), 'Maria Reyes')
  assert.equal(searchQuery('find a student named Ben Cruz in my courses'), 'Ben Cruz')
  const registrations = [{ id: 'r1', courseCode: 'IT 102', blockSection: 'BSIT-1A', studentCount: 3, status: 'active', uploadedBy: 'u1', fileName: 'list.csv', students: parseRoster(csv, 'list.csv')!.students }]
  const content = { c1: { title: 'Loops and Repetition', week: 3, type: 'material', status: 'draft', syllabusId: 'syl-1' } }
  const documents = [{ id: 'd1', title: 'IT 102 · Loop exercises', file_name: 'loops.pdf', chunks: 4, quality: { course: 'IT 102' } }]
  const hits = searchRecords('Ben Cruz', { role: 'instructor', userId: 'u1', catalog, registrations, syllabi: [syllabus], content, documents })
  assert.equal(hits[0]?.group, 'Registered students'); assert.equal(hits[0]?.source, 'list.csv'); assert.equal(hits[0]?.path, '/syllabus?tab=register')
  // Another instructor's class list is not searched.
  assert.equal(searchRecords('Ben Cruz', { role: 'instructor', userId: 'u2', catalog, registrations }).length, 0)
  const loop = searchRecords('loop', { role: 'instructor', userId: 'u1', catalog, registrations, syllabi: [syllabus], content, documents })
  assert.deepEqual(loop.map(h => h.group), ['Courseware', 'Knowledge library'])
  assert.equal(loop[0]?.path, '/courseware?tab=builder&course=syl-1&week=3')
  assert.equal(searchRecords('it102', { role: 'student', userId: 's1', catalog })[0]?.title, 'IT 102 — Computer Programming 1')
  // Students never see unpublished drafts.
  assert.equal(searchRecords('loops', { role: 'student', userId: 's1', catalog, content, syllabi: [syllabus] }).length, 0)
})

test('registering the same course and block twice merges the lists, and Undo restores the previous state', async () => {
  const { applyRegistration, undoRegistration } = await import('../src/utils/rosterParser.js')
  const students = parseRoster(csv, 'list.csv')!.students
  const first = applyRegistration([], { courseCode: 'IT 102', blockSection: 'BSIT-1A', students, fileName: 'list.csv', uploadedBy: 'u1' })
  assert.equal(first.registrations.length, 1); assert.equal(first.added, 3)
  const second = applyRegistration(first.registrations, { courseCode: 'IT 102', blockSection: 'BSIT-1A', students: [...students.slice(0, 1), { StudentID: '2026-00109', Name: 'Hana Lim', Email: '', YearLevel: '1', Block: 'BSIT-1A' }], fileName: 'late.csv', uploadedBy: 'u1' })
  assert.equal(second.registrations.length, 1); assert.equal(second.added, 1); assert.equal(second.already, 1)
  assert.equal(second.registration.studentCount, 4)
  assert.deepEqual(undoRegistration(second.registrations, second), first.registrations)
  assert.deepEqual(undoRegistration(first.registrations, first), [])
  // Another instructor's registration for the same block is separate.
  assert.equal(applyRegistration(first.registrations, { courseCode: 'IT 102', blockSection: 'BSIT-1A', students, fileName: 'x.csv', uploadedBy: 'u2' }).registrations.length, 2)
})
