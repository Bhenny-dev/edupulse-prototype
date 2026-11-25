import { useState } from 'react'
import { ArrowLeft, Download, Pencil } from 'lucide-react'
import OriginalFile from './OriginalFile'
import TeachingAttachments from './TeachingAttachments'
import DraftEvidence from '../ai/DraftEvidence'
import { Spinner } from '../ui/LoadingFeedback'
import { downloadTeachingFile } from '../../utils/teachingFiles'
import '../documents/file-pages.css'

/** A teaching material that came from an uploaded file: the file itself is the document, not the text read from it. */
export default function OriginalDocument({ content, files, others, isStudent, canEdit, onBack, onEdit, onFail, reading, embedded, onAttachFile, onAttachLink, attachBlocked }) {
  const [busy, setBusy] = useState(''), [error, setError] = useState('')
  const download = async file => {
    setBusy(file.path); setError('')
    try { await downloadTeachingFile(file) } catch (failure) { setError(failure.message) } finally { setBusy('') }
  }
  return <div className="doc-original">
    <div className="doc-original-bar">
      {!embedded&&<button className="btn btn-ghost btn-sm" onClick={onBack}><ArrowLeft size={14} /> Back</button>}
      <div className="doc-original-title"><strong>{content.title}</strong>{files.length === 1 && <span className="text-sm text-muted">{files[0].name}</span>}</div>
      {canEdit && <button className="btn btn-secondary btn-sm" onClick={onEdit}><Pencil size={14} /> Edit text</button>}
      {files.map(file => <button key={file.path} className="btn btn-secondary btn-sm" disabled={Boolean(busy)} onClick={() => void download(file)}>{busy === file.path ? <Spinner size={14} /> : <Download size={14} />} {busy === file.path ? 'Preparing download...' : files.length === 1 ? 'Download original' : file.name}</button>)}
    </div>
    {error && <p role="alert">{error}</p>}
    <TeachingAttachments attachments={others} onAttachFile={onAttachFile} onAttachLink={onAttachLink} attachBlocked={attachBlocked} />
    {files.map(file => <section key={file.path} className="doc-original-file" aria-label={`Original file ${file.name}`}>
      {files.length > 1 && <h3>{file.name}</h3>}
      <OriginalFile file={file} onFail={onFail} />
    </section>)}
    {reading && <div className="doc-original-confirm">{(content.sections || []).map((section, idx) => <button aria-busy={Boolean(reading.busy && idx === reading.read)} key={idx} type="button" className="btn btn-secondary" disabled={reading.busy || idx !== reading.read} onClick={() => reading.confirm(idx)}>{reading.busy && idx === reading.read && <Spinner />}{idx < reading.read ? 'Section confirmed' : `Confirm section ${idx + 1} read`}</button>)}</div>}
    {!isStudent && <DraftEvidence metadata={content.ai} />}
  </div>
}
