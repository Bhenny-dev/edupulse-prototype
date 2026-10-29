import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger, MOTION } from './motion'

// The six phases read top to bottom as a timeline beside the section heading. Nothing
// is pinned, so the page keeps its normal scroll. With motion, the line between two
// phases draws itself while the first one crosses the middle of the screen, and the
// next phase's number lights up when the line reaches it. Without motion the line is
// drawn in full and every number is lit.
export default function PhaseRail({ phases }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add(MOTION, () => {
      const section = ref.current, q = gsap.utils.selector(section)
      section.classList.add('is-live')
      const triggers = q('.rail-panel').map(panel => {
        const line = panel.querySelector('.rail-line span')
        if (line) gsap.fromTo(line, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: panel, start: 'top 60%', end: 'bottom 60%', scrub: 0.4 } })
        return ScrollTrigger.create({ trigger: panel, start: 'top 60%', onEnter: () => panel.classList.add('is-reached'), onLeaveBack: () => panel.classList.remove('is-reached') })
      })
      return () => { triggers.forEach(trigger => trigger.kill()); section.classList.remove('is-live') }
    }, ref)
    return () => mm.revert()
  }, [])

  return (
    <section id="flow" className="rail" ref={ref}>
      <div className="rail-inner">
        <header className="lp-head is-left">
          <p className="lp-eyebrow">How it works</p>
          <h2 data-split>Six phases. People decide each one.</h2>
          <p data-reveal>From the EduSuite files to student results. The AI assists inside every phase and never finalizes one.</p>
        </header>
        <ol className="rail-track">
          {phases.map((phase, i) => (
            <li key={phase.phase} className="rail-panel">
              <span className="rail-num" aria-hidden="true">{String(phase.phase).padStart(2, '0')}</span>
              {i < phases.length - 1 && <span className="rail-line" aria-hidden="true"><span /></span>}
              <div className="rail-body">
                <p className="rail-who">Phase {phase.phase} · {phase.who}</p>
                <h3>{phase.title}</h3>
                <p>{phase.what}</p>
                <dl>
                  <div><dt>AI</dt><dd>{phase.ai}</dd></div>
                  <div><dt>People</dt><dd>{phase.human}</dd></div>
                </dl>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
