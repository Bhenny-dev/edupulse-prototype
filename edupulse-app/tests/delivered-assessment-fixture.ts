import type { Page } from '@playwright/test'
import { baselineUI } from './baseline-fixture'
import { instructorCourseUI } from './instructor-course-fixture'

const written = (responseFormat: string, text: string, explanation: string) => ({ type: 'short_answer', responseFormat, text, explanation, options: [], correctIndex: null })

const check = {
  id: '1'.repeat(32), title: 'Variables and functions check', questions: [
    { type: 'multiple_choice', text: 'Which name describes a value that stores a total?', options: [{ label: 'A', text: 'total' }, { label: 'B', text: 'x' }, { label: 'C', text: 'thing' }, { label: 'D', text: 'it' }], correctIndex: 0, explanation: 'The name describes what the value represents.' },
    { type: 'true_false', text: 'A variable can only be assigned once.', options: ['True', 'False'], correctIndex: 1, explanation: 'Assignment can update a variable.' },
    written('identification', 'Identify the name given to a function input.', 'Accept parameter.'),
    written('enumeration', 'List two reasons for choosing descriptive names.', 'Award the point for two distinct reasons.'),
    written('essay', 'Explain how a function helps you reuse code.', 'Look for a concrete example of reuse.'),
  ],
}
const application = {
  id: '2'.repeat(32), title: 'Match concepts and document a procedure', questions: [
    written('matching', 'Match the concepts to their roles.\n\n| Concept | Role |\n| --- | --- |\n| 1. Parameter | A. Stores a value |\n| 2. Variable | B. Names an input |', 'Accept 1-B and 2-A.'),
    written('follow_along', 'Trace an assignment that adds 2 to a total of 5. Record each step and the result.', 'Check the initial value, operation and result.'),
    written('essay', 'Explain how you would check the result.', 'Accept a comparison with an independent calculation.'),
  ],
}
const assessments = [check, application]
const block = 'BSIT-1A', version = 'a'.repeat(32)
const sessionId = 'aaaaaaaa-1111-4111-8111-111111111111'
const roster = [
  { display_name: 'Ada Reyes', student_email: 'ada@example.invalid' },
  { display_name: 'Bea Santos', student_email: 'bea@example.invalid' },
  { display_name: 'Cory Lim', student_email: 'cory@example.invalid' },
  { display_name: 'Drew Tan', student_email: 'drew@example.invalid' },
  { display_name: 'Evie Cruz', student_email: 'evie@example.invalid', block_section: 'BSIT-1B' },
]
const answers = [0, 1, 'Parameter', 'Clear meaning\nEasier maintenance', 'One function can calculate the same total in different parts of the program.']
const noKey = ({ correctIndex: _correct, explanation: _guide, ...question }: (typeof check.questions)[number]) => question

