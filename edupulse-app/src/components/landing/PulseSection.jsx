import { useRef } from 'react'
import { BookOpenCheck, FileSearch, FileCheck, Compass, Hand, ChartColumn } from 'lucide-react'
import PulseChat from './PulseChat'
import { gsap, useMotion, EASE } from './motion'
import { isWorld, triggerFor } from './classroom/mode'

const ICONS = [BookOpenCheck, FileSearch, FileCheck, Compass, Hand, ChartColumn]

// Pulse, the assistant. The sample conversation opens through a circular iris centred on the
// Pulse character; the messages and what Pulse checked then appear once, in order, and stay.
// The demonstration does not loop. It is labelled as an illustration of the student view.
export default function PulseSection({ principles }) {
  const ref = useRef(null)
  useMotion(ref, ({ motion }) => {
    if (!motion) return
    const q = gsap.utils.selector(ref)
    gsap.timeline({ scrollTrigger: { trigger: triggerFor(q('.pulse-demo')[0]), start: isWorld() ? 'top 22%' : 'top 75%', once: true } })
      .fromTo(q('.pulse-scope'), { clipPath: 'circle(0% at 68px 64px)' }, { clipPath: 'circle(160% at 68px 64px)', duration: 0.85, ease: 'expo.inOut', clearProps: 'clipPath' })
      .from(q('.pulse-msg'), { opacity: 0, y: 10, duration: 0.42, ease: EASE, stagger: 0.3 }, 0.5)
      .from(q('.pulse-source-link'), { scaleY: 0, duration: 0.3, ease: 'power2.out', stagger: 0.08 }, 1.05)
  })

  return (
    <section id="ai" className="lp-section pulse is-mist room" data-room="ai" ref={ref} aria-labelledby="pulse-title">
      <div className="room-view"><div className="lp-wrap pulse-grid">
        <div className="pulse-copy">
          <header className="lp-head">
            <p className="lp-label">Pulse, the AI assistant</p>
            <h2 id="pulse-title" data-split>Grounded in your documents. Decided by you.</h2>
            <p>On every page. It drafts from your approved sources and stops at the college’s limits.</p>
          </header>
          <ul className="promises">
            {principles.map((principle, i) => {
              const Icon = ICONS[i] || BookOpenCheck
              return (
                <li key={principle.title}>
                  <span className="promise-icon"><Icon size={20} aria-hidden="true" /></span>
                  <h3>{principle.title}</h3>
                  <p>{principle.body}</p>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="pulse-gap" aria-hidden="true" />
        <PulseChat caption="Illustration · a student asks Pulse for quiz answers" />
      </div></div>
    </section>
  )
}
