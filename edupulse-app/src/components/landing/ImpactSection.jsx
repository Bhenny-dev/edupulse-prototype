import { useRef } from 'react'
import { Clock, TrendingDown, TimerReset, GraduationCap, Wrench, Presentation, Factory } from 'lucide-react'
import { gsap, useMotion } from './motion'
import { isWorld, triggerFor } from './classroom/mode'

const EVIDENCE_ICONS = { clock: Clock, less: TrendingDown, recovered: TimerReset }
const GOAL_ICONS = { access: GraduationCap, skills: Wrench, teachers: Presentation, industry: Factory }

// Why it matters: findings cited in the EduPulse study, with their sources. They describe the
// problem, not EduPulse results, so each is a fixed figure (no counters) on its own tile; a
// finding that is a share of a whole also has a meter. The tiles are brought in as they arrive
// (arrivals.js); the meter then fills to its share, once.
export default function ImpactSection({ evidence, goals }) {
  const ref = useRef(null)
  useMotion(ref, ({ motion }) => {
    if (!motion) return
    const q = gsap.utils.selector(ref)
    q('.evidence-meter-fill').forEach(fill => gsap.from(fill, {
      scaleX: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: triggerFor(fill), start: isWorld() ? 'top 12%' : 'top 68%', once: true },
    }))
  })

  return (
    <section id="impact" className="lp-section impact room" data-room="impact" ref={ref} aria-labelledby="impact-title">
      <div className="room-view"><div className="lp-wrap impact-board">
        <header className="lp-head">
          <p className="lp-label">Why it matters</p>
          <h2 id="impact-title" data-split>Preparation takes time. The research agrees.</h2>
          <p>Cited in the EduPulse study. They describe the problem, not EduPulse results.</p>
        </header>
        <div className="evidence">
          {evidence.map(item => {
            const Icon = EVIDENCE_ICONS[item.icon] || Clock
            return (
              <article key={item.source} className="evidence-item">
                <span className="evidence-icon" aria-hidden="true"><Icon size={22} strokeWidth={1.8} /></span>
                <p className="evidence-value">{item.value.toFixed(item.decimals)}{item.suffix}</p>
                {item.share != null && (
                  <span className="evidence-meter" aria-hidden="true">
                    <span className="evidence-meter-fill" style={{ width: `${item.share * 100}%` }} />
                  </span>
                )}
                <p className="evidence-label">{item.label}</p>
                <cite>{item.source}</cite>
              </article>
            )
          })}
        </div>
        <div className="goals">
          <h3>Sustainable Development Goals</h3>
          <ul>
            {goals.map(goal => {
              const Icon = GOAL_ICONS[goal.icon] || GraduationCap
              return (
                <li key={goal.code}>
                  <span className="goal-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.9} /></span>
                  <strong>{goal.code}</strong>
                  <span>{goal.text}</span>
                </li>
              )
            })}
          </ul>
        </div>
      </div></div>
    </section>
  )
}
