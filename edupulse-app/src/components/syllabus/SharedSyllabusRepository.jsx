import {useState} from 'react'
import {Eye,Trash2,PauseCircle} from 'lucide-react'

export default function SharedSyllabusRepository({shares,onView,onRemove,onResume,busy=false}){
 const [search,setSearch]=useState('')
 const shown=shares.filter(share=>`${share.courseCode} ${share.courseTitle} ${share.recipient_name}`.toLowerCase().includes(search.toLowerCase()))
 return <section className="card"><div className="card-header"><h2>My shared syllabi</h2></div><div className="card-body">
  <p className="text-sm text-muted mb-16">Only syllabi you shared appear here. Received syllabi appear in My Syllabus with the sender's name. Suspend a share before deleting it. Independently saved copies remain.</p>
  <label className="form-label">Search shared syllabi<input className="form-input" type="search" value={search} onChange={event=>setSearch(event.target.value)}/></label>
  {!shown.length?<p className="academic-empty">{search?'No matching shared syllabi.':'You have not shared any syllabi yet. Use Share syllabus in My Syllabus.'}</p>:<div className="academic-table-wrap"><table className="data-table"><thead><tr><th>Course</th><th>Shared with</th><th>Shared</th><th>Actions</th></tr></thead><tbody>{shown.map(share=><tr key={share.id}><td data-label="Course"><strong>{share.courseCode}</strong><div className="text-sm text-muted">{share.courseTitle}{share.sender_suspended?' - Suspended':''}</div></td><td data-label="Shared with">{share.recipient_name}</td><td data-label="Shared">{new Date(share.created_at).toLocaleDateString()}</td><td data-label="Actions"><div className="academic-actions"><button className="btn btn-secondary btn-sm" onClick={()=>onView(share)}><Eye size={14}/>View shared copy</button><>{share.sender_suspended&&<button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>onResume(share)}>Resume share</button>}<button className="btn btn-ghost btn-sm" disabled={busy} aria-label={`${share.sender_suspended?'Delete':'Suspend'} share of ${share.courseCode} with ${share.recipient_name}`} onClick={()=>onRemove(share)}>{share.sender_suspended?<Trash2 size={14}/>:<PauseCircle size={14}/>} {share.sender_suspended?'Delete share':'Suspend share'}</button></></div></td></tr>)}</tbody></table></div>}
 </div></section>
}
