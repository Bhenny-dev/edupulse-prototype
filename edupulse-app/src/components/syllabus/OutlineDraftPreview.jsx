import {Spinner} from '../ui/LoadingFeedback'

export default function OutlineDraftPreview({draft,onKeep,onDismiss}) {
 if(!draft?.rows?.length)return null
 return <section className="card mb-24 outline-draft-preview" aria-label="Generated outline draft"><div className="card-body">
  <div className="outline-draft-toolbar"><strong>{draft.rows.length} of {draft.total} teaching weeks ready for review</strong>{draft.phase==='working'&&<span role="status"><Spinner/> Generating the next week…</span>}<button type="button" className="btn btn-secondary btn-sm" onClick={()=>onKeep()}>Use completed weeks</button>{draft.phase!=='working'&&<button type="button" className="btn btn-ghost btn-sm" onClick={onDismiss}>Dismiss preview</button>}</div>
  <p className="text-sm text-muted mt-16">Review each week before using it. Save the syllabus after checking your changes.</p>
  {draft.references?.length>0&&<p className="text-sm">Sequence references: {draft.references.map(s=>`${s.courseCode} · ${s.courseTitle} · v${s.version} (${s.status})`).join('; ')}. Compare these source patterns before keeping the draft.</p>}
  {draft.phase==='stopped'&&<p role="status">Generation stopped. Completed weeks remain available below.</p>}
  {draft.rows.map((row,index)=><details className="outline-draft-week" key={row.week} open={index===draft.rows.length-1}><summary>Week {row.week} · {row.contents[0] || 'Generated outline'}</summary>
   <p><strong>Learning outcomes:</strong> {row.ilos}</p><ul>{row.contents.map((text,i)=><li key={i}>{text}</li>)}</ul>
   <p><strong>Activities:</strong> {row.activities}</p><p><strong>Assessment:</strong> {row.assessments}</p>
   <p><strong>Teaching materials:</strong> {(row.teachingMaterials||[]).join(', ')}</p><p><strong>Assessment types:</strong> {(row.assessmentTypes||[]).join(', ')}</p>
   <button type="button" className="btn btn-secondary btn-sm" onClick={()=>onKeep(row.week)}>Use week {row.week}</button>
  </details>)}
 </div></section>
}
