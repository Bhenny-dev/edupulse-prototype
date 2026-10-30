import { useRef } from 'react'
import FaqList from './FaqList'
import { gsap, useMotion, EASE, ENTER } from './motion'

// FAQ. The larger geometry belongs to the entrance: a pale plane slides in behind the heading
// once. The questions themselves only open and close.
export default function FaqSection({ items }) {
  const ref = useRef(null)
  useMotion(ref, ({ motion }) => {
    if (!motion) return
    const q = gsap.utils.selector(ref)
    gsap.from(q('.faq-plane'), { xPercent: -18, opacity: 0, duration: 0.85, ease: EASE, scrollTrigger: { trigger: ref.current, start: ENTER, once: true } })
  })

  return (
    <section id="faq" className="lp-section faq" ref={ref} aria-labelledby="faq-title">
      <span className="faq-plane" aria-hidden="true" />
      <div className="lp-wrap faq-grid">
        <header className="lp-head">
          <p className="lp-label">FAQ</p>
          <h2 id="faq-title" data-split>Questions people ask</h2>
          <p>How EduPulse fits the college's process, and what the AI may and may not do.</p>
        </header>
        <FaqList items={items} />
      </div>
    </section>
  )
}
