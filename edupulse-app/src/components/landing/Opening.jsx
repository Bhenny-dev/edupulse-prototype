import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import EduPulseMark from '../brand/EduPulseMark'
import Hero from './Hero'
import { SHARDS } from './shards'
import { gsap, ScrollTrigger, SplitText, MEDIA, EASE, prefersReducedMotion } from './motion'
import { OPENING_TRIGGER } from './navigation'
import { settleOpening } from './intro'

const ONLY_MOTION = { motion: MEDIA.motion } // a resize never replays the opening

// The opening stage holds the hero, the decorative 3D canvas and, on a fresh visit, the
// prelude: the EduPulse mark and name on a white and pale-blue field of facets. The mark and
// name arrive in about 1.4 s. Scrolling about 85 % of a viewport then opens the facets
// outward like an aperture, while the camera pulls back and the product screen settles.
// Everything under the prelude is ordinary HTML that works without the canvas or animation.
export default function Opening({ prelude }) {
  const stage = useRef(null), overlay = useRef(null), canvas = useRef(null), ring = useRef(null)
  const [showPrelude, setShowPrelude] = useState(prelude)
  const live = useRef(prelude) // the prelude is on the page (read by listeners)
  const preludeContext = useRef(null)
  const ended = useRef(null)
  // Read every frame by the 3D scene: entrance, aperture and hero-arrival progress (0–1).
  const inputs = useRef({ intro: prelude ? 0 : 1, aperture: prelude ? 0 : 1, hero: 0 })

  const setBar = useCallback(state => {
    const page = stage.current?.closest('.landing-page')
    if (!page) return
    if (state) page.dataset.prelude = state
    else delete page.dataset.prelude
    // While the field is closed the bar is out of sight, so it is out of the tab order too.
    page.querySelector('.lp-nav')?.toggleAttribute('inert', state === 'closed')
  }, [])

  // Skip intro, a keyboard user moving into the page, or reduced motion: remove the pin, its
  // spacer, the facets and the overlay, and leave the hero at rest at the top of the page.
  const endPrelude = useCallback(({ focusHero = false, scroll = true } = {}) => {
    if (!live.current) return
    live.current = false
    preludeContext.current?.revert()
    preludeContext.current = null
    Object.assign(inputs.current, { intro: 1, aperture: 1, hero: 1 })
    setBar(null)
    settleOpening()
    ended.current = { focusHero, scroll }
    setShowPrelude(false)
  }, [setBar])

  useLayoutEffect(() => {
    if (showPrelude || !ended.current) return
    const { focusHero, scroll } = ended.current
    ended.current = null
    ScrollTrigger.refresh()
    if (scroll) window.scrollTo(0, 0)
    if (focusHero) document.getElementById('hero-title')?.focus({ preventScroll: true })
  }, [showPrelude])

  useLayoutEffect(() => {
    const root = stage.current, q = gsap.utils.selector(root)

    function openingTimelines() {
      let barClosed = true
      setBar('closed')
      const context = gsap.context(() => {
        // 1 · The timed entrance: facets assemble in 3D around the mark while the camera
        //     pushes in, the mark settles and the name is unmasked.
        gsap.timeline({ delay: 0.05, onComplete: () => { root.dataset.intro = 'ready' } })
          .to(inputs.current, { intro: 1, duration: 1.3, ease: 'power2.out' }, 0)
          .from(q('.prelude-mark'), { autoAlpha: 0, scale: 0.84, duration: 0.7, ease: EASE }, 0.08)
          .fromTo(q('.prelude-word'), { clipPath: 'inset(-12% 100% -24% 0%)' }, { clipPath: 'inset(-12% 0% -24% 0%)', duration: 0.8, ease: 'expo.inOut' }, 0.3)
          // Opacity only: Skip intro stays reachable by keyboard while it fades in (CSS shows it on focus).
          .from(q('.prelude-cue, .prelude-skip'), { opacity: 0, y: 10, duration: 0.45, ease: 'power2.out', stagger: 0.08 }, 0.95)

        // 2 · Scrolling opens the aperture. Scrubbed, so it follows the scroll both ways.
        const shards = q('.prelude-shard')
        const size = () => ({ w: root.clientWidth, h: window.innerHeight })
        const open = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            id: OPENING_TRIGGER, trigger: root, start: 'top top', end: '+=85%', pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true,
            onUpdate: self => {
              const closed = self.progress < 0.55
              if (closed !== barClosed) { barClosed = closed; setBar(closed ? 'closed' : 'open') }
              overlay.current?.classList.toggle('is-gone', self.progress > 0.995)
            },
          },
        })
        // The pale backdrop fills the widening seams until the facets are well apart, so the
        // hero appears through a clean opening rather than through thin slivers.
        open.to(q('.prelude-backdrop'), { autoAlpha: 0, duration: 0.24 }, 0.2)
          .to(q('.prelude-ui'), { autoAlpha: 0, duration: 0.14 }, 0)
          .to(q('.prelude-brand'), { autoAlpha: 0, scale: 0.9, yPercent: -4, duration: 0.36, ease: 'power1.in' }, 0)
        SHARDS.forEach((shard, i) => {
          open.to(shards[i], { x: () => shard.travel(size()).x, y: () => shard.travel(size()).y, rotation: shard.turn, duration: 0.92, ease: 'power2.inOut' }, 0.04)
        })
        open.to(inputs.current, { aperture: 1, duration: 1 }, 0)
          .to(inputs.current, { hero: 1, duration: 0.6 }, 0.4)
          .from(q('.hero-preview'), { yPercent: 12, rotationX: 14, scale: 0.93, transformOrigin: '50% 100%', duration: 0.75, ease: 'power2.out' }, 0.25)
          .from(q('.hero-photo'), { y: 48, autoAlpha: 0, duration: 0.5, ease: 'power2.out' }, 0.5)
      }, root)
      preludeContext.current = context
      return () => { context.revert(); preludeContext.current = null }
    }

    // A repeat visit: the headline rises line by line and the product screen settles.
    function heroEntrance() {
      const split = SplitText.create(q('.hero-title')[0], {
        type: 'lines', mask: 'lines', linesClass: 'split-line', aria: 'auto', autoSplit: true,
        onSplit: self => gsap.from(self.lines, { yPercent: 105, duration: 0.85, ease: EASE, stagger: 0.08, delay: 0.08 }),
      })
      gsap.timeline({ delay: 0.08 })
        .from(q('[data-hero-in]'), { y: 16, autoAlpha: 0, duration: 0.7, ease: EASE, stagger: 0.06 }, 0.2)
        .from(q('.hero-preview'), { yPercent: 5, rotationX: 9, scale: 0.97, autoAlpha: 0, transformOrigin: '50% 100%', duration: 0.85, ease: EASE }, 0.1)
        .from(q('.hero-photo'), { y: 24, autoAlpha: 0, duration: 0.7, ease: EASE }, 0.4)
        .to(inputs.current, { hero: 1, duration: 1.1, ease: 'power2.out' }, 0.25)
        .add(() => split.revert(), 1.4) // the heading returns to its own markup once settled
      return () => split.revert()
    }

    const mm = gsap.matchMedia(root)
    mm.add(ONLY_MOTION, ({ conditions }) => {
      if (!conditions.motion) {
        inputs.current.hero = 1
        if (live.current) endPrelude({ scroll: false })
        return undefined
      }
      return live.current ? openingTimelines() : heroEntrance()
    })
    return () => mm.revert()
  }, [endPrelude, setBar])

  // A keyboard user who moves past the overlay (into the hero, for example) ends the prelude,
  // so focus never sits under the facets. Pointer focus is left alone.
  useEffect(() => {
    if (!showPrelude) return undefined
    let keyboard = false
    const onKey = () => { keyboard = true }
    const onPointer = () => { keyboard = false }
    const onFocus = event => {
      const target = event.target
      if (!keyboard || !live.current || !(target instanceof Element)) return
      if (overlay.current?.contains(target) || target.closest('.skip-to-content')) return
      if ((ScrollTrigger.getById(OPENING_TRIGGER)?.progress ?? 1) > 0.99) return
      endPrelude()
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onPointer, true)
    document.addEventListener('focusin', onFocus)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onPointer, true)
      document.removeEventListener('focusin', onFocus)
    }
  }, [showPrelude, endPrelude])

  // The 3D scene loads in its own chunk and never delays the page: the opening starts at once
  // and the facets join it when the scene is ready (it is requested immediately for the
  // opening, when the browser is idle otherwise). Without WebGL, with reduced motion or if it
  // fails, the SVG ring stays and nothing else changes.
  useEffect(() => {
    const root = stage.current
    if (prefersReducedMotion()) return undefined
    let api = null, cancelled = false
    const fail = () => { root.classList.remove('has-scene'); root.classList.add('no-scene') }
    const start = () => {
      import('./scene/landingScene.js').then(({ createLandingScene }) => {
        if (cancelled || prefersReducedMotion()) return
        api = createLandingScene({ canvas: canvas.current, anchor: ring.current, inputs: inputs.current, onReady: () => root.classList.add('has-scene'), onLost: fail })
        if (!api) fail()
      }).catch(fail)
    }
    const idle = prelude ? { id: window.setTimeout(start, 0) }
      : window.requestIdleCallback ? { id: window.requestIdleCallback(start, { timeout: 700 }), idle: true } : { id: window.setTimeout(start, 150) }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onReduce = () => { if (reduce.matches && api) { api.dispose(); api = null; root.classList.remove('has-scene') } }
    reduce.addEventListener?.('change', onReduce)
    return () => {
      cancelled = true
      if (idle.idle) window.cancelIdleCallback(idle.id)
      else window.clearTimeout(idle.id)
      reduce.removeEventListener?.('change', onReduce)
      api?.dispose()
      root.classList.remove('has-scene', 'no-scene')
    }
  }, [prelude])

  return (
    <div className="lp-opening" ref={stage}>
      {showPrelude && (
        <div className="lp-prelude" ref={overlay}>
          <div className="prelude-field" aria-hidden="true">
            <span className="prelude-backdrop" />
            {SHARDS.map((shard, i) => <span key={i} className="prelude-shard" data-tone={shard.tone} style={shard.style} />)}
          </div>
          <div className="prelude-brand" aria-hidden="true">
            <span className="prelude-mark"><EduPulseMark size={56} strokeWidth={7.5} /></span>
            <span className="prelude-word">EduPulse</span>
          </div>
          <div className="prelude-ui">
            <p className="prelude-cue" aria-hidden="true"><span className="prelude-cue-line" />Scroll to explore</p>
            <button type="button" className="prelude-skip" onClick={() => endPrelude({ focusHero: true })}>Skip intro</button>
          </div>
        </div>
      )}
      <Hero ringRef={ring} />
      <canvas ref={canvas} className="lp-scene" aria-hidden="true" />
    </div>
  )
}
