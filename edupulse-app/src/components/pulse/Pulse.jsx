import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { X, Send, Paperclip, Square, Settings, BookOpen, Trash2 } from 'lucide-react'
import PulseAvatar from './PulseAvatar'
import { pulse as pulseBus } from './pulseBus'
import { useAuth } from '../../context/AuthContext'
import { askPulse, getAiHealth, readReferenceFile } from '../../lib/aiClient'
import { getAgentForZone, intentsForRole } from '../../agents'
import './connected-pulse.css'

export default function Pulse() {
  const { user } = useAuth()
  const location = useLocation(), navigate = useNavigate()
  const [open, setOpen] = useState(false), [messages, setMessages] = useState([])
  const [input, setInput] = useState(''), [attachments, setAttachments] = useState([])
  const [busy, setBusy] = useState(false), [fileBusy, setFileBusy] = useState(false)
  const [expression, setExpression] = useState('idle'), [health, setHealth] = useState(null)
  const [error, setError] = useState(''), [guide, setGuide] = useState(null)
  const [stepIndex, setStepIndex] = useState(0), [agent, setAgent] = useState(null)
  const requestRef = useRef(null), feedRef = useRef(null), inputRef = useRef(null), fileRef = useRef(null), dockRef = useRef(null)

  useEffect(() => pulseBus.subscribe(event => {
    if (event.type === 'expression') setExpression(event.expression)
    if (event.type === 'say') {
      setOpen(true); setExpression(event.expression || 'curious')
      setMessages(previous => [...previous, { id: crypto.randomUUID(), from: 'pulse', text: event.message, mode: 'App notification', actions: event.actions }])
    }
  }), [])
  useEffect(() => {
    requestRef.current?.abort(); requestRef.current = null
    setMessages([]); setAttachments([]); setInput(''); setError(''); setBusy(false); setHealth(null)
  }, [user?.id, user?.role])
  useEffect(() => {
    const zone = document.querySelector('[data-pulse-zone]')?.getAttribute('data-pulse-zone')
    setAgent(zone ? getAgentForZone(zone, user?.role) : null); setGuide(null); setStepIndex(0)
  }, [location.pathname, user?.role, open])
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    getAiHealth(controller.signal).then(setHealth).catch(err => { if (!controller.signal.aborted) setError(err.message) })
    inputRef.current?.focus()
    return () => controller.abort()
  }, [open, user?.id])
  useEffect(() => { feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight }) }, [messages, busy])
  useEffect(() => () => requestRef.current?.abort(), [])
  const close = useCallback(() => { setOpen(false); dockRef.current?.focus() }, [])
  useEffect(() => {
    const escape = e => { if (e.key === 'Escape' && open) close() }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [open, close])

  async function attachFiles(files) {
    setError(''); setFileBusy(true)
    try {
      if (attachments.length + files.length > 3) throw new Error('Attach up to three references per message.')
      const refs = await Promise.all(files.map(readReferenceFile))
      if (refs.some(ref => ref.text.length > 18000)) throw new Error('Chat references must contain at most 18,000 characters. Add longer documents to your knowledge library.')
      setAttachments(previous => [...previous, ...refs])
    } catch (err) { setError(err.message) }
    finally { setFileBusy(false) }
  }
  async function send(event) {
    event?.preventDefault()
    if (busy || fileBusy || !input.trim()) return
    const question = input.trim()
    const history = messages.filter(m => m.from === 'user' || m.mode === 'generated').slice(-8).map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text.slice(0, 5000) }))
    const controller = new AbortController(); requestRef.current = controller
    setError(''); setBusy(true); setExpression('thinking'); setInput('')
    setMessages(previous => [...previous, { id: crypto.randomUUID(), from: 'user', text: question, attachedNames: attachments.map(a => a.title) }])
    try {
      const result = await askPulse({ message: question, history, context: `Page: ${location.pathname}. Guide: ${guide?.label || ''}. Section: ${guide?.steps?.[stepIndex]?.title || ''}`, attachments }, controller.signal)
      if (controller.signal.aborted) return
      setMessages(previous => [...previous, { id: result.requestId, from: 'pulse', text: result.answer, ...result }])
      setAttachments([]); setExpression('encouraging')
    } catch (err) {
      if (requestRef.current === controller) { setError(controller.signal.aborted ? 'Request stopped. You can edit and resend your question.' : err.message); setInput(question); setExpression('concern') }
    } finally { if (requestRef.current === controller) { setBusy(false); requestRef.current = null } }
  }
  const step = guide?.steps?.[stepIndex]
  return <>
    {open && <section className="connected-pulse" role="dialog" aria-modal="false" aria-labelledby="pulse-title">
      <header className="connected-pulse-header">
        <div><strong id="pulse-title">Pulse</strong><small>{health?.ready ? `${health.provider} · ${health.model}` : 'Source-guided assistant'}</small></div>
        <button type="button" onClick={() => { requestRef.current?.abort(); requestRef.current = null; setBusy(false); setMessages([]); setError('') }} aria-label="Clear conversation"><Trash2 size={16} /></button>
        <button type="button" onClick={() => { close(); navigate('/settings?tab=ai-provider') }} aria-label="AI and knowledge settings"><Settings size={17} /></button>
        <button type="button" onClick={close} aria-label="Close Pulse"><X size={19} /></button>
      </header>
      <div className="connected-pulse-status">{health?.message || 'Checking connection…'}</div>
      <div className="connected-pulse-feed" ref={feedRef} role="log" aria-live="polite" aria-busy={busy}>
        {messages.length === 0 && <div className="connected-pulse-welcome"><BookOpen size={24} /><h3>Ask with context. Review with sources.</h3><p>Ask about an EduPulse workflow or attach a reference. I’ll show the passages used and flag missing evidence.</p><button className="btn btn-secondary btn-sm" onClick={() => setInput('How do I generate and publish courseware?')}>How does courseware publishing work?</button></div>}
        {agent && <details className="connected-pulse-guide"><summary>{agent.label} page guide</summary>
          {intentsForRole(agent, user?.role).map(intent => <button key={intent.key} className="btn btn-secondary btn-sm" onClick={() => { setGuide(intent); setStepIndex(0) }}>{intent.label}</button>)}
          {step && <div><strong>{step.title}</strong><p>{step.body}</p>{step.tip && <p>{step.tip}</p>}<div className="ai-actions">
            <button className="btn btn-secondary btn-sm" disabled={stepIndex === 0} onClick={() => setStepIndex(i => i - 1)}>Previous</button>
            {step.section && <button className="btn btn-secondary btn-sm" onClick={() => { document.querySelector(`[data-section="${step.section}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); close() }}>Go to section {step.section}</button>}
            <button className="btn btn-secondary btn-sm" disabled={stepIndex >= guide.steps.length - 1} onClick={() => setStepIndex(i => i + 1)}>Next</button>
          </div></div>}
        </details>}
        {messages.map(message => <article key={message.id} className={`connected-pulse-message ${message.from === 'user' ? 'from-user' : ''}`}>
          <small>{message.from === 'user' ? 'You' : message.mode === 'generated' ? 'Pulse · AI draft' : message.mode === 'retrieval' ? 'Pulse · Source excerpts' : 'Pulse'}</small>
          <div className="connected-pulse-text">{message.text}</div>
          {message.attachedNames?.length > 0 && <small>References: {message.attachedNames.join(', ')}</small>}
          {message.warning && <p className="connected-pulse-warning">{message.warning}</p>}
          {message.sources?.length > 0 && <details><summary>View sources ({message.sources.length})</summary>{message.sources.map(source => <blockquote key={source.id}><strong>[{source.citation}] {source.title}</strong><small>{source.method === 'vector' ? 'Semantic match' : source.method === 'provided' ? 'Attached reference' : 'Keyword match'}</small><p>{source.text}</p></blockquote>)}</details>}
          {message.trace?.length > 0 && <details><summary>Processing steps</summary><ol>{message.trace.map((item, index) => <li key={index}><strong>{item.node}</strong>: {item.detail}</li>)}</ol></details>}
          {message.actions?.map(action => <button key={action.label} className="btn btn-secondary btn-sm" onClick={() => { action.onClick?.(); if (action.path) navigate(action.path) }}>{action.label}</button>)}
        </article>)}
        {busy && <p role="status">Retrieving references and preparing a response…</p>}
      </div>
      {error && <div role="alert" className="connected-pulse-error">{error}</div>}
      {attachments.length > 0 && <ul className="connected-pulse-attachments">{attachments.map((a, i) => <li key={i}>{a.title}<button aria-label={`Remove ${a.title}`} onClick={() => setAttachments(previous => previous.filter((_, index) => i !== index))}><X size={13} /></button></li>)}</ul>}
      <form className="connected-pulse-form" onSubmit={send}>
        <input ref={fileRef} type="file" hidden multiple accept=".txt,.md,.csv,.docx" onChange={e => { void attachFiles(Array.from(e.target.files || [])); e.target.value = '' }} />
        <button type="button" disabled={busy || fileBusy} onClick={() => fileRef.current?.click()} aria-label="Attach reference"><Paperclip size={18} /></button>
        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} maxLength={4000} rows={2} placeholder="Ask Pulse a question…" aria-label="Ask Pulse" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send() } }} />
        {busy ? <button type="button" onClick={() => requestRef.current?.abort()} aria-label="Stop response"><Square size={17} /></button> : <button type="submit" disabled={!input.trim() || fileBusy} aria-label="Send"><Send size={18} /></button>}
      </form><small className="connected-pulse-footnote">{fileBusy ? 'Reading reference…' : 'AI drafts need review. Sources are evidence, not a guarantee of correctness.'}</small>
    </section>}
    <button ref={dockRef} className="connected-pulse-dock" onClick={() => setOpen(value => !value)} aria-label={open ? 'Close Pulse assistant' : 'Open Pulse assistant'} aria-expanded={open}><PulseAvatar expression={expression} size={72} /><span>Pulse</span></button>
  </>
}
