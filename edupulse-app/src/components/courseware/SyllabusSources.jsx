import {parseCitation} from '../../utils/referenceParsing'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {BookOpen,Download,RefreshCw,Upload,Trash2} from 'lucide-react'
import {useWorkspaceViewState} from '../../context/WorkspaceContext'
import {collectSyllabusReferences,referenceToken} from '../../lib/rag/syllabusReferences'
import {prepareSyllabusSources,syllabusSources,downloadRetainedSource,indexSyllabusReference,aiSessionVersion} from '../../lib/aiClient'
import {LoadingStatus} from '../ui/LoadingFeedback'
import ModalLayer from '../ui/ModalLayer'
import CoursewareActions from './CoursewareActions'
import RetainedSourceReview from '../ai/RetainedSourceReview'
import './syllabus-sources.css'

export default function SyllabusSources({syllabus,defaultOpen=false}){
 const references=useMemo(()=>{try{return {rows:collectSyllabusReferences(syllabus),error:''}}catch(failure){return {rows:[],error:failure.message}}},[syllabus])
 const signature=JSON.stringify(references.rows)
 const [cache,setCache]=useWorkspaceViewState(`syllabus-sources:${syllabus.id}`,null)
 const [expanded,setExpanded]=useWorkspaceViewState(`syllabus-sources-open:${syllabus.id}`,defaultOpen)
 const sources=cache?.signature===signature?cache.rows:null
 const setSources=useCallback(rows=>setCache(previous=>({signature,rows:typeof rows==='function'?rows(previous?.signature===signature?previous.rows:[]):rows})),[signature,setCache])
 const [viewing,setViewing]=useWorkspaceViewState(`syllabus-source-reader:${syllabus.id}`,null)
 const [menu,setMenu]=useWorkspaceViewState(`syllabus-source-menu:${syllabus.id}`,null)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[removing,setRemoving]=useState(null)
 const fileInput=useRef(null),attachTarget=useRef(null),mounted=useRef(true),lock=useRef(false)
 const load=useCallback(async()=>{if(!references.rows.length)return;try{const result=await syllabusSources({operation:'list',references:references.rows});if(mounted.current)setSources(previous=>result.sources.map(row=>!row.snapshot?previous.find(old=>old.key===row.key&&old.status==='unavailable')||row:previous.find(old=>old.snapshot?.id===row.snapshot.id&&old.message?.startsWith('Retained, but knowledge indexing failed:'))||row))}catch(failure){if(mounted.current)setError(failure.message)}},[references.rows,setSources])
 useEffect(()=>{mounted.current=true;if(sources===null)void load();const update=event=>{if(event.detail?.sessionVersion!==aiSessionVersion())return;if(event.detail?.sources){const byToken=new Map(event.detail.sources.map(row=>[referenceToken(row.reference),row]));setSources(previous=>references.rows.map(reference=>byToken.get(referenceToken(reference))||previous.find(row=>referenceToken(row.reference)===referenceToken(reference))||{reference,status:reference.url?'unread':'attachment-needed'}))}else void load()};window.addEventListener('edupulse-sources-updated',update);return()=>{mounted.current=false;window.removeEventListener('edupulse-sources-updated',update)}},[load,sources])
 const perform=async task=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await task();await load()}catch(failure){if(mounted.current)setError(failure.message)}finally{lock.current=false;if(mounted.current)setBusy(false)}}
 const read=async(reference,refresh=false)=>{
  const result=[],version=aiSessionVersion()
  for(const entry of reference?[reference]:references.rows){
   const chunk=await prepareSyllabusSources([entry],undefined,refresh)
   if(!mounted.current||version!==aiSessionVersion())return
   for(const row of chunk){
    if(row.snapshot&&!row.metadataOnly)try{await indexSyllabusReference(row.snapshot.id,syllabus.courseCode)}catch(failure){row.message='Retained, but knowledge indexing failed: '+failure.message}
    result.push(row)
   }
   if(!mounted.current||version!==aiSessionVersion())return
   setSources(previous=>{const map=new Map(result.map(row=>[referenceToken(row.reference),row]));return references.rows.map(ref=>map.get(referenceToken(ref))||previous.find(row=>referenceToken(row.reference)===referenceToken(ref))||{reference:ref,status:ref.url?'unread':'attachment-needed'})})
  }
 }

 if(!references.rows.length&&!references.error)return null
 const rows=sources||references.rows.map(reference=>({reference,status:reference.url?'unread':'attachment-needed'}))
 return <details className="card syllabus-sources" data-pulse-target="Syllabus sources" open={expanded} onToggle={event=>setExpanded(event.currentTarget.open)}>
  <summary><BookOpen size={17} aria-hidden="true" /><strong>Syllabus sources ({references.rows.length})</strong><span className="text-sm text-muted">{rows.filter(row=>row.snapshot&&!row.metadataOnly).length} retained text{rows.some(row=>row.metadataOnly)?` / ${rows.filter(row=>row.metadataOnly).length} catalog records`:''}</span></summary>
  <div className="syllabus-sources-body" aria-busy={busy}>
   <div className="syllabus-sources-toolbar"><p className="text-sm text-muted">Search every citation, retain readable linked sources, and index their text for private knowledge search. Catalog matches identify a work; they do not supply the book text or verify its edition.</p><button className="btn btn-secondary btn-sm" disabled={busy||!!references.error} onClick={()=>void perform(()=>read(null))}><RefreshCw size={14} />Search and read sources</button></div>
   {busy&&<LoadingStatus label="Searching, retaining and indexing sources..." />}{(error||references.error)&&<p role="alert">{error||references.error}</p>}
   <input hidden ref={fileInput} type="file" accept=".pdf,.docx,.html,.htm,.txt,.md" aria-label="Attach readable reference copy" onChange={event=>{const file=event.target.files?.[0],reference=attachTarget.current;event.target.value='';if(!file||!reference)return;void perform(async()=>{if(file.size>2_000_000)throw new Error('Use a readable copy or chapter up to 2 MB.');const bytes=new Uint8Array(await file.arrayBuffer());let text='';for(const byte of bytes)text+=String.fromCharCode(byte);const result=await syllabusSources({operation:'attach',reference,name:file.name,base64:btoa(text)});const retained=result.sources[0]?.snapshot;if(retained)await indexSyllabusReference(retained.id,syllabus.courseCode)})}} />
   <ul className="syllabus-source-list">{rows.map((row,index)=>{const display=row.snapshot?.reference||row.reference,parsed=parseCitation(display.title),title=parsed.title||display.title,authors=display.authors||parsed.authors,year=display.year||parsed.year,publisher=display.publisher||parsed.publisher;return <li key={row.key||index}>
    <div className="syllabus-source-description"><strong>{title}</strong>{(authors||year||publisher)&&<span className="text-sm">{[authors,year?`(${year})`:'',publisher].filter(Boolean).join(' / ')}</span>}{row.metadataOnly&&<span className="text-sm">Possible catalog match; verify the edition.</span>}{row.metadataOnly&&<details><summary>Original syllabus citation</summary><p>{row.reference.title}</p></details>}{/^https?:\/\//i.test(row.snapshot?.url||row.reference.url)&&<a href={row.snapshot?.url||row.reference.url} target="_blank" rel="noreferrer" className="text-sm">Open source link</a>}
     <span className="text-sm text-muted">{row.metadataOnly?'Saved catalog/search listing - metadata only':row.snapshot?`Retained ${new Date(row.snapshot.created_at).toLocaleDateString()} · ${row.snapshot.versions} saved ${row.snapshot.versions===1?'version':'versions'}${row.snapshot.truncated?' · Partial searchable text':''}`:row.status==='unavailable'?'Source search or reading unavailable':row.status==='attachment-needed'?'Book metadata only · Attach a readable copy':'Link listed · Not read yet'}</span>
     {row.message&&(row.status==='unavailable'||row.snapshot)&&<span className="text-sm text-muted">{row.message}</span>}
    </div><div className="syllabus-source-actions">{row.snapshot&&<button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>setViewing(row.snapshot.id)}>View</button>}<CoursewareActions disabled={busy||!row.key} open={!!row.key&&menu===row.key} onOpenChange={next=>setMenu(current=>(typeof next==='function'?next(current===row.key):next)?row.key:null)} label={`Source actions for ${row.reference.title}`} actions={[
     ...(row.snapshot?[{label:'Download retained copy',icon:Download,onSelect:()=>void perform(()=>downloadRetainedSource(row.snapshot.id))}]:[]),
     ...([{label:row.snapshot?'Search or read again':'Search or read source',icon:RefreshCw,onSelect:()=>void perform(()=>read(row.reference,true))}]),
     {label:'Attach readable copy',icon:Upload,onSelect:()=>{attachTarget.current=row.reference;fileInput.current?.click()}},
     ...(row.snapshot?[{label:'Remove retained version',icon:Trash2,onSelect:()=>setRemoving(row.snapshot)}]:[]),
    ]} /></div>
   </li>})}</ul><p className="text-sm text-muted">Copies are private to your account. Refreshing creates a version when source bytes change; generation keeps using retained copies until you choose to refresh. Scans are limited to 2 MB per file and 150,000 searchable characters.</p>
  </div>
  {viewing&&rows.some(row=>row.snapshot?.id===viewing)&&<RetainedSourceReview id={viewing} onClose={()=>setViewing(null)} />}
  {removing&&<ModalLayer onDismiss={()=>setRemoving(null)}><section className="modal-content" role="dialog" aria-label="Remove retained source version"><h2>Remove this retained version?</h2><p>The saved copy of {removing.reference.title} and its indexed search passages will be removed. Existing courseware keeps its citation text and checksum.</p><div className="modal-actions"><button className="btn btn-ghost" disabled={busy} onClick={()=>setRemoving(null)}>Cancel</button><button className="btn btn-secondary" disabled={busy} onClick={()=>void perform(async()=>{await syllabusSources({operation:'remove',id:removing.id});setRemoving(null)})}>Remove retained version</button></div></section></ModalLayer>}
 </details>
}
