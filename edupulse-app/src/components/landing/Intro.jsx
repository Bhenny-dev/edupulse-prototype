import { useLayoutEffect, useRef, useState } from 'react'
import { gsap, EASE } from './motion'
import { KCP } from '../../data/colleges'

// A one-second branded curtain on the first visit of a browser session. It never
// blocks the page (pointer events pass through) and is skipped with reduced motion.
export default function Intro({ play }) {
  const [shown, setShown] = useState(play)
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (!shown || !ref.current) return
    const q = gsap.utils.selector(ref)
    const timeline = gsap.timeline({ onComplete: () => setShown(false) })
      .from(q('.intro-crest'), { autoAlpha: 0, scale: 0.85, duration: 0.6, ease: EASE })
      .from(q('.intro-word span'), { yPercent: 110, duration: 0.7, ease: EASE, stagger: 0.035 }, 0.1)
      .fromTo(q('.intro-line'), { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'power2.inOut' }, 0.1)
      .to(ref.current, { yPercent: -100, duration: 0.8, ease: 'expo.inOut' }, 0.75)
    return () => timeline.kill()
  }, [shown])
  if (!shown) return null
  return (
    <div className="landing-intro" ref={ref} aria-hidden="true">
      <img src={KCP.crest} alt="" className="intro-crest" width="64" height="64" />
      <span className="intro-word">{'EduPulse'.split('').map((letter, i) => <span key={i}>{letter}</span>)}</span>
      <span className="intro-line" />
    </div>
  )
}
