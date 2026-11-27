import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { questionOptionText } from '../../data/assessmentFormats'
import AssessmentQuestion from './AssessmentQuestion'
import { isWrittenQuestion, trialResult } from '../../utils/assessmentTrial'
import CoursewareText from './CoursewareText'

/** The instructor answers their own assessment as a student would. It is marked here with the answer key; nothing is sent or saved. */
export default function AssessmentTrial({ content, onClose, canCheck = true }) {
  const questions = content.questions || [], [answers, setAnswers] = useState({}), [checked, setChecked] = useState(false)
  const result = trialResult(questions, answers), set = (index, value) => setAnswers(previous => ({ ...previous, [index]: value }))
  return <section className="assessment-trial" aria-label="Test attempt">
    <p role="note" className="reader-notice">Test attempt: answer as a student would. It is marked here with your answer key and is never saved or counted as a student score.</p>
    {questions.map((question, index) => <AssessmentQuestion key={question.id || index} question={question} index={index}
      answer={answers[index]} disabled={checked} onAnswer={value => set(index, value)}>
      {checked && !isWrittenQuestion(question) && <p className="text-sm">{result.correct[index] ? 'Correct.' : 'Your answer: ' + questionOptionText(question, answers[index]) + '. Answer key: ' + (questionOptionText(question, question.correctIndex) || 'Unavailable') + '.'}</p>}
      {checked && question.explanation && <CoursewareText>{question.explanation}</CoursewareText>}
    </AssessmentQuestion>)}
    {checked && <p role="status" className="academic-result">{result.scored > 0 && <>Test score: {result.score}/{result.scored}. </>}{result.written > 0 && <>{result.written} written {result.written === 1 ? 'response requires' : 'responses require'} instructor marking. </>}Nothing was saved.</p>}
    <div className="instructor-topic-actions">
      {onClose && <button type="button" className="btn btn-secondary" onClick={onClose}>Back to the assessment</button>}
      {checked
        ? <button type="button" className="btn btn-primary" onClick={() => { setAnswers({}); setChecked(false) }}><RotateCcw size={14} /> Try again</button>
        : <button type="button" className="btn btn-primary" disabled={!canCheck || !result.ready} onClick={() => setChecked(true)}>Check my answers</button>}
    </div>
  </section>
}
