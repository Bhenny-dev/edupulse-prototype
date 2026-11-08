import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import EduPulseMark from '../brand/EduPulseMark'
import { KCP } from '../../data/colleges'
import { PAGES } from '../public/pages'
import { scrollToId } from './navigation'
import ThemeToggle from './ThemeToggle'

// The bar on every public page: the EduPulse home, Home and one link per page, day or night, and
// Sign In. Clear over the hero and solid once the page scrolls (always solid with `solid`, over a
// room page that does not scroll); the current page's link is filled in its colour with a marker
// under it, and a line along the bottom shows reading progress. Within a page, the round speed
// dial in the corner reaches each part.
export default function LandingNav({ solid = false }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const progress = useRef(null), list = useRef(null)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const home = pathname === '/'

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight
      setScrolled(y > 24)
      progress.current?.style.setProperty('--progress', max > 0 ? Math.min(1, y / max).toFixed(4) : '0')
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule) }
  }, [])

  // The marker follows the current page's link (CSS moves it in about 240 ms).
  useLayoutEffect(() => {
    const element = list.current
    if (!element) return undefined
    const place = () => {
      const link = element.querySelector('.nav-link.is-active')
      element.style.setProperty('--marker-o', link ? '1' : '0')
      if (!link) return
      element.style.setProperty('--marker-x', `${link.offsetLeft + 12}px`)
      element.style.setProperty('--marker-w', `${Math.max(0, link.offsetWidth - 24)}px`)
    }
    place()
    const sizes = new ResizeObserver(place)
    sizes.observe(element)
    return () => sizes.disconnect()
  }, [pathname])

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return undefined
    const close = event => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])

  const toTop = event => { if (home) { scrollToId(event, 'top'); setOpen(false) } }
  const signIn = event => {
    setOpen(false)
    if (home) { scrollToId(event, 'login'); return }
    event.preventDefault()
    navigate('/?section=login')
  }
  const links = [{ path: '/', label: 'Home' }, ...PAGES].map(page => (
    <NavLink key={page.path} to={page.path} end className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
      onClick={page.path === '/' ? toTop : undefined}>{page.label}</NavLink>
  ))

  return (
    <header className={`lp-nav ${scrolled || open || solid ? 'is-solid' : ''}`}>
      <div className="nav-inner">
        <NavLink to="/" className="nav-brand" onClick={toTop} aria-label="EduPulse, King's College of the Philippines, home">
          <img src={KCP.crest} alt="" width="32" height="32" />
          <span className="nav-mark"><EduPulseMark size={18} strokeWidth={8} /></span>
          <span className="nav-name">EduPulse</span>
        </NavLink>
        <nav className="nav-links" ref={list} aria-label="Pages">{links}</nav>
        <div className="nav-actions">
          <ThemeToggle />
          <a href="#login" className="lp-button is-small" onClick={signIn}>Sign In</a>
          <button type="button" className="nav-menu-btn" aria-expanded={open} aria-controls="landing-menu"
            aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(value => !value)}>
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
      <div className="nav-progress" ref={progress} aria-hidden="true" />
      {open && <nav id="landing-menu" className="nav-menu" aria-label="Pages menu">{links}</nav>}
    </header>
  )
}
