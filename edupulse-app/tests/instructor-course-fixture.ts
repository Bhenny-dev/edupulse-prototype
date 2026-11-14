import type { Page } from '@playwright/test'
import { baselineUI, baselineWorkspace } from './baseline-fixture'
import { lookupAnswer } from '../server/systemLookup'
import { chatInput } from '../server/contracts'
import type { Evidence } from '../src/lib/rag/types'

// UI transport fixtures only. No real accounts, inference, or learner achievement is claimed.
export async function instructorCourseUI(page: Page) {
  const fixture = await baselineUI(page)
  const syllabus = { ...structuredClone(baselineWorkspace.syllabi[0]), books: [], onlineReferences: [{ title: 'Programming source', url: 'https://example.invalid/programming' }], courseOutline: [
    { week: 1, ilos: 'Explain named values.', contents: ['Variables and named values'], activities: 'Read the worked example and trace its values.', assessments: 'Check variable naming and assignment.', assessmentTypes: ['True or false'], sections: [{ id: 'variables', ilos: 'Explain named values.', contents: ['Variables and named values'], activities: 'Read the worked example and trace its values.', assessments: 'Check variable naming and assignment.', assessmentTypes: ['True or false'], resources: [] }] },
    { week: 2, ilos: 'Explain function parameters.', contents: ['Functions and parameters'], activities: 'Trace function calls.', assessments: 'Identify parameters.' },
    { week: 3, ilos: 'Compare array elements.', contents: ['Arrays and indexes'], activities: 'Trace a list.', assessments: 'Check valid indexes.' },
    { week: 9, ilos: '', contents: [], activities: '', assessments: 'Midterm Examination' },
  ] }
  const material = { syllabusId: syllabus.id, week: 1, type: 'material', status: 'published', position: 1024, content: { title: 'Variables lesson', courseItemId: 'lesson', courseTopicId: 'variables', sections: [{ heading: 'Named values', body: 'A variable stores a value. Choose a descriptive name for each value. Assignment updates the stored value.' }] } }
  const quiz = { syllabusId: syllabus.id, week: 1, type: 'assessment', status: 'draft', position: 2048, content: { title: 'Variable check', courseItemId: 'quiz', courseTopicId: 'variables', overallAssessment: false, coverage: { materialIds: ['lesson'] }, questions: [1, 2, 3].map(i => ({ id: `q${i}`, type: 'true_false', responseFormat: 'true_false', text: `Variable statement ${i}`, options: ['True', 'False'], correctIndex: 0, topic: 'Variables and named values' })) } }
  fixture.setWorkspace({ syllabi: [syllabus], content: { lesson: material, quiz }, registrations: [] })
  fixture.records.courses[0].syllabus_id = syllabus.id
  fixture.records.publications[0].content = material.content
  fixture.records.accesses = [{ publication_id: fixture.records.publications[0].id, student_email: 'ui.fixture@example.invalid', first_opened_at: '2026-11-01T00:00:00Z' }]
  fixture.records.institutional!.push({ kind: 'courses', record_key: 'IT 201', data: { CourseCode: 'IT 201', CourseTitle: 'Algorithms', Units: '3', YearLevel: '2', Semester: '1' } }, { kind: 'loads', record_key: 'IT 201|BSIT-2A|1', data: { CourseCode: 'IT 201', InstructorID: fixture.records.courses[0].instructor_id!, Block: 'BSIT-2A', Semester: '1' } })
  const commands: { action: string; body: any }[] = [], forbidden: string[] = [], threads = new Map<string, any[]>()
  let failSave = false, denySource = false
  await page.route('**/api/ai?*', async route => {
    const action = new URL(route.request().url()).searchParams.get('action')!, method = route.request().method(), body = method === 'POST' ? route.request().postDataJSON() : null
    if (['chat', 'chat-context', 'operator', 'courseware', 'web-search'].includes(action)) { forbidden.push(action); return route.fulfill({ status: 500, json: { error: { code: 'UNEXPECTED_INFERENCE', message: 'No model call permitted in this fixture.' } } }) }
    if (action === 'conversations') {
      if (body?.operation === 'create' && !threads.has(body.id)) threads.set(body.id, [])
      if (body?.operation === 'append') { const old = threads.get(body.id) || []; threads.set(body.id, [...old, ...body.messages.filter((message: any) => !old.some(existing => existing.id === message.id))]) }
      const id = new URL(route.request().url()).searchParams.get('id')
      return route.fulfill({ json: { threads: [...threads.keys()].map(id => ({ id, title: 'Variable source', updated_at: '2026-11-01T00:00:00Z' })), messages: id ? threads.get(id) || [] : [], memories: [], automaticMemory: true, mode: 'cloud' } })
    }
    if (action === 'system-chat') {
      commands.push({ action, body })
      const source: Evidence = { id: `release:${fixture.records.publications[0].id}`, documentId: null, title: material.content.title, text: material.content.sections[0].body, page: null, section: 'Named values', flagged: false, origin: 'account', method: 'keyword', similarity: null, relevance: null, rrf: 1, query: body.message, destination: { path: `/courseware?course=${syllabus.id}&publication=${fixture.records.publications[0].id}&week=1`, label: 'Open teaching material' } }
      return route.fulfill({ json: await lookupAnswer(chatInput.parse(body), denySource ? [] : [source], AbortSignal.timeout(3000), 'system') })
    }
    if (action === 'syllabus-sources') return route.fulfill({ json: { sources: [{ key: 'programming', reference: { kind: 'online', title: 'Programming source', url: 'https://example.invalid/programming', authors: '', year: '', publisher: '' }, status: 'unread', message: 'Attach a readable copy for teaching context.' }] } })
    return route.fallback()
  })
  await page.route('**/api/ai?action=workspace', async route => {
    if (route.request().method() === 'PUT') {
      commands.push({ action: 'workspace', body: route.request().postDataJSON() })
      if (failSave) return route.fulfill({ status: 409, json: { error: { code: 'WORKSPACE_CONFLICT', message: 'Current teaching content changed in another session.' } } })
    }
    return route.fallback()
  })
  return { ...fixture, syllabus, commands, forbidden, threads, failSave: (value: boolean) => { failSave = value }, denySource: () => { denySource = true } }
}
