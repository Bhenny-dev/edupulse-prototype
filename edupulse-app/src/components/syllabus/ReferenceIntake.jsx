import {useEffect,useMemo,useRef,useState} from 'react'
import {Link2,Upload,Trash2,Search} from 'lucide-react'
import {collectSyllabusReferences,referenceToken,referenceSnapshotToken,bibliographicLabel} from '../../lib/rag/syllabusReferences'
import {aiSessionVersion,importSyllabusReference,indexSyllabusReference,syllabusSources} from '../../lib/aiClient'
import {LoadingStatus} from '../ui/LoadingFeedback'
import CoursewareActions from '../courseware/CoursewareActions'
import RetainedSourceReview from '../ai/RetainedSourceReview'
import './reference-intake.css'

export default function ReferenceIntake({syllabus,onAdd,onRemove}){
 const references=useMemo(()=>{try{return {rows:collectSyllabusReferences({...syllabus,courseOutline:[]})}}catch(error){return {rows:[],error:error.message}}},[syllabus])
 const [url,setUrl]=useState(''),[states,setStates]=useState({}),[busy,setBusy]=useState(''),[error,setError]=useState(''),[viewing,setViewing]=useState(null),[dragging,setDragging]=useState(false)
 const fileInput=useRef(null),abort=useRef(null),lock=useRef(false),mounted=useRef(true),course=syllabus.courseCode||''
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;abort.current?.abort()}},[])
 useEffect(()=>()=>abort.current?.abort(),[course])
 const signature=JSON.stringify(references.rows)
 useEffect(()=>{const controller=new AbortController();const session=aiSessionVersion(),rows=JSON.parse(signature);if(rows.length)void syllabusSources({operation:'list',references:rows},controller.signal).then(result=>{if(!controller.signal.aborted&&session===aiSessionVersion())setStates(previous=>{const next={...previous};for(const row of result.sources)next[referenceSnapshotToken(row.reference)]={...next[referenceSnapshotToken(row.reference)],snapshot:row.snapshot};return next})}).catch(()=>{});return()=>controller.abort()},[signature])
 const perform=async task=>{
  if(lock.current)return
  lock.current=true;const controller=new AbortController(),session=aiSessionVersion();abort.current=controller;setError('')
  const active=()=>mounted.current&&!controller.signal.aborted&&session===aiSessionVersion()
  try{await task(controller.signal,active)}catch(failure){if(active())setError(failure.message)}finally{lock.current=false;if(mounted.current)setBusy('')}
 }
 const index=async(reference,id,signal,active)=>{
  setBusy('Indexing reference for search...')
  try{await indexSyllabusReference(id,course||undefined,signal);if(active())setStates(previous=>({...previous,[referenceSnapshotToken(reference)]:{...previous[referenceSnapshotToken(reference)],indexed:true,indexError:''}}))}
  catch(failure){if(active()){setStates(previous=>({...previous,[referenceSnapshotToken(reference)]:{...previous[referenceSnapshotToken(reference)],indexError:failure.message}}));setError('Reference retained. Knowledge indexing did not finish; use its menu to retry. '+failure.message)}}
 }
 const add=async(operation)=>perform(async(signal,active)=>{
  if(references.rows.length>=80)throw new Error('This syllabus supports up to 80 distinct references. Remove an unused entry first.')
  setBusy('Reading reference and extracting citation details...')
  const command=typeof operation==='function'?await operation():operation
  if(!active())return
  const result=await importSyllabusReference(command,signal)
  if(!active())return
  onAdd(result.reference);if(command.operation==='import-link')setUrl('')
  setStates(previous=>({...previous,[referenceSnapshotToken(result.reference)]:result}))
  if(result.snapshot)await index(result.reference,result.snapshot.id,signal,active)
 })
 const upload=file=>{if(!file)return;if(!file.size||file.size>2_000_000||!(/\.(?:pdf|docx|html?|txt|md)$/i).test(file.name)){setError('Choose a non-empty PDF, DOCX, HTML, TXT or Markdown file up to 2 MB.');return}void add(async()=>{
  const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte)
  return {operation:'import-file',name:file.name,base64:btoa(binary)}
 })}
 return <section className="reference-intake" aria-label="Reference links and files" aria-busy={Boolean(busy)}>
  <p className="text-sm text-muted">Add a source link or file. Available citation details are extracted automatically.</p>
  <form className="reference-link-form" onSubmit={event=>{event.preventDefault();void add({operation:'import-link',url:url.trim()})}}>
   <label className="form-label" htmlFor="syllabus-reference-url">Source link</label><div><input id="syllabus-reference-url" className="form-input" type="url" required maxLength={2000} value={url} onChange={event=>setUrl(event.target.value)} placeholder="https://..." disabled={Boolean(busy)} /><button className="btn btn-secondary" type="submit" disabled={Boolean(busy)||!url.trim()||Boolean(references.error)}><Link2 size={16} />Add link</button></div>
  </form>
  <div className={`reference-file-drop${dragging?' is-dragging':''}`} onDragOver={event=>{if(event.dataTransfer.types.includes('Files')){event.preventDefault();setDragging(true)}}} onDragLeave={()=>setDragging(false)} onDrop={event=>{event.preventDefault();setDragging(false);if(event.dataTransfer.files.length!==1){setError('Drop one reference file at a time.');return}if(!busy)upload(event.dataTransfer.files[0])}}>
   <Upload size={22} aria-hidden="true" /><div><strong>Drop a reference file here</strong><span className="text-sm text-muted">PDF, DOCX, HTML, TXT or Markdown · up to 2 MB</span></div><button className="btn btn-secondary btn-sm" type="button" disabled={Boolean(busy)||Boolean(references.error)} onClick={()=>fileInput.current?.click()}>Upload reference file</button>
   <input ref={fileInput} hidden type="file" aria-label="Reference file" accept=".pdf,.docx,.html,.htm,.txt,.md" onChange={event=>{const file=event.target.files?.[0];event.target.value='';upload(file)}} />
  </div>
  {busy&&<LoadingStatus label={busy} />}{(error||references.error)&&<p role="alert" className="form-error">{error||references.error}</p>}
  {references.rows.length>0&&<ol className="reference-intake-list">{references.rows.map(reference=>{const state=states[referenceSnapshotToken(reference)]||{},missing=['authors','year','publisher'].filter(field=>!reference[field]);return <li key={referenceToken(reference)}><div><strong>{reference.title}</strong><p>{bibliographicLabel({...reference,title:''})}</p>{reference.url&&<a href={reference.url} target="_blank" rel="noreferrer">Open source link</a>}<span className="text-sm text-muted">{state.indexed?'Indexed for private search':state.snapshot?'Readable copy retained':state.message?'Metadata only':'Listed reference'}</span>{(missing.length>0||state.message||state.titleOrigin)&&<details><summary className="text-sm">Citation details</summary>{state.titleOrigin&&<p className="text-sm">Title from {state.titleOrigin}.</p>}{missing.length>0&&<p className="text-sm">Not supplied by source: {missing.map(field=>field==='authors'?'author':field==='year'?'publication year':field).join(', ')}.</p>}{state.message&&<p className="text-sm">{state.message}</p>}{reference.doi&&<p className="text-sm">DOI: {reference.doi}</p>}{reference.isbn&&<p className="text-sm">ISBN: {reference.isbn}</p>}</details>}</div><div className="reference-intake-actions">{state.snapshot&&<button className="btn btn-secondary btn-sm" type="button" disabled={Boolean(busy)} onClick={()=>setViewing(state.snapshot.id)}>View</button>}<CoursewareActions disabled={Boolean(busy)} label={`Reference actions for ${reference.title}`} actions={[...(state.snapshot?[{label:'Index for search',icon:Search,onSelect:()=>void perform((signal,active)=>index(reference,state.snapshot.id,signal,active))}]:[]),{label:'Remove reference',icon:Trash2,onSelect:()=>onRemove(reference)}]} /></div></li>})}</ol>}
  {viewing&&<RetainedSourceReview id={viewing} onClose={()=>setViewing(null)} />}
 </section>
}
