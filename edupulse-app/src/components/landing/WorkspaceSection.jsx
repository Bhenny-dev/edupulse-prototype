import { useEffect, useRef, useState } from 'react'
import { ShieldCheck, Route, Search, Library, ListOrdered, Columns2, PenLine, BadgeCheck, Wrench, Pause, Play, Maximize2, Square } from 'lucide-react'
import { prefersReducedMotion } from './motion'
import { AGENT_COLORS, AGENT_PLACES } from './agentLook'

const ICONS = { guardian: ShieldCheck, planner: Route, researcher: Search, librarian: Library, ranker: ListOrdered, comparator: Columns2, writer: PenLine, verifier: BadgeCheck, corrector: Wrench }
const pad = n => String(n).padStart(2, '0')
const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms))

// The agent workspace: the nine agents as robots at desks in one 3D scene (its own lazily
// loaded chunk). Tapping a robot, or its button below the scene, makes it answer; a request
// can be run through the agents it needs, each handing it to the next. Every line is scripted
// (content.js) and the section says so. The buttons and the conversation are ordinary HTML,
// so the section works by keyboard, with a screen reader, without WebGL and with reduced
// motion (lines then appear at once and the camera jumps instead of gliding).
export default function WorkspaceSection({ agents, talk, runs }) {
  const section = useRef(null), stage = useRef(null), canvas = useRef(null), log = useRef(null)
  const bubble = useRef(null), bubbleWho = useRef(null), bubbleSize = useRef(null), bubbleText = useRef(null)
  const labels = useRef({}), scene = useRef(null), token = useRef(0), ids = useRef(0), shown = useRef(false), paused = useRef(false)
  const [mode, setMode] = useState('waiting') // waiting | scene | flat
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [playing, setPlaying] = useState(null)
  const [still, setStill] = useState(false)
  const [messages, setMessages] = useState([])
  const names = Object.fromEntries(agents.map(agent => [agent.key, agent.name]))
  const isStill = () => paused.current || prefersReducedMotion()

  const push = (who, text) => setMessages(items => [...items.slice(-11), { id: ++ids.current, who, text }])
  const hush = () => { bubble.current?.classList.remove('is-on'); scene.current?.speak(null) }

  // The agent's line types out in its speech bubble (decorative; the conversation list carries it).
  const say = (key, text, run, mood) => new Promise(resolve => {
    const api = scene.current, element = bubble.current
    if (!api || !element) { resolve(); return }
    bubbleWho.current.textContent = names[key]
    bubbleSize.current.textContent = text
    bubbleText.current.textContent = isStill() ? text : ''
    element.classList.add('is-on')
    const duration = Math.min(1800, 26 * text.length)
    api.speak(key, isStill() ? 0 : duration, mood)
    if (isStill()) { resolve(); return }
    const start = performance.now()
    const step = now => {
      if (run !== token.current) { resolve(); return }
      const t = Math.min(1, (now - start) / duration)
      bubbleText.current.textContent = text.slice(0, Math.ceil(text.length * t))
      if (t < 1) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })

  const ask = async key => {
    const run = ++token.current
    hush()
    setPlaying(null)
    setSelected(key)
    scene.current?.clearRoute()
    scene.current?.focus(key)
    push('you', talk[key].ask)
    if (!isStill()) await wait(420)
    if (run !== token.current) return
    push(key, talk[key].reply)
    await say(key, talk[key].reply, run)
  }
  const choose = useRef(ask)
  choose.current = ask

  const play = async item => {
    const run = ++token.current
    hush()
    setPlaying(item.key)
    setSelected(null)
    scene.current?.clearRoute()
    scene.current?.focus(null)
    setMessages([{ id: ++ids.current, who: 'you', text: item.request }])
    let previous = null
    for (const [key, line, mood] of item.steps) {
      if (!isStill()) await wait(previous ? 150 : 450)
      if (run !== token.current) return
      setSelected(key)
      // The request flies in through the door to the Guardian, then from desk to desk.
      if (previous) await scene.current?.travel(previous, key)
      else await scene.current?.arrive(key, { bounce: mood === 'decline' })
      if (run !== token.current) return
      scene.current?.focus(key)
      push(key, line)
      await say(key, line, run, mood)
      if (!isStill()) await wait(900)
      previous = key
    }
    if (run === token.current) setPlaying(null)
  }

  const stop = () => { token.current++; setPlaying(null); hush() }
  const overview = () => { token.current++; setPlaying(null); setSelected(null); hush(); scene.current?.clearRoute(); scene.current?.focus(null) }
  const togglePause = () => {
    paused.current = !paused.current
    setStill(paused.current)
    scene.current?.setStill(isStill())
  }

  // The scene loads when the section comes near and the robots rise once it is in view.
  useEffect(() => {
    let api = null, cancelled = false
    const runs = token
    const flat = () => { if (!cancelled) { scene.current = null; setMode('flat') } }
    const near = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      near.disconnect()
      import('../studio/workspaceScene.js').then(({ createWorkspaceScene }) => {
        if (cancelled) return
        api = createWorkspaceScene({
          canvas: canvas.current, stage: stage.current, cast: agents.map(agent => ({ key: agent.key, color: AGENT_COLORS[agent.key], ...AGENT_PLACES[agent.key] })), labels: labels.current, bubble: bubble.current,
          still: isStill(), onPick: key => choose.current(key), onHover: key => setHovered(key),
          onReady: () => { if (!cancelled) setMode('scene') }, onLost: flat,
        })
        if (!api) { flat(); return }
        scene.current = api
        if (shown.current) api.reveal()
      }).catch(flat)
    }, { rootMargin: '0px 0px 75% 0px' })
    const seen = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio < 0.3) return
      shown.current = true
      scene.current?.reveal()
    }, { threshold: [0, 0.3, 0.6] })
    near.observe(section.current)
    seen.observe(stage.current)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onReduce = () => scene.current?.setStill(isStill())
    reduce.addEventListener?.('change', onReduce)
    return () => {
      cancelled = true
      runs.current++
      near.disconnect()
      seen.disconnect()
      reduce.removeEventListener?.('change', onReduce)
      api?.dispose()
      scene.current = null
    }
    // Created once; the agent list is static page content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The newest line stays in view inside the conversation (never the page).
  useEffect(() => {
    const element = log.current
    if (element) element.scrollTop = element.scrollHeight
  }, [messages])

  return (
    <section id="workspace" className="lp-section ws" ref={section} aria-labelledby="ws-title">
      <div className="lp-wrap">
        <header className="lp-head ws-head">
          <p className="lp-label">Agent workspace</p>
          <h2 id="ws-title" data-split>Tap an agent. It answers.</h2>
          <p>Or run a request and watch them pass it on. A scripted example, not live AI.</p>
        </header>
        <div className="ws-grid">
          <div className="ws-play">
            <div ref={stage} className={`ws-stage is-${mode} ${hovered ? 'is-pointing' : ''}`}>
              <canvas ref={canvas} className="ws-canvas" aria-hidden="true" />
              <div className="ws-labels" aria-hidden="true">
                {agents.map((agent, i) => (
                  <span key={agent.key} ref={element => { labels.current[agent.key] = element }} className={`ws-label ${agent.key === selected || agent.key === hovered ? 'is-on' : ''}`}>
                    <b>{pad(i + 1)}</b>{agent.name}
                  </span>
                ))}
              </div>
              <div className="ws-bubble" ref={bubble} aria-hidden="true">
                <span className="ws-bubble-who" ref={bubbleWho} />
                <span className="ws-bubble-body"><span className="ws-bubble-size" ref={bubbleSize} /><span className="ws-bubble-text" ref={bubbleText} /></span>
              </div>
              {mode === 'flat' && (
                <ul className="ws-flat" aria-hidden="true">
                  {agents.map(agent => { const Icon = ICONS[agent.key]; return <li key={agent.key} className={agent.key === selected ? 'is-on' : ''}><Icon size={24} strokeWidth={1.8} /></li> })}
                </ul>
              )}
              <div className="ws-tools">
                {selected && !playing && <button type="button" className="ws-tool" onClick={overview}><Maximize2 size={16} aria-hidden="true" /> Show all</button>}
                {mode === 'scene' && (
                  <button type="button" className="ws-tool" onClick={togglePause}>
                    {still ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />} {still ? 'Play motion' : 'Pause motion'}
                  </button>
                )}
              </div>
            </div>
            <ul className="ws-roster" aria-label="Agents">
              {agents.map(agent => {
                const Icon = ICONS[agent.key]
                return (
                  <li key={agent.key}>
                    <button type="button" className="ws-agent" aria-pressed={agent.key === selected} onClick={() => ask(agent.key)} style={{ '--agent': AGENT_COLORS[agent.key] }}>
                      <span className="ws-agent-icon" aria-hidden="true"><Icon size={16} strokeWidth={2} /></span>{agent.name}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
          <div className="ws-chat">
            <div className="ws-chat-head">
              <h3>Try a request</h3>
              {playing && <button type="button" className="ws-tool ws-stop" onClick={stop}><Square size={14} aria-hidden="true" /> Stop</button>}
            </div>
            <div className="ws-runs">
              {runs.map(item => (
                <button key={item.key} type="button" className="ws-run" aria-pressed={playing === item.key} onClick={() => play(item)}>{item.label}</button>
              ))}
            </div>
            <ol className="ws-log" ref={log} aria-live="polite" aria-label="Conversation">
              {messages.length === 0 && <li className="ws-empty">Tap an agent, or try a request.</li>}
              {messages.map(message => {
                const Icon = ICONS[message.who]
                return (
                  <li key={message.id} className={`ws-msg ${message.who === 'you' ? 'is-you' : 'is-agent'}`}>
                    {message.who === 'you'
                      ? <span className="sr-only">You: </span>
                      : <span className="ws-msg-who"><Icon size={14} strokeWidth={2.2} aria-hidden="true" />{names[message.who]}<span className="sr-only">: </span></span>}
                    <span className="ws-msg-text">{message.text}</span>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
