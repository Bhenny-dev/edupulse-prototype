import type { Page } from '@playwright/test'
import { academicUI } from './academic-ui-fixture'
import { deanRecordData } from './dean-records-data'

type Command = { action: string; [key: string]: unknown }
const course = (code: string, title: string, year: string) => ({ kind: 'courses', record_key: code, data: { CourseCode: code, CourseTitle: title, YearLevel: year, Semester: '1st Semester', Units: '3' } })
const load = (code: string, block: string, id: string, name: string) => ({ kind: 'loads', record_key: `${code}|${block}|1st Semester`, data: { CourseCode: code, Block: block, Semester: '1st Semester', InstructorID: id, InstructorName: name } })

/** Synthetic Dean account with a live directory. Dean commands are recorded and applied in memory; no hosted account is used. */
export async function deanManagementUI(page: Page) {
  const records = deanRecordData() as ReturnType<typeof deanRecordData> & { directory: { instructors: Record<string, unknown>[]; students: Record<string, unknown>[]; irregular: Record<string, string>[] } }
  records.institutional = [course('IT 102', 'Programming foundations', '1'), course('IT 202', 'Network foundations', '2'), course('IT 301', 'Systems analysis', '3'), course('IT 401', 'Capstone project', '4'),
    load('IT 102', 'BSIT-1A', 'teacher-a', 'Alex Sample Instructor'),
    { kind: 'rosters', record_key: 'SYN-005', data: { StudentID: 'SYN-005', Name: 'Sam Irregular Example', Email: 'sam@example.invalid', YearLevel: '2', Block: 'IRREGULAR', Type: 'Irregular' } }]
  records.enrollments.push({ course_id: 'c1', student_ref: 'SYN-005', display_name: 'Sam Irregular Example', student_email: 'sam@example.invalid', block_section: 'BSIT-1A' })
  const student = (id: string, number: string, name: string, email: string, year: number, block: string, type = 'Regular', status = 'active') => {
    const [first, surname] = name.split(' ')
    return { id, student_number: number, name, surname, first_name: first, middle_name: '', email, year_level: year, program: 'Bachelor of Science in Information Technology with Specialization in Web and Mobile Application Development', status, block, type }
  }
  records.directory = {
    instructors: [
      { id: 'teacher-a', name: 'Alex Sample Instructor', email: 'teacher-a@example.invalid', status: 'active', employee_id: 'E-01', has_masters: true, degree: 'Master in Information Technology', specialization: 'Programming' },
      { id: 'teacher-b', name: 'Morgan Sample Instructor', email: 'teacher-b@example.invalid', status: 'active', employee_id: '', has_masters: false, degree: '', specialization: 'Networking' },
      { id: 'teacher-c', name: 'Jordan Suspended Instructor', email: 'teacher-c@example.invalid', status: 'suspended', employee_id: '', has_masters: null, degree: '', specialization: '' }],
    students: [student('s-casey', 'SYN-002', 'Casey Example', 'casey@example.invalid', 1, 'BSIT-1A'), student('s-riley', 'SYN-001', 'Riley Example', 'riley@example.invalid', 1, 'BSIT-1A'),
      student('s-sam', 'SYN-005', 'Sam Irregular', 'sam@example.invalid', 2, 'IRREGULAR', 'Irregular'), student('s-taylor', 'SYN-003', 'Taylor Example', 'taylor@example.invalid', 2, 'BSIT-2A')],
    irregular: [{ StudentID: 'SYN-005', CourseCode: 'IT 102', Block: 'BSIT-1A', Name: 'Sam Irregular', Email: 'sam@example.invalid' }],
  }
  const commands: Command[] = []
  await academicUI(page, async () => ({ json: records }), 'dean')
  await page.route('**/api/ai?*', async route => {
    const request = route.request(), action = new URL(request.url()).searchParams.get('action')
    if (action === 'health') return route.fulfill({ json: { version: 'synthetic-ui', ready: false, provider: 'retrieval', model: 'synthetic-ui', database: { ready: true, kind: 'synthetic' }, identity: { mode: 'account', role: 'dean' } } })
    if (action === 'providers') return route.fulfill({ json: { connection: null, connections: [], models: [] } })
    if (action === 'conversations') return route.fulfill({ json: { threads: [], messages: [], memories: [], automaticMemory: true } })
    if (action !== 'academic' || request.method() !== 'POST' || request.postDataJSON()?.operation !== 'dean') return route.fallback()
    const command = request.postDataJSON().command as Command
    commands.push(command)
    if (command.action === 'load.assign') {
      for (const item of command.loads as Record<string, string>[]) {
        const name = String(((records.directory.instructors as { id: string; name: string }[]).find(i => i.id === item.instructor_id))?.name)
        records.institutional!.push(load(item.course_code, item.block, item.instructor_id, name))
      }
      return route.fulfill({ json: { created: (command.loads as unknown[]).length, updated: 0, unchanged: 0 } })
    }
    if (command.action === 'load.remove') { records.institutional = records.institutional!.filter(row => !(row.kind === 'loads' && (command.keys as string[]).includes(row.record_key))); return route.fulfill({ json: { removed: 1 } }) }
    if (command.action === 'account.status') { const person = [...records.directory.instructors, ...records.directory.students].find(p => p.id === command.id); if (person) person.status = command.status; return route.fulfill({ json: { id: command.id, status: command.status } }) }
    if (command.action === 'account.create') { const account = command.account as Record<string, unknown>; return route.fulfill({ json: { id: 'new-account', email: account.email, role: account.role, restored: false } }) }
    if (command.action === 'students.import') return route.fulfill({ json: { created: (command.students as unknown[]).length, updated: 0, linked: 0, restored: 0, regular: 1, irregular: 1, skipped: [] } })
    return route.fulfill({ json: {} })
  })
  return { records, commands }
}
