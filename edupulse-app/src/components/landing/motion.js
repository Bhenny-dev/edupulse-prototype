import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger, SplitText)
export { gsap, ScrollTrigger, SplitText }

// Every animation is created inside this media query. Nothing is hidden by CSS,
// so with reduced motion (or without JavaScript) the page is complete and still.
export const MOTION = '(prefers-reduced-motion: no-preference)'
export const DESKTOP = '(min-width: 981px)'
export const EASE = 'expo.out'

// Shared timing (docs/DESIGN.md). The CSS tokens --motion-fast/base/slow in index.css use
// the same steps. Elements rise a short distance so they read as settling, not jumping;
// exits take about two thirds of an entrance; a stagger never spreads past half a second.
export const DURATION = { fast: 0.2, base: 0.45, slow: 0.9 }
export const TRAVEL = 20
export const EXIT = 0.65
export const stagger = count => Math.min(0.06, 0.5 / Math.max(1, count))

let lenis = null
export const smoothScroller = () => lenis

// Inertial scrolling for the landing page only; signed-in pages keep native scrolling.
export function startSmoothScroll() {
  if (lenis || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
  lenis.on('scroll', ScrollTrigger.update)
  const tick = time => lenis?.raf(time * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  return () => {
    gsap.ticker.remove(tick)
    lenis?.destroy()
    lenis = null
    gsap.ticker.lagSmoothing(500, 33)
  }
}

const countText = (value, decimals, suffix) => `${value.toFixed(decimals)}${suffix}`

// Entrances declared in the markup:
//   data-split            heading lines rise from behind a mask
//   data-reveal           the element fades and rises once; data-reveal="stagger" does it per child
//   data-scrub-words      words brighten as the paragraph crosses the viewport
//   data-count="7.4"      the number counts up once (data-decimals, data-suffix)
export function revealAll(root) {
  const splits = []
  for (const element of root.querySelectorAll('[data-split]')) {
    splits.push(SplitText.create(element, {
      type: 'lines', mask: 'lines', linesClass: 'split-line', aria: 'auto', autoSplit: true,
      onSplit: self => gsap.from(self.lines, {
        yPercent: 110, duration: DURATION.slow + 0.2, ease: EASE, stagger: stagger(self.lines.length),
        scrollTrigger: { trigger: element, start: 'top 88%', once: true },
      }),
    }))
  }
  for (const element of root.querySelectorAll('[data-scrub-words]')) {
    splits.push(SplitText.create(element, {
      type: 'words', aria: 'auto',
      onSplit: self => gsap.fromTo(self.words, { opacity: 0.16 }, {
        opacity: 1, ease: 'none', stagger: 0.12,
        scrollTrigger: { trigger: element, start: 'top 78%', end: 'bottom 42%', scrub: true },
      }),
    }))
  }
  for (const element of root.querySelectorAll('[data-reveal]')) {
    const targets = element.dataset.reveal === 'stagger' ? [...element.children] : [element]
    gsap.from(targets, {
      y: TRAVEL, autoAlpha: 0, duration: DURATION.slow, ease: EASE, stagger: stagger(targets.length),
      scrollTrigger: { trigger: element, start: 'top 86%', once: true },
    })
  }
  for (const element of root.querySelectorAll('[data-count]')) {
    const end = Number(element.dataset.count), decimals = Number(element.dataset.decimals || 0), suffix = element.dataset.suffix || ''
    const state = { value: 0 }
    gsap.to(state, {
      value: end, duration: 2, ease: 'power3.out',
      onStart: () => { element.textContent = countText(0, decimals, suffix) },
      onUpdate: () => { element.textContent = countText(state.value, decimals, suffix) },
      scrollTrigger: { trigger: element, start: 'top 85%', once: true },
    })
  }
  // Positions change as photographs and web fonts arrive.
  const refresh = () => ScrollTrigger.refresh()
  window.addEventListener('load', refresh)
  document.fonts?.ready.then(refresh)
  return () => { window.removeEventListener('load', refresh); splits.forEach(split => split.revert()) }
}

// A subtle pull toward the pointer for the one primary call to action (fine pointers
// only). The pull is capped at 0.3 of the pointer's offset so the target stays put.
export function magnetic(element) {
  if (!element || !window.matchMedia('(pointer: fine)').matches) return () => {}
  const x = gsap.quickTo(element, 'x', { duration: 0.6, ease: 'power3.out' })
  const y = gsap.quickTo(element, 'y', { duration: 0.6, ease: 'power3.out' })
  const move = event => { const box = element.getBoundingClientRect(); x((event.clientX - box.left - box.width / 2) * 0.3); y((event.clientY - box.top - box.height / 2) * 0.3) }
  const leave = () => { x(0); y(0) }
  element.addEventListener('pointermove', move)
  element.addEventListener('pointerleave', leave)
  return () => { element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', leave); gsap.set(element, { x: 0, y: 0 }) }
}

// The intro curtain plays once per browser session and never with reduced motion.
export const INTRO_SECONDS = 1.5
export function shouldPlayIntro() {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || sessionStorage.getItem('edupulse-intro')) return false
    sessionStorage.setItem('edupulse-intro', '1')
    return true
  } catch { return false }
}
