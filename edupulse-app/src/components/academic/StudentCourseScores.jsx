import {useState} from 'react'
import {KPIs} from './AcademicUI'
import {deliveryTimeLabel} from '../../utils/blockDelivery'

const statuses=['Not started','In progress','Scheduled','Awaiting schedule','Missing','Pending Review','Reviewed']

export default function StudentCourseScores({items,attemptFor,stateFor,relatedMaterials,onOpen,busy}) {
  const [filter,setFilter]=useState('all')
  const results=items.map(item=>({item,attempt:attemptFor(item),status:stateFor(item)}))
  const submitted=results.filter(row=>row.attempt)
  const graded=submitted.filter(({attempt})=>attempt.grading_status!=='pending_review'&&attempt.max_score>0)
  const pending=submitted.filter(({attempt})=>attempt.grading_status==='pending_review').length
  const earned=graded.reduce((sum,row)=>sum+row.attempt.score,0)
  const maximum=graded.reduce((sum,row)=>sum+row.attempt.max_score,0)
  const visible=results.filter(row=>filter==='all'||row.status===filter)
  const weeks=[...new Set(visible.map(row=>row.item.week))]

  return <section className="student-course-scores" aria-label="Your course scores">
    <h2>Your Scores</h2>
    <KPIs items={[
      ['Submitted assessments',submitted.length],
      ['Pending instructor review',pending],
      ['Points on scored assessments',graded.length?earned+' / '+maximum:'No scores yet'],
    ]}/>
    <label className="form-label">Assessment status
      <select className="form-select" value={filter} onChange={event=>setFilter(event.target.value)}>
        <option value="all">All statuses</option>
        {statuses.filter(status=>results.some(row=>row.status===status)).map(status=><option key={status} value={status}>{status}</option>)}
      </select>
    </label>
    <section aria-label="Personal assessment results">
      {!visible.length&&<p>No assessment results match this view.</p>}
      {weeks.map(week=><div key={week} className="student-score-week">
        <h3>Week {week}</h3>
        <ul>
          {visible.filter(row=>row.item.week===week).map(({item,attempt,status})=>{
            const materials=relatedMaterials(item)
            const result=attempt?.grading_status==='pending_review'?'Score pending review':attempt?attempt.score+' / '+attempt.max_score+' points':null
            return <li key={item.id} className="student-score-row">
              <div>
                <h4>{item.title}</h4>
                {materials.length>0&&<p className="text-sm text-muted">{materials.map(material=>material.title).join(', ')}</p>}
              </div>
              <div className="student-score-result">
                <span className="badge">{status}</span>
                {result&&<strong>{result}</strong>}
                {attempt?.submitted_at&&<small>Submitted <time dateTime={attempt.submitted_at}>{deliveryTimeLabel(attempt.submitted_at)}</time> (Philippine time)</small>}
              </div>
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={event=>onOpen(item,event.currentTarget)}>
                {status==='In progress'?'Resume assessment':attempt?'Review attempt':'Open assessment'}
              </button>
            </li>
          })}
        </ul>
      </div>)}
    </section>
  </section>
}
