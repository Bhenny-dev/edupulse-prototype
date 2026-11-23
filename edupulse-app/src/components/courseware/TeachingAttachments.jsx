import { useRef, useState } from 'react'
import { Download, Paperclip, X } from 'lucide-react'
import { downloadTeachingFile } from '../../utils/teachingFiles'
import { isLinkAttachment } from '../../utils/classroom'
import { LinkCard, LinkForm } from '../classroom/LinkAttachments'
import './teaching-attachments.css'

/** Stored teaching files download through their private storage; provider links open with their provider. */
export default function TeachingAttachments({ attachments = [], onAttachFile, onAttachLink, attachBlocked = '' }) {
  const [busy, setBusy] = useState(''), [downloading,setDownloading]=useState(()=>new Set()), [error, setError] = useState(''), [selected,setSelected] = useState([])
  const input=useRef(null)
  const files = attachments.filter(item => item && !isLinkAttachment(item)), links = attachments.filter(isLinkAttachment)
  const open = async file => {
    setDownloading(previous=>new Set([...previous,file.path])); setError('')
    try { await downloadTeachingFile(file) }
    catch (failure) { setError(failure.message) } finally { setDownloading(previous=>{const next=new Set(previous);next.delete(file.path);return next}) }
  }
  const choose=files=>{setError('');if(files.some(file=>!file.size||file.size>4_000_000)){setError('Choose non-empty files up to 4 MB each.');return}setSelected(previous=>[...previous,...files])}
  const attach=async()=>{if(!selected.length||busy||attachBlocked)return;setBusy('upload');setError('');try{await onAttachFile(selected);setSelected([])}catch(failure){setError(failure.message)}finally{setBusy('')}}
  if (!files.length && !links.length && !onAttachFile && !onAttachLink) return null
  return <section className="teaching-attachments" aria-label="Attached teaching files" aria-busy={Boolean(busy)||downloading.size>0}>
    <div className="teaching-attachments-heading"><h3>Attached files</h3>{onAttachFile&&<><button type="button" className="btn btn-secondary btn-sm" disabled={busy==='upload'} onClick={()=>input.current?.click()}><Paperclip size={16} aria-hidden="true"/>Attach file</button><input ref={input} type="file" multiple hidden aria-label="Choose teaching attachment" onChange={event=>{choose([...event.target.files]);event.target.value=''}}/></>}{onAttachLink&&<LinkForm disabled={Boolean(attachBlocked)} label="Add link" onAdd={onAttachLink} note="Drive, Docs, Slides, Sheets, Forms, YouTube or any web page. The file stays with its provider; share it so your students can open it."/>}</div>
    <div className="teaching-file-list">{files.map(file => <button type="button" key={file.path} className="btn btn-secondary btn-sm" disabled={downloading.has(file.path)} onClick={() => void open(file)}><Download size={16} aria-hidden="true" /><span>{downloading.has(file.path) ? 'Preparing download...' : file.name}</span></button>)}</div>
    {links.length > 0 && <div className="class-links" aria-label="Linked resources">{links.map((link, index) => <LinkCard key={link.url + index} link={link} />)}</div>}
    {onAttachFile&&<p className="text-sm text-muted">Choose one or more files, up to 4 MB each.</p>}
    {selected.length>0&&<div className="teaching-file-selection"><ul>{selected.map((file,index)=><li key={index}>{file.name} · {Math.ceil(file.size/1000)} KB</li>)}</ul><button type="button" className="btn btn-primary btn-sm" disabled={Boolean(busy)||Boolean(attachBlocked)} onClick={()=>void attach()}>{busy==='upload'?'Attaching files…':selected.length===1?'Save attachment':'Save attachments'}</button><button type="button" className="btn btn-ghost btn-sm" disabled={busy==='upload'} aria-label="Remove selected attachment" onClick={()=>setSelected([])}><X size={16}/></button></div>}
    {attachBlocked&&<p role="status" className="text-sm text-muted">{attachBlocked}</p>}{error && <p role="alert">{error}</p>}
  </section>
}
