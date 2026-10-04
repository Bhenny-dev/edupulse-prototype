import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { X, Send, Paperclip, Square, Settings, BookOpen, Trash2, Route, Sparkles } from 'lucide-react'
import PulseAvatar from './PulseAvatar'
import { pulse as pulseBus } from './pulseBus'
import { useAuth } from '../../context/AuthContext'
import { askPulse, readReferenceFile, UPLOAD_ACCEPT } from '../../lib/aiClient'
import { getAgentForZone, intentsForRole } from '../../agents'
import { approvalResumeStep, prepareIntent, previewAgents, stepReadiness, stepTarget } from '../../agents/guidance'
import { useAI } from '../../context/AIContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import usePulseInteraction, { DwellHelp, FocusSpotlight } from './usePulseInteraction'
import { briefText, componentTour, describeSentence, describeTarget, liveStepBody } from './targets'
import AgentAnswer from '../ai/AgentAnswer'
import './connected-pulse.css'

const modeLabel = message => message.from === 'user' ? 'You' : message.mode === 'generated' ? `Pulse · ${message.grounding === 'general' ? 'General assistance' : 'Verified answer with sources'}` : message.mode === 'retrieval' ? 'Pulse · Source excerpts' : message.mode === 'references' ? 'Pulse · Librarian' : message.mode === 'insufficient-evidence' ? 'Pulse · Missing evidence' : 'Pulse'

