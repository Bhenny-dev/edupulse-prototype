import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, MapPin, ExternalLink, ShieldCheck } from 'lucide-react'
import LoginPanel from '../components/auth/LoginPanel'
import SkipToContent from '../components/ui/SkipToContent'
import EduPulseMark from '../components/brand/EduPulseMark'
import PulseAvatar from '../components/pulse/PulseAvatar'
import LandingNav from '../components/landing/LandingNav'
import Intro from '../components/landing/Intro'
import HeroScene from '../components/landing/HeroScene'
import ProductReel from '../components/landing/ProductReel'
import PhaseRail from '../components/landing/PhaseRail'
import RoleExplorer from '../components/landing/RoleExplorer'
import PhotoRail from '../components/landing/PhotoRail'
import FaqList from '../components/landing/FaqList'
import { NAV_LINKS, scrollToId } from '../components/landing/navigation'
import { gsap, MOTION, INTRO_SECONDS, revealAll, shouldPlayIntro, startSmoothScroll } from '../components/landing/motion'
import { PROBLEM, CHAPTERS, PHASES, ROLES, PRINCIPLES, EVIDENCE, GOALS, FAQ, COMMUNITY_ALT } from '../components/landing/content'
import { KCP, COLLEGES } from '../data/colleges'
import '../components/landing/landing.css'

// Photographs from kcp.edu.ph (College of Information Technology page).
const COMMUNITY = Object.entries(import.meta.glob('../assets/kcp/cit-community-*.webp', { eager: true, import: 'default' }))
  .sort(([a], [b]) => a.localeCompare(b)).map(([, src], i) => ({ src, alt: COMMUNITY_ALT[i] || 'CIT students at a KCP event' }))
const CIT = COLLEGES.find(college => college.status === 'active')
const PLANNED = COLLEGES.filter(college => college.status !== 'active')
const pad = n => String(n).padStart(2, '0')

