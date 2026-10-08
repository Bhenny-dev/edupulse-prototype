import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { X, Send, Paperclip, Square, Settings, BookOpen, Trash2, Route, Sparkles } from 'lucide-react'
import PulseAvatar from './PulseAvatar'
import { pulse as pulseBus } from './pulseBus'
import { useAuth } from '../../context/AuthContext'
import { aiRequest, askPulse, readReferenceFile, UPLOAD_ACCEPT } from '../../lib/aiClient'
import { checkAppropriateUse } from '../../lib/rag/policy'
import { getAgentForZone, intentsForRole } from '../../agents'
import { approvalResumeStep, prepareIntent, previewAgents, stepReadiness, stepTarget } from '../../agents/guidance'
import { courseCatalog, findCourseMentions, planOperator, searchRecords, syllabusReference } from '../../agents/operator'
import { useAI } from '../../context/AIContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useContentStore } from '../../context/ContentStoreContext'
import { CURRICULUM_COURSES, STUDENT_RECORDS } from '../../data/mockData'
import { applyRegistration, parseRoster, undoRegistration } from '../../utils/rosterParser'
import { generateWeekDraft } from '../../utils/aiCourseware'
import usePulseInteraction, { DwellHelp, FocusSpotlight } from './usePulseInteraction'
import { briefText, componentTour, describeSentence, describeTarget, liveStepBody } from './targets'
import AgentAnswer from '../ai/AgentAnswer'
import PulseAction from './PulseActions'
import './connected-pulse.css'

const modeLabel = message => message.from === 'user' ? 'You' : message.mode === 'actions' ? 'Pulse · Actions' : message.mode === 'generated' ? `Pulse · ${message.grounding === 'general' ? 'General assistance' : 'Verified answer with sources'}` : message.mode === 'retrieval' ? 'Pulse · Source excerpts' : message.mode === 'references' ? 'Pulse · Librarian' : message.mode === 'insufficient-evidence' ? 'Pulse · Missing evidence' : 'Pulse'
// The server accepts up to 18,000 characters per chat reference; longer files are sent as an excerpt and can be added to the library whole.
const CHAT_REFERENCE = 18000
const chatReference = a => ({ title: a.text.length > CHAT_REFERENCE ? `${a.title} (first ${CHAT_REFERENCE.toLocaleString()} characters)` : a.title, text: a.text.slice(0, CHAT_REFERENCE) })

