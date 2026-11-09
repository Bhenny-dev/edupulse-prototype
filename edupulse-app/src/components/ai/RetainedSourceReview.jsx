import {useEffect,useState} from 'react'
import ModalLayer from '../ui/ModalLayer'
import {LoadingStatus} from '../ui/LoadingFeedback'
import {aiRequest,downloadRetainedSource} from '../../lib/aiClient'
export default function RetainedSourceReview({id,onClose}){
 const [source,setSource]=useState(null),[error,setError]=useState(''),[downloading,setDownloading]=useState(false)
 useEffect(()=>{const abort=new AbortController();void aiRequest('syllabus-sources','POST',{operation:'review',id},abort.signal).then(setSource).catch(failure=>{if(!abort.signal.aborted)setError(failure.message)});return()=>abort.abort()},[id])
 return <ModalLayer onDismiss={onClose}><section className="modal-content" role="dialog" aria-modal="true" aria-label="Retained source review" style={{maxWidth:850,maxHeight:'90vh',overflow:'auto',overflowWrap:'anywhere'}}>
  <div className="modal-header"><h2>{source?.reference?.title||'Retained source'}</h2><button className="modal-close" aria-label="Close retained source" onClick={onClose}>×</button></div>
  {!source&&!error&&<LoadingStatus label="Opening retained source..." />}{error&&<p role="alert">{error}</p>}
  {source&&<><p className="text-sm text-muted">Saved {new Date(source.created_at).toLocaleString()} · {source.pages?`${source.pages} pages`:'Unpaginated text'} · SHA-256 {source.sha256}</p>{/^https?:\/\//i.test(source.url)&&<p><a href={source.url} target="_blank" rel="noreferrer">Open original source</a></p>}{source.truncated&&<p role="status">The first 150,000 extracted characters are searchable. The original file is retained.</p>}{source.warnings?.map((warning,index)=><p key={index} className="text-sm text-muted">{warning}</p>)}<pre className="retained-source-text">{source.text}</pre></>}
  <div className="modal-actions">{source&&<button className="btn btn-secondary" disabled={downloading} onClick={async()=>{setDownloading(true);try{await downloadRetainedSource(id)}catch(failure){setError(failure.message)}finally{setDownloading(false)}}}>{downloading?'Downloading...':'Download retained copy'}</button>}<button className="btn btn-ghost" onClick={onClose}>Close</button></div>
 </section></ModalLayer>
}
