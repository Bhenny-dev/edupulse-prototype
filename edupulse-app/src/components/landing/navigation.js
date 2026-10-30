import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { gsap, ScrollTrigger, prefersReducedMotion } from './motion'

gsap.registerPlugin(ScrollToPlugin)

// Sections listed in the landing navigation, the menu and the footer.
export const NAV_LINKS = [
  { id: 'problem', label: 'Why EduPulse' },
  { id: 'features', label: 'Features' },
  { id: 'flow', label: 'How It Works' },
  { id: 'roles', label: 'Roles' },
  { id: 'impact', label: 'Impact' },
  { id: 'colleges', label: 'Colleges' },
  { id: 'faq', label: 'FAQ' },
]
export const SECTION_IDS = [...NAV_LINKS.map(link => link.id), 'ai', 'campus', 'login']
export const OPENING_TRIGGER = 'lp-aperture'

const barHeight = () => document.querySelector('.lp-nav')?.getBoundingClientRect().height || 72

// Where a section starts below the fixed bar. "top" is the hero at rest: after the opening
// aperture (when it is on the page) has fully opened.
export function sectionTop(id) {
  if (id === 'top') return ScrollTrigger.getById(OPENING_TRIGGER)?.end ?? 0
  const target = document.getElementById(id)
  if (!target) return null
  return Math.max(0, Math.round(target.getBoundingClientRect().top + window.scrollY - barHeight() + 1))
}

// Glides the window to a scroll position with GSAP (the page's one animation system). The
// glide stops the moment the reader scrolls themselves (autoKill), and with reduced motion
// the jump is instant. Wheel and touch scrolling are never intercepted.
let glide = null
export function glideTo(y, { instant = false, onArrive } = {}) {
  glide?.kill()
  glide = null
  if (instant || prefersReducedMotion()) { window.scrollTo(0, y); onArrive?.(); return }
  const distance = Math.abs(y - window.scrollY)
  glide = gsap.to(window, {
    scrollTo: { y, autoKill: true }, duration: Math.min(1.2, 0.4 + distance / 8000), ease: 'power3.inOut', overwrite: 'auto',
    onComplete: () => { glide = null; onArrive?.() },
  })
}

// HashRouter reads the URL hash as a route, so a plain href="#id" would open Not Found.
// Section links scroll themselves and leave the URL alone. If the page moved under the glide
// (web fonts or images arriving), they finish exactly on the section. Opened from the
// keyboard, a link also moves focus to its section, as an in-page link would.
export function scrollToId(event, id, { instant = false } = {}) {
  event?.preventDefault()
  const top = sectionTop(id)
  if (top == null) return
  glideTo(top, {
    instant,
    onArrive: () => { const again = sectionTop(id); if (again != null && Math.abs(again - window.scrollY) > 2) window.scrollTo(0, again) },
  })
  if (event && event.detail === 0) {
    const target = document.getElementById(id === 'top' ? 'hero-title' : id)
    if (!target) return
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
    target.focus({ preventScroll: true })
  }
}
