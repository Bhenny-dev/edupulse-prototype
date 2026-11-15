import { useMemo, useRef, useState } from 'react'
import { ArrowLeft, FileText } from 'lucide-react'
import { PdfPages, WordPages } from '../documents/FilePages'
import { downloadApprovedFile } from '../../utils/syllabusFiles'
import './retained-file-viewer.css'

const isPdf = file => /\.pdf$/i.test(file.name)
const bytesOf = file => Uint8Array.from(atob(file.base64), char => char.charCodeAt(0))

/** Shows the file the instructor uploaded, never text extracted from it. */
export default function RetainedFileViewer({ file, title, onBack }) {
  const [failed, setFailed] = useState(false), fail = useRef(() => setFailed(true)).current, bytes = useMemo(() => bytesOf(file), [file])
  return <div className="retained-viewer">
    <div className="retained-viewer-bar">
      <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" />Back</button>
      <div className="retained-viewer-title"><strong>{title}</strong><span className="text-sm text-muted">{file.name}</span></div>
      <button type="button" className="btn btn-secondary" onClick={() => downloadApprovedFile(file)}><FileText size={14} aria-hidden="true" />Original approved file</button>
    </div>
    {failed ? <p role="alert" className="retained-viewer-error">This file could not be displayed here. Use Original approved file to open the uploaded copy.</p>
      : isPdf(file) ? <PdfPages bytes={bytes} onFail={fail} /> : <WordPages bytes={bytes} onFail={fail} />}
  </div>
}
