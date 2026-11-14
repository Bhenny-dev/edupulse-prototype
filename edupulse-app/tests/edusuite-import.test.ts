import test from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { delimitedGrid, htmlGrid, xlsxGrid, normalizeBlock, normalizeCourseCode, splitName, planStudentList, planCourseLoads, matchInstructor, initialStudentPassword, CIT_PROGRAMS } from '../src/components/academic/eduSuiteImport'

const courses = [{ code: 'IT 102', title: 'Programming foundations' }, { code: 'IT 202', title: 'Data structures' }]
const loads = [{ key: 'IT 102|BSIT-1A|', code: 'IT 102', block: 'BSIT-1A', instructorId: 't1', instructorName: 'Alex Sample' }]
const instructors = [
  { id: 't1', name: 'Alex Sample', email: 'sample@edupulse.invalid', status: 'active', employee_id: 'E-01' },
  { id: 't2', name: 'Morgan Dela Cruz', email: 'delacruz@edupulse.invalid', status: 'active' },
  { id: 't3', name: 'Casey Dela Cruz', email: 'casey@edupulse.invalid', status: 'active' },
  { id: 't4', name: 'Riley Suspended', email: 'riley@edupulse.invalid', status: 'suspended' },
]

test('EduSuite student lists find the header under title rows and separate irregular students from blocks', () => {
  const grid = delimitedGrid([
    'King\'s College of the Philippines,,,,,',
    'Class List,,,,,',
    'Semester: 1st Semester,,,,,',
    'Student No.,Name,Year Level,Section,Subject Code,Status',
    '2026-0001,"Ramos, Ana B.",1st Year,BSIT 1-A,IT102,Regular',
    '2026-0002,"Lim, Ben",1,bsit1a,IT 102,',
    '2025-0100,"Cruz, Carla",2nd Year,BSIT 1-A,IT 102,Irregular',
    '2024-0200,"Reyes, Dan",3,BSIT 2-A,IT 202,',
    '2026-0003,"Tan, Eve",1,BSIT-1A,IT 102,',
    '2026-0003,"Tan, Eve",1,BSIT-1B,IT 202,',
    'Total: 6,,,,,',
    '2026#09,"Bad, Row",1,BSIT-1A,IT 102,',
  ].join('\n'))
  const plan = planStudentList(grid, { courses, blocks: ['BSIT-1A', 'BSIT-2A'], students: [{ id: 'u1', student_number: '2026-0002', name: 'Ben Lim', status: 'suspended' }], loads })
  assert.equal(plan.header, 4)
  const by = Object.fromEntries(plan.students.map(s => [s.student_number, s]))
  assert.deepEqual([by['2026-0001'].placement, by['2026-0001'].block, by['2026-0001'].middle_name, by['2026-0001'].program], ['block', 'BSIT-1A', 'B', CIT_PROGRAMS[0]])
  assert.deepEqual([by['2026-0002'].block, by['2026-0002'].account], ['BSIT-1A', 'suspended'])
  assert.equal(by['2025-0100'].placement, 'irregular')
  assert.match(by['2025-0100'].reasons.join(' '), /Marked irregular/)
  assert.deepEqual(by['2025-0100'].courses, [{ course_code: 'IT 102', course_title: 'Programming foundations', block: 'BSIT-1A', instructor: 'Alex Sample' }], 'irregular classes show the loaded instructor')
  assert.match(by['2024-0200'].reasons.join(' '), /Year 3 student in a Year 2 block/)
  assert.match(by['2026-0003'].reasons.join(' '), /BSIT-1A and BSIT-1B/)
  assert.equal(by['2026-0003'].courses.length, 2)
  assert.deepEqual(plan.rejected, [{ row: 12, reason: 'Student number "2026#09" is not valid' }], 'totals are skipped; malformed numbers are reported')
  assert.deepEqual(plan.blocks, [{ block: 'BSIT-1A', count: 2, existing: 0 }])
  assert.equal(by['2026-0001'].email, '2026-0001@gmail.com')
  assert.equal(by['2026-0001'].password, 'ramos@123')
})

