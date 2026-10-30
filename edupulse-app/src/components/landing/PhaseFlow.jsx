import { useRef } from 'react'
import { Bot, UserCheck } from 'lucide-react'
import { gsap, ScrollTrigger, useMotion, EASE } from './motion'

const pad = n => String(n).padStart(2, '0')

// How it works: the six phases as one connected sequence. With motion, an SVG connector draws
// down through the phase markers as the page scrolls (scrubbed, so it follows both ways), each
// marker lights when the line reaches it, and the phase's text, then its AI and People duties,
// settle in once. Nothing is pinned. Without motion the connector is a plain rule and every
// phase is shown.
export default function PhaseFlow({ phases }) {
  const ref = useRef(null), track = useRef(null), svg = useRef(null), base = useRef(null), line = useRef(null)

  useMotion(ref, ({ motion }, context) => {
    if (!motion) return undefined
    const section = ref.current, q = gsap.utils.selector(section)
    section.classList.add('is-live')
    const state = { p: 0 }
    let length = 1
    const paint = () => {
      line.current.style.strokeDasharray = `${length} ${length}`
      line.current.style.strokeDashoffset = `${length * (1 - state.p)}`
    }
    // The connector: a spine through every marker, with a short branch into each phase.
    const build = () => {
      const box = track.current.getBoundingClientRect()
      const nodes = q('.flow-node').map(node => {
        const r = node.getBoundingClientRect()
        return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2, edge: r.right - box.left }
      })
      let d = ''
      nodes.forEach((node, i) => {
        if (i) d += `M ${node.x} ${nodes[i - 1].y} V ${node.y} `
        d += `M ${node.edge + 6} ${node.y} h 20 `
      })
      svg.current.setAttribute('viewBox', `0 0 ${Math.max(1, box.width)} ${Math.max(1, box.height)}`)
      base.current.setAttribute('d', d.trim())
      line.current.setAttribute('d', d.trim())
      length = line.current.getTotalLength() || 1
      paint()
    }
    build()
    gsap.to(state, {
      p: 1, ease: 'none', onUpdate: paint,
      scrollTrigger: { trigger: track.current, start: 'top 62%', end: 'bottom 62%', scrub: 0.4, onRefresh: build },
    })

    const phaseEls = q('.flow-phase')
    gsap.set(q('.flow-body'), { opacity: 0, x: -16 }) // hidden from sight only; still read by assistive technology
    // Created inside the context, so a later revert also undoes these entrances.
    const reach = context.add(null, phase => {
      phase.classList.add('is-reached')
      if ('shown' in phase.dataset) return
      phase.dataset.shown = ''
      gsap.timeline()
        .to(phase.querySelector('.flow-body'), { opacity: 1, x: 0, duration: 0.6, ease: EASE })
        .from(phase.querySelectorAll('.flow-duty'), { opacity: 0, y: 8, duration: 0.45, ease: EASE, stagger: 0.12 }, 0.18)
    })
    phaseEls.forEach(phase => ScrollTrigger.create({
      trigger: phase, start: 'top 62%', end: 'max',
      onEnter: () => reach(phase), onLeaveBack: () => phase.classList.remove('is-reached'),
    }))
    return () => {
      section.classList.remove('is-live')
      phaseEls.forEach(phase => { phase.classList.remove('is-reached'); delete phase.dataset.shown })
      for (const path of [base.current, line.current]) { path?.removeAttribute('d'); path?.removeAttribute('style') }
    }
  })

  return (
    <section id="flow" className="lp-section flow is-mist" ref={ref} aria-labelledby="flow-title">
      <div className="lp-wrap flow-grid">
        <header className="lp-head flow-head">
          <p className="lp-label">How it works</p>
          <h2 id="flow-title" data-split>Six phases. People decide each one.</h2>
          <p>From the EduSuite files to student results. The AI assists inside every phase and never finalizes one.</p>
        </header>
        <div className="flow-track" ref={track}>
          <svg className="flow-line" ref={svg} aria-hidden="true" focusable="false" preserveAspectRatio="none">
            <path ref={base} className="flow-line-base" />
            <path ref={line} className="flow-line-draw" />
          </svg>
          <ol className="flow-list">
            {phases.map(phase => (
              <li key={phase.phase} className="flow-phase">
                <span className="flow-node" aria-hidden="true">{pad(phase.phase)}</span>
                <div className="flow-body">
                  <p className="flow-who">Phase {phase.phase} · {phase.who}</p>
                  <h3>{phase.title}</h3>
                  <p className="flow-what">{phase.what}</p>
                  <dl className="flow-duties">
                    <div className="flow-duty is-ai"><dt><Bot size={16} aria-hidden="true" /> AI</dt><dd>{phase.ai}</dd></div>
                    <div className="flow-duty is-people"><dt><UserCheck size={16} aria-hidden="true" /> People</dt><dd>{phase.human}</dd></div>
                  </dl>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
