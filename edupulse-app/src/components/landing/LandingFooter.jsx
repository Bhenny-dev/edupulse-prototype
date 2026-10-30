import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, ExternalLink } from 'lucide-react'
import EduPulseMark from '../brand/EduPulseMark'
import { NAV_LINKS, scrollToId } from './navigation'
import { gsap, useMotion, EASE } from './motion'

// The footer. The large EduPulse wordmark resolves once with a slight reduction in depth;
// nothing moves behind the small print afterwards.
export default function LandingFooter({ kcp }) {
  const ref = useRef(null)
  useMotion(ref, ({ motion }) => {
    if (!motion) return
    gsap.from(ref.current.querySelector('.footer-word'), { opacity: 0, scale: 1.05, yPercent: 12, duration: 0.85, ease: EASE, scrollTrigger: { trigger: ref.current, start: 'top 85%', once: true } })
  })

  return (
    <footer className="lp-footer" ref={ref}>
      <div className="lp-wrap footer-grid">
        <div className="footer-brand">
          <p className="footer-logos">
            <img src={kcp.crest} alt="" width="40" height="40" />
            <span className="nav-mark"><EduPulseMark size={18} strokeWidth={8} /></span>
            <strong>EduPulse</strong>
          </p>
          <p>An AI-powered syllabus and course builder with performance monitoring, made for the College of Information Technology.</p>
          <blockquote><p>{kcp.vision}</p><cite>KCP vision</cite></blockquote>
        </div>
        <nav className="footer-col" aria-label="Footer: page sections">
          <h3>Explore</h3>
          {NAV_LINKS.map(link => <a key={link.id} href={`#${link.id}`} onClick={event => scrollToId(event, link.id)}>{link.label}</a>)}
        </nav>
        <nav className="footer-col" aria-label="Footer: legal">
          <h3>Legal</h3>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </nav>
        <div className="footer-col">
          <h3>{kcp.name}</h3>
          <p><MapPin size={16} aria-hidden="true" /> {kcp.address}</p>
          <a href={kcp.website} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true" /> kcp.edu.ph</a>
        </div>
      </div>
      <div className="footer-word" aria-hidden="true">EduPulse</div>
      <div className="lp-wrap footer-bottom">
        <p>A BSIT capstone project · College of Information Technology · Prototype v4.0</p>
        <p>Photos and emblems © King's College of the Philippines</p>
      </div>
    </footer>
  )
}