test('block, course and name forms normalise the way EduSuite writes them', () => {
  assert.deepEqual(['BSIT 1-A', 'bsit1a', '1-A', 'IT-1A', 'BSCS 2-b', 'IRREG', ''].map(b => normalizeBlock(b)), ['BSIT-1A', 'BSIT-1A', 'BSIT-1A', 'BSIT-1A', 'BSCS-2B', '', ''])
  assert.equal(normalizeBlock('bsit 1a', ['BSIT-1A']), 'BSIT-1A')
  assert.deepEqual(['IT102', 'it 102', 'GE-5', 'NSTP 1'].map(normalizeCourseCode), ['IT 102', 'IT 102', 'GE 5', 'NSTP 1'])
  assert.deepEqual(splitName('Dela Cruz, Juan P.'), { surname: 'Dela Cruz', first_name: 'Juan', middle_name: 'P' })
  assert.deepEqual(splitName('Juan P. Santos'), { surname: 'Santos', first_name: 'Juan', middle_name: 'P' })
  assert.equal(initialStudentPassword('Peña', 'Ana'), 'pena@123')
})

test('faculty load files match instructors without guessing and flag what cannot be loaded', () => {
  const grid = delimitedGrid(['Faculty Load\t\t\t', 'Instructor\tSubject Code\tDescriptive Title\tSection', 'Mr. Alex Sample\tIT102\t\tBSIT 1-A', 'Sample, Alex\tIT 202\t\tBSIT 2-A', 'Dela Cruz\tIT 102\t\tBSIT 1-B',
    'Morgan Dela Cruz\tIT 301\tSystems analysis\tBSIT 3-A', 'Riley Suspended\tIT 102\t\tBSIT 1-C', 'Alex Sample\tIT 999\t\tBSIT 1-A', 'Alex Sample\tIT 202\t\t'].join('\n'))
  const plan = planCourseLoads(grid, { instructors, courses, loads, blocks: ['BSIT-1A'] })
  const rows = plan.loads.map(l => [l.course_code, l.block, l.instructor?.id || '', l.status, l.problem || ''])
  assert.deepEqual(rows, [
    ['IT 102', 'BSIT-1A', 't1', 'unchanged', ''],
    ['IT 202', 'BSIT-2A', 't1', 'new', ''],
    ['IT 102', 'BSIT-1B', '', 'problem', 'Several instructors match "Dela Cruz"'],
    ['IT 301', 'BSIT-3A', 't2', 'new', ''],
    ['IT 102', 'BSIT-1C', 't4', 'problem', 'Riley Suspended is suspended'],
    ['IT 999', 'BSIT-1A', 't1', 'problem', 'IT 999 is not in the course list and has no title'],
    ['IT 202', '', 't1', 'problem', 'Block section missing'],
  ])
  assert.equal(matchInstructor('anyone', instructors, { email: 'CASEY@edupulse.invalid' }).instructor?.id, 't3')
  assert.equal(matchInstructor('', instructors, { employeeId: 'e-01' }).instructor?.id, 't1')
})

test('Excel workbooks and HTML-table downloads read as the same grid', async () => {
  const zip = new JSZip()
  zip.file('xl/workbook.xml', '<workbook><sheets><sheet name="List" sheetId="1" r:id="rId1"/></sheets></workbook>')
  zip.file('xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>')
  zip.file('xl/sharedStrings.xml', '<sst><si><t>Student No.</t></si><si><t>Name</t></si><si><r><t>Ramos, </t></r><r><t>Ana</t></r></si></sst>')
  zip.file('xl/worksheets/sheet1.xml', '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>2026-0001</t></is></c><c r="C2" t="s"><v>2</v></c></row></sheetData></worksheet>')
  const grid = await xlsxGrid(await zip.generateAsync({ type: 'arraybuffer' }))
  assert.deepEqual(grid, [['Student No.', '', 'Name'], ['2026-0001', '', 'Ramos, Ana']])
  assert.deepEqual(htmlGrid('<table><tr><th colspan="2">Class list</th></tr><tr><td>2026-0001</td><td>Ramos &amp; Co</td></tr></table>'), [['Class list', ''], ['2026-0001', 'Ramos & Co']])
})
