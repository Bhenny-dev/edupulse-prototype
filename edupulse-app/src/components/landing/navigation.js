import { smoothScroller } from './motion'

// HashRouter reads the URL hash for routing, so a plain `href="#id"` jump
// link would be swallowed as a (nonexistent) route and land on NotFound.
// Intercept the click and scroll manually instead of letting the browser
// touch location.hash. With smooth scrolling active, Lenis eases the jump.
export function scrollToId(event, id) {
  event?.preventDefault()
  const target = document.getElementById(id)
  if (!target) return
  const lenis = smoothScroller()
  if (lenis) lenis.scrollTo(target, { offset: id === 'top' ? 0 : -64, duration: 1.4 })
  else target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
}

export const prefersReducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

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
