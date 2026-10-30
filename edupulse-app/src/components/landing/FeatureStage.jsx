import { useLayoutEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger, useMotion, EASE } from './motion'
import { glideTo } from './navigation'

const pad = n => String(n).padStart(2, '0')
const TRIGGER = 'lp-features'

// Features. On a desktop with motion, the product stage holds still while the four parts of
// the workflow change beside it. One value, `active`, drives the step number, heading,
// screen, caption and step controls, so they stay in step whatever the scroll speed or
// direction. Each change wipes the new screen in over the old one with a small perspective-
// to-flat settle. Elsewhere every part is shown in sequence with its own screen.
export default function FeatureStage({ chapters }) {
  const ref = useRef(null), stage = useRef(null)
  const [active, setActive] = useState(0)
  const shown = useRef(0)
  const steps = chapters.length

  useMotion(ref, ({ motion, desktop }) => {
    if (!motion || !desktop) return undefined
    const section = ref.current, q = gsap.utils.selector(section)
    section.classList.add('is-live')
    const copies = q('.fs-chapter')
    gsap.set(copies, { opacity: i => (i === shown.current ? 1 : 0) })
    ScrollTrigger.create({
      id: TRIGGER, trigger: stage.current, pin: true, anticipatePin: 1, invalidateOnRefresh: true,
      start: () => `top top+=${document.querySelector('.lp-nav')?.offsetHeight || 72}`,
      end: () => `+=${Math.round((steps - 1) * window.innerHeight * 0.62)}`,
      onUpdate: self => setActive(Math.min(steps - 1, Math.floor(self.progress * steps))),
    })
    return () => section.classList.remove('is-live')
  }, [steps])

  // One transition per change of step, interrupted cleanly by the next one.
  useLayoutEffect(() => {
    const section = ref.current
    const from = shown.current
    shown.current = active
    if (from === active || !section.classList.contains('is-live')) return
    const q = gsap.utils.selector(section)
    const shots = q('.fs-shot'), copies = q('.fs-chapter'), frame = q('.fs-frame')[0]
    const forward = active > from
    gsap.killTweensOf([...shots, ...copies, frame])
    shots.forEach((shot, i) => { if (i === from) shot.dataset.leaving = ''; else delete shot.dataset.leaving })
    gsap.set(shots[from], { clearProps: 'clipPath' }) // the screen being covered shows whole, even mid-change
    gsap.set(copies.filter((_, i) => i !== from && i !== active), { opacity: 0, y: 0 })
    gsap.fromTo(shots[active], { clipPath: forward ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 0.62, ease: 'power3.inOut', clearProps: 'clipPath',
      onComplete: () => { delete shots[from]?.dataset.leaving },
    })
    gsap.fromTo(frame, { rotationY: forward ? -5 : 5, rotationX: 2, transformPerspective: 1400 }, { rotationY: 0, rotationX: 0, duration: 0.8, ease: EASE, clearProps: 'transform' })
    gsap.to(copies[from], { opacity: 0, y: forward ? -14 : 14, duration: 0.24, ease: 'power2.in' })
    gsap.fromTo(copies[active], { opacity: 0, y: forward ? 16 : -16 }, { opacity: 1, y: 0, duration: 0.5, ease: EASE, delay: 0.14 })
  }, [active])

  // Step controls scroll to the middle of their step, so the scroll position stays the one
  // source of truth for which step is shown.
  const goTo = i => {
    const trigger = ScrollTrigger.getById(TRIGGER)
    if (!trigger) return
    glideTo(Math.round(trigger.start + ((i + 0.5) / steps) * (trigger.end - trigger.start)))
  }

  return (
    <section id="features" className="lp-section fs" ref={ref} aria-labelledby="features-title">
      <div className="lp-wrap">
        <header className="lp-head">
          <p className="lp-label">Features</p>
          <h2 id="features-title" data-split>From the syllabus to every class</h2>
          <p>Four parts of one workflow, each starting from the approved KCP syllabus. The screens are the EduPulse prototype with sample data.</p>
        </header>
        <div className="fs-stage" ref={stage}>
          <div className="fs-copy">
            <p className="fs-count" aria-hidden="true"><span>{pad(active + 1)}</span> / {pad(steps)}</p>
            <ol className="fs-steps" aria-label="Feature steps">
              {chapters.map((chapter, i) => (
                <li key={chapter.key}>
                  <button type="button" className={`fs-step ${i === active ? 'is-active' : ''}`} aria-current={i === active ? 'step' : undefined} onClick={() => goTo(i)}>
                    <span className="fs-step-num" aria-hidden="true">{pad(i + 1)}</span>
                    <span className="fs-step-name">{chapter.title}</span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="fs-chapters">
              {chapters.map((chapter, i) => (
                <article key={chapter.key} className={`fs-chapter ${i === active ? 'is-active' : ''}`} aria-labelledby={`fs-title-${chapter.key}`}>
                  <p className="fs-who"><span>{pad(i + 1)}</span> {chapter.who}</p>
                  <h3 id={`fs-title-${chapter.key}`}>{chapter.title}</h3>
                  <p className="fs-body">{chapter.body}</p>
                  <ul>{chapter.points.map(point => <li key={point}>{point}</li>)}</ul>
                  <figure className="fs-inline">
                    <img src={chapter.image} alt={chapter.alt} loading="lazy" decoding="async" width="1600" height="862" />
                    <figcaption>{chapter.screen} · EduPulse prototype, sample data</figcaption>
                  </figure>
                </article>
              ))}
            </div>
          </div>
          <figure className="fs-frame">
            <div className="fs-bar" aria-hidden="true"><span /><span /><span /><em>edupulse-prototype.vercel.app</em></div>
            <div className="fs-screens">
              {chapters.map((chapter, i) => (
                <div key={chapter.key} className={`fs-shot ${i === active ? 'is-active' : ''}`} aria-hidden="true">
                  <img src={chapter.image} alt="" loading="lazy" decoding="async" width="1600" height="862" />
                </div>
              ))}
            </div>
            <figcaption className="fs-caption"><strong>{chapters[active].screen}</strong> · EduPulse prototype, sample data</figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
