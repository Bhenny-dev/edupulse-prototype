import {useId,useState} from 'react'

const filters = [
  ['all','All pending'],
  ['upcoming','Upcoming'],
  ['open','No due date'],
  ['missing','Missed'],
]
const labels = {upcoming:'Upcoming',open:'No due date',missing:'Missed'}

export default function StudentDueWork({work,renderItem,title='Pending Assessments'}) {
  const [filter,setFilter]=useState('all')
  const [expanded,setExpanded]=useState(false)
  const heading=useId()
  const visible=filter==='all'?work:work.filter(row=>row.category===filter)
  return <section aria-labelledby={heading}>
    <h2 id={heading}>{title}</h2>
    {work.length>0 && <div className="student-work-filter">
      <label className="form-label">Show assessments
        <select className="form-select" value={filter} onChange={event=>{setFilter(event.target.value);setExpanded(false)}}>
          {filters.map(([id,label])=><option key={id} value={id}>{label}</option>)}
        </select>
      </label>
    </div>}
    {visible.length ? <ul className="student-home-items">
      {(expanded?visible:visible.slice(0,6)).map(({item,due,category,when})=><li key={item.id}>
        <span className="badge">{labels[category]}</span>
        {renderItem(item)}
        {due && <time dateTime={due} className="text-sm text-muted">{when}</time>}
      </li>)}
    </ul> : <p>{work.length ? 'No assessments match this filter.' : 'No pending published assessments.'}</p>}
    {visible.length>6 && <button type="button" className="btn btn-secondary" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>
      {expanded?'Show fewer':'Show all '+visible.length+' assessments'}
    </button>}
  </section>
}
