import { useRef } from 'react'
import { GraduationCap } from 'lucide-react'
import { gsap, useMotion, EASE, ENTER } from './motion'

const ARCS = [0.62, 0.48, 0.8] // drawn length of each arc around the seal (matches landing.css)

// Colleges: the CIT, the one college EduPulse serves now, then the four KCP colleges where
// adoption is planned. Arcs draw around the CIT seal (a radial reveal) and the planned cards
// settle in a gentle stagger. Their status never changes: they stay "Planned".
export default function CollegesSection({ cit, planned }) {
  const ref = useRef(null)
  useMotion(ref, ({ motion }) => {
    if (!motion) return
    const q = gsap.utils.selector(ref)
    gsap.timeline({ scrollTrigger: { trigger: q('.cit-feature')[0], start: ENTER, once: true } })
      .from(q('.cit-arc'), { strokeDashoffset: i => ARCS[i], duration: 1, ease: 'power3.inOut', stagger: 0.1 })
      .from(q('.cit-seal img'), { opacity: 0, scale: 0.9, duration: 0.7, ease: EASE }, 0.15)
    gsap.from(q('.college-card'), { opacity: 0, y: 18, duration: 0.7, ease: EASE, stagger: 0.09, scrollTrigger: { trigger: q('.college-list')[0], start: ENTER, once: true } })
  })

  return (
    <section id="colleges" className="lp-section colleges" ref={ref} aria-labelledby="colleges-title">
      <div className="lp-wrap">
        <header className="lp-head">
          <p className="lp-label">Colleges</p>
          <h2 id="colleges-title" data-split>Built for the CIT first</h2>
          <p>The study covers the CIT. Other KCP colleges are planned; each joins once its instructors and records are in.</p>
        </header>
        <article className="cit-feature" aria-labelledby="cit-name">
          <div className="cit-seal">
            <svg className="cit-arcs" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
              <circle className="cit-arc is-1" cx="120" cy="120" r="114" pathLength="1" />
              <circle className="cit-arc is-2" cx="120" cy="120" r="100" pathLength="1" />
              <circle className="cit-arc is-3" cx="120" cy="120" r="86" pathLength="1" />
            </svg>
            <img src={cit.emblem} alt={`${cit.name} seal`} width="160" height="160" loading="lazy" decoding="async" />
          </div>
          <div className="cit-body">
            <p className="college-status is-active"><span aria-hidden="true" /> Now serving</p>
            <h3 id="cit-name">{cit.name}</h3>
            <ul>{cit.programs.map(program => <li key={program}><GraduationCap size={18} aria-hidden="true" /> {program}</li>)}</ul>
          </div>
          <figure className="cit-photo"><img src={cit.photo} alt="" loading="lazy" decoding="async" width="1280" height="800" /></figure>
        </article>
        <ul className="college-list">
          {planned.map(college => (
            <li key={college.code} className="college-card">
              <div className="college-card-photo"><img src={college.photo} alt="" loading="lazy" decoding="async" width="720" height="480" /></div>
              <img src={college.emblem} alt={`${college.name} seal`} className="college-card-emblem" width="64" height="64" loading="lazy" decoding="async" />
              <h3>{college.name}</h3>
              <p className="college-card-meta">{[college.code, college.since && `since ${college.since}`, college.motto].filter(Boolean).join(' · ')}</p>
              <p className="college-status">Planned</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
