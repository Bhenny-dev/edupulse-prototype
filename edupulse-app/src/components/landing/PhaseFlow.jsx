import { useRef } from 'react'
import { Bot, UserCheck, FileUp, Users, FileText, Layers, GraduationCap, ChartColumn, Landmark, Briefcase, Presentation } from 'lucide-react'
import { gsap, ScrollTrigger, useMotion } from './motion'
import { isWorld, rectIn } from './classroom/mode'

const pad = n => String(n).padStart(2, '0')
const PHASE_ICONS = { records: FileUp, loading: Users, syllabus: FileText, courseware: Layers, access: GraduationCap, monitoring: ChartColumn }
const ROLE_ICONS = { Dean: Landmark, 'Program Coordinator': Briefcase, Instructor: Presentation, Students: GraduationCap, Everyone: Users }

// How it works: the six phases as one connected sequence of cards. Each card shows the phase,
// who works in it, and the hand-over from the AI (a dashed draft) to people (the decision).
// With motion, an SVG connector draws down through the phase markers as the page scrolls
// (scrubbed, so it follows both ways) and each marker lights when the line reaches it; the
// cards are brought in as they arrive (arrivals.js). Nothing is pinned. Without motion the connector
// is a plain rule and every phase is shown.
export default function PhaseFlow({ phases }) {
  const ref = useRef(null), track = useRef(null), svg = useRef(null), base = useRef(null), line = useRef(null)

  useMotion(ref, ({ motion }) => {
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
      const box = { width: track.current.offsetWidth, height: track.current.offsetHeight }
      const nodes = q('.flow-node').map(node => {
        const r = rectIn(node, track.current)
        return { x: r.x + r.w / 2, y: r.y + r.h / 2, edge: r.x + r.w }
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
      scrollTrigger: isWorld()
        ? { trigger: section, start: 'top top', end: () => `+=${Math.max(1, Number(section.dataset.holdPx) || 1)}`, scrub: 0.4, invalidateOnRefresh: true, onRefresh: build }
        : { trigger: track.current, start: 'top 62%', end: 'bottom 62%', scrub: 0.4, onRefresh: build },
    })

    const phaseEls = q('.flow-phase')
    const view = section.querySelector('.room-view')
    phaseEls.forEach(phase => ScrollTrigger.create({
      ...(isWorld()
        ? { trigger: section, start: () => `top top-=${Math.max(0, rectIn(phase, view).y - window.innerHeight * 0.62)}`, invalidateOnRefresh: true }
        : { trigger: phase, start: 'top 62%' }),
      end: 'max',
      onEnter: () => phase.classList.add('is-reached'), onLeaveBack: () => phase.classList.remove('is-reached'),
    }))
    return () => {
      section.classList.remove('is-live')
      phaseEls.forEach(phase => phase.classList.remove('is-reached'))
      for (const path of [base.current, line.current]) { path?.removeAttribute('d'); path?.removeAttribute('style') }
    }
  })

  return (
    <section id="flow" className="lp-section flow is-mist room" data-room="flow" ref={ref} aria-labelledby="flow-title">
      <div className="room-view"><div className="lp-wrap flow-grid">
        <header className="lp-head flow-head">
          <p className="lp-label">How it works</p>
          <h2 id="flow-title" data-split>Six phases. People decide each one.</h2>
          <p>From EduSuite files to student results. The AI assists; it never finalizes.</p>
        </header>
        <div className="flow-track" ref={track}>
          <svg className="flow-line" ref={svg} aria-hidden="true" focusable="false" preserveAspectRatio="none">
            <path ref={base} className="flow-line-base" />
            <path ref={line} className="flow-line-draw" />
          </svg>
          <ol className="flow-list">
            {phases.map(phase => {
              const Icon = PHASE_ICONS[phase.icon] || FileText
              return (
                <li key={phase.phase} className="flow-phase">
                  <span className="flow-node" aria-hidden="true">{pad(phase.phase)}</span>
                  <div className="flow-body">
                    <article className="flow-card">
                      <div className="flow-card-head">
                        <span className="flow-glyph" aria-hidden="true"><Icon size={22} strokeWidth={1.8} /></span>
                        <div>
                          <h3><span className="sr-only">Phase {phase.phase}: </span>{phase.title}</h3>
                          <ul className="flow-roles" aria-label="Who">
                            {phase.who.map(role => {
                              const RoleIcon = ROLE_ICONS[role] || Users
                              return <li key={role} className="flow-role"><RoleIcon size={13} strokeWidth={2} aria-hidden="true" />{role}</li>
                            })}
                          </ul>
                        </div>
                      </div>
                      <p className="flow-what">{phase.what}</p>
                      <dl className="flow-duties">
                        <div className="flow-duty is-ai"><dt><Bot size={15} aria-hidden="true" /> AI</dt><dd>{phase.ai}</dd></div>
                        <div className="flow-duty is-people"><dt><UserCheck size={15} aria-hidden="true" /> People</dt><dd>{phase.human}</dd></div>
                      </dl>
                    </article>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div></div>
    </section>
  )
}
