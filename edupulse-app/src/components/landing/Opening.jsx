import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import EduPulseMark from '../brand/EduPulseMark'
import Hero from './Hero'
import { SHARDS } from './shards'
import { gsap, ScrollTrigger, SplitText, MEDIA, EASE, prefersReducedMotion } from './motion'
import { OPENING_TRIGGER } from './navigation'
import { settleOpening } from './intro'

const ONLY_MOTION = { motion: MEDIA.motion } // a resize never replays the opening

// The opening stage holds the hero, the decorative 3D canvas and, whenever the landing page
// loads at its top, the prelude: the EduPulse mark and name on a white and pale-blue field of
// facets. There is no control to skip it. The mark and name arrive in about 1.4 s. Scrolling
// about 85 % of a viewport then opens the facets outward like an aperture, while the camera
// pulls back and the KCP and CIT seals turn in inside the Pulse ring. Everything under the
// prelude is ordinary HTML that works without the canvas or animation.
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

  // Reduced motion: remove the pin, its spacer, the facets and the overlay, and leave the hero
  // at rest at the top of the page.
  const endPrelude = useCallback(({ scroll = true } = {}) => {
    if (!live.current) return
    live.current = false
    preludeContext.current?.revert()
    preludeContext.current = null
    Object.assign(inputs.current, { intro: 1, aperture: 1, hero: 1 })
    setBar(null)
    settleOpening()
    ended.current = { scroll }
    setShowPrelude(false)
  }, [setBar])

  useLayoutEffect(() => {
    if (showPrelude || !ended.current) return
    const { scroll } = ended.current
    ended.current = null
    ScrollTrigger.refresh()
    if (scroll) window.scrollTo(0, 0)
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
          .from(q('.prelude-cue'), { opacity: 0, y: 10, duration: 0.45, ease: 'power2.out' }, 0.95)

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
          .from(q('.hero-copy'), { y: 40, duration: 0.75, ease: 'power2.out' }, 0.25)
      }, root)
      preludeContext.current = context
      return () => { context.revert(); preludeContext.current = null }
    }

    // Without the prelude (a section link, Back, or a return within the visit): the headline
    // rises line by line and the seals turn in, on long, even curves.
    function heroEntrance() {
      const split = SplitText.create(q('.hero-title')[0], {
        type: 'lines', mask: 'lines', linesClass: 'split-line', aria: 'auto', autoSplit: true,
        onSplit: self => gsap.from(self.lines, { yPercent: 105, duration: 1.15, ease: 'expo.out', stagger: 0.1, delay: 0.1 }),
      })
      gsap.timeline({ delay: 0.08 })
        .from(q('[data-hero-in]'), { y: 18, autoAlpha: 0, duration: 1, ease: 'power3.out', stagger: 0.1 }, 0.25)
        // Opacity only: the 3D scene measures the emblem box to place the medallions.
        .from(q('.hero-emblem'), { autoAlpha: 0, duration: 1.4, ease: 'power3.out' }, 0.1)
        .to(inputs.current, { hero: 1, duration: 1.8, ease: 'power2.inOut' }, 0.15)
        .add(() => split.revert(), 1.6) // the heading returns to its own markup once settled
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

  // A keyboard user who moves into the hero while the facets still cover it plays the opening
  // forward to its end (the scroll that opens the aperture), so focus never sits under the
  // facets and the opening is not skipped. Pointer focus is left alone.
  useEffect(() => {
    if (!showPrelude) return undefined
    let keyboard = false
    const onKey = () => { keyboard = true }
    const onPointer = () => { keyboard = false }
    const onFocus = event => {
      const target = event.target
      if (!keyboard || !live.current || !(target instanceof Element) || !stage.current?.contains(target)) return
      const opening = ScrollTrigger.getById(OPENING_TRIGGER)
      if (!opening || opening.progress > 0.99) return
      window.scrollTo(0, Math.ceil(opening.end) + 1)
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onPointer, true)
    document.addEventListener('focusin', onFocus)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onPointer, true)
      document.removeEventListener('focusin', onFocus)
    }
  }, [showPrelude])

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
          </div>
        </div>
      )}
      <Hero ringRef={ring} />
      <canvas ref={canvas} className="lp-scene" aria-hidden="true" />
    </div>
  )
}
