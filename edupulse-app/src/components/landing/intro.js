import { prefersReducedMotion } from './motion'

// The opening (logo, name and the aperture into the hero) belongs to a fresh visit to the
// root route at the top of the page, once per browser tab. It never plays for a reload,
// back/forward, a direct section link (#/?section=faq), a document that started on another
// route (legal pages, sign-in, the app), a later return to the landing page, or reduced motion.
const FLAG = 'edupulse-intro'
const ENTRY_IS_ROOT = typeof window !== 'undefined' && /^#?\/?(\?.*)?$/.test(window.location.hash)

let decided // undefined until the first landing render of this document
let lastY = 0
let returnY = null

function seen() {
  try { return sessionStorage.getItem(FLAG) === '1' } catch { return true } // no storage: never risk a replay
}
function remember() {
  try { sessionStorage.setItem(FLAG, '1') } catch { /* storage unavailable */ }
}

export function decideOpening(search = '') {
  if (decided !== undefined) return decided
  const navigation = performance.getEntriesByType?.('navigation')?.[0]
  decided = ENTRY_IS_ROOT && !new URLSearchParams(search).has('section') && window.scrollY < 4
    && navigation?.type !== 'back_forward' && !prefersReducedMotion() && !seen()
  if (decided) remember() // set when chosen, so a reload during the opening never replays it
  return decided
}

// Once the first landing render has played (or skipped) the opening, later renders never do.
export const settleOpening = () => { decided = false }

// The landing scroll position is kept while a legal page is open, so the browser's Back
// button returns to the same place (HashRouter has no scroll restoration of its own).
export const trackLandingScroll = () => { lastY = window.scrollY }
export const leaveLanding = () => { returnY = lastY; settleOpening() }
export const takeReturnY = () => { const y = returnY; returnY = null; return y }
