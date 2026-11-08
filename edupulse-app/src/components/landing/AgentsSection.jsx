import { useMemo, useRef, useState } from 'react'
import { gsap, ScrollTrigger, useMotion } from './motion'
import AgentFace from './AgentFace'
import { CLOCK, REST } from './classroom/clockface'
import { navHeight, scopeSize } from './classroom/scope'

// Inside Pulse. The agents are concentric rings of type around a centre, like a scope, and
// neighbouring rings turn in opposite directions.
//
// With motion the section holds the screen and one scroll runs three things, with nothing white
// in between:
//   opening   the camera has come to rest square on the wall clock of the Pulse room (3D school),
//             and the scope is drawn over it: its outer ring is the clock's rim, the clock's two
//             hands come apart into the letters of the rings, which swirl out to their places, and
//             the rings fill in. A round window opens in the middle onto the agent workspace behind.
//   naming    the scope zooms inward one ring per agent; the window shows the workspace's own robot
//             for that agent, the room's camera turning to it and the robot waving.
//   closing   the window opens out to the whole screen: the nine robots hop to a row, wave, and hop
//             back to their desks as the page moves on into the room. The workspace section waits
//             behind the scope the whole time (landing.css), so it is the same room throughout.
// Without motion it is one still picture with the agents listed below it. The rings are
// decorative; the list carries the content.

const C = 500, OUTER = 480, RATIO = 0.74      // viewBox centre, outer radius, ratio between rings
const TRIGGER = 'lp-agents'
const PER_AGENT = 0.55                        // screens of scrolling per agent
const OPENING = 1.6                           // the clock becoming the scope, in agent lengths
const CLOSING = 2.4                           // the window opening out and the team lining up
const LENS = 0.17                             // the window's radius, as a share of the scope's width
const UNIT = OUTER / CLOCK.rim                // the scope's units to a metre of the clock
const radius = i => OUTER * RATIO ** i
const pad = n => String(n).padStart(2, '0')
const clamp01 = value => Math.min(1, Math.max(0, value))
const smooth = t => t * t * (3 - 2 * t)
const mod360 = value => ((value % 360) + 360) % 360
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
// A point at distance `r` from the centre, `deg` clockwise from twelve o'clock.
const at = (r, deg) => [C + r * Math.sin((deg * Math.PI) / 180), C - r * Math.cos((deg * Math.PI) / 180)]
const put = (r, deg, scale = 1) => { const [x, y] = at(r, deg); return `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${deg.toFixed(2)})${scale === 1 ? '' : ` scale(${scale.toFixed(3)})`}` }
// How much room a letter takes on a ring, in letters: narrow ones less, wide ones more.
const room = ch => ' ·.,|!iIl:'.includes(ch) ? 0.5 : 'MW'.includes(ch) ? 1.35 : 1
// The clock's hands at rest, as degrees clockwise from twelve.
const HANDS = { minute: mod360(-(REST.minute * 180) / Math.PI), hour: mod360(-(REST.hour * 180) / Math.PI) }

