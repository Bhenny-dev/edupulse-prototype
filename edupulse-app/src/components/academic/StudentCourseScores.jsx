import {useState} from 'react'
import {KPIs} from './AcademicUI'
import {deliveryTimeLabel} from '../../utils/blockDelivery'
import {itemProgress} from './studentProgress'
import {assessmentTitle} from '../../data/assessmentFormats'
import StudentProgressBar from './StudentProgressBar'

const statuses=['Not started','In progress','Scheduled','Awaiting schedule','Missing','Pending Review','Reviewed']

export default function StudentCourseScores({items,materials,data,attemptFor,stateFor,relatedMaterials,onOpen,busy}) {
  const [filter,setFilter]=useState('all')
  const results=items.map(item=>({item,attempt:attemptFor(item),status:stateFor(item)}))
  const submitted=results.filter(row=>row.attempt)
  const graded=submitted.filter(({attempt})=>attempt.grading_status!=='pending_review'&&attempt.max_score>0)
  const pending=submitted.filter(({attempt})=>attempt.grading_status==='pending_review').length
  const earned=graded.reduce((sum,row)=>sum+row.attempt.score,0)
  const maximum=graded.reduce((sum,row)=>sum+row.attempt.max_score,0)
  const visible=results.filter(row=>filter==='all'||row.status===filter)
  const weeks=[...new Set(visible.map(row=>row.item.week))]
  const opened = new Set(data.accesses.map(access => access.publication_id))
  const materialsOpened = materials.filter(item => opened.has(item.id)).length

  return <section className="student-course-scores" aria-label="Course performance">
    <h2>Course Performance</h2>
    <KPIs items={[
      ['Submitted assessments',submitted.length],
      ['Pending instructor review',pending],
      ['Points on scored assessments',graded.length?earned+' / '+maximum:'No scores yet'],
      ['Teaching materials opened',materialsOpened+' / '+materials.length],
    ]}/>
    <section className="mb-24" aria-label="Teaching material access">
      <h3>Teaching Material Access</h3>
      {materials.length ? <ul>{materials.map(item => {
        const read = itemProgress(data, item)
        return <li className="student-score-row" key={item.id}>
          <div><strong>{item.title}</strong><p className="text-sm text-muted">Week {item.week}</p></div>
          <div><p>{opened.has(item.id) ? 'Opened' : 'Not opened'}</p>
            {read.total > 0 && <StudentProgressBar value={read.percent} total={100} label={item.title+' reading progress'} text={read.percent+'% read'}/>}
          </div>
          <button type="button" className="btn btn-secondary" disabled={busy} data-student-open={item.id} onClick={event=>onOpen(item,event.currentTarget)}>Open material</button>
        </li>
      })}</ul> : <p>No teaching materials have been delivered for this class.</p>}
    </section>
    <h3>Assessments</h3>
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
                <h4>{assessmentTitle(item.content?.questions)}</h4>
                <p>{item.title}</p>
                {materials.length>0&&<p className="text-sm text-muted">{materials.map(material=>material.title).join(', ')}</p>}
              </div>
              <div className="student-score-result">
                <span className="badge">{status}</span>
                {result&&<strong>{result}</strong>}
                {attempt?.submitted_at&&<small>Submitted <time dateTime={attempt.submitted_at}>{deliveryTimeLabel(attempt.submitted_at)}</time> (Philippine time)</small>}
              </div>
              <button type="button" className="btn btn-secondary" disabled={busy} data-student-open={item.id} onClick={event=>onOpen(item,event.currentTarget,attempt&&status!=='In progress'?'scores':undefined)}>
                {status==='In progress'?'Resume assessment':attempt?'Review attempt':'Open assessment'}
              </button>
            </li>
          })}
        </ul>
      </div>)}
    </section>
  </section>
}
