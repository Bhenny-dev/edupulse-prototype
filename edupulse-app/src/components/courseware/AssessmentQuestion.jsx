import { useId } from 'react'
import { assessmentLabel, questionOptionText } from '../../data/assessmentFormats'
import { isWrittenQuestion } from '../../utils/assessmentTrial'
import CoursewareText from './CoursewareText'
import './assessment-question.css'

const instructions = {
  enumeration: 'Enter one item per line.',
  matching: 'Enter the matching pairs from the question, one pair per line.',
  follow_along: 'Describe your steps and record the result or evidence requested.',
}

export default function AssessmentQuestion({ question, index, answer, onAnswer, disabled, showTopic = false, children }) {
  const name = useId()
  const written = isWrittenQuestion(question)
  const identification = question.responseFormat === 'identification'
  const hint = instructions[question.responseFormat]
  const response = {
    'aria-label': 'Written response for question ' + (index + 1),
    'aria-describedby': hint ? name + '-instructions' : undefined,
    className: 'form-input',
    maxLength: 4000,
    value: answer ?? '',
    disabled,
    onChange: event => onAnswer(event.target.value),
  }
  return <fieldset className="academic-question assessment-question-form">
    <legend>Question {index + 1} · {assessmentLabel(question.responseFormat || question.type || 'multiple_choice')}</legend>
    <CoursewareText>{question.text}</CoursewareText>
    {showTopic && question.topic && <p className="text-sm text-muted">Syllabus topic: {question.topic}</p>}
    {written ? <div className="assessment-written">
      <label>
        <span>{identification ? 'Your answer' : 'Your response'} <small className="text-muted">· Instructor marked</small></span>
        {identification ? <input type="text" {...response} /> : <textarea rows={question.responseFormat === 'essay' || question.responseFormat === 'follow_along' ? 5 : 3} {...response} />}
      </label>
      {hint && <p className="text-sm text-muted" id={name + '-instructions'}>{hint}</p>}
    </div> : (question.options || []).map((_, option) => {
      const label = questionOptionText(question, option)
      return <label key={option} className="assessment-choice">
        <input type="radio" name={name} aria-label={'Question ' + (index + 1) + ': ' + label} checked={answer === option} disabled={disabled} onChange={() => onAnswer(option)} />
        <CoursewareText inline>{label}</CoursewareText>
      </label>
    })}
    {children}
  </fieldset>
}
