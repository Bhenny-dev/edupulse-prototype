import CoursewareText from './CoursewareText'
import TeachingAttachments from './TeachingAttachments'
import { assessmentLabel } from '../../data/assessmentFormats'
export default function ReadOnlyAssessment({ content }) {
  return <div className="card-body"><p>{content.description}</p><TeachingAttachments attachments={content.attachments} /><ol>{(content.questions || []).map((question, index) => <li key={question.id || index} className="instructor-sequence-item"><small className="text-muted">{assessmentLabel(question.responseFormat || question.type)}</small><CoursewareText>{question.text}</CoursewareText>{question.options?.length > 0 && <ul>{question.options.map((option, position) => <li key={position}>{typeof option === 'string' ? option : option.text}</li>)}</ul>}{question.explanation && <details><summary>Instructor marking guide</summary><CoursewareText>{question.explanation}</CoursewareText></details>}</li>)}</ol></div>
}
