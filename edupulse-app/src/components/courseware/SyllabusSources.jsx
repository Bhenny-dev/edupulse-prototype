import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {BookOpen,Download,RefreshCw,Upload,Trash2} from 'lucide-react'
import {useWorkspaceViewState} from '../../context/WorkspaceContext'
import {collectSyllabusReferences,referenceToken} from '../../lib/rag/syllabusReferences'
import {prepareSyllabusSources,syllabusSources,downloadRetainedSource,aiSessionVersion} from '../../lib/aiClient'
import {LoadingStatus} from '../ui/LoadingFeedback'
import ModalLayer from '../ui/ModalLayer'
import CoursewareActions from './CoursewareActions'
import RetainedSourceReview from '../ai/RetainedSourceReview'
import './syllabus-sources.css'

export default function SyllabusSources({syllabus}){
 const references=useMemo(()=>{try{return {rows:collectSyllabusReferences(syllabus),error:''}}catch(failure){return {rows:[],error:failure.message}}},[syllabus])
 const signature=JSON.stringify(references.rows)
 const [cache,setCache]=useWorkspaceViewState(`syllabus-sources:${syllabus.id}`,null)
 const [expanded,setExpanded]=useWorkspaceViewState(`syllabus-sources-open:${syllabus.id}`,false)
 const sources=cache?.signature===signature?cache.rows:null
 const setSources=useCallback(rows=>setCache(previous=>({signature,rows:typeof rows==='function'?rows(previous?.signature===signature?previous.rows:[]):rows})),[signature,setCache])
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[viewing,setViewing]=useState(null),[removing,setRemoving]=useState(null)
 const fileInput=useRef(null),attachTarget=useRef(null),mounted=useRef(true),lock=useRef(false)
 const load=useCallback(async()=>{if(!references.rows.length)return;try{const result=await syllabusSources({operation:'list',references:references.rows});if(mounted.current)setSources(previous=>result.sources.map(row=>row.status==='unread'?previous.find(old=>old.key===row.key&&old.status==='unavailable')||row:row))}catch(failure){if(mounted.current)setError(failure.message)}},[references.rows,setSources])
 useEffect(()=>{mounted.current=true;if(sources===null)void load();const update=event=>{if(event.detail?.sessionVersion!==aiSessionVersion())return;if(event.detail?.sources){const byToken=new Map(event.detail.sources.map(row=>[referenceToken(row.reference),row]));setSources(previous=>references.rows.map(reference=>byToken.get(referenceToken(reference))||previous.find(row=>referenceToken(row.reference)===referenceToken(reference))||{reference,status:reference.url?'unread':'attachment-needed'}))}else void load()};window.addEventListener('edupulse-sources-updated',update);return()=>{mounted.current=false;window.removeEventListener('edupulse-sources-updated',update)}},[load,sources])
 const perform=async task=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await task();await load()}catch(failure){if(mounted.current)setError(failure.message)}finally{lock.current=false;if(mounted.current)setBusy(false)}}
 const read=async(reference,refresh=false)=>{const result=await prepareSyllabusSources(reference?[reference]:references.rows,undefined,refresh);setSources(previous=>{const byToken=new Map(result.map(row=>[referenceToken(row.reference),row]));return references.rows.map(reference=>byToken.get(referenceToken(reference))||previous.find(row=>referenceToken(row.reference)===referenceToken(reference))||{reference,status:reference.url?'unread':'attachment-needed'})})}
 if(!references.rows.length&&!references.error)return null
 const rows=sources||references.rows.map(reference=>({reference,status:reference.url?'unread':'attachment-needed'}))
 return <details className="card syllabus-sources" data-pulse-target="Syllabus sources" open={expanded} onToggle={event=>setExpanded(event.currentTarget.open)}>
  <summary><BookOpen size={17} aria-hidden="true" /><strong>Syllabus sources ({references.rows.length})</strong><span className="text-sm text-muted">{rows.filter(row=>row.snapshot).length} retained</span></summary>
  <div className="syllabus-sources-body" aria-busy={busy}>
   <div className="syllabus-sources-toolbar"><p className="text-sm text-muted">Generation reads linked references and reuses saved copies. Books need readable text before they can support citations. Check the edition and extracted text.</p><button className="btn btn-secondary btn-sm" disabled={busy||!!references.error} onClick={()=>void perform(()=>read(null))}><RefreshCw size={14} />Read linked sources</button></div>
   {busy&&<LoadingStatus label="Reading and retaining sources..." />}{(error||references.error)&&<p role="alert">{error||references.error}</p>}
   <input hidden ref={fileInput} type="file" accept=".pdf,.docx,.html,.htm,.txt,.md" aria-label="Attach readable reference copy" onChange={event=>{const file=event.target.files?.[0],reference=attachTarget.current;event.target.value='';if(!file||!reference)return;void perform(async()=>{if(file.size>2_000_000)throw new Error('Use a readable copy or chapter up to 2 MB.');const bytes=new Uint8Array(await file.arrayBuffer());let text='';for(const byte of bytes)text+=String.fromCharCode(byte);await syllabusSources({operation:'attach',reference,name:file.name,base64:btoa(text)})})}} />
   <ul className="syllabus-source-list">{rows.map((row,index)=><li key={row.key||index}>
    <div className="syllabus-source-description"><strong>{row.reference.title}</strong>{row.reference.authors&&<span className="text-sm">{row.reference.authors}{row.reference.year?` (${row.reference.year})`:''}{row.reference.publisher?` · ${row.reference.publisher}`:''}</span>}{/^https?:\/\//i.test(row.reference.url)&&<a href={row.reference.url} target="_blank" rel="noreferrer" className="text-sm">Open source link</a>}
     <span className="text-sm text-muted">{row.snapshot?`Retained ${new Date(row.snapshot.created_at).toLocaleDateString()} · ${row.snapshot.versions} saved ${row.snapshot.versions===1?'version':'versions'}${row.snapshot.truncated?' · Partial searchable text':''}`:row.status==='unavailable'?'Could not read linked source':row.status==='attachment-needed'?'Book metadata only · Attach a readable copy':'Link listed · Not read yet'}</span>
     {row.message&&(row.status==='unavailable'||row.snapshot)&&<span className="text-sm text-muted">{row.message}</span>}
    </div><div className="syllabus-source-actions">{row.snapshot&&<button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>setViewing(row.snapshot.id)}>View</button>}<CoursewareActions disabled={busy} label={`Source actions for ${row.reference.title}`} actions={[
     ...(row.snapshot?[{label:'Download retained copy',icon:Download,onSelect:()=>void perform(()=>downloadRetainedSource(row.snapshot.id))}]:[]),
     ...(row.reference.url?[{label:row.snapshot?'Read a new version':'Read linked source',icon:RefreshCw,onSelect:()=>void perform(()=>read(row.reference,true))}]:[]),
     {label:'Attach readable copy',icon:Upload,onSelect:()=>{attachTarget.current=row.reference;fileInput.current?.click()}},
     ...(row.snapshot?[{label:'Remove retained version',icon:Trash2,onSelect:()=>setRemoving(row.snapshot)}]:[]),
    ]} /></div>
   </li>)}</ul><p className="text-sm text-muted">Copies are private to your account. Refreshing creates a version when source bytes change; generation keeps using retained copies until you choose to refresh. Scans are limited to 2 MB per file and 150,000 searchable characters.</p>
  </div>
  {viewing&&<RetainedSourceReview id={viewing} onClose={()=>setViewing(null)} />}
  {removing&&<ModalLayer onDismiss={()=>setRemoving(null)}><section className="modal-content" role="dialog" aria-label="Remove retained source version"><h2>Remove this retained version?</h2><p>The saved copy of {removing.reference.title} and its indexed search passages will be removed. Existing courseware keeps its citation text and checksum.</p><div className="modal-actions"><button className="btn btn-ghost" disabled={busy} onClick={()=>setRemoving(null)}>Cancel</button><button className="btn btn-secondary" disabled={busy} onClick={()=>void perform(async()=>{await syllabusSources({operation:'remove',id:removing.id});setRemoving(null)})}>Remove retained version</button></div></section></ModalLayer>}
 </details>
}
