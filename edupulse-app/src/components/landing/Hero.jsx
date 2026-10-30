import { ArrowRight } from 'lucide-react'
import PulseRing from './PulseRing'
import { scrollToId } from './navigation'
import { KCP, COLLEGES } from '../../data/colleges'
import syllabusScreen from '../../assets/product/syllabus.webp'
import citPhoto from '../../assets/kcp/hero-cit-sm.webp'

const CIT = COLLEGES.find(college => college.status === 'active')

// The hero: flat, semantic HTML. The product screen is a real EduPulse prototype screen with
// sample data; the ring beside it is decorative (3D when the scene runs, SVG otherwise).
export default function Hero({ ringRef }) {
  return (
    <header id="top" className="lp-hero">
      <div className="hero-inner">
        <div className="hero-copy">
          <p className="hero-lockup" data-hero-in>
            <img src={KCP.crest} alt="" width="40" height="40" />
            <img src={CIT.emblem} alt="" width="40" height="40" />
            <span><span>{KCP.name}</span><span>{CIT.name}</span></span>
          </p>
          {/* The no-break space keeps "& scores" together as the closing line. */}
          <h1 id="hero-title" className="hero-title" tabIndex={-1}>One shared home for syllabi, courseware &amp;&nbsp;scores</h1>
        </div>

        <div className="hero-aside">
          <p className="hero-lede" data-hero-in>
            EduPulse turns the official KCP syllabus into the learning materials, assessments and
            progress views that follow from it. The AI drafts; the instructor reviews and decides.
          </p>
          <div className="hero-actions" data-hero-in>
            <a href="#login" className="lp-button" onClick={event => scrollToId(event, 'login')}>
              Get started <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a href="#flow" className="lp-link" onClick={event => scrollToId(event, 'flow')}>See how it works</a>
          </div>
          <ul className="hero-notes" data-hero-in>
            <li>Syllabus-centred</li>
            <li>Grounded in approved documents</li>
            <li>Instructor-approved</li>
          </ul>
        </div>

        <div className="hero-visual">
          <figure className="hero-preview">
            <div className="preview-bar" aria-hidden="true"><span /><span /><span /><em>EduPulse · Syllabus Builder</em></div>
            <img src={syllabusScreen} alt="EduPulse Syllabus Builder: the area for uploading a syllabus and the Course Information section" width="1600" height="862" fetchPriority="high" decoding="async" />
            <figcaption className="preview-tag">Prototype screen · sample data</figcaption>
          </figure>
          <figure className="hero-photo">
            <img src={citPhoto} alt="" width="900" height="1100" loading="lazy" decoding="async" />
            <figcaption>College of Information Technology · La Trinidad, Benguet</figcaption>
          </figure>
          <div className="hero-ring" ref={ringRef} aria-hidden="true"><PulseRing /></div>
        </div>
      </div>
    </header>
  )
}