export async function deliveredAssessmentUI(page: Page, role: 'instructor' | 'student') {
  const instructor = role === 'instructor' ? await instructorCourseUI(page) : undefined
  const fixture = instructor || await baselineUI(page, role)
  const records = fixture.records, course = records.courses[0]!
  records.publications = [records.publications[0]!, ...assessments.map(item => ({
    id: item.id, source_version: version, course_id: course.id, active: true, type: 'assessment', week: 1, title: item.title,
    content: { courseTopicId: 'variables', assessmentPolicy: { maxAttempts: 1 }, questions: item.questions.map(noKey) },
  }))]
  if (instructor) {
    const workspace = fixture.getWorkspace() as { content: Record<string, unknown> }
    workspace.content[check.id] = { syllabusId: instructor.syllabus.id, week: 1, status: 'published', position: 1400, type: 'assessment',
      content: { title: check.title, courseItemId: check.id, courseTopicId: 'variables', questions: check.questions } }
    records.publications[1]!.workspace_item_id = check.id
    fixture.setWorkspace(workspace)
  }
  const attempt = (id: string, email: string, score: number, attempt_no: number, grading_status = 'graded') => ({
    id, student_email: email, publication_id: check.id, source_version: version,
    answers, score, max_score: answers.length, attempt_no, grading_status,
    question_scores: grading_status === 'pending_review' ? [1, 1, 0, 0, 0] : Array.from({ length: 5 }, (_, i) => i < score ? 1 : 0),
    submitted_at: '2026-11-26T02:00:0' + attempt_no + 'Z',
  })
  const bea = attempt('aaaaaaaa-0000-4000-8000-000000000003', roster[1]!.student_email, 2, 1, 'pending_review')
  if (role === 'instructor') {
    records.enrollments = roster.map(student => ({ course_id: course.id, block_section: block, ...student }))
    records.attempts = [
      attempt('aaaaaaaa-0000-4000-8000-000000000001', roster[0]!.student_email, 3, 1),
      attempt('aaaaaaaa-0000-4000-8000-000000000002', roster[0]!.student_email, 0, 2),
      bea, attempt('aaaaaaaa-0000-4000-8000-000000000004', roster[4]!.student_email, 5, 1),
      { ...attempt('aaaaaaaa-0000-4000-8000-000000000005', roster[2]!.student_email, 4, 1), is_test: true },
    ]
    records.sessions = [{ id: sessionId, publication_id: check.id, source_version: version, student_email: roster[3]!.student_email, started_at: '2026-11-26T02:00:00Z', attempt_no: 1 }]
  } else {
    records.attempts = []
    records.sessions = []
  }
  const commands: any[] = []
  let failKey = false
  await page.route('**/api/ai?action=academic', async route => {
    if (route.request().method() !== 'POST') return route.fallback()
    const command = route.request().postDataJSON(), assessment = assessments.find(item => item.id === command.publication)
    commands.push(command)
    if (command.operation === 'instructor-assessment-key' && role === 'instructor' && assessment && command.version === version) {
      if (failKey) return route.fulfill({ status: 503, json: { error: { message: 'The published answer key could not be verified.' } } })
      return route.fulfill({ json: { questions: assessment.questions.map(q => ({ correctIndex: q.correctIndex, explanation: q.explanation })) } })
    }
    if (command.operation === 'grade' && role === 'instructor' && command.attempt === bea.id) {
      const saved = { ...bea, grading_status: 'graded', score: command.points.reduce((sum: number, n: number) => sum + n, 0), question_scores: command.points }
      records.attempts = records.attempts.map(item => item.id === bea.id ? saved : item)
      return route.fulfill({ json: saved })
    }
    if (command.operation === 'start' && role === 'student' && assessment) return route.fulfill({ json: { id: sessionId, started_at: new Date().toISOString(), attempt_no: 1 } })
    if (command.operation === 'respond' && role === 'student' && assessment) {
      const saved = { ...bea, id: assessment.id === check.id ? bea.id : 'aaaaaaaa-0000-4000-8000-000000000006', publication_id: assessment.id, student_email: 'ui.fixture@example.invalid', score: assessment.id === check.id ? 2 : 0, answers: command.responses, max_score: assessment.questions.length }
      records.attempts = [...records.attempts, saved]
      return route.fulfill({ json: saved })
    }
    if (command.operation === 'feedback' && role === 'student') {
      const saved = records.attempts.find(item => item.id === command.attempt)
      if (!saved) return route.fallback()
      const item = assessments.find(record => record.id === saved.publication_id)!
      return route.fulfill({ json: { available: true, grading_status: 'pending_review', explanations: true, questions: item.questions.map((question, index) => ({
        index, response: saved.answers?.[index], type: question.type, correctIndex: question.correctIndex,
        status: question.type === 'short_answer' ? 'awaiting_review' : 'correct', explanation: question.type === 'short_answer' ? undefined : question.explanation,
      })) } })
    }
    return route.fallback()
  })
  return { course, check, application, commands, answers, block, failKey: (value: boolean) => { failKey = value } }
}
