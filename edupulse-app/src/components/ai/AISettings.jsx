import { useCallback, useEffect, useRef, useState } from 'react'
import { Database, RefreshCw, Upload, Trash2, Cpu } from 'lucide-react'
import { aiRequest, getAiHealth, readReferenceFile } from '../../lib/aiClient'
import { useAuth } from '../../context/AuthContext'

export default function AISettings() {
  const { user } = useAuth()
  const [health, setHealth] = useState(null), [documents, setDocuments] = useState([])
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [title, setTitle] = useState(''), [text, setText] = useState('')
  const fileRef = useRef(null)
  const refresh = useCallback(async (signal) => {
    setBusy(true); setError('')
    try {
      const status = await getAiHealth(signal); setHealth(status)
      setDocuments(status.database.ready ? (await aiRequest('documents', 'GET', undefined, signal)).documents : [])
    } catch (err) { if (!signal?.aborted) setError(err.message) }
    finally { if (!signal?.aborted) setBusy(false) }
  }, [])
  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => controller.abort() }, [refresh, user?.id])
  async function ingest(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      const result = await aiRequest('documents', 'POST', { title, text })
      setNotice(result.duplicate ? 'This document is already indexed.' : `Indexed ${result.chunks} passages. Pulse can now retrieve this reference.`)
      setTitle(''); setText(''); await refresh()
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  async function remove(document) {
    if (!window.confirm(`Delete “${document.title}” and its indexed passages?`)) return
    setBusy(true); setError('')
    try { await aiRequest('documents', 'DELETE', { id: document.id }); await refresh(); setNotice('Document removed from the knowledge library.') }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  const canIngest = health?.database.ready && health?.embeddings
  return <div className="ai-library">
    <div className="card mb-24"><div className="card-header"><h3><Cpu size={18} /> AI connection</h3><button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => refresh()}><RefreshCw size={14} /> Check connection</button></div>
      <div className="card-body"><div className="ai-settings-grid">
        <div className="ai-status-card"><span className={`badge ${health?.ready ? 'badge-published' : 'badge-draft'}`}>{health?.ready ? 'Connected' : busy ? 'Checking…' : 'Source search only'}</span><h4>{health?.model || 'Public product guide'}</h4><p>{health?.message || 'Checking the actual API connection.'}</p></div>
        <div className="ai-status-card"><Database size={20} /><h4>Knowledge library</h4><p>{health?.database.message || 'Checking storage…'}</p><p className="text-sm text-muted">{health?.embeddings ? 'Semantic embeddings available · all-minilm · 384 dimensions' : 'Semantic embeddings unavailable; public keyword search remains available.'}</p></div>
      </div><p className="ai-notice">{health?.identity.mode === 'local-workspace' ? 'Local workspace: inference and your library stay on this computer. Preview roles share this local library. Local preview is not a multi-user deployment.' : user?.authenticated ? 'Documents are private to your verified account. Preview role switching cannot grant access.' : 'Preview access searches the public product guide. Sign in to manage private knowledge.'}</p>
        <p className="text-sm text-muted">Ollama is the free local default. Hosted providers require server configuration and may have quotas or charges. Provider secrets are never entered or stored in this browser.</p>
        {health?.checkedAt && <p className="text-sm text-muted">Last checked: {new Date(health.checkedAt).toLocaleString()}</p>}
      </div></div>
    <div className="card"><div className="card-header"><h3><Database size={18} /> Reference documents</h3></div><div className="card-body">
      <p>Add source material for Pulse to search. Review text before indexing. Up to 50 documents, 60,000 characters each. PDF/image OCR and web-link fetching are not supported.</p>
      <form onSubmit={ingest}>
        <div className="form-group"><label className="form-label" htmlFor="knowledge-title">Document title</label><input id="knowledge-title" className="form-input" maxLength={160} required value={title} onChange={e => setTitle(e.target.value)} /></div>
        <div className="form-group"><label className="form-label" htmlFor="knowledge-text">Reference text</label><textarea id="knowledge-text" className="form-input" minLength={40} maxLength={60000} required value={text} onChange={e => setText(e.target.value)} /><small>{text.length.toLocaleString()} / 60,000 characters</small></div>
        <input ref={fileRef} type="file" hidden accept=".txt,.md,.csv,.docx" onChange={async e => {
          const file = e.target.files?.[0]; e.target.value = ''; if (!file) return
          setBusy(true); setError('')
          try { const result = await readReferenceFile(file); if (result.text.length > 60000) throw new Error('Document exceeds 60,000 characters. Split it into smaller documents.'); setTitle(result.title); setText(result.text) }
          catch (err) { setError(err.message) } finally { setBusy(false) }
        }} />
        <div className="ai-actions"><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => fileRef.current?.click()}><Upload size={15} /> Read a file</button><button type="submit" className="btn btn-primary" disabled={busy || !canIngest || text.trim().length < 40 || !title.trim()}>{busy ? 'Working…' : 'Index document'}</button></div>
      </form>
      {error && <p className="ai-notice" role="alert">{error}</p>}{notice && <p className="ai-notice" role="status">{notice}</p>}
      <ul className="ai-document-list">{documents.map(document => <li key={document.id}><div><strong>{document.title}</strong><div className="text-sm text-muted">{new Date(document.created_at).toLocaleDateString()}</div></div><button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => remove(document)} aria-label={`Delete ${document.title}`}><Trash2 size={15} /></button></li>)}</ul>
      {!documents.length && <p className="text-sm text-muted">No private documents loaded. The public product guide remains available.</p>}
    </div></div>
  </div>
}
