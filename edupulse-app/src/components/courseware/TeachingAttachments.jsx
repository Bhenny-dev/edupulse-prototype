import { useState } from 'react'
import { Download } from 'lucide-react'
import { teachingFileUrl } from '../../utils/teachingFiles'
export default function TeachingAttachments({ attachments = [] }) {
  const [busy, setBusy] = useState(''), [error, setError] = useState('')
  const open = async file => {
    setBusy(file.path); setError('')
    try { const url = await teachingFileUrl(file.path); const link = document.createElement('a'); link.href = url; link.download = file.name; link.rel = 'noopener noreferrer'; link.click() }
    catch (failure) { setError(failure.message) } finally { setBusy('') }
  }
  if (!attachments.length) return null
  return <section aria-label="Attached teaching files"><h3>Attached files</h3>{attachments.map(file => <button key={file.path} className="btn btn-secondary btn-sm" disabled={Boolean(busy)} onClick={() => void open(file)}><Download size={14} />{busy === file.path ? 'Preparing download...' : file.name}</button>)}{error && <p role="alert">{error}</p>}</section>
}