export default function Landing() {
  const root = useRef(null)
  const [intro] = useState(shouldPlayIntro)

  // Section components create their pinned timelines first (child effects run before
  // this one), so the shared reveals below are measured with the pins in place.
  useLayoutEffect(() => {
    const stopScroll = startSmoothScroll()
    const mm = gsap.matchMedia()
    mm.add(MOTION, () => revealAll(root.current), root)
    return () => { mm.revert(); stopScroll() }
  }, [])

  return (
    <div className="landing-page" ref={root}>
      <SkipToContent />
      <Intro play={intro} />
      <LandingNav />
      <HeroScene delay={intro ? INTRO_SECONDS - 0.45 : 0.1} />

      {/* "Skip to main content" moves focus here, past the navigation and the hero. */}
      <main id="main-content" tabIndex={-1}>
        <section id="problem" className="lp-section problem">
          <p className="lp-eyebrow">Why EduPulse</p>
          <p className="problem-statement" data-scrub-words>
            At the CIT, every lesson is meant to follow the approved syllabus. In practice, syllabi
            are recycled, materials are rushed or pasted from AI chat tools, delivery is split between
            Moodle and paper, and the Dean's office cannot see what reaches the class.
          </p>
          <table className="problem-table">
            <caption className="sr-only">Course preparation today and with EduPulse</caption>
            <thead><tr><th scope="col">Area</th><th scope="col">Today</th><th scope="col">With EduPulse</th></tr></thead>
            <tbody data-reveal="stagger">
              {PROBLEM.map(row => <tr key={row.area}><th scope="row">{row.area}</th><td>{row.today}</td><td>{row.next}</td></tr>)}
            </tbody>
          </table>
          <p className="problem-note" data-reveal>
            <ShieldCheck size={18} aria-hidden="true" /> EduPulse assists but never replaces the instructor's judgment:
            every material and assessment is reviewed and approved before it is used in class.
          </p>
        </section>

        <ProductReel chapters={CHAPTERS} />
        <PhaseRail phases={PHASES} />

        <section id="roles" className="lp-section roles-section">
          <header className="lp-head is-left">
            <p className="lp-eyebrow">Roles</p>
            <h2 data-split>Five roles, one platform</h2>
            <p data-reveal>Each account has one role, and the top bar shows only that role's sections.</p>
          </header>
          <RoleExplorer roles={ROLES} />
        </section>

        <section id="ai" className="lp-dark pulse">
          <div className="lp-section pulse-inner">
            <div>
              <header className="lp-head is-left">
                <p className="lp-eyebrow">Pulse, the AI assistant</p>
                <h2 data-split>Grounded in your documents. Decided by you.</h2>
                <p data-reveal>Pulse lives on every page. It retrieves from the approved syllabus and your files, drafts when you ask, and stops at the boundaries the college set.</p>
              </header>
              <ol className="principles" data-reveal="stagger">
                {PRINCIPLES.map((principle, i) => <li key={principle.title}><span>{pad(i + 1)}</span><h3>{principle.title}</h3><p>{principle.body}</p></li>)}
              </ol>
            </div>
            <figure className="pulse-demo" data-reveal>
              <div className="pulse-demo-head">
                <PulseAvatar size={72} expression="encouraging" />
                <span><strong>Pulse</strong><small>Student view</small></span>
              </div>
              <p className="pulse-bubble is-user">Give me the answers to quiz 2.</p>
              <p className="pulse-bubble is-pulse">I can't help with assessment answers. Your Week 4 reading on conditional statements is still unopened. Want to start there?</p>
              <p className="pulse-tag">Declined · appropriate-use rule</p>
              <figcaption>Illustration · a student asks Pulse for quiz answers</figcaption>
            </figure>
          </div>
        </section>

        <section id="impact" className="lp-section impact">
          <header className="lp-head">
            <p className="lp-eyebrow">Why it matters</p>
            <h2 data-split>Preparation takes time. The research agrees.</h2>
            <p data-reveal>Findings cited in the EduPulse study. They describe the problem EduPulse addresses, not measured EduPulse results.</p>
          </header>
          <div className="evidence" data-reveal="stagger">
            {EVIDENCE.map(item => (
              <article key={item.source}>
                <p className="evidence-value"><span data-count={item.value} data-decimals={item.decimals} data-suffix={item.suffix}>{item.value.toFixed(item.decimals)}{item.suffix}</span></p>
                <p className="evidence-label">{item.label}</p>
                <cite>{item.source}</cite>
              </article>
            ))}
          </div>
          <div className="goals">
            <p className="lp-eyebrow">Sustainable Development Goals</p>
            <ul data-reveal="stagger">{GOALS.map(goal => <li key={goal.code}><strong>{goal.code}</strong><span>{goal.text}</span></li>)}</ul>
          </div>
        </section>

        <section id="colleges" className="lp-section colleges">
          <header className="lp-head is-left">
            <p className="lp-eyebrow">Colleges</p>
            <h2 data-split>Built for the CIT first</h2>
            <p data-reveal>The study is scoped to the College of Information Technology. Adoption by the other KCP colleges is planned future work; a college joins when its instructors are registered and its records are imported.</p>
          </header>
          <article className="college-hero" data-reveal>
            <div className="college-hero-arch"><img src={CIT.photo} alt="" loading="lazy" decoding="async" width="1280" height="800" /></div>
            <div className="college-hero-body">
              <img src={CIT.emblem} alt={`${CIT.name} seal`} className="college-hero-emblem" width="120" height="120" loading="lazy" />
              <p className="college-status is-active"><span /> Now serving</p>
              <h3>{CIT.name}</h3>
              <ul>{CIT.programs.map(program => <li key={program}><GraduationCap size={16} aria-hidden="true" /> {program}</li>)}</ul>
            </div>
          </article>
          <ul className="college-list" data-reveal="stagger">
            {PLANNED.map(college => (
              <li key={college.code} className="college-card">
                <div className="college-card-arch"><img src={college.photo} alt="" loading="lazy" decoding="async" width="720" height="480" /></div>
                <img src={college.emblem} alt={`${college.name} seal`} className="college-card-emblem" width="76" height="76" loading="lazy" />
                <h3>{college.name}</h3>
                <p className="college-card-meta">{[college.code, college.since && `since ${college.since}`, college.motto].filter(Boolean).join(' · ')}</p>
                <p className="college-status">Planned</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="campus" className="lp-section campus">
          <header className="lp-head">
            <p className="lp-eyebrow">Our community</p>
            <h2 data-split>Made for the people of the CIT</h2>
            <p data-reveal>The instructors and BSIT students EduPulse is built around.</p>
          </header>
          <PhotoRail photos={COMMUNITY} credit="Photos: King's College of the Philippines (kcp.edu.ph)" />
        </section>

        <section id="faq" className="lp-section faq">
          <header className="lp-head is-left">
            <p className="lp-eyebrow">FAQ</p>
            <h2 data-split>Questions people ask</h2>
            <p data-reveal>How EduPulse fits the college's process, and what the AI may and may not do.</p>
          </header>
          <FaqList items={FAQ} />
        </section>

        <section id="login" className="lp-section login">
          <figure className="login-visual" data-reveal>
            <img src={(COMMUNITY[6] || COMMUNITY[0]).src} alt="" loading="lazy" decoding="async" width="720" height="480" />
            <figcaption>
              <img src={CIT.emblem} alt="" width="64" height="64" />
              <strong>Welcome to EduPulse</strong>
              <span>Sign in with the account your system administrator created. Your role decides what you see.</span>
              <ul>{['Dean', 'Associate Dean', 'Instructor', 'Student', 'System Admin'].map(role => <li key={role}>{role}</li>)}</ul>
            </figcaption>
          </figure>
          <div className="login-form">
            <header className="lp-head is-left">
              <p className="lp-eyebrow">Get started</p>
              <h2 data-split>Sign in to EduPulse</h2>
              <p>Use your EduPulse account to continue.</p>
            </header>
            <LoginPanel />
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <p className="footer-logos">
              <img src={KCP.crest} alt="" width="44" height="44" />
              <span className="nav-mark"><EduPulseMark size={18} style={{ color: 'currentColor' }} /></span>
              <strong>EduPulse</strong>
            </p>
            <p>An AI-powered syllabus and course builder with performance monitoring, made for the College of Information Technology.</p>
            <blockquote><p>{KCP.vision}</p><cite>KCP vision</cite></blockquote>
          </div>
          <nav className="footer-col" aria-label="Footer: page sections">
            <h3>Explore</h3>
            {NAV_LINKS.map(link => <a key={link.id} href={`#${link.id}`} onClick={event => scrollToId(event, link.id)}>{link.label}</a>)}
          </nav>
          <nav className="footer-col" aria-label="Footer: legal">
            <h3>Legal</h3>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </nav>
          <div className="footer-col">
            <h3>{KCP.name}</h3>
            <p><MapPin size={15} aria-hidden="true" /> {KCP.address}</p>
            <a href={KCP.website} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} aria-hidden="true" /> kcp.edu.ph</a>
          </div>
        </div>
        <p className="footer-word" aria-hidden="true">EduPulse</p>
        <div className="footer-bottom">
          <p>A BSIT capstone project · College of Information Technology · Prototype v4.0</p>
          <p>Photos and emblems © King's College of the Philippines</p>
        </div>
      </footer>
    </div>
  )
}
