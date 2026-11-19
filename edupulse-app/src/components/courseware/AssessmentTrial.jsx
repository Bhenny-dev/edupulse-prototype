import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { assessmentLabel } from '../../data/assessmentFormats'
import { isWrittenQuestion, trialResult } from '../../utils/assessmentTrial'
import CoursewareText from './CoursewareText'

const optionText = option => typeof option === 'string' ? option : option?.text || ''
const optionLetter = (question, index) => { const option = question.options?.[index]; return typeof option === 'object' && option?.label ? option.label : String.fromCharCode(65 + index) }

/** The instructor answers their own assessment as a student would. It is marked here with the answer key; nothing is sent or saved. */
export default function AssessmentTrial({ content, onClose }) {
  const questions = content.questions || [], [answers, setAnswers] = useState({}), [checked, setChecked] = useState(false)
  const result = trialResult(questions, answers), set = (index, value) => setAnswers(previous => ({ ...previous, [index]: value }))
  return <section className="assessment-trial" aria-label="Test attempt">
    <p role="note" className="reader-notice">Test attempt: answer as a student would. It is marked here with your answer key and is never saved or counted as a student score.</p>
    {questions.map((question, index) => <fieldset key={question.id || index} className="academic-question">
      <legend>{index + 1}. <CoursewareText inline>{question.text}</CoursewareText></legend>
      {isWrittenQuestion(question)
        ? <label>{assessmentLabel(question.responseFormat)} · you mark this after students submit<textarea className="form-input" aria-label={`Written response for question ${index + 1}`} maxLength={4000} value={answers[index] || ''} disabled={checked} onChange={event => set(index, event.target.value)} /></label>
        : (question.options || []).map((option, optionIndex) => <label key={optionIndex}><input type="radio" name={`trial-question-${index}`} aria-label={`Question ${index + 1}: ${optionText(option)}`} checked={answers[index] === optionIndex} disabled={checked} onChange={() => set(index, optionIndex)} /> {optionText(option)}</label>)}
      {checked && !isWrittenQuestion(question) && <p className="text-sm">{result.correct[index] ? 'Correct.' : `Your answer: ${optionLetter(question, answers[index])}. Answer key: ${optionLetter(question, question.correctIndex)}.`}</p>}
      {checked && question.explanation && <CoursewareText>{question.explanation}</CoursewareText>}
    </fieldset>)}
    {checked && <p role="status" className="academic-result">Test score: {result.score}/{result.scored}{result.written ? ` · ${result.written} written ${result.written === 1 ? 'response is' : 'responses are'} not marked here` : ''}. Nothing was saved.</p>}
    <div className="instructor-topic-actions">
      <button type="button" className="btn btn-secondary" onClick={onClose}>Back to the assessment</button>
      {checked
        ? <button type="button" className="btn btn-primary" onClick={() => { setAnswers({}); setChecked(false) }}><RotateCcw size={14} /> Try again</button>
        : <button type="button" className="btn btn-primary" disabled={!result.ready} onClick={() => setChecked(true)}>Check my answers</button>}
    </div>
  </section>
}
