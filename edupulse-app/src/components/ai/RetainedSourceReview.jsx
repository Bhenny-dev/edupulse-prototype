import {useEffect,useState} from 'react'
import ModalLayer from '../ui/ModalLayer'
import {LoadingStatus} from '../ui/LoadingFeedback'
import {aiRequest,downloadRetainedSource} from '../../lib/aiClient'
import CoursewareText from '../courseware/CoursewareText'
import {downloadRetainedSourcePdf,retainedSourceTitle} from '../../utils/pdfExport'
import {Spinner} from '../ui/LoadingFeedback'
import '../courseware/syllabus-sources.css'
export default function RetainedSourceReview({id,onClose}){
 const [source,setSource]=useState(null),[error,setError]=useState(''),[downloading,setDownloading]=useState(null)
 useEffect(()=>{const abort=new AbortController();void aiRequest('syllabus-sources','POST',{operation:'review',id},abort.signal).then(setSource).catch(failure=>{if(!abort.signal.aborted)setError(failure.message)});return()=>abort.abort()},[id])
 const download=async kind=>{if(downloading)return;setDownloading(kind);setError('');try{if(kind==='pdf')await downloadRetainedSourcePdf(source);else await downloadRetainedSource(id)}catch(failure){setError(failure.message)}finally{setDownloading(null)}}
 return <ModalLayer onDismiss={onClose}><section className="modal-content retained-source-dialog" role="dialog" aria-modal="true" aria-label="Retained source review">
  <div className="modal-header"><h2 className="retained-source-heading">{source?retainedSourceTitle(source):'Retained source'}</h2><button className="modal-close" aria-label="Close retained source" onClick={onClose}>×</button></div>
  <div className="retained-source-scroll" tabIndex={0} role="region" aria-label="Retained source content">
  {!source&&!error&&<LoadingStatus label="Opening retained source..." />}{error&&<p role="alert">{error}</p>}
  {source&&<><details className="retained-source-details"><summary>Source details</summary><p className="text-sm">{source.reference?.title}</p><p className="text-sm text-muted">Saved {new Date(source.created_at).toLocaleString()} · {source.pages?`${source.pages} pages`:'Unpaginated text'} · SHA-256 {source.sha256}</p></details>{/^https?:\/\//i.test(source.url)&&<p><a href={source.url} target="_blank" rel="noreferrer">Open original source</a></p>}{source.truncated&&<p role="status">The first 150,000 extracted characters are searchable. The original file is retained.</p>}{source.warnings?.map((warning,index)=><p key={index} className="text-sm text-muted">{warning}</p>)}<article className="retained-source-text" data-testid="retained-source-body"><CoursewareText>{source.text}</CoursewareText></article></>}
  </div>
  <div className="modal-actions">{source&&<><button className="btn btn-secondary" disabled={!!downloading} onClick={()=>void download('pdf')}>{downloading==='pdf'&&<Spinner />}Download PDF</button><button className="btn btn-ghost" disabled={!!downloading} onClick={()=>void download('original')}>{downloading==='original'&&<Spinner />}Download retained copy</button></>}<button className="btn btn-ghost" onClick={onClose}>Close</button></div>
 </section></ModalLayer>
}
