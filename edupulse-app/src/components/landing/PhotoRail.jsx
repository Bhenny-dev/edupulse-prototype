import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { gsap, ScrollTrigger, useMotion } from './motion'

// Two rows of CIT photographs. With motion, each photograph is first revealed through a
// diagonal crop, then the rows drift slowly in opposite directions. Moving content can always
// be stopped (WCAG 2.2.2): the Pause photo movement button holds the rows until it is pressed
// again, and hovering with a mouse, focusing the gallery with the keyboard or tapping it also
// eases them to a stop (a second tap starts them again). They also stop off screen and in a
// hidden tab. Each row is rendered twice for a seamless loop; the copy is hidden from
// assistive technology. With reduced motion the rows stand still and scroll sideways by hand.
export default function PhotoRail({ photos, credit }) {
  const ref = useRef(null)
  const [paused, setPaused] = useState(false)
  const held = useRef({ hover: false, focus: false, tap: false, button: false })
  const sync = useRef(() => {})
  const half = Math.ceil(photos.length / 2)
  const rows = [photos.slice(0, half), photos.slice(half)]

  useMotion(ref, ({ motion }) => {
    if (!motion) return undefined
    const rail = ref.current, q = gsap.utils.selector(rail)
    rail.classList.add('is-live')
    gsap.fromTo(q('.photo-track li'), { clipPath: 'polygon(0% 0%, 24% 0%, 0% 100%, 0% 100%)' }, {
      clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', duration: 0.85, ease: 'power3.inOut', stagger: 0.05, clearProps: 'clipPath',
      scrollTrigger: { trigger: rail, start: 'top 82%', once: true },
    })
    const loops = q('.photo-track').map((track, i) => gsap.fromTo(track, { xPercent: i ? -50 : 0 }, { xPercent: i ? 0 : -50, duration: 70 + i * 14, ease: 'none', repeat: -1 }))
    const state = held.current
    const visible = { screen: false, tab: !document.hidden }
    const update = () => {
      const stop = state.hover || state.focus || state.tap || state.button
      loops.forEach(loop => {
        gsap.to(loop, { timeScale: stop ? 0 : 1, duration: state.button ? 0.25 : 0.9, ease: 'power2.out', overwrite: true })
        loop.paused(!(visible.screen && visible.tab))
      })
      rail.dataset.paused = String(stop)
    }
    sync.current = update
    const on = (target, type, handler) => { target.addEventListener(type, handler); return () => target.removeEventListener(type, handler) }
    // A tap or click also focuses the gallery (after a touch, only once the finger lifts).
    // That focus belongs to the pointer, so only focus from the keyboard holds the rows. The
    // window closes at the click (any focus it caused has happened by then) or a cancelled
    // touch, so keyboard focus straight after a click that did not move focus still holds.
    let pointerFocus = 0
    const endPointerFocus = () => { clearTimeout(pointerFocus); pointerFocus = 0 }
    const fromButton = event => event.target instanceof Element && event.target.closest('.photo-toggle')
    const offs = [
      on(rail, 'pointerenter', event => { if (event.pointerType === 'mouse') { state.hover = true; update() } }),
      on(rail, 'pointerleave', event => { if (event.pointerType === 'mouse') { state.hover = false; update() } }),
      on(rail, 'pointerdown', event => {
        clearTimeout(pointerFocus)
        pointerFocus = setTimeout(() => { pointerFocus = 0 }, 1500)
        if (event.pointerType !== 'mouse' && !fromButton(event)) { state.tap = !state.tap; update() }
      }),
      on(rail, 'click', endPointerFocus),
      on(rail, 'pointercancel', endPointerFocus),
      on(rail, 'focusin', () => {
        if (pointerFocus) { endPointerFocus(); return }
        state.focus = true; update()
      }),
      on(rail, 'focusout', event => { if (!rail.contains(event.relatedTarget)) { state.focus = false; update() } }),
      on(document, 'visibilitychange', () => { visible.tab = !document.hidden; update() }),
    ]
    const onScreen = ScrollTrigger.create({ trigger: rail, start: 'top bottom', end: 'bottom top', onToggle: self => { visible.screen = self.isActive; if (!self.isActive) state.tap = false; update() } })
    visible.screen = onScreen.isActive
    update()
    return () => {
      offs.forEach(off => off())
      clearTimeout(pointerFocus)
      onScreen.kill()
      sync.current = () => {}
      rail.classList.remove('is-live')
      delete rail.dataset.paused
    }
  })

  useEffect(() => { held.current.button = paused; sync.current() }, [paused])

  return (
    <div className="photo-rail" ref={ref} role="region" aria-label="CIT community photographs" aria-describedby="photo-rail-hint" tabIndex={0}>
      <p id="photo-rail-hint" className="sr-only">The photographs move slowly. Use the Pause photo movement button, or hover over, focus or tap the photographs, to stop the movement.</p>
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
      <div className="photo-rail-bar">
        <p className="photo-credit">{credit}</p>
        <button type="button" className="photo-toggle" onClick={() => setPaused(value => !value)}>
          {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
          {paused ? 'Play photo movement' : 'Pause photo movement'}
        </button>
      </div>
    </div>
  )
}
