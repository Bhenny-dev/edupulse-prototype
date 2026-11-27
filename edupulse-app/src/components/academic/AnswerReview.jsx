import { useCallback, useEffect, useRef, useState } from 'react'
import { aiRequest } from '../../lib/aiClient'
import { Spinner } from '../ui/LoadingFeedback'

const STATUS = { correct: 'Correct', incorrect: 'Incorrect', awaiting_review: 'Awaiting instructor review' }
const optionText = (question, index) => {
  if (!Number.isInteger(index) || index < 0) return ''
  const option = question?.options?.[index]
  return (typeof option === 'string' ? option : option?.text) || `Option ${index + 1}`
}

/** The student's answer review for one recorded attempt (owner specification I3). The database releases the key only for
 *  the student's own submitted attempt and never while a later attempt is open, so this component only renders what it is given. */
export default function AnswerReview({ attempt, questions }) {
  const [state, setState] = useState({ loading: true, error: '', review: null })
  const pending = useRef(null)
  const load = useCallback(async () => {
    pending.current?.abort()
    const request = new AbortController()
    pending.current = request
    setState({ loading: true, error: '', review: null })
    try {
      const review = await aiRequest('academic', 'POST', { operation: 'feedback', attempt: attempt.id }, request.signal)
      if (!request.signal.aborted) setState({ loading: false, error: '', review })
    } catch (failure) {
      if (!request.signal.aborted) setState({ loading: false, error: failure.message || 'The answer review could not be loaded.', review: null })
    }
  }, [attempt.id])
  // A re-marked attempt (new score or status) loads its review again.
  useEffect(() => { void load(); return () => pending.current?.abort() }, [load, attempt.score, attempt.grading_status])
  const { loading, error, review } = state
  return <details className="academic-answer-review mt-24" open aria-label={`Answer review for attempt ${attempt.attempt_no || 1}`}>
    <summary><strong>Answer review · attempt {attempt.attempt_no || 1}</strong></summary>
    {loading && <p role="status"><Spinner /> Loading your answers and the correct answers…</p>}
    {error && <p role="alert">{error} <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>Retry</button></p>}
    {review && !review.available && <p role="status">{review.reason}</p>}
    {review?.available && <>
      {review.grading_status === 'pending_review' && <p className="text-sm text-muted">Written responses are awaiting your instructor’s marking, so the score above is not final.</p>}
      {!review.explanations && <p className="text-sm text-muted">Your instructor’s explanations are not available for this version; the correct answers are shown.</p>}
      <ol className="academic-answer-list">{review.questions.map(item => {
        const question = questions[item.index], written = item.type === 'short_answer'
        return <li key={item.index} className={`academic-answer ${item.status}`}>
          <p><strong>{question?.text ? `${item.index + 1}. ${question.text}` : `Question ${item.index + 1}`}</strong> <span className={`academic-answer-status ${item.status}`}>{STATUS[item.status] || item.status}</span></p>
          <p className="text-sm assessment-recorded-answer">Your answer: {written ? item.response : optionText(question, item.response) || 'No answer recorded'}</p>
          {!written && optionText(question, item.correctIndex) && <p className="text-sm">Correct answer: {optionText(question, item.correctIndex)}</p>}
          {written && item.status === 'awaiting_review' && <p className="text-sm text-muted">Your instructor marks written responses; this question’s point is pending.</p>}
          {item.explanation ? <p className="text-sm">Why: {item.explanation}</p> : item.status === 'incorrect' && <p className="text-sm text-muted">No explanation was added for this question.</p>}
        </li>
      })}</ol>
    </>}
  </details>
}
