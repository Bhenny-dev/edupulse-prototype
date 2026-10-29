import { useEffect, useRef, useState } from 'react'
import { Menu, X, ArrowUp } from 'lucide-react'
import EduPulseMark from '../brand/EduPulseMark'
import { KCP } from '../../data/colleges'
import { NAV_LINKS, scrollToId } from './navigation'

// Transparent over the hero, paper-toned once the page scrolls; it stays reachable from
// anywhere on the page. The line under it shows reading progress;
// the link for the section in view is marked. The back-to-top button sits outside the
// header: its backdrop blur would otherwise become the containing block of a fixed child.
const SPY = [...NAV_LINKS.map(link => link.id), 'top', 'ai', 'campus', 'login']

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
      const y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight
      setScrolled(y > 24)
      setFarDown(y > window.innerHeight * 1.2)
      progress.current?.style.setProperty('--progress', max > 0 ? Math.min(1, y / max).toFixed(4) : '0')
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
    for (const id of SPY) { const section = document.getElementById(id); if (section) observer.observe(section) }
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
    <a key={link.id} href={`#${link.id}`} className={`nav-link ${active === link.id ? 'is-active' : ''}`}
      aria-current={active === link.id ? 'location' : undefined} onClick={event => go(event, link.id)}>{link.label}</a>
  ))

  return (
    <>
      <header className={`landing-nav ${scrolled || open ? 'is-solid' : ''}`}>
        <div className="nav-inner">
          <a href="#top" className="nav-brand" onClick={event => go(event, 'top')} aria-label="EduPulse, King's College of the Philippines, back to top">
            <img src={KCP.crest} alt="" width="34" height="34" />
            <span className="nav-mark"><EduPulseMark size={16} style={{ color: 'currentColor' }} /></span>
            <span className="nav-name">EduPulse</span>
          </a>
          <nav className="nav-links" aria-label="Landing page sections">{links}</nav>
          <div className="nav-actions">
            <a href="#login" className="lp-button is-small" onClick={event => go(event, 'login')}>Sign In</a>
            <button type="button" className="nav-menu-btn" aria-expanded={open} aria-controls="landing-menu"
              aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(value => !value)}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        <div className="nav-progress" ref={progress} aria-hidden="true" />
        {open && <nav id="landing-menu" className="nav-menu" aria-label="Landing page sections menu">{links}</nav>}
      </header>
      <a href="#top" className={`landing-to-top ${farDown ? 'is-shown' : ''}`} aria-label="Back to top" tabIndex={farDown ? 0 : -1} aria-hidden={!farDown} onClick={event => go(event, 'top')}>
        <ArrowUp size={18} aria-hidden="true" />
      </a>
    </>
  )
}
