import { useRef, useState } from 'react'
import { ShieldCheck, FileText, Layers, Send, Eye, ChartColumn } from 'lucide-react'
import { gsap, useMotion, EASE } from './motion'

const ICONS = { syllabus: FileText, materials: Layers, delivery: Send, oversight: Eye, performance: ChartColumn }

// Why EduPulse, shown rather than told: five cards, each with today's state on one face and
// EduPulse's on the other. With motion the cards rise showing "Today", then flip once to
// "With EduPulse"; the switch flips them back and forth. The faces are decorative; each card
// carries one plain sentence with both states for assistive technology.
export default function ProblemSection({ rows }) {
  const ref = useRef(null)
  const [view, setView] = useState('next')

  useMotion(ref, ({ motion }) => {
    if (!motion) return undefined
    const q = gsap.utils.selector(ref)
    setView('today')
    gsap.timeline({ scrollTrigger: { trigger: q('.why-cards')[0], start: 'top 78%', once: true } })
      .from(q('.why-card'), { y: 28, autoAlpha: 0, duration: 0.6, ease: EASE, stagger: 0.08 })
      .add(() => setView('next'), '+=0.45')
    return () => setView('next')
  })

  return (
    <section id="problem" className="lp-section why" ref={ref} aria-labelledby="why-title">
      <div className="lp-wrap">
        <header className="lp-head why-head">
          <h2 id="why-title" data-split>Why EduPulse</h2>
          <p className="why-statement">Every lesson should follow the approved syllabus. Today, the pieces drift apart.</p>
        </header>
        <div className="why-switch" role="group" aria-label="Show course preparation">
          <span className="why-switch-marker" data-view={view} aria-hidden="true" />
          <button type="button" aria-pressed={view === 'today'} onClick={() => setView('today')}>Today</button>
          <button type="button" aria-pressed={view === 'next'} onClick={() => setView('next')}>With EduPulse</button>
        </div>
        <ul className={`why-cards is-${view}`}>
          {rows.map((row, i) => {
            const Icon = ICONS[row.key]
            return (
              <li key={row.key} className="why-card" style={{ '--i': i }}>
                <p className="sr-only">{`${row.area}. Today: ${row.today}. With EduPulse: ${row.next}.`}</p>
                <div className="why-flip" aria-hidden="true">
                  <div className="why-face is-today">
                    <span className="why-icon"><Icon size={22} strokeWidth={1.8} /></span>
                    <p className="why-area">{row.area}</p>
                    <p className="why-text">{row.today}</p>
                    <p className="why-state">Today</p>
                  </div>
                  <div className="why-face is-next">
                    <span className="why-icon"><Icon size={22} strokeWidth={1.8} /></span>
                    <p className="why-area">{row.area}</p>
                    <p className="why-text">{row.next}</p>
                    <p className="why-state">With EduPulse</p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        <p className="why-note"><ShieldCheck size={20} aria-hidden="true" /> AI drafts. Instructors review and approve every item.</p>
      </div>
    </section>
  )
}