export default function AgentsSection({ agents }) {
  const ref = useRef(null)
  const [active, setActive] = useState(0)
  const count = agents.length

  // Ring i spans radius(i) to radius(i + 1); its line runs once around the middle of the band, one
  // letter at a time: each letter's place on the ring, and where it starts (on one of the clock's
  // hands) and when it sets off. The last letter's room is left empty, so the line has a gap where
  // it meets its own start.
  const rings = useMemo(() => {
    let index = 0
    return agents.map((agent, i) => {
      const outer = radius(i), inner = radius(i + 1), band = outer - inner
      const size = band * 0.44
      const base = inner + (band - size * 0.7) / 2
      const text = `${agent.ring} ·`
      const total = [...text].reduce((sum, ch) => sum + room(ch), 0) + 1
      let used = 0
      const letters = [...text].map(ch => {
        const share = room(ch), theta = mod360(270 + (360 * (used + share / 2)) / total)
        used += share
        const n = index++
        const minute = n % 3 !== 0, hand = minute ? CLOCK.minute : CLOCK.hour
        return { ch, theta, base, size, start: UNIT * hand.tip * (0.18 + 0.82 * hash(n)), from: minute ? HANDS.minute : HANDS.hour, delay: 0.04 + i * 0.045 + hash(n + 91) * 0.18, final: put(base, theta) }
      })
      return { key: agent.key, outer, size, letters }
    })
  }, [agents])

  useMotion(ref, ({ motion }) => {
    if (!motion) return undefined
    const section = ref.current, q = gsap.utils.selector(section)
    const landing = section.closest('.landing-page')
    const svg = q('.scope-svg')[0], zoom = q('.scope-zoom')[0], ringEls = q('.scope-ring'), bands = q('.scope-band')
    const letterEls = q('.scope-letter'), flat = flatten(rings)
    const handsEl = q('.scope-hands')[0], rimEl = q('.scope-rim-line')[0], faceEl = q('.scope-face')[0]
    const lensEls = q('.scope-lens')
    section.classList.add('is-live')
    const state = { o: 0, a: -0.5, c: 0 }
    const settled = RATIO ** -(count - 0.5)    // the scale once the last agent has been shown
    let reach = 1, cover = settled, unit = 1, holePx = 0, lensPx = 0, size = 0
    const turned = new Array(count).fill(null)
    let flying = true
    // From the centre of the scope to the farthest corner of the screen, in px and in viewBox units.
    const measure = () => {
      const W = window.innerWidth, H = window.innerHeight
      size = scopeSize(W, H)
      section.style.setProperty('--scope-size', `${size}px`)
      const box = svg.getBoundingClientRect()
      unit = Math.max(0.0001, (size || box.width) / 1000)
      const cx = W / 2, cy = H / 2 + navHeight() / 2
      reach = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 4
      lensPx = LENS * size
      cover = Math.max(settled, (reach / unit * 1.04) / radius(count))
    }
    const ringTurn = i => { const turn = state.a * 24 + state.c * 70; return i % 2 ? -turn : turn }
    // The letters of the clock's hands swirl out to their rings, a few at a time.
    const fly = () => {
      let any = false
      flat.forEach(({ ring, letter }, j) => {
        const el = letterEls[j]
        const p = clamp01((state.o - letter.delay) / 0.36), e = smooth(p)
        if (p >= 1) { if (letter.flying) { letter.flying = false; el.setAttribute('transform', letter.final); el.style.opacity = '' } return }
        any = true
        letter.flying = true
        const turn = ringTurn(ring)
        const from = letter.from - turn, sweep = mod360(letter.theta - from) + 360
        el.setAttribute('transform', put(letter.start + (letter.base - letter.start) * e, from + sweep * e, 0.5 + 0.5 * e))
        el.style.opacity = p <= 0 ? '0' : String(Math.min(1, p * 5))
      })
      flying = any
    }
    // One writer for the scope: the scroll-linked timeline below calls this on every update.
    const render = () => {
      const { o, a, c } = state
      const scale = c > 0 ? settled * (cover / settled) ** smooth(c) : RATIO ** -Math.max(0, a)
      zoom.setAttribute('transform', `translate(${C} ${C}) scale(${scale}) translate(${-C} ${-C})`)
      ringEls.forEach((ring, i) => {
        const shown = radius(i + 1) * scale < reach
        ring.style.visibility = shown ? '' : 'hidden'
        const turn = ringTurn(i)
        if (shown && turn !== turned[i]) { turned[i] = turn; ring.setAttribute('transform', `rotate(${turn} ${C} ${C})`) }
        // The rings fill in from the outside, once the first letters are away.
        const k = smooth(clamp01((o - 0.1 - i * 0.05) / 0.3))
        bands[i].style.opacity = String(k)
        bands[i].setAttribute('transform', `translate(${C} ${C}) scale(${0.86 + 0.14 * k}) translate(${-C} ${-C})`)
      })
      if (o < 1 || flying) fly()
      // The hands give way to the letters that leave them; the rim stays as the scope's edge.
      if (handsEl) handsEl.style.opacity = String(1 - smooth(clamp01((o - 0.04) / 0.4)))
      if (rimEl) rimEl.style.opacity = String(smooth(clamp01(o / 0.12)))
      if (faceEl) faceEl.style.opacity = String(1 - smooth(clamp01(o / 0.3)))
      // The window: closed until the rings are in, round in the middle while the agents are named,
      // then wider than the screen.
      holePx = lensPx * smooth(clamp01((o - 0.8) / 0.2)) + (reach - lensPx) * smooth(clamp01((c - 0.1) / 0.6))
      const edge = `radial-gradient(circle at 50% calc(50% + ${(navHeight() / 2).toFixed(1)}px), transparent ${holePx.toFixed(1)}px, #000 ${(holePx + 1.5).toFixed(1)}px)`
      const mask = holePx > 0.5 ? edge : ''
      section.style.maskImage = mask
      section.style.webkitMaskImage = mask
      lensEls.forEach((ring, i) => {
        ring.setAttribute('r', ((holePx + (i ? 0 : 5)) / unit).toFixed(2))
        ring.style.opacity = holePx > 0.5 ? String(1 - smooth(clamp01((c - 0.55) / 0.3))) : '0'
      })
      section.style.setProperty('--agents-veil', String(smooth(clamp01(o / 0.75))))
      section.style.setProperty('--agents-head', String(smooth(clamp01((o - 0.5) / 0.4)) * (1 - smooth(clamp01((a + 0.3) / 0.7)))))
      section.style.setProperty('--agents-caption', String(smooth(clamp01((o - 0.85) / 0.15)) * (1 - smooth(clamp01(c / 0.25)))))
      landing?.classList.toggle('is-scope-open', o > 0.72)
      landing?.classList.toggle('is-scoping', o > 0 && c < 0.97)
      const named = Math.min(count - 1, Math.max(0, Math.round(a)))
      setActive(named)
      // The workspace behind: its camera follows the agent named, then the team lines up and goes
      // back to its desks (WorkspaceSection listens).
      const want = c >= 0.9 ? 'places' : c >= 0.04 ? 'line' : o >= 0.99 ? agents[named].key : ''
      if (want !== crew) {
        const from = crew
        crew = want
        if (want === 'line') send('scope:line', true)
        else {
          if (from === 'line') send('scope:line', false)
          send('scope:focus', want && want !== 'places' ? want : null)
        }
      }
    }
    let crew = ''
    const send = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }))
    measure()
    // The scroll the pin adds, for the workspace's layout (landing.css keeps the room under it).
    const holdLength = pin => landing?.style.setProperty('--agents-pin', `${Math.round(pin.end - pin.start)}px`)
    const { scrollTrigger: pin } = gsap.timeline({
      defaults: { ease: 'none' }, onUpdate: render,
      scrollTrigger: {
        id: TRIGGER, trigger: section, pin: true, start: 'top top', scrub: 0.6, invalidateOnRefresh: true,
        end: () => `+=${Math.round(window.innerHeight * (OPENING + count + CLOSING) * PER_AGENT)}`,
        onRefresh: self => { measure(); holdLength(self); render() },
      },
    }).to(state, { o: 1, duration: OPENING }).addLabel('opened').to(state, { a: count - 0.5, duration: count }).to(state, { c: 1, duration: CLOSING })
    holdLength(pin)
    ScrollTrigger.refresh()
    render()
    return () => {
      if (crew === 'line') send('scope:line', false)
      if (crew) send('scope:focus', null)
      section.classList.remove('is-live')
      landing?.classList.remove('is-scope-open', 'is-scoping')
      landing?.style.removeProperty('--agents-pin')
      zoom.removeAttribute('transform')
      ringEls.forEach((ring, i) => { ring.removeAttribute('transform'); ring.style.visibility = ''; bands[i].removeAttribute('transform'); bands[i].style.opacity = '' })
      letterEls.forEach((el, j) => { el.setAttribute('transform', flat[j].letter.final); el.style.opacity = ''; flat[j].letter.flying = false })
      ;[handsEl, rimEl, faceEl].forEach(el => { if (el) el.style.opacity = '' })
      lensEls.forEach(ring => { ring.style.opacity = ''; ring.removeAttribute('r') })
      section.style.maskImage = ''
      section.style.webkitMaskImage = ''
      for (const name of ['--agents-veil', '--agents-head', '--agents-caption', '--scope-size']) section.style.removeProperty(name)
      setActive(0)
    }
  }, [count])

  const k = UNIT
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
            </defs>
            <g className="scope-zoom">
              <circle className="scope-face" cx={C} cy={C} r={OUTER - CLOCK.rimWidth * k} />
              {rings.map((ring, i) => (
                <g key={ring.key} className={`scope-ring ${i === active ? 'is-active' : ''}`}>
                  <circle className={`scope-band ${i % 2 ? 'is-alt' : ''}`} cx={C} cy={C} r={ring.outer} />
                  <g className="scope-letters" fontSize={ring.size}>
                    {ring.letters.map((letter, j) => <text key={j} className="scope-letter" textAnchor="middle" transform={letter.final}>{letter.ch}</text>)}
                  </g>
                </g>
              ))}
              <circle className="scope-core" cx={C} cy={C} r={radius(count)} fill="url(#scope-core-fill)" />
              <circle className="scope-rim-line" cx={C} cy={C} r={OUTER - (CLOCK.rimWidth * k) / 2} strokeWidth={CLOCK.rimWidth * k} />
              <g className="scope-hands">
                <g transform={`rotate(${HANDS.hour} ${C} ${C})`}><rect className="scope-hand is-hour" x={C - (CLOCK.hour.width * k) / 2} y={C - CLOCK.hour.tip * k} width={CLOCK.hour.width * k} height={(CLOCK.hour.tip + CLOCK.hour.tail) * k} rx={(CLOCK.hour.width * k) / 2} /></g>
                <g transform={`rotate(${HANDS.minute} ${C} ${C})`}><rect className="scope-hand is-minute" x={C - (CLOCK.minute.width * k) / 2} y={C - CLOCK.minute.tip * k} width={CLOCK.minute.width * k} height={(CLOCK.minute.tip + CLOCK.minute.tail) * k} rx={(CLOCK.minute.width * k) / 2} /></g>
              </g>
            </g>
            <circle className="scope-lens" cx={C} cy={C} r="0" />
            <circle className="scope-lens is-inner" cx={C} cy={C} r="0" />
          </svg>
          <div className="agents-caption" aria-hidden="true">
            <p className="agents-count"><span>{pad(active + 1)}</span> / {pad(count)}</p>
            <div key={active} className="agents-caption-body">
              <p className="agents-name">{agents[active].name}</p>
              <ul className="agents-words">{agents[active].words.map(word => <li key={word}>{word}</li>)}</ul>
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

// The letters of every ring in one list, in the order they are drawn, with the ring each belongs to.
const flatten = rings => rings.flatMap((ring, i) => ring.letters.map(letter => ({ ring: i, letter })))
