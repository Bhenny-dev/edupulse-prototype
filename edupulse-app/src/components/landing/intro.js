import { prefersReducedMotion } from './motion'

// The opening (logo, name and the aperture into the hero) is the default start of the landing
// page: it plays whenever the page loads on the root route at its top, including a new tab or
// a reload, and nothing skips it. It does not play where the reader asked for another place:
// Back and Forward, a direct section link (#/?section=faq), a document that started on another
// route (legal pages, sign-in, the app) or a later return to the landing page within the same
// visit. With reduced motion the page starts on the still hero.
const ENTRY_IS_ROOT = typeof window !== 'undefined' && /^#?\/?(\?.*)?$/.test(window.location.hash)

let decided // undefined until the first landing render of this document
let lastY = 0
let returnY = null

export function decideOpening(search = '') {
  if (decided !== undefined) return decided
  const navigation = performance.getEntriesByType?.('navigation')?.[0]
  decided = ENTRY_IS_ROOT && !new URLSearchParams(search).has('section') && window.scrollY < 4
    && navigation?.type !== 'back_forward' && !prefersReducedMotion()
  return decided
}

// Once the first landing render has played (or skipped) the opening, later renders never do.
export const settleOpening = () => { decided = false }

// The landing scroll position is kept while a legal page is open, so the browser's Back
// button returns to the same place (HashRouter has no scroll restoration of its own).
export const trackLandingScroll = (y = window.scrollY) => { lastY = Math.max(0, y) }
export const leaveLanding = () => { returnY = lastY; settleOpening() }
export const takeReturnY = () => { const y = returnY; returnY = null; return y }
