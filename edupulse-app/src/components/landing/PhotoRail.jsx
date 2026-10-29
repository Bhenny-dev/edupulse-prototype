import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger, MOTION } from './motion'

// Two rows of photographs drift continuously in opposite directions. Moving content must
// be possible to pause (WCAG 2.2.2), and there is deliberately no button: hovering with a
// mouse, focusing the gallery with the keyboard, or tapping it on a touch screen eases
// the rows to a stop (a second tap starts them again). They also stop while the gallery
// is off screen or the browser tab is hidden. Each row is rendered twice so the loop is
// seamless; the copy is hidden from assistive technology. With reduced motion the rows
// stand still and scroll sideways by hand.
export default function PhotoRail({ photos, credit }) {
  const ref = useRef(null)
  const half = Math.ceil(photos.length / 2)
  const rows = [photos.slice(0, half), photos.slice(half)]

  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add(MOTION, () => {
      const rail = ref.current, q = gsap.utils.selector(rail)
      rail.classList.add('is-live')
      const loops = q('.photo-track').map((track, i) => gsap.fromTo(track, { xPercent: i ? -50 : 0 }, { xPercent: i ? 0 : -50, duration: 70 + i * 14, ease: 'none', repeat: -1 }))
      const held = { hover: false, focus: false, tap: false }
      const visible = { screen: false, tab: !document.hidden }
      // Hover, focus and tap ease the speed down; leaving the screen or the tab stops at once.
      const update = () => {
        const speed = held.hover || held.focus || held.tap ? 0 : 1
        loops.forEach(loop => { gsap.to(loop, { timeScale: speed, duration: 0.9, ease: 'power2.out', overwrite: true }); loop.paused(!(visible.screen && visible.tab)) })
        rail.dataset.paused = String(speed === 0)
      }
      const on = (target, type, handler) => { target.addEventListener(type, handler); return () => target.removeEventListener(type, handler) }
      // A tap or click also focuses the gallery (after a touch, only once the finger lifts).
      // That focus belongs to the pointer, so only focus from the keyboard holds the rows
      // and a second tap can start them again.
      let pointerFocus = 0
      const offs = [
        on(rail, 'pointerenter', event => { if (event.pointerType === 'mouse') { held.hover = true; update() } }),
        on(rail, 'pointerleave', event => { if (event.pointerType === 'mouse') { held.hover = false; update() } }),
        on(rail, 'pointerdown', event => {
          clearTimeout(pointerFocus)
          pointerFocus = setTimeout(() => { pointerFocus = 0 }, 1500)
          if (event.pointerType !== 'mouse') { held.tap = !held.tap; update() }
        }),
        on(rail, 'focusin', () => {
          if (pointerFocus) { clearTimeout(pointerFocus); pointerFocus = 0; return }
          held.focus = true; update()
        }),
        on(rail, 'focusout', event => { if (!rail.contains(event.relatedTarget)) { held.focus = false; update() } }),
        on(document, 'visibilitychange', () => { visible.tab = !document.hidden; update() }),
      ]
      const onScreen = ScrollTrigger.create({ trigger: rail, start: 'top bottom', end: 'bottom top', onToggle: self => { visible.screen = self.isActive; if (!self.isActive) held.tap = false; update() } })
      visible.screen = onScreen.isActive
      update()
      return () => {
        offs.forEach(off => off())
        clearTimeout(pointerFocus)
        onScreen.kill()
        rail.classList.remove('is-live')
        delete rail.dataset.paused
      }
    }, ref)
    return () => mm.revert()
  }, [])

  return (
    <div className="photo-rail" ref={ref} role="region" aria-label="CIT community photographs" aria-describedby="photo-rail-hint" tabIndex={0}>
      <p id="photo-rail-hint" className="sr-only">The photographs move slowly. Hover over them, focus them or tap them to stop the movement.</p>
      {rows.map((row, r) => (
        <div key={r} className="photo-row">
          <ul className="photo-track">
            {[...row, ...row].map((photo, i) => {
              const copy = i >= row.length
              return (
                <li key={i} className={copy ? 'is-copy' : undefined} aria-hidden={copy || undefined}>
                  <img src={photo.src} alt={copy ? '' : photo.alt} loading="lazy" decoding="async" width="720" height="480" />
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      <p className="photo-credit">{credit}</p>
    </div>
  )
}
