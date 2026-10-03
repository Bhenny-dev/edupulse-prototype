import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, Trash2, MessageSquare, GitCompare, FileText, ShieldCheck, Check, X, Loader2, AlertTriangle } from 'lucide-react'
import { aiRequest, extractDocument, UPLOAD_ACCEPT } from '../../lib/aiClient'
import { pulse } from '../pulse/pulseBus'
import './ai.css'

const STAGES = [['upload', 'Upload'], ['extract', 'Sandboxed extraction'], ['clean', 'Clean'], ['evaluate', 'Evaluate'], ['review', 'Your review'], ['chunk', 'Chunk'], ['embed', 'Embed'], ['index', 'Index']]
const KIND = { pdf: 'pdf', docx: 'docx', pptx: 'pptx', html: 'html', markdown: 'markdown', text: 'text', csv: 'csv' }
const titleFor = report => (typeof report.meta?.title === 'string' && report.meta.title.trim().length > 3 ? report.meta.title.trim() : report.fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')).slice(0, 160)
const kb = bytes => bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`

function StageList({ item }) {
  const order = STAGES.map(([key]) => key)
  const position = item.status === 'queued' ? 0 : item.status === 'extracting' ? 1 : item.status === 'review' ? 4 : item.status === 'indexing' ? 5 : item.status === 'indexed' ? 8 : item.failedAt ?? 1
  return <ol className="kl-stages" aria-label="Pipeline progress">{STAGES.map(([key, label], i) => {
    const state = item.status === 'error' && i === position ? 'is-error' : i < position ? 'is-done' : i === position && item.status !== 'indexed' ? 'is-active' : ''
    return <li key={key} className={state}>{state === 'is-done' ? <Check size={11} /> : state === 'is-error' ? <X size={11} /> : state === 'is-active' && item.status !== 'review' ? <Loader2 size={11} className="spin" /> : null}{label}{item.timings?.[order[i]] !== undefined ? ` · ${item.timings[order[i]]} ms` : ''}</li>
  })}</ol>
}

function QualityReport({ report }) {
  const q = report.quality, grade = q.grade === 'good' ? '' : q.grade === 'fair' ? 'is-fair' : 'is-poor'
  return <div className="kl-report">
    <div><h5>Quality</h5><strong>{q.score}/100 · {q.grade}</strong><div className={`kl-meter ${grade}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={q.score} aria-label="Extraction quality"><span style={{ width: `${q.score}%` }} /></div>
      {q.warnings.length ? <ul className="kl-warnings">{q.warnings.map(w => <li key={w}>{w}</li>)}</ul> : <small>No extraction problems detected.</small>}</div>
    <div><h5>Content</h5>{q.metrics.words.toLocaleString()} words · {q.metrics.characters.toLocaleString()} characters<br />{q.metrics.pages ? `${q.metrics.pages} ${report.kind === 'pptx' ? 'slides' : 'pages'}${q.metrics.emptyPages ? ` (${q.metrics.emptyPages} without text)` : ''}` : `${q.metrics.headings} heading${q.metrics.headings === 1 ? '' : 's'}`}<br />Vocabulary variety {Math.round(q.metrics.uniqueWordRatio * 100)}%{report.truncated ? <><br /><strong>Truncated to 150,000 characters.</strong></> : null}</div>
    <div><h5><ShieldCheck size={12} /> Sandbox</h5>{report.sandbox.mode === 'isolated-worker' ? 'Isolated worker thread' : 'In-process (sandbox unavailable)'} · {report.sandbox.heapLimitMb} MB heap limit · {report.sandbox.timeoutMs / 1000} s limit · {report.sandbox.environment === 'empty' ? 'no access to server secrets' : 'server environment'}<br />Verified type: {report.kind.toUpperCase()} ({report.mime})</div>
    {q.injection.flagged && <div className="kl-flag"><AlertTriangle size={13} /> Instruction-like text found. Pulse will quote it as data and never follow it.<ul className="kl-warnings">{q.injection.samples.slice(0, 2).map(s => <li key={s}>“{s}”</li>)}</ul></div>}
  </div>
}

