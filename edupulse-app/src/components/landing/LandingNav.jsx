import { useEffect, useRef, useState } from 'react'
import { Menu, X, LogIn, ArrowUp } from 'lucide-react'
import EduPulseMark from '../brand/EduPulseMark'
import { KCP } from '../../data/colleges'
import { NAV_LINKS, scrollToId } from './navigation'

// Transparent over the hero, frosted once the page scrolls. The bar under it
// shows reading progress; the link for the section in view is highlighted.
// The back-to-top button sits outside the header: its backdrop blur would
// otherwise become the containing block of a fixed child.
export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [farDown, setFarDown] = useState(false)
  const [active, setActive] = useState('')
  const [open, setOpen] = useState(false)
  const progress = useRef(null)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      setScrolled(window.scrollY > 24)
      setFarDown(window.scrollY > window.innerHeight * 1.2)
      progress.current?.style.setProperty('--progress', max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : '0')
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule) }
  }, [])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
    }, { rootMargin: '-45% 0px -50% 0px' })
    // Sections without a link (hero, Pulse band, photos, statistics, sign-in) clear the highlight.
    for (const id of [...NAV_LINKS.map(link => link.id), 'top', 'ai', 'campus', 'stats', 'login']) {
      const section = document.getElementById(id)
      if (section) observer.observe(section)
    }
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!open) return
    const close = event => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])

  const go = (event, id) => { scrollToId(event, id); setOpen(false) }
  const links = NAV_LINKS.map(link => (
    <a key={link.id} href={`#${link.id}`} className={`landing-nav-link ${active === link.id ? 'is-active' : ''}`}
      aria-current={active === link.id ? 'location' : undefined} onClick={event => go(event, link.id)}>{link.label}</a>
  ))

  return (
    <>
    <header className={`landing-nav ${scrolled || open ? 'is-scrolled' : ''}`}>
      <div className="landing-progress" ref={progress} aria-hidden="true" />
      <div className="landing-nav-inner">
        <a href="#top" className="landing-brand" onClick={event => go(event, 'top')} aria-label="EduPulse, King's College of the Philippines, back to top">
          <img src={KCP.crest} alt="" className="landing-brand-crest" width="36" height="36" />
          <span className="landing-brand-divider" aria-hidden="true" />
          <span className="landing-nav-mark"><EduPulseMark size={18} style={{ color: 'white' }} /></span>
          <span className="landing-brand-text">
            <span className="landing-nav-name">EduPulse</span>
            <span className="landing-brand-sub">KCP · College of Information Technology</span>
          </span>
        </a>
        <nav className="landing-nav-links" aria-label="Landing page sections">{links}</nav>
        <div className="landing-nav-actions">
          <a href="#login" className="btn btn-primary btn-sm landing-nav-signin" onClick={event => go(event, 'login')}><LogIn size={15} aria-hidden="true" /> Sign In</a>
          <button type="button" className="landing-menu-btn" aria-expanded={open} aria-controls="landing-menu"
            aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(value => !value)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && <nav id="landing-menu" className="landing-menu" aria-label="Landing page sections menu">{links}</nav>}
    </header>
    <a href="#top" className={`landing-to-top ${farDown ? 'is-shown' : ''}`} aria-label="Back to top" tabIndex={farDown ? 0 : -1} aria-hidden={!farDown} onClick={event => go(event, 'top')}>
      <ArrowUp size={18} aria-hidden="true" />
    </a>
    </>
  )
}
