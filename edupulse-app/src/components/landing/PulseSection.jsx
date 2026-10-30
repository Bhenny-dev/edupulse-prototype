import { useRef } from 'react'
import { BookOpenCheck, FileSearch, FileCheck, Compass, Hand, ChartColumn } from 'lucide-react'
import PulseAvatar from '../pulse/PulseAvatar'
import { gsap, useMotion, EASE } from './motion'

const ICONS = [BookOpenCheck, FileSearch, FileCheck, Compass, Hand, ChartColumn]

// Pulse, the assistant. The sample conversation opens through a circular iris centred on the
// Pulse character; the messages and what Pulse checked then appear once, in order, and stay.
// The demonstration does not loop. It is labelled as an illustration of the student view.
export default function PulseSection({ principles }) {
  const ref = useRef(null)
  useMotion(ref, ({ motion }) => {
    if (!motion) return
    const q = gsap.utils.selector(ref)
    gsap.timeline({ scrollTrigger: { trigger: q('.pulse-demo')[0], start: 'top 75%', once: true } })
      .fromTo(q('.pulse-scope'), { clipPath: 'circle(0% at 68px 64px)' }, { clipPath: 'circle(160% at 68px 64px)', duration: 0.85, ease: 'expo.inOut', clearProps: 'clipPath' })
      .from(q('.pulse-msg'), { opacity: 0, y: 10, duration: 0.42, ease: EASE, stagger: 0.3 }, 0.5)
      .from(q('.pulse-source-link'), { scaleY: 0, duration: 0.3, ease: 'power2.out', stagger: 0.08 }, 1.05)
  })

  return (
    <section id="ai" className="lp-section pulse is-mist" ref={ref} aria-labelledby="pulse-title">
      <div className="lp-wrap pulse-grid">
        <div className="pulse-copy">
          <header className="lp-head">
            <p className="lp-label">Pulse, the AI assistant</p>
            <h2 id="pulse-title" data-split>Grounded in your documents. Decided by you.</h2>
            <p>Pulse lives on every page. It retrieves from the approved syllabus and your files, drafts when you ask, and stops at the boundaries the college set.</p>
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
        <figure className="pulse-demo">
          <div className="pulse-scope">
            <div className="pulse-demo-head">
              <PulseAvatar size={64} expression="encouraging" />
              <span><strong>Pulse</strong><small>Student view · sample conversation</small></span>
            </div>
            <p className="pulse-msg pulse-bubble is-user">Give me the answers to quiz 2.</p>
            <ul className="pulse-msg pulse-sources" aria-label="What Pulse checked">
              <li><span className="pulse-source-link" aria-hidden="true" />Appropriate-use rule · assessments</li>
              <li><span className="pulse-source-link" aria-hidden="true" />Week 4 reading · conditional statements, unopened</li>
            </ul>
            <p className="pulse-msg pulse-bubble is-pulse">I can't help with assessment answers. Your Week 4 reading on conditional statements is still unopened. Want to start there?</p>
            <p className="pulse-msg pulse-tag">Declined · appropriate-use rule</p>
          </div>
          <figcaption>Illustration · a student asks Pulse for quiz answers</figcaption>
        </figure>
      </div>
    </section>
  )
}