export default function Pulse() {
  const { user } = useAuth()
  const { syllabi } = useWorkspace()
  const ai = useAI()
  const refreshAI = ai.refresh
  const location = useLocation(), navigate = useNavigate()
  const [open, setOpen] = useState(false), [messages, setMessages] = useState([])
  const [input, setInput] = useState(''), [attachments, setAttachments] = useState([])
  const [busy, setBusy] = useState(false), [fileBusy, setFileBusy] = useState(false)
  const [expression, setExpression] = useState('idle')
  const [error, setError] = useState(''), [guide, setGuide] = useState(null)
  const [stepIndex, setStepIndex] = useState(0), [agent, setAgent] = useState(null)
  const [focus, setFocus] = useState(null), [events, setEvents] = useState(new Set()), [ready, setReady] = useState(true), [completed, setCompleted] = useState(false)
  const [missingTarget, setMissingTarget] = useState(false), [side, setSide] = useState('right')
  const requestRef = useRef(null), feedRef = useRef(null), inputRef = useRef(null), fileRef = useRef(null), dockRef = useRef(null), sendRef = useRef(null)

  useEffect(() => pulseBus.subscribe(event => {
    if (event.type === 'progress') { setEvents(previous => new Set([...previous, event.name])); setExpression('cheerful') }
    if (event.type === 'expression') setExpression(event.expression)
    if (event.type === 'say') {
      setOpen(true); setExpression(event.expression || 'curious')
      setMessages(previous => [...previous, { id: crypto.randomUUID(), from: 'pulse', text: event.message, mode: 'App notification', actions: event.actions }])
    }
    if (event.type === 'ask') { setOpen(true); void sendRef.current?.(event.message, { documentIds: event.documentIds, task: event.task, scope: event.label }) }
  }), [])
  useEffect(() => {
    requestRef.current?.abort(); requestRef.current = null
    setMessages([]); setAttachments([]); setInput(''); setError(''); setBusy(false); setFocus(null); setGuide(null); setEvents(new Set()); setCompleted(false)
  }, [user?.id, user?.role])
  useEffect(() => {
    const zone = document.querySelector('[data-pulse-zone]')?.getAttribute('data-pulse-zone') || 'general'
    const next = getAgentForZone(zone, user?.role)
    setAgent(next)
    setFocus(previous => previous?.agent.id === next?.id && previous.element.isConnected ? previous : null)
    setGuide(previous => previous?.agentId === next?.id ? previous : null)
  }, [location.pathname, user?.role])
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    refreshAI(controller.signal).catch(err => { if (!controller.signal.aborted) setError(err.message) })
    inputRef.current?.focus()
    return () => controller.abort()
  }, [open, user?.id, refreshAI])
  useEffect(() => { feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight }) }, [messages, busy])
  useEffect(() => () => requestRef.current?.abort(), [])
  const close = useCallback(() => { setOpen(false); setFocus(null); dockRef.current?.focus() }, [])
  const focusTarget = useCallback(target => {
    setFocus(target); setAgent(target.agent); setOpen(true); setGuide(null); setStepIndex(0); setCompleted(false); setEvents(new Set()); setExpression('curious')
  }, [])
  const interaction = usePulseInteraction({ dockRef, role: user?.role, onTarget: focusTarget, onToggle: () => { if (open) close(); else setOpen(true) } })
  const { perch, reset: resetDock } = interaction
  // Pulse perches beside the component it is helping with; the panel opens on the side away from
  // the perched mascot so the two never cover each other (wide targets put the mascot on the left).
  useEffect(() => {
    if (!focus?.element?.isConnected) { resetDock(); setSide('right'); return }
    perch(focus.element)
    const dock = dockRef.current, r = focus.element.getBoundingClientRect()
    const mascotCenter = dock?.style.left ? parseFloat(dock.style.left) + dock.offsetWidth / 2 : r.left + r.width / 2
    setSide(innerWidth >= 900 && mascotCenter > innerWidth / 2 ? 'left' : 'right')
  }, [focus, perch, resetDock])
  const step = guide?.steps?.[stepIndex]
  useEffect(() => {
    const check = () => setReady(stepReadiness(step, events, guide, syllabi))
    check(); document.addEventListener('input', check); document.addEventListener('change', check)
    return () => { document.removeEventListener('input', check); document.removeEventListener('change', check) }
  }, [step, events, location.search, guide, syllabi])
  useEffect(() => {
    if (!focus) return
    const outside = event => { if (!event.target.closest('[data-pulse-ui]') && !focus.zoneElement.contains(event.target)) setFocus(null) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [focus])
  useEffect(() => {
    setMissingTarget(false)
    if (!step || completed) return
    let attempts = 0, frame = 0
    // Pages render after navigation; look for the step's control for up to ~1 s before reporting it missing.
    const locate = () => {
      const target = stepTarget(step)
      if (target) {
        target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' })
        const described = describeTarget(target, user?.role)
        if (described) setFocus(previous => previous?.element === described.element ? previous : described)
      } else if (step.section || step.target || step.element) { if (++attempts < 60) frame = requestAnimationFrame(locate); else setMissingTarget(true) }
    }
    frame = requestAnimationFrame(locate)
    return () => cancelAnimationFrame(frame)
  }, [step, completed, location.search, user?.role])
  function chooseIntent(intent) {
    const prepared = intent.key === 'component-tour' ? { ...intent, agentId: agent?.id } : prepareIntent(agent, intent)
    if (intent.key === 'activate') prepared.recordId = focus?.recordId || ''
    const index = intent.key === 'activate' ? approvalResumeStep(syllabi.find(s => s.id === prepared.recordId)) : intent.key === 'walkthrough' && focus?.section ? Math.max(0, prepared.steps.findIndex(s => String(s.section) === focus.section)) : 0
    setGuide(prepared); setStepIndex(index); setCompleted(false); setEvents(new Set())
    if (intent.key === 'activate') navigate('/syllabus?tab=mine')
    else if (prepared.steps[index]?.path) navigate(prepared.steps[index].path)
  }
  function nextStep() {
    if (!stepReadiness(step, events, guide, syllabi)) { setReady(false); return }
    if (stepIndex === guide.steps.length - 1) { setCompleted(true); setExpression('cheerful'); setFocus(null); return }
    const next = guide.steps[stepIndex + 1]; setStepIndex(i => i + 1)
    if (next.path) navigate(next.path)
  }
  useEffect(() => {
    const escape = e => { if (e.key === 'Escape' && open) close() }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [open, close])

  async function attachFiles(files) {
    setError(''); setFileBusy(true)
    try {
      if (attachments.length + files.length > 3) throw new Error('Attach up to three references per message.')
      // Attachments go through the same sandboxed extraction as the knowledge library.
      const refs = await Promise.all(files.map(readReferenceFile))
      if (refs.some(ref => ref.text.length > 18000)) throw new Error('Chat references must contain at most 18,000 characters. Add longer documents to your knowledge library in AI settings.')
      setAttachments(previous => [...previous, ...refs])
    } catch (err) { setError(err.message) }
    finally { setFileBusy(false) }
  }
  async function send(text, options = {}) {
    const question = (text ?? input).trim()
    if (busy || fileBusy || !question) return
    const history = messages.filter(m => m.from === 'user' || m.mode === 'generated').slice(-8).map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text.slice(0, 5000) }))
    const controller = new AbortController(); requestRef.current = controller
    setError(''); setBusy(true); setExpression('thinking'); if (text === undefined) setInput('')
    setMessages(previous => [...previous, { id: crypto.randomUUID(), from: 'user', text: question, attachedNames: attachments.map(a => a.title), scope: options.scope }])
    const component = focus?.brief ? `Selected component: ${briefText(focus.brief)}.` : ''
    try {
      const result = await askPulse({ message: question, viewRole: user?.role, grounding: 'auto', task: options.task || 'auto', documentIds: options.documentIds || [], history, context: `Page: ${location.pathname}. ${component} Guide: ${guide?.label || ''}. Current step: ${step?.title || ''}. Instruction: ${step?.body || ''}. ${previewAgents.has(agent?.id) ? 'This page contains prototype/sample data; do not claim it is live institutional data.' : ''}`.slice(0, 2000), attachments }, controller.signal)
      if (controller.signal.aborted) return
      setMessages(previous => [...previous, { ...result, id: result.requestId, from: 'pulse', text: result.answer }])
      setAttachments([]); setExpression(result.verification?.unsupported ? 'concern' : 'encouraging')
    } catch (err) {
      if (requestRef.current === controller) { setError(controller.signal.aborted ? 'Request stopped. You can edit and resend your question.' : err.message); if (text === undefined) setInput(question); setExpression('concern') }
    } finally { if (requestRef.current === controller) { setBusy(false); requestRef.current = null } }
  }
  useEffect(() => { sendRef.current = send })
  // Tour of the real controls in the dropped component (or the section around a single field).
  const tour = useMemo(() => focus?.element?.isConnected ? componentTour(focus.element) : [], [focus])
  const intents = [
    ...(tour.length >= 2 ? [{ key: 'component-tour', label: `Walk me through ${focus.label.length > 40 ? 'this component' : focus.label}`, steps: tour }] : []),
    ...intentsForRole(agent, user?.role).filter(intent => !(focus && agent?.id === 'general' && intent.key === 'explain' && tour.length >= 2)),
  ]
  const lookAt = interaction.dragging ? interaction.hovered?.element : focus?.element
  return <>
    <DwellHelp role={user?.role} disabled={open || interaction.dragging} onTarget={focusTarget} />
    <FocusSpotlight target={interaction.dragging ? interaction.hovered : open ? focus : null} dragging={interaction.dragging} />
    {open && <section data-pulse-ui="panel" className={`connected-pulse ${focus || (guide && !completed) ? 'is-focused' : ''} ${side === 'left' ? 'is-left' : ''}`} role="dialog" aria-modal="false" aria-labelledby="pulse-title">
      <header className="connected-pulse-header">
        <div><strong id="pulse-title">Pulse</strong><small>{ai.ready ? ai.label : 'Your interactive assistant'}</small></div>
        <button type="button" onClick={() => { requestRef.current?.abort(); requestRef.current = null; setBusy(false); setMessages([]); setError('') }} aria-label="Clear conversation"><Trash2 size={16} /></button>
        <button type="button" onClick={() => { close(); navigate('/settings?tab=ai-provider') }} aria-label="AI and knowledge settings"><Settings size={17} /></button>
        <button type="button" onClick={close} aria-label="Close Pulse"><X size={19} /></button>
      </header>
      <div className="connected-pulse-status">{ai.preference === 'browser' ? ai.local.message || 'Load your local model to chat.' : ai.ready ? 'Ready to help you think, draft and complete this workflow.' : 'Page guidance and source search are ready. Enable a model for conversation and drafting.'}{!ai.ready && <button className="btn btn-secondary btn-sm" onClick={() => { close(); navigate('/settings?tab=ai-provider') }}>Set up free / provider AI</button>}</div>
      <div className="connected-pulse-feed" ref={feedRef} role="log" aria-live="polite" aria-busy={busy}>
        {focus && <div className="pulse-focus-heading" data-testid="pulse-component-brief"><small>Helping with</small><strong>{focus.label}</strong>
          {focus.brief && <p className="pulse-brief">{describeSentence(focus.brief)} <span>{focus.brief.kind}</span> · {focus.brief.state}{focus.brief.required ? ' · required' : ''}{focus.brief.disabled ? ' · unavailable' : ''}</p>}
          {focus.brief?.hints.length > 0 && <ul className="pulse-brief-hints">{focus.brief.hints.map(hint => <li key={hint}>{hint}</li>)}</ul>}
          {!guide && <button className="btn btn-ghost btn-sm" onClick={() => setFocus(null)}>Exit focused help</button>}</div>}
        {messages.length === 0 && !guide && <div className="connected-pulse-welcome"><BookOpen size={24} /><h3>{focus ? 'What would you like to do here?' : 'Let’s work through it.'}</h3><p>{focus ? agent?.greeting(user) : 'Drag me onto a field, card or process for focused help. You can also ask, draft, compare documents, find references, or attach a document.'}</p><button className="btn btn-secondary btn-sm" onClick={() => { const target = describeTarget(document.querySelector('[data-pulse-zone]') || document.querySelector('#main-content'), user?.role); if (target) focusTarget(target) }}>Guide this page</button><small>Keyboard: focus a component, then press Alt+P.</small></div>}
        {agent && <div className="connected-pulse-guide">
          {guide?.key === 'activate' && !completed && <label className="form-label">Syllabus to guide<select className="form-input" value={guide.recordId || ''} onChange={e => { const recordId = e.target.value; setGuide(previous => ({ ...previous, recordId })); setStepIndex(approvalResumeStep(syllabi.find(s => s.id === recordId))) }}><option value="">Select your saved syllabus</option>{syllabi.filter(s => !s.sample && s.status !== 'archived').map(s => <option key={s.id} value={s.id}>{s.courseCode} · {s.status}</option>)}</select><small>The guide resumes from this record’s saved status.</small></label>}
          {previewAgents.has(agent.id) && <p className="connected-pulse-warning">This workflow currently contains sample data. I can explain the controls; institutional import, delivery or scoring is not verified here.</p>}
          {!guide && <div className="pulse-intents">{intents.map(intent => <button key={intent.key} className="btn btn-secondary btn-sm" onClick={() => chooseIntent(intent)}>{intent.key === 'component-tour' && <Route size={13} />}{intent.label}</button>)}{focus && <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void send(`Explain ${focus.label} and help me with the next step.`)}><Sparkles size={13} />Explain this with AI</button>}</div>}
          {step && !completed && <div className="pulse-step"><small>Step {stepIndex + 1} of {guide.steps.length} · {guide.label}</small><strong>{step.title}</strong><p>{liveStepBody(step)}</p>{step.tip && <p>{step.tip}</p>}{!ready && <p role="status">{step.hint}</p>}
            {missingTarget && <p role="status" className="connected-pulse-warning">I can’t find “{step.title}” on this page yet. It may appear after you finish the previous step or switch tabs.</p>}
            <div className="ai-actions">
              <button className="btn btn-secondary btn-sm" disabled={stepIndex === 0} onClick={() => { const previous = guide.steps[stepIndex - 1]; setStepIndex(i => i - 1); if (previous.path) navigate(previous.path) }}>Previous step</button>
              {(step.section || step.target || step.path || step.element) && <button className="btn btn-secondary btn-sm" disabled={missingTarget} onClick={() => { if (step.path) navigate(step.path); const target = stepTarget(step); target?.scrollIntoView({ block: 'center' }); const control = target?.matches('button,input,textarea,select,a[href],[role="tab"]') ? target : target?.querySelector('input,select,textarea,button'); control?.focus() }}>Show me where</button>}
              <button className="btn btn-primary btn-sm" disabled={!ready} onClick={nextStep}>{stepIndex === guide.steps.length - 1 ? 'Finish walkthrough' : step.event ? 'Continue' : 'Next step'}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setGuide(null); setFocus(null); setCompleted(false) }}>Exit walkthrough</button>
            </div></div>}
          {completed && <div role="status"><strong>{step?.event ? 'Task recorded. Walkthrough complete.' : 'Walkthrough complete.'}</strong><p>{step?.event ? 'Your action was recorded in the workspace. Check its saved/pending indicator for sync status.' : 'Review the page’s own status for any action you performed. Guidance does not submit or approve records.'}</p><button className="btn btn-secondary btn-sm" onClick={() => { setGuide(null); setCompleted(false) }}>Choose another task</button></div>}
        </div>}
        {messages.map(message => <article key={message.id} className={`connected-pulse-message ${message.from === 'user' ? 'from-user' : ''}`}>
          <small>{modeLabel(message)}</small>
          {message.from === 'pulse' && message.trace ? <AgentAnswer message={message} onRevise={note => void send(`Revise your previous answer: ${note}`, { task: message.task })} /> : <div className="connected-pulse-text">{message.text}</div>}
          {message.scope && <small>Scope: {message.scope}</small>}
          {message.attachedNames?.length > 0 && <small>References: {message.attachedNames.join(', ')}</small>}
          {message.warning && <p className="connected-pulse-warning">{message.warning}</p>}
          {message.actions?.map(action => <button key={action.label} className="btn btn-secondary btn-sm" onClick={() => { action.onClick?.(); if (action.path) navigate(action.path) }}>{action.label}</button>)}
        </article>)}
        {busy && <p role="status">Pulse agents are planning, searching, writing and checking…</p>}
      </div>
      {error && <div role="alert" className="connected-pulse-error">{error}</div>}
      {attachments.length > 0 && <ul className="connected-pulse-attachments">{attachments.map((a, i) => <li key={i}>{a.title}<button aria-label={`Remove ${a.title}`} onClick={() => setAttachments(previous => previous.filter((_, index) => i !== index))}><X size={13} /></button></li>)}</ul>}
      <form className="connected-pulse-form" onSubmit={event => { event.preventDefault(); void send() }}>
        <input ref={fileRef} type="file" hidden multiple accept={UPLOAD_ACCEPT} onChange={e => { void attachFiles(Array.from(e.target.files || [])); e.target.value = '' }} />
        <button type="button" disabled={busy || fileBusy} onClick={() => fileRef.current?.click()} aria-label="Attach reference"><Paperclip size={18} /></button>
        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} maxLength={4000} rows={2} placeholder="Ask, draft, compare or find references…" aria-label="Ask Pulse" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send() } }} />
        {busy ? <button type="button" onClick={() => requestRef.current?.abort()} aria-label="Stop response"><Square size={17} /></button> : <button type="submit" disabled={!input.trim() || fileBusy} aria-label="Send"><Send size={18} /></button>}
      </form><small className="connected-pulse-footnote">{fileBusy ? 'Reading the reference in the sandbox…' : 'AI drafts need review. Verification marks show what the sources support; they are not a guarantee.'}</small>
    </section>}
    <button ref={dockRef} data-pulse-ui="mascot" className={`connected-pulse-dock ${interaction.dragging ? 'is-dragging' : ''}`} {...interaction.handlers} aria-label={open ? 'Close Pulse assistant' : 'Open Pulse assistant'} aria-description="Drag Pulse onto a component for guidance, or focus a component and press Alt+P." aria-expanded={open}><PulseAvatar expression={interaction.rejection ? 'concern' : interaction.dragging ? 'curious' : expression} dragging={interaction.dragging} lookAt={lookAt} size={72} /><span>{interaction.dragging ? 'Drop to guide' : 'Pulse'}</span></button>
    {interaction.dragging && <div data-pulse-ui="drag-hint" className="pulse-drag-hint">{interaction.hovered ? `Help with ${interaction.hovered.label} · ${interaction.hovered.brief.kind}` : 'Drop on a page component'}</div>}
    {interaction.rejection && <div data-pulse-ui="reject" className="pulse-reject-bubble" role="status">{interaction.rejection}</div>}
    <span className="sr-only" role="status">{interaction.notice}</span>
  </>
}
