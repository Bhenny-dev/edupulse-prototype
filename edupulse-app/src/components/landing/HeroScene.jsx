import { useEffect, useLayoutEffect, useRef } from 'react'
import { ArrowRight, ArrowDown } from 'lucide-react'
import { gsap, SplitText, MOTION, DESKTOP, EASE, TRAVEL, magnetic } from './motion'
import { scrollToId } from './navigation'
import LiquidImage from './LiquidImage'
import { KCP, COLLEGES } from '../../data/colleges'
import heroPhoto from '../../assets/kcp/hero-cit.webp'
import heroPhotoSmall from '../../assets/kcp/hero-cit-sm.webp'

const CIT = COLLEGES.find(college => college.status === 'active')

// Hero: the headline rises line by line. On desktop the arch-shaped window opens
// into a full-screen photograph as the page scrolls, ending on one statement.
// Without motion the arch simply stands beside the headline.
export default function HeroScene({ delay = 0 }) {
  const ref = useRef(null), cta = useRef(null)
  const media = useRef({ zoom: 1.12 })

  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add({ motion: MOTION, desktop: DESKTOP }, ({ conditions }) => {
      if (!conditions.motion) return
      const q = gsap.utils.selector(ref)
      const title = SplitText.create(q('.hero-title')[0], { type: 'lines', mask: 'lines', aria: 'auto' })
      gsap.timeline({ delay })
        .from(title.lines, { yPercent: 110, duration: 1.4, ease: EASE, stagger: 0.1 })
        .from(q('[data-hero-in]'), { y: TRAVEL, autoAlpha: 0, duration: 1.1, ease: EASE, stagger: 0.08 }, 0.35)
        .from(q('.hero-media'), { autoAlpha: 0, duration: 1.4, ease: 'power2.out' }, 0)
        .fromTo(media.current, { zoom: 1.3 }, { zoom: 1.12, duration: 2.2, ease: EASE }, 0)
      if (!conditions.desktop) return () => title.revert()
      const statement = SplitText.create(q('.hero-statement > span')[0], { type: 'words', mask: 'words', aria: 'none' })
      gsap.set(q('.hero-statement'), { autoAlpha: 1 })
      gsap.timeline({ scrollTrigger: { trigger: ref.current, start: 'top top', end: '+=130%', pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true } })
        .to(q('.hero-copy'), { yPercent: -18, autoAlpha: 0, ease: 'power2.in', duration: 0.45 }, 0)
        .to(q('.hero-media'), { clipPath: 'inset(0px 0px 0px 0px round 0px 0px 0px 0px)', ease: 'power2.inOut', duration: 0.7 }, 0)
        .to(media.current, { zoom: 1, ease: 'none', duration: 0.7 }, 0)
        .to(q('.hero-caption, .hero-cue'), { autoAlpha: 0, duration: 0.2 }, 0)
        .to(q('.hero-shade'), { opacity: 1, duration: 0.35 }, 0.45)
        .from(statement.words, { yPercent: 110, duration: 0.3, stagger: 0.04, ease: 'power3.out' }, 0.6)
      return () => { title.revert(); statement.revert() }
    }, ref)
    return () => mm.revert()
  }, [delay])
  useEffect(() => magnetic(cta.current), [])

  return (
    <header id="top" className="hero" ref={ref}>
      <div className="hero-media" aria-hidden="true">
        <LiquidImage src={heroPhoto} srcSmall={heroPhotoSmall} state={media.current} className="hero-photo" />
        <span className="hero-shade" />
      </div>
      {/* One inline child keeps the spaces between split words (flex items would drop them). */}
      <p className="hero-statement" aria-hidden="true"><span>Every lesson begins with the <em>syllabus</em>.</span></p>

      <div className="hero-copy">
        <p className="hero-eyebrow" data-hero-in>
          <img src={KCP.crest} alt="" width="28" height="28" />
          <img src={CIT.emblem} alt="" width="28" height="28" />
          <span>{KCP.name} · {CIT.name}</span>
        </p>
        <h1 className="hero-title">One shared home for <em>syllabi</em>, <em>courseware</em> &amp; <em>scores</em></h1>
        <p className="hero-lede" data-hero-in>
          EduPulse turns the official KCP syllabus into the learning materials, assessments and
          progress views that follow from it. The AI drafts; the instructor reviews and decides.
        </p>
        <div className="hero-actions" data-hero-in>
          <a ref={cta} href="#login" className="lp-button is-light" onClick={event => scrollToId(event, 'login')}>
            Get started <ArrowRight size={18} aria-hidden="true" />
          </a>
          <a href="#flow" className="lp-link is-light" onClick={event => scrollToId(event, 'flow')}>See how it works</a>
        </div>
        <ul className="hero-meta" data-hero-in>
          <li>Syllabus-centred</li>
          <li>Grounded in approved documents</li>
          <li>Instructor-approved</li>
        </ul>
      </div>

      <p className="hero-caption" data-hero-in>College of Information Technology · La Trinidad, Benguet</p>
      <a href="#problem" className="hero-cue" onClick={event => scrollToId(event, 'problem')}>
        <ArrowDown size={16} aria-hidden="true" /> Scroll
      </a>
    </header>
  )
}
