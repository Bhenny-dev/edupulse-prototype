import { useRef } from 'react'
import { gsap, useMotion, EASE, ENTER } from './motion'

// Why it matters: findings cited in the EduPulse study, with their sources. They describe the
// problem, not EduPulse results, so they are shown as fixed figures (no counters): a rule
// draws across each finding and the figures settle once.
export default function ImpactSection({ evidence, goals }) {
  const ref = useRef(null)
  useMotion(ref, ({ motion }) => {
    if (!motion) return
    const q = gsap.utils.selector(ref)
    gsap.timeline({ scrollTrigger: { trigger: q('.evidence')[0], start: ENTER, once: true } })
      .from(q('.evidence-rule'), { scaleX: 0, duration: 0.8, ease: 'power3.inOut', stagger: 0.12 })
      .from(q('.evidence-value'), { opacity: 0, y: 10, duration: 0.6, ease: EASE, stagger: 0.12 }, 0.25)
    gsap.from(q('.goal-rule'), { scaleX: 0, duration: 0.7, ease: 'power3.inOut', stagger: 0.08, scrollTrigger: { trigger: q('.goals')[0], start: ENTER, once: true } })
  })

  return (
    <section id="impact" className="lp-section impact" ref={ref} aria-labelledby="impact-title">
      <div className="lp-wrap">
        <header className="lp-head">
          <p className="lp-label">Why it matters</p>
          <h2 id="impact-title" data-split>Preparation takes time. The research agrees.</h2>
          <p>Findings cited in the EduPulse study. They describe the problem EduPulse addresses, not measured EduPulse results.</p>
        </header>
        <div className="evidence">
          {evidence.map(item => (
            <article key={item.source} className="evidence-item">
              <span className="evidence-rule" aria-hidden="true" />
              <p className="evidence-value">{item.value.toFixed(item.decimals)}{item.suffix}</p>
              <p className="evidence-label">{item.label}</p>
              <cite>{item.source}</cite>
            </article>
          ))}
        </div>
        <div className="goals">
          <h3>Sustainable Development Goals</h3>
          <ul>
            {goals.map(goal => (
              <li key={goal.code}><span className="goal-rule" aria-hidden="true" /><strong>{goal.code}</strong><span>{goal.text}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
