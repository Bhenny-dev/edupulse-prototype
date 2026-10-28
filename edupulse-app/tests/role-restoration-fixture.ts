import type { Page } from '@playwright/test'
import { academicUI } from './academic-ui-fixture'
import type { AcademicData } from '../src/components/academic/academicData'

export const roleRecords: AcademicData = {
  courses: [{ id: 'a'.repeat(32), course_code: 'IT 102', course_title: 'Computer Programming 1', instructor_id: 'synthetic-instructor', active: true, source_revision: 4, syllabus_status:'active', instructor_name:'Synthetic instructor', outline:[1,2,3].map(week=>({week,contents:['Variables','Functions','Arrays'],ilos:'Explain and apply the weekly programming topics.'})) }],
  publications: [
    { id: 'b'.repeat(32), course_id: 'a'.repeat(32), active: true, type: 'material', week: 1, title: 'Variables lesson', source_version: 'v1', content: { sections: [{ heading: 'Variables', body: 'A variable stores a value.\nUse a descriptive name.' }, { heading: 'Practice', body: 'Declare a variable for a learner name.' }] } },
    ...['Variables quiz', 'Functions quiz', 'Arrays quiz'].map((title, index) => ({ id: String(index + 1).repeat(32), course_id: 'a'.repeat(32), active: true, type: 'assessment', week: index + 1, title, source_version: 'v1', content: { questions: [1, 2, 3].map(number => ({ text: `Synthetic question ${number}`, topic:['Variables','Functions','Arrays'][number-1], options: ['Option A', 'Option B', 'Option C', 'Option D'] })) } })),
  ],
  enrollments: [
    { course_id: 'a'.repeat(32), student_email: 'ui.fixture@example.invalid', display_name: 'Synthetic learner', student_ref: 'SYN-001', block_section: 'BSIT-1A' },
    { course_id: 'a'.repeat(32), student_email: 'second@example.invalid', display_name: 'Synthetic second learner', student_ref: 'SYN-002', block_section: 'BSIT-1B' },
  ],
  attempts: [1, 2, 3].map((index) => ({ id: `00000000-0000-4000-8000-00000000000${index}`, publication_id: String(index).repeat(32), source_version: 'v1', student_id: 'synthetic-learner', student_email: 'ui.fixture@example.invalid', score: index, max_score: 3, attempt_no:1, grading_status:'graded', answers:[0,1,2], question_scores:[0,1,2].map(n=>n<index?1:0), topic_scores:['Variables','Functions','Arrays'].map((topic,n)=>({topic,score:n<index?1:0,max_score:1})), submitted_at: `2026-10-${24 + index}T03:00:00Z` })),
  accesses: [], institutional:[],faculty:[],events:[],notices:[],
}
export async function restorationUI(page: Page, role = 'instructor') {
  const records = structuredClone(roleRecords)
  if (role === 'student') records.enrollments = records.enrollments.slice(0, 1)
  if (role === 'associate_dean') { records.attempts = []; records.accesses = [] }
  await academicUI(page, async () => ({ json: records }), role)
  let revision = 0
  let workspace: Record<string, unknown> = { syllabi: [], content: {}, registrations: [] }
  await page.route('**/api/ai?action=workspace', async route => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON()
      if (body.revision !== revision) return route.fulfill({ status: 409, json: { error: { code: 'WORKSPACE_CONFLICT', message: 'Revision conflict' } } })
      workspace = body.data; revision++
    }
    return route.fulfill({ json: { revision, data: workspace, mode: 'cloud' } })
  })
  await page.route('**/api/ai?action=academic', async route => {
    if (route.request().method() === 'POST') {
      const command = route.request().postDataJSON()
      if(command.operation==='import') {
        let created=0,updated=0
        for(const row of command.rows){const key=command.kind==='courses'?row.CourseCode:command.kind==='loads'?[row.CourseCode,row.Block,row.Semester].join('|'):row.StudentID;const previous=records.institutional!.find(item=>item.kind===command.kind&&item.record_key===key);if(previous){previous.data=row;updated++}else{records.institutional!.push({kind:command.kind,record_key:key,data:row});created++}}
        records.events!.push({id:crypto.randomUUID(),kind:'import',title:command.filename,detail:`${command.kind}: ${created} new, ${updated} updated`,created_at:new Date().toISOString()})
        return route.fulfill({json:{created,updated,shared:true}})
      }
      if(command.operation==='read'){records.notices!.forEach(n=>{if(command.ids.includes(n.id))n.read_at=new Date().toISOString()});return route.fulfill({json:{saved:true}})}
      if(command.operation==='start'){return route.fulfill({json:{id:'99999999-1111-4111-8111-111111111111',started_at:new Date().toISOString(),attempt_no:command.retake?2:1,duration_seconds:600,max_attempts:2}})}
      if(command.operation==='respond'){
        const publication=records.publications.find(p=>p.id===command.publication)!
        const questions=(publication.content as {questions:{topic:string,type?:string}[]}).questions
        const points=questions.map((q,i)=>q.type==='short_answer'?0:(command.responses[i]===(q.type==='true_false'?1:i)?1:0))
        const pending=questions.some(q=>q.type==='short_answer')
        const attempt={id:crypto.randomUUID(),publication_id:publication.id,source_version:publication.source_version,student_email:'ui.fixture@example.invalid',student_id:'synthetic-learner',score:points.reduce<number>((a,b)=>a+b,0),max_score:questions.length,submitted_at:new Date().toISOString(),attempt_no:1,grading_status:pending?'pending_review':'graded',answers:command.responses,question_scores:points,topic_scores:pending?[]:questions.map((q,i)=>({topic:q.topic,score:points[i],max_score:1}))}
        records.attempts.push(attempt);return route.fulfill({json:attempt})
      }
      if(command.operation==='revise')return route.fulfill({json:{saved:true}})
      if(command.operation==='remind')return route.fulfill({json:{sent:1}})
      if(command.operation==='grade'){
        const attempt=records.attempts.find(a=>a.id===command.attempt)!
        attempt.question_scores=command.points;attempt.score=command.points.reduce((a:number,b:number)=>a+b,0);attempt.grading_status='graded'
        attempt.topic_scores=['Variables','Functions','Arrays'].map((topic,n)=>({topic,score:command.points[n],max_score:1}))
        return route.fulfill({json:attempt})
      }
      if(command.operation==='appeal'){records.attempts.find(a=>a.id===command.attempt)!.appeal=command.reason;return route.fulfill({json:{saved:true}})}
      if (command.operation === 'open') { records.accesses.push({ publication_id: command.publication, student_email: 'ui.fixture@example.invalid', first_opened_at: '2026-10-28T02:00:00Z' }); return route.fulfill({ json: { saved: true } }) }
    }
    return route.fulfill({ json: records })
  })
  return { records, getWorkspace: () => workspace, setWorkspace:(data:Record<string,unknown>)=>{workspace=data} }
}
