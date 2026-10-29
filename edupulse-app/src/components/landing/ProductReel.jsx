import { useLayoutEffect, useRef } from 'react'
import { gsap, MOTION, DESKTOP, DURATION, TRAVEL, EXIT } from './motion'

// Pinned scrollytelling on desktop: chapters change on the left while real EduPulse
// screens wipe in on the right. Without motion (or on phones) every chapter shows its
// own screen in sequence, so nothing depends on scrolling.
export default function ProductReel({ chapters }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add(`${MOTION} and ${DESKTOP}`, () => {
      const section = ref.current, q = gsap.utils.selector(section)
      section.classList.add('is-live')
      const items = q('.reel-chapter'), shots = q('.reel-shot'), counter = q('.reel-current')[0], last = items.length - 1
      gsap.set(items.slice(1), { autoAlpha: 0, y: TRAVEL })
      gsap.set(shots.slice(1), { clipPath: 'inset(100% 0% 0% 0%)' })
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: q('.reel-stage')[0], start: 'top top+=72', end: `+=${last * 100}%`, pin: true, scrub: 1, anticipatePin: 1,
          snap: { snapTo: 1 / last, duration: { min: 0.3, max: 0.8 }, ease: 'power2.inOut' },
          onUpdate: self => { if (counter) counter.textContent = String(Math.round(self.progress * last) + 1).padStart(2, '0') },
        },
      })
      for (let i = 1; i <= last; i++) {
        const at = i - 1
        timeline
          .to(items[i - 1], { autoAlpha: 0, y: -TRAVEL, duration: DURATION.base * EXIT, ease: 'power2.in' }, at + 0.2)
          .to(items[i], { autoAlpha: 1, y: 0, duration: DURATION.base, ease: 'power3.out' }, at + 0.5)
          .to(shots[i], { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'power3.inOut' }, at + 0.2)
          .to(shots[i - 1].querySelector('img'), { scale: 1.06, yPercent: -3, duration: 0.7, ease: 'power2.inOut' }, at + 0.2)
      }
      timeline.to({}, { duration: 0.3 })
      return () => section.classList.remove('is-live')
    }, ref)
    return () => mm.revert()
  }, [])

  return (
    <section id="features" className="lp-section reel" ref={ref}>
      <header className="lp-head">
        <p className="lp-eyebrow">Features</p>
        <h2 data-split>From the syllabus to every class</h2>
        <p data-reveal>Four parts of one workflow, each starting from the approved KCP syllabus. The screens are the EduPulse prototype with sample data.</p>
      </header>
      <div className="reel-stage">
        <div className="reel-copy">
          <p className="reel-index" aria-hidden="true"><span className="reel-current">01</span> / {String(chapters.length).padStart(2, '0')}</p>
          {chapters.map((chapter, i) => (
            <article key={chapter.key} className="reel-chapter">
              <p className="reel-who"><span>{String(i + 1).padStart(2, '0')}</span> {chapter.who}</p>
              <h3>{chapter.title}</h3>
              <p>{chapter.body}</p>
              <ul>{chapter.points.map(point => <li key={point}>{point}</li>)}</ul>
              <img src={chapter.image} alt={chapter.alt} className="reel-inline-shot" loading="lazy" decoding="async" width="1600" height="862" />
            </article>
          ))}
        </div>
        <figure className="reel-frame" aria-hidden="true">
          <div className="reel-bar"><span /><span /><span /><em>edupulse-prototype.vercel.app</em></div>
          <div className="reel-shots">
            {chapters.map(chapter => <div key={chapter.key} className="reel-shot"><img src={chapter.image} alt="" loading="lazy" decoding="async" width="1600" height="862" /></div>)}
          </div>
          <figcaption>EduPulse prototype · sample data</figcaption>
        </figure>
      </div>
    </section>
  )
}
