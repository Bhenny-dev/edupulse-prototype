// HashRouter reads the URL hash for routing, so a plain `href="#id"` jump
// link would be swallowed as a (nonexistent) route and land on NotFound.
// Intercept the click and scroll manually instead of letting the browser
// touch location.hash.
export function scrollToId(event, id) {
  event?.preventDefault()
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

export const prefersReducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

// Sections listed in the landing navigation, the menu and the footer.
export const NAV_LINKS = [
  { id: 'about', label: 'About' },
  { id: 'features', label: 'Features' },
  { id: 'flow', label: 'How It Works' },
  { id: 'roles', label: 'Roles' },
  { id: 'colleges', label: 'Colleges' },
  { id: 'faq', label: 'FAQ' },
]
