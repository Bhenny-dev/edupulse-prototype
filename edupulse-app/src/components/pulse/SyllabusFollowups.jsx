import {useState} from 'react'

const labels={ilos:'Learning outcomes',contents:'Contents',activities:'Teaching-learning activities',assessments:'Assessments',assessmentTypes:'Assessment types',programOutcomes:'Program outcomes',courseRequirements:'Course requirements',coursePolicy:'Course policy',gradingSystem:'Grading system',institutionalContext:'Institutional context',books:'Books',onlineReferences:'Online references'}
const display=value=>Array.isArray(value)?value.map(display).join('\n'):value&&typeof value==='object'?Object.entries(value).map(([key,item])=>`${labels[key]||key}: ${display(item)}`).join('\n'):String(value||'Empty')
function changes(review){
 if(!review)return []
 const result=[]
 for(const key of Object.keys(labels).filter(key=>!['ilos','contents','activities','assessments','assessmentTypes'].includes(key)))if(JSON.stringify(review.before[key])!==JSON.stringify(review.after[key]))result.push({label:labels[key],before:review.before[key],after:review.after[key]})
 for(const row of review.after.courseOutline||[]){const before=review.before.courseOutline?.find(item=>item.week===row.week);for(const key of ['ilos','contents','activities','assessments','assessmentTypes'])if(JSON.stringify(before?.[key])!==JSON.stringify(row[key]))result.push({label:`Week ${row.week} - ${labels[key]}`,before:before?.[key],after:row[key]})}
 return result
}
export default function SyllabusFollowups({proposal,ctx}){
 const [error,setError]=useState(''),[reviewing,setReviewing]=useState(false)
 const run=task=>{setError('');try{void Promise.resolve(task()).catch(error=>setError(error.message))}catch(error){setError(error.message)}}
 if(proposal.type==='open-editable-syllabus')return <section className="pulse-action"><strong>{proposal.label}</strong><div className="ai-actions"><button className="btn btn-secondary btn-sm" onClick={()=>run(()=>ctx.openEditableSyllabus(proposal.id))}>Open editable syllabus</button></div>{error&&<p role="alert">{error}</p>}</section>
 const review=changes(proposal.review)
 return <section className="pulse-action" aria-label="Syllabus next actions"><p role="status">{proposal.text|| (proposal.saved?'Draft saved. Continue editing here.':'The syllabus is open for editing.')}</p><div className="ai-actions">
 {ctx.activeSyllabus&&proposal.nextWeek&&<><button className="btn btn-secondary btn-sm" onClick={()=>run(()=>ctx.continueSyllabus(proposal.reference,`Complete the course outline for Week ${proposal.nextWeek} only.`))}>Generate Week {proposal.nextWeek}</button><button className="btn btn-ghost btn-sm" onClick={()=>run(()=>ctx.continueSyllabus(proposal.reference,'Complete the remaining unfinished course outline weeks. Preserve completed weeks.'))}>Complete remaining weeks</button></>}
 {review.length>0&&<button className="btn btn-ghost btn-sm" aria-expanded={reviewing} onClick={()=>setReviewing(value=>!value)}>Review changes</button>}
 </div>{proposal.sources?.length>0&&<details><summary>Sources</summary><ul>{proposal.sources.filter(source=>/^https?:\/\//i.test(source.url||'')).map((source,index)=><li key={index}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title||source.url}</a></li>)}</ul></details>}{reviewing&&<div className="pulse-draft-review">{review.map((item,index)=><section key={index}><h4>{item.label}</h4><span className="text-sm text-muted">Before</span><p>{display(item.before)}</p><span className="text-sm text-muted">Now</span><p>{display(item.after)}</p></section>)}</div>}{error&&<p role="alert">{error}</p>}</section>
}
