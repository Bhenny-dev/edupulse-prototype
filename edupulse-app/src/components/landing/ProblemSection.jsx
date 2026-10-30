import { useRef } from 'react'
import { ShieldCheck } from 'lucide-react'
import { gsap, useMotion, EASE, ENTER, DURATION } from './motion'

// Why EduPulse. The comparison opens from its centre seam (a split reveal), its rows settle
// one by one and a short connector draws from each problem to its improvement. The table
// keeps its semantics on phones (explicit roles survive the stacked layout).
export default function ProblemSection({ rows }) {
  const ref = useRef(null)
  useMotion(ref, ({ motion }) => {
    if (!motion) return
    const q = gsap.utils.selector(ref)
    const stacked = window.matchMedia('(max-width: 759px)').matches // connectors run downward on phones
    gsap.timeline({ scrollTrigger: { trigger: q('.why-compare')[0], start: ENTER, once: true } })
      .fromTo(q('.why-compare'), { clipPath: 'inset(0% 50% 0% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: DURATION.wide, ease: 'expo.inOut', clearProps: 'clipPath' })
      .from(q('.why-row'), { y: 14, autoAlpha: 0, duration: 0.55, ease: EASE, stagger: 0.07 }, 0.3)
      .from(q('.why-link'), { [stacked ? 'scaleY' : 'scaleX']: 0, duration: 0.5, ease: 'power2.out', stagger: 0.07 }, 0.45)
  })

  return (
    <section id="problem" className="lp-section why" ref={ref} aria-labelledby="why-title">
      <div className="lp-wrap">
        <header className="lp-head">
          <h2 id="why-title" data-split>Why EduPulse</h2>
          <p className="why-statement">
            At the CIT, every lesson is meant to follow the approved syllabus. In practice, syllabi
            are recycled, materials are rushed or pasted from AI chat tools, delivery is split between
            Moodle and paper, and the Dean's office cannot see what reaches the class.
          </p>
        </header>
        <div className="why-compare">
          <table className="why-table" role="table">
            <caption className="sr-only">Course preparation today and with EduPulse</caption>
            <thead role="rowgroup">
              <tr role="row"><th scope="col" role="columnheader">Area</th><th scope="col" role="columnheader">Today</th><th scope="col" role="columnheader">With EduPulse</th></tr>
            </thead>
            <tbody role="rowgroup">
              {rows.map(row => (
                <tr key={row.area} className="why-row" role="row">
                  <th scope="row" role="rowheader">{row.area}</th>
                  <td className="why-today" role="cell"><span className="why-cell-label" aria-hidden="true">Today</span>{row.today}</td>
                  <td className="why-next" role="cell"><span className="why-link" aria-hidden="true" /><span className="why-cell-label" aria-hidden="true">With EduPulse</span>{row.next}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="why-note">
          <ShieldCheck size={20} aria-hidden="true" /> EduPulse assists but never replaces the instructor's judgment:
          every material and assessment is reviewed and approved before it is used in class.
        </p>
      </div>
    </section>
  )
}
