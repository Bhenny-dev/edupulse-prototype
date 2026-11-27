import { useCallback, useEffect, useRef, useState } from 'react'
import { aiRequest } from '../../lib/aiClient'
import { LoadingStatus } from '../ui/LoadingFeedback'
import { useWorkspaceViewState } from '../../context/WorkspaceContext'
import { assessmentLabel, questionOptionText } from '../../data/assessmentFormats'
import { isWrittenQuestion } from '../../utils/assessmentTrial'
import { emailKey } from '../../utils/courseRoster'
import { currentAttempts, filterAcademic, percent } from '../academic/academicData'
import { Table } from '../academic/AcademicUI'
import { AttemptMarking } from '../academic/AttemptReview'
import StudentResourceLinks from '../academic/StudentResourceLinks'
import AssessmentTrial from '../courseware/AssessmentTrial'
import CoursewareText from '../courseware/CoursewareText'
import TeachingAttachments from '../courseware/TeachingAttachments'
import './delivered-assessment.css'

const views = [['form', 'Assessment form'], ['key', 'Answer key'], ['scores', 'Student scores']]
const studentName = student => student.display_name || student.student_email

function AnswerKey({ questions }) {
  return <section aria-label="Answer key">
    <ol className="delivered-answer-key">
      {questions.map((question, index) => {
        const written = isWrittenQuestion(question)
        return <li className="academic-question" key={question.id || index}>
          <h3>Question {index + 1} · {assessmentLabel(question.responseFormat || question.type || 'multiple_choice')}</h3>
          <CoursewareText>{question.text}</CoursewareText>
          {written ? <p>Instructor marked</p> : <p><strong>Correct answer:</strong> {questionOptionText(question, question.correctIndex) || 'Unavailable for this version'}</p>}
          {question.explanation ? <><h4>{written ? 'Marking guide' : 'Answer explanation'}</h4><CoursewareText>{question.explanation}</CoursewareText></> :
            written && <p className="text-sm text-muted">No marking guide was added.</p>}
        </li>
      })}
    </ol>
  </section>
}

function AssessmentScores({ publication, course, data, scope, readOnly, questions }) {
  const [selected, setSelected] = useWorkspaceViewState(scope + ':review', null)
  const [notice, setNotice] = useState('')
  const reviewHeading = useRef(null)
  const records = filterAcademic({ ...data, publications: [publication] }, publication.course_id, course.block)
  const attempts = new Map(currentAttempts(records).map(attempt => [emailKey(attempt.student_email), attempt]))
  const started = new Set((records.sessions || []).filter(session => session.publication_id === publication.id && String(session.source_version) === String(publication.source_version)).map(session => emailKey(session.student_email)))
  const members = [...new Map(records.enrollments.map(student => [emailKey(student.student_email), student])).values()]
    .sort((a, b) => studentName(a).localeCompare(studentName(b)))
  const reviewed = members.find(student => selected && attempts.get(emailKey(student.student_email))?.id === selected)
  const review = reviewed && attempts.get(emailKey(reviewed.student_email))
  const reviewId = review?.id
  useEffect(() => { if (reviewId) reviewHeading.current?.focus() }, [reviewId])
  const rows = members.map(student => {
    const email = emailKey(student.student_email), attempt = attempts.get(email)
    const marked = attempt && attempt.grading_status !== 'pending_review'
    const status = marked ? 'Marked' : attempt ? 'Awaiting marking' : student.suspended ? 'Membership suspended' : started.has(email) ? 'Started' : 'No submission'
    return [studentName(student), status, marked ? attempt.score + '/' + attempt.max_score : null,
      marked && attempt.max_score > 0 ? percent(attempt.score, attempt.max_score) + '%' : null,
      attempt?.id ? <button className="btn btn-secondary btn-sm" type="button" aria-label={'Review responses for ' + studentName(student)} aria-expanded={selected === attempt.id} onClick={() => { setNotice(''); setSelected(selected === attempt.id ? null : attempt.id) }}>Review responses</button> : null]
  })
  return <section aria-label="Student scores">
    <p className="text-sm text-muted mb-16">Block {course.block || 'unassigned'} · Latest submitted attempt for this published version.</p>
    {notice && <p role="status" className="mb-16">{notice}</p>}
    <Table label="Student scores for this assessment" headers={['Student', 'Status', 'Raw score', 'Percentage', 'Responses']} rows={rows} empty="No students are enrolled for this assessment in the selected block." />
    {review && <section className="delivered-response-review" aria-label={'Responses for ' + studentName(reviewed)}>
      <h3 ref={reviewHeading} tabIndex={-1}>Responses for {studentName(reviewed)}</h3>
      <p className="text-sm text-muted mb-16">Attempt {review.attempt_no || 1} · One point per question</p>
      <AttemptMarking key={review.id} attempt={review} questions={questions} readOnly={readOnly}
        onClose={() => setSelected(null)} onSaved={() => { setSelected(null); setNotice('Question marks saved.') }} />
    </section>}
  </section>
}

/** An instructor works with the authorized published version and the selected block's existing records. */
export default function DeliveredAssessment({ publication, course, data, readOnly = false }) {
  const { id, source_version: version, content } = publication
  const questionCount = content.questions?.length || 0
  const scope = ['delivered-assessment', course.id, course.block, id, version].join(':')
  const [view, setView] = useWorkspaceViewState(scope + ':view', 'form')
  const [key, setKey] = useState(null), [error, setError] = useState('')
  const pending = useRef(null)
  const loadKey = useCallback(async () => {
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setError('')
    try {
      const result = await aiRequest('academic', 'POST', { operation: 'instructor-assessment-key', publication: id, version }, controller.signal)
      if (controller.signal.aborted) return
      if (!Array.isArray(result?.questions) || result.questions.length !== questionCount) throw new Error('The answer key is unavailable for this version.')
      setKey(result.questions)
    } catch (failure) {
      if (!controller.signal.aborted) { setKey(null); setError(failure.message) }
    }
  }, [id, version, questionCount])
  useEffect(() => {
    if (questionCount) void loadKey()
    return () => pending.current?.abort()
  }, [questionCount, loadKey])
  const questions = (content.questions || []).map((question, index) => ({
    ...question, correctIndex: key?.[index]?.correctIndex, explanation: key?.[index]?.explanation,
  }))
  const verified = key?.length === questions.length
  return <div className="delivered-assessment">
    <nav className="tabs delivered-assessment-tabs" aria-label="Delivered assessment views">
      {views.map(([id, label]) => <button key={id} type="button" className={'tab' + (view === id ? ' active' : '')} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>)}
    </nav>
    {view === 'scores' ? <AssessmentScores publication={publication} course={course} data={data} scope={scope} readOnly={readOnly} questions={questions} /> : <>
      {questions.length > 0 && !verified && (error ?
        <p role="alert" className="reader-notice">{error} <button type="button" className="btn btn-secondary btn-sm" onClick={() => void loadKey()}>Retry answer key</button></p> :
        <LoadingStatus label="Loading the published answer key..." />)}
      {view === 'key' ? (verified && <AnswerKey questions={questions} />) : <>
        {(content.instructions || content.description) && <CoursewareText>{content.instructions || content.description}</CoursewareText>}
        <StudentResourceLinks links={content.links || []} />
        <TeachingAttachments attachments={content.attachments || []} />
        {questions.length ? <AssessmentTrial content={{ ...content, questions }} canCheck={verified || questions.every(isWrittenQuestion)} /> : <p>No questions are available for this version.</p>}
      </>}
    </>}
  </div>
}
