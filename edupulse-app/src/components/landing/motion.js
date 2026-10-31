import { useLayoutEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(ScrollTrigger, SplitText)
export { gsap, ScrollTrigger, SplitText }

// A refresh (after a resize, the fonts or the photographs arrive) takes each pinned section out
// of its spacer and back to measure it, and the browser drops keyboard focus from an element
// that leaves the document. Give the focus back, so a keyboard user who has reached Skip intro,
// an agent or a feature step stays there.
let refocus = null
ScrollTrigger.addEventListener('refreshInit', () => {
  const active = document.activeElement
  refocus = active instanceof HTMLElement && active !== document.body ? active : null
})
ScrollTrigger.addEventListener('refresh', () => {
  if (refocus?.isConnected && document.activeElement !== refocus) refocus.focus({ preventScroll: true })
  refocus = null
})

// Every landing animation is created inside gsap.matchMedia with these conditions. Nothing
// is hidden by CSS, so with reduced motion (and before the scripts run) every section is
// complete and still. When a preference changes, matchMedia reverts everything it created
// and runs the setup again with the new conditions. Scrolling stays native: no smooth-scroll
// library, no wheel or touch interception.
export const MEDIA = {
  motion: '(prefers-reduced-motion: no-preference)',
  desktop: '(min-width: 1024px)',
  fine: '(pointer: fine)',
}

// Timing (docs/DESIGN.md): small interactions 150–250 ms (CSS), entrances 500–850 ms,
// restrained ease-out curves. A section has one dominant transition, then stays still.
export const DURATION = { quick: 0.24, enter: 0.7, wide: 0.85 }
export const EASE = 'expo.out'
export const EASE_SOFT = 'power3.out'
export const ENTER = 'top 80%'

export const prefersReducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

// Runs `setup(conditions)` inside gsap.matchMedia scoped to `scope`. Its tweens, timelines,
// ScrollTriggers and SplitText instances are reverted on unmount and on preference changes.
export function useMotion(scope, setup, deps = []) {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia(scope)
    mm.add(MEDIA, context => setup(context.conditions, context))
    return () => mm.revert()
    // The caller lists what its setup depends on, as with useEffect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

// Section headings marked data-split rise line by line from behind a mask, once. The
// heading keeps one accessible name: SplitText labels it and hides the line wrappers.
export function revealHeadings(root) {
  const splits = [...root.querySelectorAll('[data-split]')].map(element => SplitText.create(element, {
    type: 'lines', mask: 'lines', linesClass: 'split-line', aria: 'auto', autoSplit: true,
    onSplit: self => gsap.from(self.lines, {
      yPercent: 105, duration: DURATION.enter, ease: EASE, stagger: 0.07,
      scrollTrigger: { trigger: element, start: ENTER, once: true },
    }),
  }))
  // Positions change as photographs and web fonts arrive.
  const refresh = () => ScrollTrigger.refresh()
  window.addEventListener('load', refresh)
  document.fonts?.ready.then(refresh)
  return () => { window.removeEventListener('load', refresh); splits.forEach(split => split.revert()) }
}
