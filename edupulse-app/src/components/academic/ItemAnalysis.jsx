import { useState } from 'react'
import { Panel, Table, Empty } from './AcademicUI'
import { itemAnalysis, released } from './monitoringModel'

const LOW = 50

/** Percent correct per question for one released assessment. Read-only; shared by instructor monitoring and the Dean's course inspection. */
export default function ItemAnalysis({ data, title = 'Item analysis' }) {
  const several = data.courses.length > 1, code = id => data.courses.find(course => course.id === id)?.course_code || 'Course'
  const assessments = released(data, 'assessment').filter(item => Array.isArray(item.content?.questions) && item.content.questions.length)
  const [chosen, setChosen] = useState('')
  const selected = assessments.find(item => item.id === chosen) || assessments[0]
  const rows = selected ? itemAnalysis(data, selected) : []
  const low = rows.filter(row => row.percent !== null && row.percent < LOW)
  return <Panel title={title}>
    {!assessments.length ? <Empty>No released assessment with questions yet.</Empty> : <>
      <label className="academic-filter">Assessment<select aria-label="Item analysis assessment" className="form-input" value={selected.id} onChange={event => setChosen(event.target.value)}>{assessments.map(item => <option key={item.id} value={item.id}>{several ? `${code(item.course_id)} · ` : ''}Week {item.week} · {item.title}</option>)}</select></label>
      <p className="text-sm text-muted">Each question is one mark. Counts each student's latest marked attempt on the current version; answers awaiting marking are left out.</p>
      {low.length > 0 && <p className="text-sm"><strong>{low.length} {low.length === 1 ? 'question' : 'questions'} below {LOW}% correct:</strong> {low.map(row => `Q${row.index + 1}`).join(', ')}. Review the question wording or reteach its topic.</p>}
      <Table label={`Item analysis for ${selected.title}`} headers={['#', 'Question', 'Topic', 'Marked answers', 'Correct', 'Percent correct']} empty="This assessment has no questions." rows={rows.map(row => [
        `Q${row.index + 1}`,
        row.text.length > 140 ? `${row.text.slice(0, 139)}…` : row.text,
        row.topic || 'Not tagged',
        row.answered,
        row.correct,
        row.percent === null ? 'No marked answers' : <div key="p">{row.percent}%{row.percent < LOW ? ' (below 50%)' : ''}<div className="monitoring-progress"><progress aria-label={`Q${row.index + 1} correct answers`} value={row.correct} max={Math.max(1, row.answered)} /><span>{row.correct}/{row.answered}</span></div></div>,
      ])} />
    </>}
  </Panel>
}
