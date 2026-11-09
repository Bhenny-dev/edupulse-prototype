import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BadgeCheck, Columns2, Compass, Cpu, Library, ListOrdered, PenLine, Route, Search, Send, ShieldCheck, Users, Wrench } from 'lucide-react'
import LandingNav from '../../components/landing/LandingNav'
import RoomDial from '../../components/landing/RoomDial'
import { AGENTS } from '../../components/landing/content'
import { AGENT_COLORS, AGENT_PLACES } from '../../components/landing/agentLook'
import { prefersReducedMotion } from '../../components/landing/motion'
import { MOODS, introduce, respond } from '../../components/public/pulseTalk'
import '../../components/landing/landing.css'
import '../../components/landing/classroom.css'
import '../../components/public/public-site.css'

const ICONS = { guardian: ShieldCheck, planner: Route, researcher: Search, librarian: Library, ranker: ListOrdered, comparator: Columns2, writer: PenLine, verifier: BadgeCheck, corrector: Wrench }
const NAME = Object.fromEntries(AGENTS.map(agent => [agent.key, agent.name]))
const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms))
const HELLO = { agent: 'guardian', mood: 'happy', text: 'Hi! We can explain EduPulse, its roles, features and public project information without an AI connection. Tap an agent or type a question.', source: null }