export default function KnowledgeLibrary({ canIndex, onChange }) {
  const [items, setItems] = useState([]), [documents, setDocuments] = useState([]), [over, setOver] = useState(false)
  const [selected, setSelected] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState(false), [paste, setPaste] = useState({ open: false, title: '', text: '' })
  const fileRef = useRef(null), queue = useRef(Promise.resolve())
  const update = (id, patch) => setItems(list => list.map(item => item.id === id ? { ...item, ...(typeof patch === 'function' ? patch(item) : patch) } : item))
  // The API allows one active request per account; uploads and indexing run in order instead of colliding.
  const enqueue = task => { const run = queue.current.then(task, task); queue.current = run.catch(() => undefined); return run }
  const load = useCallback(async signal => {
    if (!canIndex) { setDocuments([]); return }
    try { setDocuments((await aiRequest('documents', 'GET', undefined, signal)).documents) } catch (err) { if (!signal?.aborted) setError(err.message) }
  }, [canIndex])
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load])

  function add(files) {
    setError('')
    for (const file of files.slice(0, 5)) {
      const id = crypto.randomUUID()
      setItems(list => [{ id, file, status: 'queued', title: '', text: '', timings: {} }, ...list])
      void enqueue(async () => {
        update(id, { status: 'extracting' })
        const started = performance.now()
        try {
          const report = await extractDocument(file)
          update(id, { status: 'review', report, title: titleFor(report), text: report.text, timings: { upload: Math.round(performance.now() - started - report.stages.reduce((n, s) => n + s.ms, 0)), ...Object.fromEntries(report.stages.map(s => [s.name, s.ms])) } })
        } catch (err) { update(id, { status: 'error', error: err.message, failedAt: 1 }) }
      })
    }
  }
  function index(item) {
    update(item.id, { status: 'indexing', error: '' })
    return enqueue(async () => {
      try {
        const result = await aiRequest('documents', 'POST', { title: item.title.trim(), text: item.text, sourceType: KIND[item.report.kind] || 'text', fileName: item.report.fileName })
        update(item.id, current => ({ status: 'indexed', result, timings: { ...current.timings, ...Object.fromEntries(result.stages.map(s => [s.name, s.ms])) } }))
        await load(); onChange?.()
      } catch (err) { update(item.id, { status: 'error', error: err.message, failedAt: 5 }) }
    })
  }
  async function indexPasted(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await aiRequest('documents', 'POST', { title: paste.title.trim(), text: paste.text, sourceType: 'text' }); setPaste({ open: false, title: '', text: '' }); await load(); onChange?.() }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  async function remove(document) {
    if (!window.confirm(`Delete “${document.title}” and its ${document.chunks} indexed passages?`)) return
    setBusy(true); setError('')
    try { await aiRequest('documents', 'DELETE', { id: document.id }); setSelected(list => list.filter(id => id !== document.id)); await load(); onChange?.() }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const toggle = id => setSelected(list => list.includes(id) ? list.filter(x => x !== id) : list.length >= 2 ? [list[1], id] : [...list, id])
  const chosen = selected.map(id => documents.find(d => d.id === id)).filter(Boolean)

  return <div className="card" data-pulse-target="Knowledge library"><div className="card-header"><h3><FileText size={18} /> Knowledge library</h3><span className="badge badge-published">{documents.length}/50 documents</span></div><div className="card-body">
    <p>Add real course documents. Each file is checked, read in an isolated sandbox, cleaned and scored before you review the text. Indexed passages keep their page or section so Pulse can cite exact locations.</p>
    <div className={`kl-dropzone ${over ? 'is-over' : ''}`} data-pulse-target="Document upload" onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); add(Array.from(e.dataTransfer.files || [])) }}>
      <Upload size={26} aria-hidden="true" /><strong>Drop documents here</strong><p>PDF, DOCX, PPTX, HTML, TXT, Markdown or CSV · up to 4 MB each · scanned PDFs need OCR first</p>
      <input ref={fileRef} type="file" hidden multiple accept={UPLOAD_ACCEPT} aria-label="Choose documents to upload" onChange={e => { add(Array.from(e.target.files || [])); e.target.value = '' }} />
      <button type="button" className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}>Choose files</button>
    </div>
    {!canIndex && <p className="ai-notice">You can preview extraction now. Sign in as an instructor (or use the local app) to index documents into your private library.</p>}
    {items.length > 0 && <div className="kl-queue">{items.map(item => <section key={item.id} className="kl-item" aria-label={`Upload ${item.file.name}`}>
      <div className="kl-item-head"><strong>{item.file.name}</strong>{item.report && <span className="kl-type">{item.report.kind}</span>}<small>{kb(item.file.size)}</small><button type="button" className="btn btn-ghost btn-sm" onClick={() => setItems(list => list.filter(x => x.id !== item.id))} aria-label={`Dismiss ${item.file.name}`}><X size={14} /></button></div>
      <StageList item={item} />
      {item.status === 'queued' && <p role="status">Waiting for the previous file to finish…</p>}
      {item.status === 'extracting' && <p role="status">Reading the file in the sandbox…</p>}
      {item.error && <p role="alert" className="ai-notice">{item.error}</p>}
      {item.report && <QualityReport report={item.report} />}
      {item.status === 'review' && <div className="kl-review">
        <label className="form-label" htmlFor={`title-${item.id}`}>Document title</label>
        <input id={`title-${item.id}`} className="form-input" maxLength={160} value={item.title} onChange={e => update(item.id, { title: e.target.value })} />
        <details><summary>Review or correct the extracted text ({item.text.length.toLocaleString()} characters)</summary>
          <textarea className="form-input" aria-label={`Extracted text of ${item.file.name}`} value={item.text} maxLength={150000} onChange={e => update(item.id, { text: e.target.value })} />
          <small>[[Page n]] and [[Slide n]] lines keep citation locations; lines starting with # mark sections.</small></details>
        <div className="ai-actions" style={{ marginTop: 10 }}><button type="button" className="btn btn-primary btn-sm" disabled={!canIndex || !item.title.trim() || item.text.trim().length < 40} onClick={() => index(item)}>Index document</button><button type="button" className="btn btn-secondary btn-sm" onClick={() => setItems(list => list.filter(x => x.id !== item.id))}>Discard</button></div>
      </div>}
      {item.status === 'indexing' && <p role="status">Chunking, embedding and indexing…</p>}
      {item.status === 'indexed' && <div role="status" className="ai-notice">{item.result.duplicate ? 'This document is already in your library.' : <>Indexed <strong>{item.result.chunks} passages</strong>{item.result.pages ? ` from ${item.result.pages} pages` : ''}{item.result.sections ? ` in ${item.result.sections} sections` : ''} with {item.result.embeddingModel}.{item.result.flaggedChunks ? ` ${item.result.flaggedChunks} passages are marked as containing instruction-like text.` : ''}</>}
        <ul className="kl-timings">{item.result.stages.map(s => <li key={s.name}><strong>{s.name}</strong> · {s.ms} ms · {s.detail}</li>)}</ul></div>}
    </section>)}</div>}
    <details style={{ marginTop: 16 }} open={paste.open} onToggle={e => setPaste(p => ({ ...p, open: e.currentTarget.open }))}><summary>Paste text instead</summary>
      <form onSubmit={indexPasted} className="kl-review">
        <label className="form-label" htmlFor="paste-title">Document title</label><input id="paste-title" className="form-input" maxLength={160} required value={paste.title} onChange={e => setPaste(p => ({ ...p, title: e.target.value }))} />
        <label className="form-label" htmlFor="paste-text">Reference text</label><textarea id="paste-text" className="form-input" minLength={40} maxLength={150000} required value={paste.text} onChange={e => setPaste(p => ({ ...p, text: e.target.value }))} />
        <button className="btn btn-primary btn-sm" disabled={!canIndex || busy}>{busy ? 'Indexing…' : 'Index text'}</button>
      </form></details>
    {error && <p role="alert" className="ai-notice">{error}</p>}
    {canIndex && <>
      <h4 style={{ marginTop: 20 }}>Indexed documents</h4>
      {documents.length ? <div style={{ overflowX: 'auto' }}><table className="kl-library"><thead><tr><th scope="col"><span className="sr-only">Select for comparison</span></th><th scope="col">Document</th><th scope="col">Type</th><th scope="col">Passages</th><th scope="col">Quality</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>
        {documents.map(document => <tr key={document.id}>
          <td><input type="checkbox" checked={selected.includes(document.id)} onChange={() => toggle(document.id)} aria-label={`Select ${document.title} for comparison`} /></td>
          <td><strong>{document.title}</strong><div className="text-sm text-muted">{document.page_count ? `${document.page_count} pages · ` : ''}{(document.char_count || 0).toLocaleString()} characters · {new Date(document.created_at).toLocaleDateString()}</div></td>
          <td><span className="kl-type">{document.source_type}</span></td><td>{document.chunks}</td>
          <td>{typeof document.quality?.score === 'number' ? `${document.quality.score}/100` : '—'}{document.quality?.injectionFlagged ? <AlertTriangle size={13} aria-label="Contains instruction-like text" /> : null}</td>
          <td><div className="kl-actions"><button type="button" className="btn btn-secondary btn-sm" onClick={() => pulse.ask(`Summarize “${document.title}” and list its key points.`, { documentIds: [document.id], task: 'summarize', label: document.title })}><MessageSquare size={13} /> Ask Pulse</button><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => remove(document)} aria-label={`Delete ${document.title}`}><Trash2 size={14} /></button></div></td>
        </tr>)}
      </tbody></table></div> : <p className="text-sm text-muted">No private documents yet. The public product guide remains available to Pulse.</p>}
      <div className="kl-compare-bar" data-pulse-target="Compare documents"><GitCompare size={15} />{chosen.length === 2 ? <span>Compare <strong>{chosen[0].title}</strong> with <strong>{chosen[1].title}</strong></span> : <span>Select two documents to compare their coverage and alignment.</span>}
        <button type="button" className="btn btn-primary btn-sm" disabled={chosen.length !== 2} onClick={() => pulse.ask(`Compare “${chosen[0].title}” with “${chosen[1].title}”: what do they share, and what appears in only one?`, { documentIds: selected, task: 'compare', label: 'Compare documents' })}>Compare in Pulse</button></div>
    </>}
  </div></div>
}
