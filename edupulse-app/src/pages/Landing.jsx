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
import { setupArrivals } from '../components/landing/arrivals'
import { decideMode, fullQuery } from '../components/landing/classroom/mode'
import { createStage, createLiteStage } from '../components/landing/classroom/stage'
import RoomDial from '../components/landing/RoomDial'
import kcpBuilding from '../assets/kcp/kcp-building.webp'
import { SECTION_IDS, OPENING_TRIGGER, scrollToId } from '../components/landing/navigation'
import { PROBLEM, CHAPTERS, PHASES, ROLES, PRINCIPLES, AGENTS, WORKSPACE_TALK, EVIDENCE, GOALS, FAQ, COMMUNITY_ALT } from '../components/landing/content'
import { KCP, COLLEGES } from '../data/colleges'
import '../components/landing/landing.css'
import '../components/landing/classroom.css'

// Photographs from kcp.edu.ph (College of Information Technology page).
const COMMUNITY = Object.entries(import.meta.glob('../assets/kcp/cit-community-*.webp', { eager: true, import: 'default' }))
  .sort(([a], [b]) => a.localeCompare(b)).map(([, src], i) => ({ src, alt: COMMUNITY_ALT[i] || 'CIT students at a KCP event' }))
const CIT = COLLEGES.find(college => college.status === 'active')
const PLANNED = COLLEGES.filter(college => college.status !== 'active')

export default function Landing() {
  const root = useRef(null)
  const { search } = useLocation()
  const navigationType = useNavigationType()
  const canvas = useRef(null), wash = useRef(null)
  // Decided before the sections' own effects run, which read it through classroom/mode.js.
  const [mode] = useState(() => decideMode())
  const [opening] = useState(() => decideOpening(search))
  const [arrival] = useState(() => ({ section: new URLSearchParams(search).get('section'), navigationType }))

  // Shared heading reveals and the entrances of every section's cards, created after the
  // sections' own pins (child effects run first), so they are measured with the pin spacers
  // in place. Neither runs with reduced motion.
  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    if (mode !== 'full') {
      mm.add(MEDIA.motion, () => revealHeadings(root.current), root)
      mm.add(MEDIA.motion, () => setupArrivals(root.current))
    }
    return () => mm.revert()
  }, [mode])

  // The walk through the 3D school: laid on its surfaces on large screens, behind the content on
  // small ones. Crossing the size or motion breakpoint reloads the page in the mode that now fits.
  useLayoutEffect(() => {
    if (mode === 'flat') return undefined
    const start = mode === 'full' ? createStage : createLiteStage
    return start({ root: root.current, canvas: canvas.current, wash: wash.current, buildingUrl: kcpBuilding, onFail: () => window.location.reload() })
  }, [mode])
  useLayoutEffect(() => {
    const queries = [window.matchMedia(fullQuery), window.matchMedia('(prefers-reduced-motion: reduce)')]
    const start = queries.map(query => query.matches)
    const onChange = () => { if (queries.some((query, i) => query.matches !== start[i])) window.location.reload() }
    queries.forEach(query => query.addEventListener?.('change', onChange))
    return () => queries.forEach(query => query.removeEventListener?.('change', onChange))
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
    // A return (Back from a legal page) starts without the opening, whose pin adds its own
    // scroll length while it is on the page, so the place is kept without that length.
    const onScroll = () => {
      const opening = ScrollTrigger.getById(OPENING_TRIGGER)
      trackLandingScroll(window.scrollY - (opening ? opening.end - opening.start : 0))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { alive = false; cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); leaveLanding() }
  }, [arrival])

  return (
    <div className={`landing-page ${mode === 'full' ? 'is-world' : `is-${mode}`}`} ref={root}>
      <SkipToContent />
      {mode !== 'flat' && <canvas ref={canvas} className="world-canvas" aria-hidden="true" />}
      <LandingNav />
      <RoomDial />
      {mode === 'full' && <div ref={wash} className="world-wash" aria-hidden="true" />}
      <Opening prelude={opening} />

      {/* "Skip to main content" moves focus here, past the navigation and the hero. */}
      <main id="main-content" tabIndex={-1}>
        <ProblemSection rows={PROBLEM} />
        <FeatureStage chapters={CHAPTERS} />
        <PhaseFlow phases={PHASES} />

        <section id="roles" className="lp-section roles-section room" data-room="roles" aria-labelledby="roles-title">
          <div className="room-view"><div className="lp-wrap roles-board">
            <header className="lp-head">
              <p className="lp-label">Roles</p>
              <h2 id="roles-title" data-split>Five roles, one platform</h2>
              <p>One role per account. Each sees only its own pages.</p>
            </header>
            <RoleExplorer roles={ROLES} />
          </div></div>
        </section>

        <PulseSection principles={PRINCIPLES} />
        <AgentsSection agents={AGENTS} />
        <WorkspaceSection agents={AGENTS} talk={WORKSPACE_TALK} />
        <ImpactSection evidence={EVIDENCE} goals={GOALS} />
        <CollegesSection cit={CIT} planned={PLANNED} />

        <section id="campus" className="lp-section campus room" data-room="campus" aria-labelledby="campus-title">
          <div className="room-view"><div className="campus-board"><div className="lp-wrap">
            <header className="lp-head">
              <p className="lp-label">Our community</p>
              <h2 id="campus-title" data-split>Made for the people of the CIT</h2>
              <p>The instructors and BSIT students EduPulse is built around.</p>
            </header>
          </div>
          <PhotoRail photos={COMMUNITY} credit="Photos: King's College of the Philippines (kcp.edu.ph)" />
          </div></div>
        </section>

        <FaqSection items={FAQ} />
        <SignInSection photo={(COMMUNITY[6] || COMMUNITY[0]).src} emblem={CIT.emblem} />
      </main>

      <LandingFooter kcp={KCP} />
    </div>
  )
}
