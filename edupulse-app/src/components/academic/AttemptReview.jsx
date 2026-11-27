import { useRef, useState } from 'react'
import { useAcademicRecords } from '../../context/AcademicContext'
import { assessmentLabel, questionOptionText } from '../../data/assessmentFormats'
import { isWrittenQuestion } from '../../utils/assessmentTrial'
import CoursewareText from '../courseware/CoursewareText'
import { Spinner } from '../ui/LoadingFeedback'
import { Panel, Empty } from './AcademicUI'

export function AttemptMarking({ attempt, questions, readOnly = false, onSaved, onClose }) {
  const { command } = useAcademicRecords()
  const [points, setPoints] = useState(() => questions.map((_, index) => attempt.question_scores?.[index] ?? 0))
  const [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const submitting = useRef(false)
  const save = async event => {
    event.preventDefault()
    if (submitting.current || readOnly || !reason.trim()) return
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      await command({ operation: 'grade', attempt: attempt.id, points, reason })
      onSaved()
    } catch (failure) {
      setError(failure.message)
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }
  return <form onSubmit={save}>
    {error && <p role="alert">{error}</p>}
    {attempt.appeal && <p className="mt-16"><strong>Student appeal:</strong> {attempt.appeal}</p>}
    {questions.map((question, index) => {
      const answer = attempt.answers?.[index]
      const response = typeof answer === 'number' ? questionOptionText(question, answer) : answer
      const key = questionOptionText(question, question.correctIndex)
      return <div className="academic-question" key={question.id || index}>
        <h4>Question {index + 1} · {assessmentLabel(question.responseFormat || question.type || 'multiple_choice')}</h4>
        <CoursewareText>{question.text}</CoursewareText>
        <p className="assessment-recorded-answer"><strong>Student response:</strong> {response || 'No response recorded'}</p>
        {!isWrittenQuestion(question) && key && <p><strong>Correct answer:</strong> {key}</p>}
        {question.explanation && <details><summary>{isWrittenQuestion(question) ? 'Marking guide' : 'Answer explanation'}</summary><CoursewareText>{question.explanation}</CoursewareText></details>}
        {readOnly ? <p>{isWrittenQuestion(question) && attempt.grading_status === 'pending_review' ? 'Awaiting marking' : 'Recorded points: ' + (attempt.question_scores?.[index] ?? 'Unavailable')}</p> :
          <label>Question {index + 1} points<select aria-label={'Question ' + (index + 1) + ' points'} className="form-select" value={points[index]} disabled={busy} onChange={event => setPoints(previous => previous.map((point, i) => i === index ? Number(event.target.value) : point))}><option value="0">0</option><option value="1">1</option></select></label>}
      </div>
    })}
    {!readOnly && questions.length > 0 && <>
      <label className="academic-filter">Review reason<textarea className="form-input" maxLength={2000} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
      <button type="submit" className="btn btn-primary mt-16" disabled={busy || !reason.trim()}>{busy && <Spinner />} Confirm reviewed marks</button>
    </>}
    {onClose && <button type="button" className="btn btn-secondary mt-16" disabled={busy} onClick={onClose}>Close response review</button>}
  </form>
}

export default function AttemptReview({ data }) {
  const [selected, setSelected] = useState(''), [message, setMessage] = useState('')
  const attempts = data.attempts.filter(attempt => data.publications.some(p => p.id === attempt.publication_id && String(p.source_version) === String(attempt.source_version)))
  const attempt = attempts.find(item => item.id === selected)
  const publication = data.publications.find(item => item.id === attempt?.publication_id)
  return <Panel title="Review responses and score adjustments">
    <p className="text-sm text-muted mb-16">Review each response before confirming its mark. Every question is worth one point. A reason is retained with the review and the student receives an in-app notice.</p>
    {message && <p role="status">{message}</p>}
    {attempts.length ? <label className="academic-filter">Assessment attempt
      <select aria-label="Assessment attempt" className="form-select" value={selected} onChange={event => setSelected(event.target.value)}>
        <option value="">Select a saved attempt</option>
        {attempts.map(item => <option key={item.id} value={item.id}>{item.student_email} · {data.publications.find(p => p.id === item.publication_id)?.title} · {item.grading_status === 'pending_review' ? 'Awaiting marking' : item.score + '/' + item.max_score}</option>)}
      </select>
    </label> : <Empty>No saved responses to review.</Empty>}
    {attempt && <AttemptMarking key={attempt.id} attempt={attempt} questions={publication?.content?.questions || []} onSaved={() => {
      setMessage('Question marks saved. Topic mastery now uses the reviewed scores.')
      setSelected('')
    }} />}
  </Panel>
}
