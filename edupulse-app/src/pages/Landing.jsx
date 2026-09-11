import { Link } from 'react-router-dom'
import {
  BookOpen, GraduationCap, Shield, Sparkles, Clock, Layers,
  ArrowRight, ChevronDown, FolderCheck, Gauge,
} from 'lucide-react'
import Reveal from '../components/ui/Reveal'
import CountUp from '../components/ui/CountUp'
import LoginPanel from '../components/auth/LoginPanel'
import EduPulseMark from '../components/brand/EduPulseMark'

// HashRouter reads the URL hash for routing, so a plain `href="#id"` jump
// link would be swallowed as a (nonexistent) route and land on NotFound.
// Intercept the click and scroll manually instead of letting the browser
// touch location.hash.
function scrollToId(e, id) {
  e.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

const ABOUT_CARDS = [
  {
    icon: BookOpen,
    color: 'var(--sky-500)',
    bg: 'var(--sky-100)',
    title: 'For Instructors',
    body: "Turn a course outline into a ready-to-use syllabus and class materials in far less time. Everything you prepare — outlines, handouts, activities, quizzes — stays organized in one place, so you can spend less time on paperwork and more time with your students.",
  },
  {
    icon: GraduationCap,
    color: 'var(--green-500)',
    bg: 'var(--green-100)',
    title: 'For Students',
    body: "Everything you need for a course — readings, activities, and assessments — lives in one place you can open anytime. Check your own scores and progress whenever you want, without waiting on anyone.",
  },
  {
    icon: Shield,
    color: 'var(--purple-500)',
    bg: 'var(--purple-100)',
    title: "For the Dean's Office",
    body: "See at a glance which courses are loaded, which syllabi are ready, and where things are moving slowly — without chasing paperwork from every department.",
  },
]

const STATS = [
  { icon: Clock, end: 75, suffix: '%', label: 'Less time spent preparing syllabi & materials', color: 'var(--sky-500)', bg: 'var(--sky-100)' },
  { icon: Layers, end: 4, suffix: '', label: 'Roles working from one shared platform', color: 'var(--purple-500)', bg: 'var(--purple-100)' },
  { icon: FolderCheck, end: 100, suffix: '%', label: 'Course materials centralized in one place', color: 'var(--green-500)', bg: 'var(--green-100)' },
  { icon: Gauge, end: 24, suffix: '/7', label: 'Access to courseware, scores & progress', color: 'var(--amber-500)', bg: 'var(--amber-100)' },
]

export default function Landing() {
  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <a href="#top" className="landing-nav-logo" onClick={e => scrollToId(e, 'top')}>
            <span className="landing-nav-mark"><EduPulseMark size={20} style={{ color: 'white' }} /></span>
            <span className="landing-nav-name">EduPulse</span>
          </a>
          <div className="landing-nav-links">
            <a href="#about" className="landing-nav-link" onClick={e => scrollToId(e, 'about')}>About</a>
            <a href="#stats" className="landing-nav-link" onClick={e => scrollToId(e, 'stats')}>Why It Matters</a>
            <a href="#login" className="btn btn-primary btn-sm" onClick={e => scrollToId(e, 'login')}>Sign In</a>
          </div>
        </div>
      </nav>

      <header id="top" className="landing-hero">
        <div className="landing-hero-bg" aria-hidden="true">
          <span className="landing-blob landing-blob-1" />
          <span className="landing-blob landing-blob-2" />
          <span className="landing-blob landing-blob-3" />
        </div>

        <div className="landing-hero-content">
          <Reveal className="landing-hero-badge">
            <Sparkles size={14} /> King's College of the Philippines — Benguet
          </Reveal>

          <Reveal as="h1" delay={80} className="landing-hero-title">
            One shared home for<br />syllabi, courseware &amp; scores
          </Reveal>

          <Reveal as="p" delay={160} className="landing-hero-subtitle">
            EduPulse helps instructors prepare course materials faster and gives students
            a single, reliable place to find their coursework — no more scattered files,
            group chats, or lost handouts.
          </Reveal>

          <Reveal delay={240} className="landing-hero-actions">
            <a href="#login" className="btn btn-primary btn-lg" onClick={e => scrollToId(e, 'login')}>
              Get Started <ArrowRight size={18} />
            </a>
            <a href="#about" className="btn btn-secondary btn-lg" onClick={e => scrollToId(e, 'about')}>
              See how it helps
            </a>
          </Reveal>

          <Reveal delay={320} className="landing-hero-scroll">
            <ChevronDown size={20} />
          </Reveal>
        </div>
      </header>

      <section id="about" className="landing-section">
        <Reveal className="landing-section-header">
          <span className="landing-eyebrow">What is EduPulse?</span>
          <h2>Less paperwork, more teaching and learning</h2>
          <p>
            EduPulse is built for one simple goal: make it easier for everyone at the
            College of IT to prepare, deliver, and keep track of course materials — in
            plain terms, without any of the technical hassle.
          </p>
        </Reveal>

        <div className="landing-about-grid">
          {ABOUT_CARDS.map((item, i) => (
            <Reveal key={item.title} delay={i * 120} className="landing-about-card card">
              <div className="landing-about-icon" style={{ background: item.bg }}>
                <item.icon size={26} style={{ color: item.color }} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="stats" className="landing-section landing-stats-section">
        <Reveal className="landing-section-header">
          <span className="landing-eyebrow">Why it matters</span>
          <h2>Built around what King's College needs</h2>
          <p>Prototype targets — the goals EduPulse is designed to deliver once fully rolled out.</p>
        </Reveal>

        <div className="landing-stats-grid">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 100} className="landing-stat-card">
              <div className="landing-stat-icon" style={{ background: stat.bg }}>
                <stat.icon size={24} style={{ color: stat.color }} />
              </div>
              <div className="landing-stat-value">
                <CountUp end={stat.end} suffix={stat.suffix} />
              </div>
              <p className="landing-stat-label">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="login" className="landing-section landing-login-section">
        <Reveal className="landing-section-header">
          <span className="landing-eyebrow">Get started</span>
          <h2>Sign in to EduPulse</h2>
          <p>Enter your KCP credentials to continue.</p>
        </Reveal>

        <Reveal delay={100} className="landing-login-wrap">
          <LoginPanel />
        </Reveal>
      </section>

      <footer className="landing-footer">
        <p>Prototype v4.0 — College of Information Technology</p>
        <div className="landing-footer-links">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </footer>
    </div>
  )
}
