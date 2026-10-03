import { useState } from 'react'
import { Copy, ExternalLink, PenLine } from 'lucide-react'
import { AGENT_META } from './agentMeta'
import './ai.css'

const STATUS = {
  supported: 'Supported by the cited source', corroborated: 'Supported by two or more documents', partial: 'Partly supported; check the source', uncited: 'Supported by a source but not cited',
  unsupported: 'Not found in the cited source', miscited: 'Cited the wrong source', general: 'General knowledge, not from your sources',
}
const ORIGIN = { private: 'Your library', 'public-guide': 'Product guide', attachment: 'Attached file' }
const percent = value => value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`

/** One line of answer text with verified claims marked and citations as buttons that open their source. */
function markLine(line, claims, grounded, onCite, used, key) {
  const marks = []
  claims.forEach((claim, index) => {
    if (used.has(index)) return
    const start = line.indexOf(claim.text)
    if (start < 0 || marks.some(m => start < m.end && start + claim.text.length > m.start)) return
    const status = claim.corroboratedBy >= 2 && claim.status === 'supported' ? 'corroborated' : claim.status
    if (status === 'general' && !grounded) return
    used.add(index)
    marks.push({ start, end: start + claim.text.length, status, claim })
  })
  marks.sort((a, b) => a.start - b.start)
  // Markdown bold markers are dropped from display; citations become buttons.
  const cite = (segment, id) => segment.split(/(\[\d{1,2}\])/).map((piece, i) => {
    const n = piece.match(/^\[(\d{1,2})\]$/)?.[1]
    return n ? <button key={`${id}-${i}`} type="button" className="aa-cite" onClick={() => onCite(Number(n))} aria-label={`Open source ${n}`}>{n}</button> : piece.replace(/\*\*/g, '')
  })
  const parts = []
  let cursor = 0
  marks.forEach((mark, i) => {
    if (mark.start > cursor) parts.push(<span key={`${key}t${i}`}>{cite(line.slice(cursor, mark.start), `${key}t${i}`)}</span>)
    const detail = `${STATUS[mark.status]}${mark.claim.bestSource ? ` · best match: source ${mark.claim.bestSource}` : ''} · support ${Math.round(mark.claim.support * 100)}%`
    parts.push(<span key={`${key}c${i}`} className={`aa-claim is-${mark.status}`} title={detail} data-claim-status={mark.status}>{cite(line.slice(mark.start, mark.end), `${key}c${i}`)}</span>)
    cursor = mark.end
  })
  if (cursor < line.length) parts.push(<span key={`${key}end`}>{cite(line.slice(cursor), `${key}end`)}</span>)
  return parts
}

/** Answer text rendered line by line so Markdown headings and bullets read as structure, not symbols. */
function AnswerText({ text, claims = [], grounded, onCite }) {
  const used = new Set()
  return <div className="aa-text">{text.split('\n').map((line, i) => {
    const heading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/)
    const bullet = !heading && line.match(/^(\s*)[-*•]\s+(.*)$/)
    if (heading) return <div key={i} className="aa-heading" role="heading" aria-level={4}>{markLine(heading[1], claims, grounded, onCite, used, i)}</div>
    if (bullet) return <div key={i} className="aa-bullet" style={{ '--indent': `${Math.min(3, Math.floor(bullet[1].length / 2))}` }}>{markLine(bullet[2], claims, grounded, onCite, used, i)}</div>
    return <div key={i} className={line.trim() ? undefined : 'aa-gap'}>{markLine(line, claims, grounded, onCite, used, i)}</div>
  })}</div>
}

export default function AgentAnswer({ message, onRevise }) {
  const [openSource, setOpenSource] = useState(null), [revising, setRevising] = useState(false), [note, setNote] = useState(''), [copied, setCopied] = useState('')
  const v = message.verification, grounded = message.sources?.length > 0 && ['answer', 'summarize', 'compare'].includes(message.task)
  const showSource = n => { setOpenSource(n); requestAnimationFrame(() => document.getElementById(`${message.requestId}-source-${n}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })) }
  const copy = async reference => {
    const text = `${reference.authors.join(', ')}${reference.year ? ` (${reference.year})` : ''}. ${reference.title}.${reference.venue ? ` ${reference.venue}.` : ''} ${reference.url}`
    try { await navigator.clipboard.writeText(text); setCopied(reference.url) } catch { setCopied('') }
  }
  return <>
    <AnswerText text={message.text} claims={v?.claims} grounded={grounded} onCite={showSource} />
    <div className="aa-badges">
      {message.agents?.length > 0 && <span className="aa-badge">{message.agents.length} agents</span>}
      {v && v.groundedness !== null && <span className={`aa-badge ${v.unsupported ? 'is-warn' : 'is-good'}`} title="Share of statements supported by the retrieved sources">Grounded {percent(v.groundedness)}</span>}
      {v && v.citationAccuracy !== null && <span className={`aa-badge ${v.citationAccuracy < 1 ? 'is-warn' : 'is-good'}`} title="Cited statements that their cited source supports">Citations {percent(v.citationAccuracy)}</span>}
      {v?.corroborated > 0 && <span className="aa-badge is-good" title="Statements supported by two or more different documents">{v.corroborated} corroborated</span>}
      {v?.unsupported > 0 && <span className="aa-badge is-warn">{v.unsupported} not found in sources</span>}
      {v && <span className="aa-badge" title="How claims were checked">{v.method === 'semantic+lexical' ? 'Semantic + lexical check' : 'Lexical check'}</span>}
    </div>
    {grounded && v?.claims?.length > 0 && <div className="aa-legend" aria-hidden="true"><span style={{ '--legend': 'var(--green-500)' }}>supported</span><span style={{ '--legend': 'var(--amber-500)' }}>partial</span><span style={{ '--legend': 'var(--red-500)' }}>not found</span></div>}
    {message.comparison && <details open><summary>Comparison · coverage {percent(message.comparison.coverage)}</summary>
      <table className="aa-compare"><thead><tr><th>{message.comparison.leftTitle}</th><th>{message.comparison.rightTitle}</th></tr></thead><tbody>
        {message.comparison.shared.map((pair, i) => <tr key={`s${i}`}><td>{pair.left}</td><td>{pair.right}</td></tr>)}
        {message.comparison.related.map((pair, i) => <tr key={`r${i}`}><td>{pair.left}</td><td><em>Related:</em> {pair.right}</td></tr>)}
        {message.comparison.onlyLeft.map((text, i) => <tr key={`l${i}`}><td>{text}</td><td><em>Not covered</em></td></tr>)}
        {message.comparison.onlyRight.map((text, i) => <tr key={`o${i}`}><td><em>Not covered</em></td><td>{text}</td></tr>)}
      </tbody></table><small>Alignment and coverage only. This is not plagiarism or authorship detection.</small></details>}
    {message.references?.length > 0 && <details open><summary>References from open catalogs ({message.references.length})</summary><ol className="aa-refs">{message.references.map(reference => <li key={reference.url}>
      <a href={reference.url} target="_blank" rel="noreferrer noopener">{reference.title} <ExternalLink size={11} aria-hidden="true" /></a>
      <div>{[reference.authors.slice(0, 3).join(', '), reference.year, reference.venue].filter(Boolean).join(' · ')}</div>
      <small>{reference.source} · {reference.identifier}{reference.relevance !== null ? ` · relevance ${percent(reference.relevance)}` : ''}</small>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(reference)}><Copy size={12} /> {copied === reference.url ? 'Copied' : 'Copy citation'}</button>
    </li>)}</ol><small>Verify availability and fit before adding a reference to Section 7.</small></details>}
    {message.sources?.length > 0 && <details open={openSource !== null}><summary>Sources ({message.sources.length})</summary>{message.sources.map(source => <div key={source.id} id={`${message.requestId}-source-${source.citation}`} className={`aa-source ${openSource === source.citation ? 'is-open' : ''}`}>
      <header><strong>[{source.citation}] {source.title}</strong>{source.page && <span>p. {source.page}</span>}{source.section && <span>· {source.section}</span>}</header>
      <small>{ORIGIN[source.origin] || 'Source'} · {source.method === 'hybrid' ? 'vector + keyword match' : source.method === 'vector' ? 'semantic match' : source.method === 'keyword' ? 'keyword match' : 'provided'}{source.relevance !== null && source.relevance !== undefined ? ` · reranker score ${source.relevance.toFixed(1)}` : ''}{source.similarity !== null && source.similarity !== undefined ? ` · cosine ${source.similarity.toFixed(2)}` : ''}</small>
      {source.flagged && <p className="kl-flag">This passage contains instruction-like text. Pulse treated it only as quoted data.</p>}
      <p>{source.text}</p>
    </div>)}</details>}
    {message.trace?.length > 0 && <details><summary>How Pulse worked on this ({message.trace.length} steps)</summary><ol className="aa-timeline">{message.trace.map((step, i) => <li key={i} style={{ '--agent-color': AGENT_META[step.agent]?.color }}>
      <strong>{step.agent}</strong> · {step.action}<small>{step.ms} ms{step.status !== 'done' ? ` · ${step.status}` : ''}</small><div>{step.detail}</div>
    </li>)}</ol></details>}
    {onRevise && message.mode === 'generated' && (revising
      ? <form className="aa-revise" onSubmit={event => { event.preventDefault(); if (note.trim()) { onRevise(note.trim()); setNote(''); setRevising(false) } }}>
        <input className="form-input" autoFocus value={note} maxLength={500} onChange={e => setNote(e.target.value)} placeholder="What should Pulse change or check?" aria-label="Revision request" />
        <button className="btn btn-primary btn-sm" disabled={!note.trim()}>Revise</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => setRevising(false)}>Cancel</button>
      </form>
      : <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRevising(true)}><PenLine size={13} /> Request a revision</button>)}
  </>
}