// The Pulse page: the agent room from the home page, filling the screen, and a chat beside it.
// Tap an agent (or pick it in the chat) to talk to it; with no one picked, the agent whose job it
// is answers. The one answering stands, turns, and shows its mood while its line types out over
// its head; the chat keeps every line (pulseTalk.js writes them, on the page, with no AI).
export default function PulsePage() {
  const stage = useRef(null), canvas = useRef(null), labels = useRef({}), scene = useRef(null)
  const bubble = useRef(null), bubbleWho = useRef(null), bubbleMood = useRef(null), bubbleSize = useRef(null), bubbleText = useRef(null)
  const log = useRef(null), field = useRef(null), turn = useRef(0), last = useRef('guardian')
  const [mode, setMode] = useState('waiting')
  const [to, setTo] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [lines, setLines] = useState([HELLO])
  const [draft, setDraft] = useState('')
  const still = () => prefersReducedMotion()

  useEffect(() => {
    const before = document.title
    document.title = 'Agent room: Nine agents, ask them anything | EduPulse'
    return () => { document.title = before }
  }, [])
  useEffect(() => { log.current?.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: still() ? 'auto' : 'smooth' }) }, [lines])

  // A line types out in the bubble over the agent's head while it shows its mood.
  const voice = (line, run) => new Promise(resolve => {
    const api = scene.current, element = bubble.current
    if (!api || !element) { resolve(); return }
    bubbleWho.current.textContent = NAME[line.agent]
    bubbleMood.current.textContent = MOODS[line.mood] || ''
    bubbleSize.current.textContent = line.text
    bubbleText.current.textContent = still() ? line.text : ''
    element.classList.add('is-on')
    const duration = Math.min(2600, 22 * line.text.length)
    api.speak(line.agent, still() ? 0 : duration, line.mood)
    if (still()) { resolve(); return }
    const start = performance.now()
    const step = now => {
      if (run !== turn.current) { resolve(); return }
      const t = Math.min(1, (now - start) / duration)
      bubbleText.current.textContent = line.text.slice(0, Math.ceil(line.text.length * t))
      if (t < 1) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })
  const answer = async line => {
    const run = ++turn.current
    bubble.current?.classList.remove('is-on')
    scene.current?.focus(line.agent)
    last.current = line.agent
    if (!still()) await wait(scene.current ? 480 : 0)
    if (run !== turn.current) return
    setLines(list => [...list, line].slice(-40))
    await voice(line, run)
  }
  const choose = useRef(null)
  choose.current = key => {
    setTo(key)
    if (key) answer(introduce(key))
    else { turn.current++; bubble.current?.classList.remove('is-on'); scene.current?.speak(null); scene.current?.focus(null) }
  }
  const send = event => {
    event.preventDefault()
    const message = draft.trim().slice(0, 280)
    if (!message) return
    setDraft('')
    setLines(list => [...list, { agent: null, text: message }].slice(-40))
    answer(respond(message, { to, last: last.current, history: lines }))
  }

  useEffect(() => {
    let api = null, cancelled = false
    const runs = turn
    const flat = () => { if (!cancelled) { scene.current = null; setMode('flat') } }
    import('../../components/studio/workspaceScene.js').then(({ createWorkspaceScene }) => {
      if (cancelled) return
      api = createWorkspaceScene({
        canvas: canvas.current, stage: stage.current, labels: labels.current, bubble: bubble.current, touchOrbit: true,
        cast: AGENTS.map(agent => ({ key: agent.key, color: AGENT_COLORS[agent.key], ...AGENT_PLACES[agent.key] })),
        still: still(), onPick: key => choose.current(key), onHover: key => setHovered(key),
        onReady: () => { if (!cancelled) setMode('scene') }, onLost: flat,
      })
      if (!api) { flat(); return }
      scene.current = api
      api.setNight(document.documentElement.classList.contains('dark-mode'))
      api.reveal()
    }).catch(flat)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onReduce = () => scene.current?.setStill(reduce.matches)
    reduce.addEventListener?.('change', onReduce)
    const night = new MutationObserver(() => scene.current?.setNight(document.documentElement.classList.contains('dark-mode')))
    night.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    const onPause = event => scene.current?.setStill(Boolean(event.detail) || still())
    document.addEventListener('classroom:pause', onPause)
    return () => {
      cancelled = true
      runs.current++
      reduce.removeEventListener?.('change', onReduce)
      night.disconnect()
      document.removeEventListener('classroom:pause', onPause)
      api?.dispose()
      scene.current = null
    }
  }, [])

  const picked = to && AGENTS.find(agent => agent.key === to)
  const PickedIcon = picked ? ICONS[picked.key] : Users

  return (
    <div className="landing-page public-site is-room is-pulse" data-room-theme="lab">
      <LandingNav solid />
      <main id="room" className="ps-room ps-pulse" aria-labelledby="ps-title">
        <div ref={stage} className={`ps-pulse-stage ws-stage is-${mode} ${hovered ? 'is-pointing' : ''}`}>
          <canvas ref={canvas} className="ws-canvas" aria-hidden="true" />
          <div className="ws-labels" aria-hidden="true">
            {AGENTS.map((agent, i) => (
              <span key={agent.key} ref={element => { labels.current[agent.key] = element }} className={`ws-label ${agent.key === to || agent.key === hovered ? 'is-on' : ''}`}>
                <b>{String(i + 1).padStart(2, '0')}</b>{agent.name}
              </span>
            ))}
          </div>
          <div className="ws-bubble" ref={bubble} aria-hidden="true">
            <span className="ws-bubble-head"><span className="ws-bubble-who" ref={bubbleWho} /><span className="ws-bubble-note ps-mood" ref={bubbleMood} /></span>
            <span className="ws-bubble-body"><span className="ws-bubble-size" ref={bubbleSize} /><span className="ws-bubble-text" ref={bubbleText} /></span>
          </div>
          <header className="ps-room-title">
            <p className="ps-kicker" style={{ '--tint': '#2563eb' }}><i aria-hidden="true"><Cpu size={15} strokeWidth={2.4} /></i>Agent room</p>
            <h1 id="ps-title">Nine agents. Ask them anything.</h1>
            <p className="ps-lead">Tap an agent to talk to it, or just type.</p>
          </header>
        </div>

        <section className="ps-chat" aria-label="Chat with the agents">
          <div className="ps-chat-to" role="group" aria-label="Talk to">
            <button type="button" className="ps-chat-who" aria-pressed={!to} onClick={() => choose.current(null)}><Users size={15} aria-hidden="true" /> Everyone</button>
            {AGENTS.map(agent => {
              const Icon = ICONS[agent.key]
              return <button key={agent.key} type="button" className="ps-chat-who" aria-pressed={to === agent.key} style={{ '--tint': AGENT_COLORS[agent.key] }} onClick={() => choose.current(agent.key)}><Icon size={15} aria-hidden="true" /> {agent.name}</button>
            })}
          </div>
          <div className="ps-chat-about" style={{ '--tint': picked ? AGENT_COLORS[picked.key] : '#2563eb' }}>
            <span className="ps-chat-about-icon" aria-hidden="true"><PickedIcon size={18} /></span>
            <p>{picked ? <><b>{picked.name}.</b> {picked.role}</> : <><b>Everyone.</b> A message goes to the agent whose job it is; the Guardian checks first.</>}</p>
            <ol className="ps-relay" aria-label="The agents, in the order a request meets them">
              {AGENTS.map((agent, i) => {
                const Icon = ICONS[agent.key]
                return (
                  <li key={agent.key} className={agent.key === to ? 'is-on' : ''} style={{ '--tint': AGENT_COLORS[agent.key] }}>
                    <i aria-hidden="true"><Icon size={14} strokeWidth={2.2} /></i><span className="sr-only">{agent.name}</span>
                    {i < AGENTS.length - 1 && <ArrowRight className="ps-relay-arrow" size={12} aria-hidden="true" />}
                  </li>
                )
              })}
            </ol>
          </div>
          <ol className="ps-chat-log" ref={log} aria-live="polite" aria-relevant="additions">
            {lines.map((line, i) => line.agent ? (
              <li key={i} className="ps-chat-line" style={{ '--tint': AGENT_COLORS[line.agent] }}>
                <p className="ps-chat-meta"><b>{NAME[line.agent]}</b>{line.mood && <span className="ps-mood">{MOODS[line.mood]}</span>}</p>
                <p className="ps-chat-text">{line.text}</p>
                {line.source && <p className="ps-chat-source">From: {line.source}</p>}
              </li>
            ) : (
              <li key={i} className="ps-chat-line is-you"><p className="ps-chat-meta"><b>You</b></p><p className="ps-chat-text">{line.text}</p></li>
            ))}
          </ol>
          <form className="ps-chat-form" onSubmit={send}>
            <label className="sr-only" htmlFor="ps-chat-field">Message {picked ? picked.name : 'the agents'}</label>
            <input id="ps-chat-field" ref={field} value={draft} onChange={event => setDraft(event.target.value)} maxLength={280} autoComplete="off"
              placeholder={picked ? `Say anything to ${picked.name}…` : 'Say hi, ask about EduPulse, or ask for help…'} />
            <button type="submit" className="lp-button is-small" disabled={!draft.trim()}><Send size={16} aria-hidden="true" /> Send</button>
          </form>
          <p className="ps-chat-note">Searches public EduPulse information on this page. No AI key; messages are not sent or saved.</p>
        </section>
      </main>
      <RoomDial stops={AGENTS.map(agent => ({ id: agent.key, label: agent.name, icon: ICONS[agent.key], tint: AGENT_COLORS[agent.key] }))}
        jump={(event, key) => { event.preventDefault(); choose.current(key) }} revealAt={-1} pausable icon={Compass} label="Talk to an agent" />
    </div>
  )
}