export default function Pulse() {
  const { user } = useAuth()
  const { syllabi, registrations, setRegistrations } = useWorkspace()
  const { store: content, generateWeek } = useContentStore()
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
    if (event.type === 'ask') { setOpen(true); void sendRef.current?.(event.message, { documentIds: event.documentIds, task: event.task, scope: event.label, skipOperator: true }) }
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

  // Courses Pulse can act on: the curriculum, with the syllabi and class lists in this workspace.
  const enrolled = useMemo(() => {
    if (user?.role !== 'student') return null
    const record = STUDENT_RECORDS.find(s => s.name === user?.name)
    return record ? new Set(record.courses.map(c => c.code)) : null
  }, [user?.role, user?.name])
  const catalog = useMemo(() => courseCatalog({ curriculum: CURRICULUM_COURSES, syllabi, registrations, enrolled, role: user?.role, userId: user?.id }), [syllabi, registrations, enrolled, user?.role, user?.id])
  const currentCourse = useMemo(() => {
    const id = new URLSearchParams(location.search).get('course')
    const syllabus = id && syllabi.find(s => s.id === id)
    return syllabus ? catalog.find(c => c.code === syllabus.courseCode) || null : null
  }, [location.search, syllabi, catalog])

  async function attachFiles(files) {
    setError(''); setFileBusy(true)
    try {
      if (attachments.length + files.length > 3) throw new Error('Attach up to three files per message.')
      // Attachments go through the same sandboxed extraction as the knowledge library.
      const refs = await Promise.all(files.map(readReferenceFile))
      setAttachments(previous => [...previous, ...refs.map(ref => {
        // A class list keeps its rows; the course is read from the file name, a course column or the first lines.
        const roster = parseRoster(ref.raw ?? ref.text, ref.fileName)
        const kept = { ...ref }
        delete kept.raw
        return roster ? { ...kept, roster, detectedCourse: findCourseMentions(`${ref.fileName} ${roster.courseValues.join(' ')} ${ref.text.slice(0, 600)}`, catalog)[0]?.code || '' } : kept
      })])
    } catch (err) { setError(err.message) }
    finally { setFileBusy(false) }
  }

  // Confirmed actions. Each runs only from an action card's confirm button.
  const runRegister = useCallback(async details => {
    // The id is fixed here so the saved registration and the Undo record always match.
    const request = { ...details, uploadedBy: user?.id, id: `reg-${crypto.randomUUID().slice(0, 8)}` }
    const result = applyRegistration(registrations, request)
    setRegistrations(previous => applyRegistration(previous, request).registrations)
    pulseBus.progress('roster-registered', `${details.courseCode} · ${details.blockSection}`)
    navigate('/syllabus?tab=register')
    return result
  }, [registrations, setRegistrations, user?.id, navigate])
  const undoRegister = useCallback(result => setRegistrations(previous => undoRegistration(previous, result)), [setRegistrations])
  const runFile = useCallback(async ({ attachment, courseCode, title }) => {
    const fullTitle = (courseCode ? `${courseCode} · ${title}` : title).slice(0, 160)
    const result = await aiRequest('documents', 'POST', { title: fullTitle, text: attachment.text, sourceType: attachment.sourceType || 'text', fileName: attachment.fileName, ...(courseCode ? { course: courseCode } : {}) })
    pulseBus.progress('material-filed', courseCode)
    return { ...result, title: fullTitle, course: courseCode }
  }, [])
  const runGenerate = useCallback(async ({ syllabus, week }, signal) => {
    setExpression('thinking')
    try {
      const draft = await generateWeekDraft(syllabus, week, signal)
      signal.throwIfAborted()
      const updates = {}
      let kept = 0
      for (const item of draft.items) {
        // Reviewed or published work is never overwritten.
        if (['checked', 'published'].includes(content[item.id]?.status)) { kept++; continue }
        updates[item.id] = { content: item.content, status: 'draft', type: item.type, week, syllabusId: syllabus.id, title: item.content.title, generatedAt: new Date().toISOString() }
      }
      generateWeek(updates)
      if (Object.keys(updates).length) pulseBus.progress('courseware-generated', `${syllabus.courseCode}, week ${week}`)
      const path = `/courseware?tab=builder&course=${encodeURIComponent(syllabus.id)}&week=${week}`
      navigate(path)
      setExpression('cheerful')
      return { saved: Object.keys(updates).length, kept, titles: Object.values(updates).map(u => u.title), sources: draft.items[0]?.content.ai?.sources?.length || 0, path }
    } catch (error) { setExpression('concern'); throw error }
  }, [content, generateWeek, navigate])
  // The API runs one request per account at a time, so a course ranking that overlaps another request waits and retries.
  const similarity = useCallback(async (left, right, signal) => {
    for (let attempt = 0; ; attempt++) {
      try { return (await aiRequest('similarity', 'POST', { left, right }, signal)).matrix }
      catch (error) {
        if (error?.status !== 429 || attempt >= 4 || signal?.aborted) throw error
        await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)))
      }
    }
  }, [])
  const actionContext = { role: user?.role, userId: user?.id, catalog, registrations, content, navigate, runRegister, undoRegister, runFile, runGenerate, similarity,
    attach: () => fileRef.current?.click(),
    ask: (message, { label, ...options }) => void send(message, { ...options, scope: label, skipOperator: true }),
    chat: message => void send(message, { skipOperator: true }),
    study: (message, files, task) => void send(message, { skipOperator: true, task, attachments: files }),
  }

  async function send(text, options = {}) {
    const question = (text ?? input).trim()
    const pending = options.attachments || attachments
    if (busy || fileBusy || (!question && !pending.length)) return
    const history = messages.filter(m => m.from === 'user' || m.mode === 'generated').slice(-8).map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text.slice(0, 5000) }))
    setError(''); if (text === undefined) setInput('')
    if (!options.attachments) setAttachments([])
    // The Operator plans app actions first; a request the Guardian would decline goes straight to the agents, which explain why.
    const permitted = !question || checkAppropriateUse(question, user?.role || 'guest').allowed
    const plan = options.skipOperator || !permitted ? { proposals: [], chat: true, task: options.task || 'auto', mentioned: findCourseMentions(question, catalog) } : planOperator({ message: question, attachments: pending, role: user?.role, catalog, currentCourse })
    const now = plan.proposals.filter(p => !p.after), later = plan.proposals.filter(p => p.after)
    // Course context: a named course's syllabus becomes a cited reference (RAG over the user's own records).
    const course = plan.mentioned.find(c => c.syllabus)
    const references = plan.chat ? pending.map(chatReference) : []
    const syllabusRef = plan.chat && course && references.length < 3 ? syllabusReference(course) : null
    if (syllabusRef) references.push(syllabusRef)
    setMessages(previous => [...previous, { id: crypto.randomUUID(), from: 'user', text: question || `Attached ${pending.map(a => a.fileName || a.title).join(', ')}`, attachedNames: references.map(a => a.title), fileNames: plan.chat ? [] : pending.map(a => a.fileName || a.title), scope: options.scope }])
    for (const proposal of now) {
      if (proposal.type === 'navigate') navigate(proposal.path)
      if (proposal.type === 'search') {
        // Library titles are searched only for accounts that have a private library.
        const documents = await aiRequest('documents').then(r => r.documents, () => [])
        proposal.results = searchRecords(proposal.query, { role: user?.role, userId: user?.id, catalog, registrations, rosters: pending.filter(a => a.roster).map(a => ({ fileName: a.fileName, students: a.roster.students })), syllabi, content, documents })
      }
    }
    const searchedNothing = now.length === 1 && now[0].type === 'search' && !now[0].results.length && now[0].fallbackToChat
    if (now.length) setMessages(previous => [...previous, { id: crypto.randomUUID(), from: 'pulse', mode: 'actions', text: '', proposals: now }])
    if (!plan.chat && !searchedNothing) { setExpression(now.length ? 'encouraging' : 'idle'); return }
    const controller = new AbortController(); requestRef.current = controller
    setBusy(true); setExpression('thinking')
    const component = focus?.brief ? `Selected component: ${briefText(focus.brief)}.` : ''
    try {
      const result = await askPulse({ message: question || 'Summarize the attached file and list its key points.', viewRole: user?.role, grounding: 'auto', task: options.task || plan.task || 'auto', documentIds: options.documentIds || [], history, context: `Page: ${location.pathname}. ${component} Guide: ${guide?.label || ''}. Current step: ${step?.title || ''}. Instruction: ${step?.body || ''}. ${previewAgents.has(agent?.id) ? 'This page contains prototype/sample data; do not claim it is live institutional data.' : ''}`.slice(0, 2000), attachments: searchedNothing ? [] : references }, controller.signal)
      if (controller.signal.aborted) return
      setMessages(previous => [...previous, { ...result, id: result.requestId, from: 'pulse', text: result.answer }, ...(later.length ? [{ id: crypto.randomUUID(), from: 'pulse', mode: 'actions', text: '', proposals: later }] : [])])
      setExpression(result.verification?.unsupported ? 'concern' : 'encouraging')
    } catch (err) {
      if (requestRef.current === controller) { setError(controller.signal.aborted ? 'Request stopped. You can edit and resend your question.' : err.message); if (text === undefined) setInput(question); if (!options.attachments) setAttachments(pending); setExpression('concern') }
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
        {messages.length === 0 && !guide && <div className="connected-pulse-welcome"><BookOpen size={24} /><h3>{focus ? 'What would you like to do here?' : 'Let’s work through it.'}</h3><p>{focus ? agent?.greeting(user) : 'Drag me onto a field, card or process for focused help. You can also ask, draft, compare documents, find references or records, or attach a document: a class list to register, or a material to file under a course. I ask before I change anything.'}</p><button className="btn btn-secondary btn-sm" onClick={() => { const target = describeTarget(document.querySelector('[data-pulse-zone]') || document.querySelector('#main-content'), user?.role); if (target) focusTarget(target) }}>Guide this page</button><small>Keyboard: focus a component, then press Alt+P.</small></div>}
        {agent && <div className="connected-pulse-guide">
          {guide?.key === 'activate' && !completed && <label className="form-label">Syllabus to guide<select className="form-input" value={guide.recordId || ''} onChange={e => { const recordId = e.target.value; setGuide(previous => ({ ...previous, recordId })); setStepIndex(approvalResumeStep(syllabi.find(s => s.id === recordId))) }}><option value="">Select your saved syllabus</option>{syllabi.filter(s => !s.sample && s.status !== 'archived').map(s => <option key={s.id} value={s.id}>{s.courseCode} · {s.status}</option>)}</select><small>The guide resumes from this record’s saved status.</small></label>}
          {previewAgents.has(agent.id) && <p className="connected-pulse-warning">This workflow currently contains sample data. I can explain the controls; institutional import, delivery or scoring is not verified here.</p>}
          {!guide && <div className="pulse-intents">{intents.map(intent => <button key={intent.key} className="btn btn-secondary btn-sm" onClick={() => chooseIntent(intent)}>{intent.key === 'component-tour' && <Route size={13} />}{intent.label}</button>)}{focus && <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void send(`Explain ${focus.label} and help me with the next step.`, { skipOperator: true })}><Sparkles size={13} />Explain this with AI</button>}</div>}
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
          {message.from === 'pulse' && message.trace ? <AgentAnswer message={message} onRevise={note => void send(`Revise your previous answer: ${note}`, { task: message.task, skipOperator: true })} /> : message.mode === 'actions' ? <div className="pulse-actions">{message.proposals.map((proposal, i) => <PulseAction key={i} proposal={proposal} ctx={actionContext} />)}</div> : <div className="connected-pulse-text">{message.text}</div>}
          {message.scope && <small>Scope: {message.scope}</small>}
          {message.attachedNames?.length > 0 && <small>References: {message.attachedNames.join(', ')}</small>}
          {/* Files used only by an action card are attached, not sent to the answer agents as references. */}
          {message.fileNames?.length > 0 && <small>Attached: {message.fileNames.join(', ')}</small>}
          {message.warning && <p className="connected-pulse-warning">{message.warning}</p>}
          {message.actions?.map(action => <button key={action.label} className="btn btn-secondary btn-sm" onClick={() => { action.onClick?.(); if (action.path) navigate(action.path) }}>{action.label}</button>)}
        </article>)}
        {busy && <p role="status">Pulse agents are planning, searching, writing and checking…</p>}
      </div>
      {error && <div role="alert" className="connected-pulse-error">{error}</div>}
      {attachments.length > 0 && <ul className="connected-pulse-attachments">{attachments.map((a, i) => <li key={i}><span>{a.title}{a.roster ? ` · class list, ${a.roster.students.length} students` : a.text.length > CHAT_REFERENCE ? ' · long file: chat reads the first 18,000 characters' : ''}</span><button aria-label={`Remove ${a.title}`} onClick={() => setAttachments(previous => previous.filter((_, index) => i !== index))}><X size={13} /></button></li>)}</ul>}
      <form className="connected-pulse-form" onSubmit={event => { event.preventDefault(); void send() }}>
        <input ref={fileRef} type="file" hidden multiple accept={UPLOAD_ACCEPT} onChange={e => { void attachFiles(Array.from(e.target.files || [])); e.target.value = '' }} />
        <button type="button" disabled={busy || fileBusy} onClick={() => fileRef.current?.click()} aria-label="Attach reference"><Paperclip size={18} /></button>
        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} maxLength={4000} rows={2} placeholder="Ask, draft, compare or find references…" aria-label="Ask Pulse" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send() } }} />
        {busy ? <button type="button" onClick={() => requestRef.current?.abort()} aria-label="Stop response"><Square size={17} /></button> : <button type="submit" disabled={(!input.trim() && !attachments.length) || fileBusy} aria-label="Send"><Send size={18} /></button>}
      </form><small className="connected-pulse-footnote">{fileBusy ? 'Reading the reference in the sandbox…' : 'AI drafts need review. Verification marks show what the sources support; they are not a guarantee.'}</small>
    </section>}
    <button ref={dockRef} data-pulse-ui="mascot" className={`connected-pulse-dock ${interaction.dragging ? 'is-dragging' : ''}`} {...interaction.handlers} aria-label={open ? 'Close Pulse assistant' : 'Open Pulse assistant'} aria-description="Drag Pulse onto a component for guidance, or focus a component and press Alt+P." aria-expanded={open}><PulseAvatar expression={interaction.rejection ? 'concern' : interaction.dragging ? 'curious' : expression} dragging={interaction.dragging} lookAt={lookAt} size={72} /><span>{interaction.dragging ? 'Drop to guide' : 'Pulse'}</span></button>
    {interaction.dragging && <div data-pulse-ui="drag-hint" className="pulse-drag-hint">{interaction.hovered ? `Help with ${interaction.hovered.label} · ${interaction.hovered.brief.kind}` : 'Drop on a page component'}</div>}
    {interaction.rejection && <div data-pulse-ui="reject" className="pulse-reject-bubble" role="status">{interaction.rejection}</div>}
    <span className="sr-only" role="status">{interaction.notice}</span>
  </>
}
