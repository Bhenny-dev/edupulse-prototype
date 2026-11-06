import { useEffect, useRef, useState } from 'react'
import { ShieldCheck, Route, Search, Library, ListOrdered, Columns2, PenLine, BadgeCheck, Wrench, Pause, Play, Maximize2 } from 'lucide-react'
import { prefersReducedMotion } from './motion'
import { sectionTop } from './navigation'
import { AGENT_COLORS, AGENT_PLACES } from './agentLook'

const ICONS = { guardian: ShieldCheck, planner: Route, researcher: Search, librarian: Library, ranker: ListOrdered, comparator: Columns2, writer: PenLine, verifier: BadgeCheck, corrector: Wrench }
const pad = n => String(n).padStart(2, '0')
const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms))

// The agent workspace: the nine agents as robots at desks in one 3D scene (its own lazily
// loaded chunk), alone on the screen. With motion the room waits behind the agents scope
// (landing.css): the scope's white-out clears into it and the room assembles in that light, then
// holds for a moment before the page moves on. Tapping a robot, or its button, makes it answer in
// a bubble. Every line is scripted (content.js) and the section says so. The buttons are ordinary
// HTML and a polite live region carries each answer (it is on screen only when the bubble cannot
// be), so the section works by keyboard, with a screen reader, without WebGL and with reduced
// motion (lines then appear at once and the camera jumps instead of gliding).
export default function WorkspaceSection({ agents, talk }) {
  const section = useRef(null), stage = useRef(null), canvas = useRef(null)
  const bubble = useRef(null), bubbleWho = useRef(null), bubbleAsk = useRef(null), bubbleSize = useRef(null), bubbleText = useRef(null)
  const labels = useRef({}), scene = useRef(null), token = useRef(0), shown = useRef(false), paused = useRef(false)
  const [mode, setMode] = useState('waiting') // waiting | scene | flat
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [still, setStill] = useState(false)
  const names = Object.fromEntries(agents.map(agent => [agent.key, agent.name]))
  const isStill = () => paused.current || prefersReducedMotion()

  const hush = () => { bubble.current?.classList.remove('is-on'); scene.current?.speak(null) }

  // The agent's line types out in its speech bubble (decorative; the live region carries it).
  const say = (key, run) => new Promise(resolve => {
    const api = scene.current, element = bubble.current
    if (!api || !element) { resolve(); return }
    const { ask, reply } = talk[key]
    bubbleWho.current.textContent = names[key]
    bubbleAsk.current.textContent = ask
    bubbleSize.current.textContent = reply
    bubbleText.current.textContent = isStill() ? reply : ''
    element.classList.add('is-on')
    const duration = Math.min(1800, 26 * reply.length)
    api.speak(key, isStill() ? 0 : duration)
    if (isStill()) { resolve(); return }
    const start = performance.now()
    const step = now => {
      if (run !== token.current) { resolve(); return }
      const t = Math.min(1, (now - start) / duration)
      bubbleText.current.textContent = reply.slice(0, Math.ceil(reply.length * t))
      if (t < 1) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })

  const ask = async key => {
    const run = ++token.current
    hush()
    setSelected(key)
    scene.current?.focus(key)
    if (!isStill()) await wait(420)
    if (run !== token.current) return
    await say(key, run)
  }
  const choose = useRef(ask)
  choose.current = ask

  const overview = () => { token.current++; setSelected(null); hush(); scene.current?.focus(null) }
  const togglePause = () => {
    paused.current = !paused.current
    setStill(paused.current)
    scene.current?.setStill(isStill())
  }

  // A keyboard user reaching the buttons while the room still waits behind the scope is brought
  // to the room, so focus never sits under the white.
  const keepInView = event => {
    if (event.target.matches(':focus-visible') && section.current.getBoundingClientRect().top > 0) window.scrollTo(0, sectionTop('workspace'))
  }

  // The scene loads well before the white-out, behind the scope, and assembles when the section
  // reaches the top of the screen and the white starts to clear (at once with reduced motion,
  // where nothing waits).
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
    }, { rootMargin: '0px 0px 200% 0px' })
    const seen = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      seen.disconnect()
      shown.current = true
      scene.current?.reveal()
    }, { rootMargin: prefersReducedMotion() ? '0px' : '0px 0px -99% 0px' })
    near.observe(section.current)
    seen.observe(section.current)
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

  return (
    <section id="workspace" className="lp-section ws" ref={section} aria-labelledby="ws-title" data-full-screen onFocus={keepInView}>
      <div className={`ws-room ${selected && mode === 'scene' ? 'is-focused' : ''}`}>
        <header className="lp-head ws-head">
          <p className="lp-label">Agent workspace</p>
          <h2 id="ws-title" data-split>Tap an agent. It answers.</h2>
          <p>A scripted example, not live AI.</p>
        </header>
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
            <span className="ws-bubble-head"><span className="ws-bubble-who" ref={bubbleWho} /><span className="ws-bubble-note">Scripted example</span></span>
            <span className="ws-bubble-ask" ref={bubbleAsk} />
            <span className="ws-bubble-body"><span className="ws-bubble-size" ref={bubbleSize} /><span className="ws-bubble-text" ref={bubbleText} /></span>
          </div>
          {mode === 'flat' && (
            <ul className="ws-flat" aria-hidden="true">
              {agents.map(agent => { const Icon = ICONS[agent.key]; return <li key={agent.key} className={agent.key === selected ? 'is-on' : ''}><Icon size={24} strokeWidth={1.8} /></li> })}
            </ul>
          )}
        </div>
        <div className="ws-tools">
          {selected && <button type="button" className="ws-tool" onClick={overview}><Maximize2 size={16} aria-hidden="true" /> Show all</button>}
          {mode === 'scene' && (
            <button type="button" className="ws-tool" onClick={togglePause}>
              {still ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />} {still ? 'Play motion' : 'Pause motion'}
            </button>
          )}
        </div>
        <p className="ws-answer" aria-live="polite">
          {selected && <><span className="ws-answer-ask"><span className="sr-only">You: </span>{talk[selected].ask}</span> <b>{names[selected]}: </b>{talk[selected].reply}</>}
        </p>
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
    </section>
  )
}
