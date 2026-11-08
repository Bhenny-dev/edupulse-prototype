import { ArrowRight } from 'lucide-react'
import PulseRing from './PulseRing'
import { scrollToId } from './navigation'
import { KCP, COLLEGES } from '../../data/colleges'
import kcpBuilding from '../../assets/kcp/kcp-building.webp'

const CIT = COLLEGES.find(college => college.status === 'active')

// The hero's picture is what the first screen waits for: it is requested before the page has drawn
// anything else, ahead of the scripts that will place it.
if (typeof document !== 'undefined' && /^#?\/?(\?.*)?$/.test(window.location.hash)) {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'image'
  link.href = kcpBuilding
  link.fetchPriority = 'high'
  document.head.append(link)
}

// The hero: the institutions, the title and two actions on a blue and white stage, beside the
// emblem: the Pulse ring around the KCP and CIT seals. When the 3D scene runs it draws the ring
// and the seals as medallions over the emblem box, its anchor. Without WebGL, with reduced
// motion, or while the scene loads, this markup is what shows.
export default function Hero({ ringRef }) {
  return (
    <header id="top" className="lp-hero">
      <div className="hero-inner">
        <div className="hero-copy">
          <p className="hero-lockup" data-hero-in><span>{KCP.name}</span><span>{CIT.name}</span></p>
          {/* The no-break space keeps "& scores" together as the closing line. */}
          <h1 id="hero-title" className="hero-title" tabIndex={-1}>One shared home for syllabi, courseware &amp;&nbsp;scores</h1>
          <div className="hero-actions" data-hero-in>
            <a href="#login" className="lp-button" onClick={event => scrollToId(event, 'login')}>
              Get started <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a href="#flow" className="lp-link" onClick={event => scrollToId(event, 'flow')}>See how it works</a>
          </div>
        </div>
        <div className="hero-emblem" ref={ringRef} aria-hidden="true">
          <PulseRing />
          <span className="hero-seal" data-seal="kcp"><img src={KCP.crest} alt="" decoding="async" /></span>
          <span className="hero-seal" data-seal="cit"><img src={CIT.emblem} alt="" decoding="async" /></span>
        </div>
      </div>
      <img className="hero-building" src={kcpBuilding} alt="The King's College of the Philippines building" width="2000" height="252" decoding="async" fetchPriority="high" />
    </header>
  )
}
