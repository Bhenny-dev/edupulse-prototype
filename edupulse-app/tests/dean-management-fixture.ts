import type { Page } from '@playwright/test'
import { academicUI } from './academic-ui-fixture'
import { makePdf } from './fixtures'
import { deanRecordData } from './dean-records-data'

type Command = { action: string; [key: string]: unknown }
const course = (code: string, title: string, year: string) => ({ kind: 'courses', record_key: code, updated_at:'2026-11-18T00:00:00.000Z', data: { CourseCode: code, CourseTitle: title, YearLevel: year, Semester: '1st Semester', Units: '3' } })
const load = (code: string, block: string, id: string, name: string) => ({ kind: 'loads', record_key: `${code}|${block}|1st Semester`, data: { CourseCode: code, Block: block, Semester: '1st Semester',AcademicYear:'2026-2027', InstructorID: id, InstructorName: name } })

/** Synthetic Dean account with a live directory. Dean commands are recorded and applied in memory; no hosted account is used. */
export async function deanManagementUI(page: Page, role = 'dean') {
  const records = deanRecordData() as ReturnType<typeof deanRecordData> & { directory: { instructors: Record<string, unknown>[]; students: Record<string, unknown>[]; irregular: Record<string, string>[] } }
  records.institutional = [course('IT 102', 'Programming foundations', '1'), course('IT 202', 'Network foundations', '2'), course('IT 301', 'Systems analysis', '3'), course('IT 401', 'Capstone project', '4'),
    load('IT 102', 'BSIT-1A', 'teacher-a', 'Alex Sample Instructor'),
    { kind: 'rosters', record_key: 'SYN-005', data: { StudentID: 'SYN-005', Name: 'Sam Irregular Example', Email: 'sam@example.invalid', YearLevel: '2', Block: 'IRREGULAR', Type: 'Irregular' } }]
  records.institutional.push(...records.institutional.filter(r=>r.kind==='courses').map(r=>({...r,kind:'course_terms',record_key:r.record_key+'|1st Semester|2026-2027',data:{...r.data,AcademicYear:'2026-2027'}})))
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
  const commands: Command[] = [], scans: Command[] = []
  const inspection = { syllabus: { id: 'scan-basis', courseCode: 'IT 102', courseTitle: 'Programming foundations', status: 'active',
    approvedFile: { name: 'original-programming.pdf', base64: Buffer.from(makePdf([['Original approved programming syllabus', 'Week 1: Functions']])).toString('base64') },
    courseOutline: [{ week: 1, ilos: 'Explain functions.', contents: ['Functions'], activities: 'Guided examples', assessments: 'Multiple choice quiz' }] },
    items: [{ id: 'scan-lesson', week: 1, type: 'material', status: 'draft', content: { title: 'Function calls', sections: [{ heading: 'Reusable functions', body: 'A function can be called more than once.' }] } },
      { id: 'scan-quiz', week: 1, type: 'assessment', status: 'checked', content: { title: 'Function quiz', questions: [{ text: 'Can a function be called twice?', responseFormat: 'multiple_choice', options: ['Yes', 'No'] }] } }] }

  await academicUI(page, async () => ({ json: records }), role)
  await page.route('**/api/ai?*', async route => {
    const request = route.request(), action = new URL(request.url()).searchParams.get('action')
    if (action === 'health') return route.fulfill({ json: { version: 'synthetic-ui', ready: false, provider: 'retrieval', model: 'synthetic-ui', database: { ready: true, kind: 'synthetic' }, identity: { mode: 'account', role } } })
    if (action === 'providers') return route.fulfill({ json: { connection: null, connections: [], models: [] } })
    if (action === 'conversations') return route.fulfill({ json: { threads: [], messages: [], memories: [], automaticMemory: true } })
    if (action !== 'academic' || request.method() !== 'POST' || request.postDataJSON()?.operation !== 'dean') return route.fallback()
    const command = request.postDataJSON().command as Command
    if (command.action === 'load.inspect') {
      scans.push(command)
      const current = records.institutional!.find(row => row.kind === 'loads' && row.record_key === command.key && row.data.InstructorID === command.expected_instructor)
      return current ? route.fulfill({ json: inspection }) : route.fulfill({ status: 400, json: { error: { message: 'This course load is no longer available.' } } })
    }
    if(command.action==='course-load.continuations')return route.fulfill({json:{continuations:[]}})
    commands.push(command)
    if(command.action==='course-load.assign'||command.action==='course-load.update'){
      const current=records.institutional!.find(r=>r.kind==='loads'&&r.record_key===command.key)
      const code=String(command.course_code||current?.data.CourseCode),person=(records.directory.instructors as {id:string;name:string}[]).find(p=>p.id===command.instructor_id)
      if(current){current.data.InstructorID=String(command.instructor_id);current.data.InstructorName=String(person?.name)}
      else records.institutional!.push({kind:'loads',record_key:'course:'+code+':'+command.instructor_id,data:{CourseCode:code,InstructorID:String(command.instructor_id),InstructorName:String(person?.name),Block:'',LoadType:'course',AcademicYear:String(command.academic_year),Semester:String(command.semester)}})
      return route.fulfill({json:{created:current?0:1,updated:current?1:0,key:current?.record_key||'course:'+code+':'+command.instructor_id}})
    }
    if(command.action==='block.add'){
      const parent=records.institutional!.find(r=>r.kind==='loads'&&r.record_key===command.assignment),block=String(command.block).toUpperCase(),key=`${parent?.data.CourseCode}|${block}|1st Semester|2026-2027`
      const people=(command.students as {StudentID?:string;Email?:string}[]).map(s=>(records.directory.students as {student_number:string;email:string;name:string}[]).find(d=>d.student_number===s.StudentID||d.email===s.Email)).filter(Boolean) as {student_number:string;email:string;name:string}[]
      const existing=records.institutional!.find(r=>r.kind==='loads'&&r.record_key===key),roster=[...((existing?.data.Students as unknown as Record<string,string>[])||[]),...people.map(p=>({StudentID:p.student_number,Email:p.email,Name:p.name,Block:block}))]
      if(existing)Object.assign(existing.data,{Students:roster})
      else records.institutional!.push({kind:'loads',record_key:key,data:{CourseCode:String(parent?.data.CourseCode),InstructorID:String(parent?.data.InstructorID),InstructorName:String(parent?.data.InstructorName),Block:block,LoadType:'class',ParentLoadKey:String(command.assignment),AcademicYear:'2026-2027',Semester:'1st Semester',ScheduleDays:String(command.days||''),ScheduleTime:String(command.time||''),Room:String(command.room||''),...(people.length?{Students:roster as unknown as string}:{})}})
      return route.fulfill({json:{key,block,students:people.length}})
    }
    if(command.action==='course-load.remove'){
      const prior=records.institutional!.find(r=>r.kind==='loads'&&r.record_key===command.key)
      records.institutional=records.institutional!.filter(r=>!(r.kind==='loads'&&r.data.CourseCode===prior?.data.CourseCode&&r.data.InstructorID===command.expected_instructor));return route.fulfill({json:{removed:1}})
    }
    if (command.action === 'course.create') {
      const fields=command.course as {code:string;title:string;year:number;units:number;semester:string}
      const row=course(fields.code,fields.title,'');row.kind='course_terms';row.record_key=fields.code+'|'+command.semester+'|'+command.academic_year;Object.assign(row.data,{Units:String(fields.units),Semester:String(command.semester),AcademicYear:String(command.academic_year)})
      records.institutional!.push(row)
      return route.fulfill({json:{code:fields.code,updated_at:row.updated_at}})
    }
    if(command.action==='course.update'||command.action==='course.status'){
      const row=records.institutional!.find(row=>row.kind==='course_terms'&&row.data.CourseCode===command.code&&row.data.Semester===command.semester&&row.data.AcademicYear===command.academic_year)
      if(!row||!row.updated_at||row.updated_at!==command.expected_updated_at)return route.fulfill({status:409,json:{error:{message:'This course changed. Close this dialog and reload the course before trying again.'}}})
      if(command.action==='course.update'){
        const fields=command.course as {title:string;year:number;units:number;semester:string}
        Object.assign(row.data,{CourseTitle:fields.title,Units:String(fields.units)})
      }else row.data.Status=String(command.status)
      row.updated_at=new Date(Date.parse(row.updated_at)+1000).toISOString()
      return route.fulfill({json:{code:row.record_key,updated_at:row.updated_at}})
    }
    if (command.action === 'load.assign') {
      for (const item of command.loads as Record<string, string>[]) {
        const name = String(((records.directory.instructors as { id: string; name: string }[]).find(i => i.id === item.instructor_id))?.name)
        const row=load(item.course_code,'',item.instructor_id,name);Object.assign(row.data,{LoadType:'course',AcademicYear:item.academic_year,Semester:item.semester});row.record_key='course:'+item.course_code+':'+item.instructor_id;records.institutional!.push(row)
      }
      return route.fulfill({ json: { created: (command.loads as unknown[]).length, updated: 0, unchanged: 0 } })
    }
    if (command.action === 'load.update') {
      const old = records.institutional!.find(row => row.kind === 'loads' && row.record_key === command.key)
      if (!old || old.data.InstructorID !== command.expected_instructor) return route.fulfill({ status: 409, json: { error: { message: 'This load changed. Refresh the course before editing it.' } } })
      const name = String((records.directory.instructors as { id: string; name: string }[]).find(item => item.id === command.instructor_id)?.name)
      records.institutional = records.institutional!.filter(row => row !== old)
      const updated = load(old.data.CourseCode, String(command.block), String(command.instructor_id), name)
      updated.data.Semester = String(command.semester); updated.record_key = `${updated.data.CourseCode}|${command.block}|${command.semester}`
      records.institutional!.push(updated)
      return route.fulfill({ json: { key: updated.record_key, updated: 1 } })
    }
    if (command.action === 'load.remove') { records.institutional = records.institutional!.filter(row => !(row.kind === 'loads' && (command.keys as string[]).includes(row.record_key))); return route.fulfill({ json: { removed: 1 } }) }
    if (command.action === 'account.status') { const person = [...records.directory.instructors, ...records.directory.students].find(p => p.id === command.id); if (person) person.status = command.status; return route.fulfill({ json: { id: command.id, status: command.status } }) }
    if (command.action === 'account.create') { const account = command.account as Record<string, unknown>; return route.fulfill({ json: { id: 'new-account', email: account.email, role: account.role, restored: false } }) }
    if (command.action === 'students.import') return route.fulfill({ json: { created: (command.students as unknown[]).length, updated: 0, linked: 0, restored: 0, regular: 1, irregular: 1, skipped: [] } })
    return route.fulfill({ json: {} })
  })
  return { records, commands, scans, inspection }
}
