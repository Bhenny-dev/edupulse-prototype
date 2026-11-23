import { useState } from 'react'
import { ExternalLink, Link as LinkIcon, Video, FileText, Presentation, Table2, ClipboardList, HardDrive, PenTool, Play, X } from 'lucide-react'
import { linkProvider, linkAttachment, youtubeId } from '../../utils/classroom'
import './classroom.css'

const ICONS = { youtube: Video, 'google-docs': FileText, 'google-slides': Presentation, 'google-sheets': Table2, 'google-forms': ClipboardList, 'google-drawings': PenTool, 'google-drive': HardDrive, link: LinkIcon }

/** A provider link: it opens with its provider, and a YouTube video can play here (privacy-enhanced player). */
export function LinkCard({ link, onRemove, embed = true }) {
  const provider = linkProvider(link.url), Icon = ICONS[provider.id] || LinkIcon, video = embed ? youtubeId(link.url) : null
  const [playing, setPlaying] = useState(false)
  let host = ''
  try { host = new URL(link.url).hostname.replace(/^www\./, '') } catch { /* Saved links were validated when added. */ }
  const name = link.title || provider.label
  return <article className="class-link-card" data-provider={provider.id} aria-label={`${provider.label}: ${name}`}>
    <div className="class-link-row">
      <span className="class-link-icon" aria-hidden="true"><Icon size={20} /></span>
      <span className="class-link-copy"><strong>{name}</strong><span className="text-sm text-muted">{provider.label}{host ? ` · ${host}` : ''}</span></span>
      <span className="class-link-actions">
        {video && !playing && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPlaying(true)}><Play size={14} aria-hidden="true" />Play here</button>}
        <a className="btn btn-secondary btn-sm" href={link.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" />{provider.open}</a>
        {onRemove && <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove link ${name}`} onClick={onRemove}><X size={14} aria-hidden="true" /></button>}
      </span>
    </div>
    {video && playing && <div className="class-link-video"><iframe title={`YouTube video: ${name}`} src={`https://www.youtube-nocookie.com/embed/${video}`} allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /><p className="text-sm text-muted">If the video does not play, its owner may not allow playing it elsewhere. Use {provider.open}.</p></div>}
  </article>
}

/** Paste a Drive, Docs, Slides, Sheets, Forms, YouTube or web link. No form element: it may sit inside another form. */
export function LinkForm({ onAdd, disabled = false, label = 'Add link', note }) {
  const [open, setOpen] = useState(false), [url, setUrl] = useState(''), [title, setTitle] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const provider = url.trim() ? linkProvider(url) : null
  const add = async () => {
    if (busy || disabled) return
    setError('')
    let link
    try { link = linkAttachment(url, title) } catch (failure) { setError(failure.message); return }
    setBusy(true)
    try { await onAdd(link); setUrl(''); setTitle(''); setOpen(false) } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  const enter = event => { if (event.key === 'Enter') { event.preventDefault(); void add() } }
  if (!open) return <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={() => setOpen(true)}><LinkIcon size={14} aria-hidden="true" />{label}</button>
  return <div className="class-link-form" role="group" aria-label="Add a link">
    <label className="form-label">Link<input className="form-input" type="url" inputMode="url" value={url} autoFocus placeholder="https://drive.google.com/..." onKeyDown={enter} onChange={event => { setUrl(event.target.value); setError('') }} /></label>
    {provider && <p className="text-sm text-muted" role="status">Recognized as {provider.label}.</p>}
    <label className="form-label">Title (optional)<input className="form-input" maxLength={200} value={title} onKeyDown={enter} onChange={event => setTitle(event.target.value)} /></label>
    <p className="text-sm text-muted">{note || 'The file stays with its provider. Share it so your students can open it, for example with anyone at the College who has the link.'}</p>
    {error && <p role="alert">{error}</p>}
    <div className="class-link-form-actions"><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setOpen(false); setError('') }}>Cancel</button><button type="button" className="btn btn-primary btn-sm" disabled={busy || disabled || !url.trim()} onClick={() => void add()}>{busy ? 'Adding link...' : 'Add link'}</button></div>
  </div>
}
