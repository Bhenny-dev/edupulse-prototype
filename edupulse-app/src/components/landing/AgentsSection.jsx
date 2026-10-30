import { useMemo, useRef, useState } from 'react'
import { gsap, useMotion } from './motion'
import AgentFace from './AgentFace'

// Inside Pulse. The agents are concentric rings of type around a core, like a scope, and
// neighbouring rings turn in opposite directions. With motion the section holds the screen
// while scrolling travels inward one ring per agent, naming each one, until the core opens
// into white and the next section follows. Without motion it is one still picture with the
// agents listed below it. The rings are decorative; the list carries the content.

const C = 500, OUTER = 480, RATIO = 0.74      // viewBox centre, outer radius, ratio between rings
const TRIGGER = 'lp-agents'
const PER_AGENT = 0.55                        // screens of scrolling per agent
const OPENING = 1.6                           // the core's opening, in agent lengths
const radius = i => OUTER * RATIO ** i
const pad = n => String(n).padStart(2, '0')
const clamp01 = value => Math.min(1, Math.max(0, value))
const smooth = t => t * t * (3 - 2 * t)

export default function AgentsSection({ agents }) {
  const ref = useRef(null)
  const [active, setActive] = useState(0)
  const count = agents.length

  // Ring i spans radius(i) to radius(i + 1); its line runs once around the middle of the band.
  // The browser spreads the letters evenly over the ring (textLength), leaving about one
  // letter's room where the line meets its own start.
  const rings = useMemo(() => agents.map((agent, i) => {
    const outer = radius(i), inner = radius(i + 1), band = outer - inner
    const size = band * 0.44
    const base = inner + (band - size * 0.7) / 2
    const text = `${agent.ring} ·`
    return {
      key: agent.key, outer, size, text, length: (2 * Math.PI * base * text.length) / (text.length + 1),
      path: `M ${C - base} ${C} a ${base} ${base} 0 1 1 ${2 * base} 0 a ${base} ${base} 0 1 1 ${-2 * base} 0`,
    }
  }), [agents])

  useMotion(ref, ({ motion }) => {
    if (!motion) return undefined
    const section = ref.current, q = gsap.utils.selector(section)
    const svg = q('.scope-svg')[0], zoom = q('.scope-zoom')[0], light = q('.scope-light')[0], ringEls = q('.scope-ring')
    section.classList.add('is-live')
    const state = { a: -0.5, c: 0 }
    const settled = RATIO ** -(count - 0.5)    // the scale once the last agent has been shown
    let reach = 1, cover = settled
    // From the centre of the scope to the farthest corner of the pinned screen, in viewBox units.
    const measure = () => {
      const box = svg.getBoundingClientRect(), unit = box.width / 1000
      const cx = box.left + box.width / 2, cy = box.top - section.getBoundingClientRect().top + box.height / 2
      const w = window.innerWidth, h = window.innerHeight
      reach = Math.max(Math.hypot(cx, cy), Math.hypot(w - cx, cy), Math.hypot(cx, h - cy), Math.hypot(w - cx, h - cy)) / unit
      cover = Math.max(settled, (reach * 1.04) / radius(count))
    }
    // One writer for the scope: the scroll-linked timeline below calls this on every update.
    const render = () => {
      const scale = state.c > 0 ? settled * (cover / settled) ** smooth(state.c) : RATIO ** -state.a
      zoom.setAttribute('transform', `translate(${C} ${C}) scale(${scale}) translate(${-C} ${-C})`)
      const turn = state.a * 24 + state.c * 70
      ringEls.forEach((ring, i) => {
        const shown = radius(i + 1) * scale < reach
        ring.style.visibility = shown ? '' : 'hidden'
        if (shown) ring.setAttribute('transform', `rotate(${i % 2 ? -turn : turn} ${C} ${C})`)
      })
      light.style.opacity = String(smooth(clamp01((state.c - 0.3) / 0.7)))
      section.style.setProperty('--agents-head', String(1 - smooth(clamp01((state.a + 0.3) / 0.7))))
      section.style.setProperty('--agents-caption', String(1 - smooth(clamp01(state.c / 0.35))))
      // The agent being named waves from the lens at the centre; while the core opens the whole
      // team waves, then fades with the light into the workspace.
      section.style.setProperty('--agents-lens', String(smooth(clamp01((state.a + 0.45) / 0.35)) * (1 - smooth(clamp01(state.c / 0.25)))))
      section.style.setProperty('--agents-team', String(smooth(clamp01((state.c - 0.08) / 0.3)) * (1 - smooth(clamp01((state.c - 0.62) / 0.3)))))
      setActive(Math.min(count - 1, Math.max(0, Math.round(state.a))))
    }
    measure()
    gsap.timeline({
      defaults: { ease: 'none' }, onUpdate: render,
      scrollTrigger: {
        id: TRIGGER, trigger: section, pin: true, start: 'top top', scrub: 0.6, invalidateOnRefresh: true,
        end: () => `+=${Math.round(window.innerHeight * (count + OPENING) * PER_AGENT)}`,
        onRefresh: () => { measure(); render() },
      },
    }).to(state, { a: count - 0.5, duration: count }).to(state, { c: 1, duration: OPENING })
    render()
    return () => {
      section.classList.remove('is-live')
      zoom.removeAttribute('transform')
      ringEls.forEach(ring => { ring.removeAttribute('transform'); ring.style.visibility = '' })
      light.style.opacity = ''
      section.style.removeProperty('--agents-head')
      section.style.removeProperty('--agents-caption')
      section.style.removeProperty('--agents-lens')
      section.style.removeProperty('--agents-team')
      setActive(0)
    }
  }, [count])

  return (
    <section id="agents" className="lp-section agents" ref={ref} aria-labelledby="agents-title">
      <div className="lp-wrap">
        <header className="lp-head agents-head">
          <p className="lp-label">Inside Pulse</p>
          <h2 id="agents-title" data-split>The agents behind every answer</h2>
          <p>Pulse is nine named agents sharing one workflow. A request passes only the agents it needs, and the Guardian always checks it first.</p>
        </header>
        <div className="agents-stage">
          <svg className="scope-svg" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="scope-core-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" className="scope-stop-deep" />
                <stop offset="0.55" className="scope-stop-mid" />
                <stop offset="1" className="scope-stop-pale" />
              </linearGradient>
              {rings.map(ring => <path key={ring.key} id={`scope-line-${ring.key}`} d={ring.path} />)}
            </defs>
            <g className="scope-zoom">
              {rings.map((ring, i) => (
                <g key={ring.key} className={`scope-ring ${i === active ? 'is-active' : ''}`}>
                  <circle className={`scope-band ${i % 2 ? 'is-alt' : ''}`} cx={C} cy={C} r={ring.outer} />
                  <text fontSize={ring.size}><textPath href={`#scope-line-${ring.key}`} textLength={ring.length} lengthAdjust="spacing">{ring.text}</textPath></text>
                </g>
              ))}
              <circle className="scope-core" cx={C} cy={C} r={radius(count)} fill="url(#scope-core-fill)" />
              <circle className="scope-light" cx={C} cy={C} r={radius(count)} />
            </g>
          </svg>
          <div className="agents-faces" aria-hidden="true">
            <div className="agents-lens"><div key={active} className="agents-lens-card"><AgentFace agent={agents[active]} /></div></div>
            <ul className="agents-team">{agents.map(agent => <li key={agent.key}><AgentFace agent={agent} /></li>)}</ul>
          </div>
          <div className="agents-caption" aria-hidden="true">
            <p className="agents-count"><span>{pad(active + 1)}</span> / {pad(count)}</p>
            <div key={active} className="agents-caption-body">
              <p className="agents-name">{agents[active].name}</p>
              <p className="agents-role">{agents[active].role}</p>
            </div>
            <ol className="agents-ticks">
              {agents.map((agent, i) => <li key={agent.key} className={i < active ? 'is-done' : i === active ? 'is-active' : undefined} />)}
            </ol>
          </div>
          <ol className="agents-list">
            {agents.map((agent, i) => (
              <li key={agent.key}>
                <AgentFace agent={agent} className="agents-list-face" />
                <span className="agents-list-num" aria-hidden="true">{pad(i + 1)}</span>
                <h3>{agent.name}</h3>
                <p>{agent.role}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
