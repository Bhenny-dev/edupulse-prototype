import { useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import SkipToContent from '../components/ui/SkipToContent'
import LandingNav from '../components/landing/LandingNav'
import Opening from '../components/landing/Opening'
import ProblemSection from '../components/landing/ProblemSection'
import FeatureStage from '../components/landing/FeatureStage'
import PhaseFlow from '../components/landing/PhaseFlow'
import RoleExplorer from '../components/landing/RoleExplorer'
import PulseSection from '../components/landing/PulseSection'
import AgentsSection from '../components/landing/AgentsSection'
import WorkspaceSection from '../components/landing/WorkspaceSection'
import ImpactSection from '../components/landing/ImpactSection'
import CollegesSection from '../components/landing/CollegesSection'
import PhotoRail from '../components/landing/PhotoRail'
import FaqSection from '../components/landing/FaqSection'
import SignInSection from '../components/landing/SignInSection'
import LandingFooter from '../components/landing/LandingFooter'
import { gsap, ScrollTrigger, MEDIA, revealHeadings } from '../components/landing/motion'
import { decideOpening, trackLandingScroll, leaveLanding, takeReturnY } from '../components/landing/intro'
import { SECTION_IDS, scrollToId } from '../components/landing/navigation'
import { PROBLEM, CHAPTERS, PHASES, ROLES, PRINCIPLES, AGENTS, WORKSPACE_TALK, WORKSPACE_RUNS, EVIDENCE, GOALS, FAQ, COMMUNITY_ALT } from '../components/landing/content'
import { KCP, COLLEGES } from '../data/colleges'
import '../components/landing/landing.css'

// Photographs from kcp.edu.ph (College of Information Technology page).
const COMMUNITY = Object.entries(import.meta.glob('../assets/kcp/cit-community-*.webp', { eager: true, import: 'default' }))
  .sort(([a], [b]) => a.localeCompare(b)).map(([, src], i) => ({ src, alt: COMMUNITY_ALT[i] || 'CIT students at a KCP event' }))
const CIT = COLLEGES.find(college => college.status === 'active')
const PLANNED = COLLEGES.filter(college => college.status !== 'active')

export default function Landing() {
  const root = useRef(null)
  const { search } = useLocation()
  const navigationType = useNavigationType()
  const [opening] = useState(() => decideOpening(search))
  const [arrival] = useState(() => ({ section: new URLSearchParams(search).get('section'), navigationType }))

  // Shared heading reveals, created after the sections' own pins (child effects run first),
  // so they are measured with the pin spacers in place.
  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add(MEDIA.motion, () => revealHeadings(root.current), root)
    return () => mm.revert()
  }, [])

  // Where the page starts: a direct section link (#/?section=faq), the place a reader left
  // for a legal page (Back), or the top.
  useLayoutEffect(() => {
    const { section, navigationType } = arrival
    const back = takeReturnY()
    let frame = 0, alive = true, landed = -1
    if (section && SECTION_IDS.includes(section)) {
      const jump = () => { ScrollTrigger.refresh(); scrollToId(null, section, { instant: true }); landed = window.scrollY }
      frame = requestAnimationFrame(jump)
      // Web fonts can move the section after the first jump; follow it unless the reader has scrolled.
      document.fonts?.ready.then(() => { if (alive && Math.abs(window.scrollY - landed) < 2) jump() })
    } else if (navigationType === 'POP' && back != null) {
      frame = requestAnimationFrame(() => { ScrollTrigger.refresh(); window.scrollTo(0, back) })
    } else if (navigationType === 'PUSH') {
      window.scrollTo(0, 0)
    }
    const onScroll = () => trackLandingScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { alive = false; cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); leaveLanding() }
  }, [arrival])

  return (
    <div className="landing-page" ref={root}>
      <SkipToContent />
      <LandingNav />
      <Opening prelude={opening} />

      {/* "Skip to main content" moves focus here, past the navigation and the hero. */}
      <main id="main-content" tabIndex={-1}>
        <ProblemSection rows={PROBLEM} />
        <FeatureStage chapters={CHAPTERS} />
        <PhaseFlow phases={PHASES} />

        <section id="roles" className="lp-section roles-section" aria-labelledby="roles-title">
          <div className="lp-wrap">
            <header className="lp-head">
              <p className="lp-label">Roles</p>
              <h2 id="roles-title" data-split>Five roles, one platform</h2>
              <p>One role per account. Each sees only its own pages.</p>
            </header>
            <RoleExplorer roles={ROLES} />
          </div>
        </section>

        <PulseSection principles={PRINCIPLES} />
        <AgentsSection agents={AGENTS} />
        <WorkspaceSection agents={AGENTS} talk={WORKSPACE_TALK} runs={WORKSPACE_RUNS} />
        <ImpactSection evidence={EVIDENCE} goals={GOALS} />
        <CollegesSection cit={CIT} planned={PLANNED} />

        <section id="campus" className="lp-section campus" aria-labelledby="campus-title">
          <div className="lp-wrap">
            <header className="lp-head">
              <p className="lp-label">Our community</p>
              <h2 id="campus-title" data-split>Made for the people of the CIT</h2>
              <p>The instructors and BSIT students EduPulse is built around.</p>
            </header>
          </div>
          <PhotoRail photos={COMMUNITY} credit="Photos: King's College of the Philippines (kcp.edu.ph)" />
        </section>

        <FaqSection items={FAQ} />
        <SignInSection photo={(COMMUNITY[6] || COMMUNITY[0]).src} emblem={CIT.emblem} />
      </main>

      <LandingFooter kcp={KCP} />
    </div>
  )
}
