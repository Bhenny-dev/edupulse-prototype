import { prefersReducedMotion } from '../landing/motion'

// Scrolls to a section of the page (or the top), the way the speed dial's stops ask for.
export function jumpTo(event, id) {
  event?.preventDefault()
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth'
  if (id === 'top') { window.scrollTo({ top: 0, behavior }); return }
  const target = document.getElementById(id)
  if (!target) return
  target.scrollIntoView({ behavior, block: 'start' })
  target.focus?.({ preventScroll: true })
}
