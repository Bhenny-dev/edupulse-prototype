import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, GraduationCap, Shield, ShieldCheck, Clock, Layers, ArrowRight, ChevronDown,
  FolderCheck, Gauge, FileText, ClipboardCheck, BarChart3, LayoutDashboard, Upload, Bot,
  Library, BadgeCheck, Lock, ListChecks, UserCog, Activity, Users, MapPin, ExternalLink,
  CalendarCheck, Search, Hand, Sparkles, Quote,
} from 'lucide-react'
import Reveal from '../components/ui/Reveal'
import CountUp from '../components/ui/CountUp'
import LoginPanel from '../components/auth/LoginPanel'
import EduPulseMark from '../components/brand/EduPulseMark'
import PulseAvatar from '../components/pulse/PulseAvatar'
import LandingNav from '../components/landing/LandingNav'
import HeroPreview from '../components/landing/HeroPreview'
import RoleExplorer from '../components/landing/RoleExplorer'
import PhotoMarquee from '../components/landing/PhotoMarquee'
import FaqList from '../components/landing/FaqList'
import { NAV_LINKS, scrollToId, prefersReducedMotion } from '../components/landing/navigation'
import { KCP, COLLEGES } from '../data/colleges'
import heroPhoto from '../assets/kcp/hero-cit.webp'
import heroPhotoSmall from '../assets/kcp/hero-cit-sm.webp'
import labPhoto from '../assets/kcp/cit-lab.webp'
import '../components/landing/landing.css'

// Photographs from kcp.edu.ph (College of Information Technology page).
const COMMUNITY = Object.entries(import.meta.glob('../assets/kcp/cit-community-*.webp', { eager: true, import: 'default' }))
  .sort(([a], [b]) => a.localeCompare(b)).map(([, src]) => src)
const COMMUNITY_ALT = [
  'CIT students seated around a banquet table at a KCP event',
  'CIT students gathered around a table, some seated and some standing',
  'A group of CIT students and faculty standing on the stage steps',
  'CIT students holding certificates on stage',
  'A small group of CIT students posing on stage',
  'A long row of CIT students and faculty lined up on stage',
  'A large group photo of CIT students and faculty',
  'CIT students gathered around a dinner table',
  'CIT students seated and standing together in a function hall',
  'CIT students posing around a table at a college event',
]
const PHOTOS = COMMUNITY.map((src, i) => ({ src, alt: COMMUNITY_ALT[i] || 'CIT students at a KCP event' }))
const CIT = COLLEGES.find(college => college.status === 'active')
const ONBOARDING = COLLEGES.filter(college => college.status !== 'active')

const ABOUT_CARDS = [
  {
    icon: BookOpen, tone: 'sky', title: 'For Instructors',
    body: 'Turn a course outline into a ready-to-use syllabus and class materials in far less time. Everything you prepare — outlines, handouts, activities, quizzes — stays organized in one place, so you can spend less time on paperwork and more time with your students.',
  },
  {
    icon: GraduationCap, tone: 'green', title: 'For Students',
    body: 'Everything you need for a course — readings, activities, and assessments — lives in one place you can open anytime. Check your own scores and progress whenever you want, without waiting on anyone.',
  },
  {
    icon: Shield, tone: 'violet', title: "For the Dean's Office",
    body: 'See at a glance which courses are loaded, which syllabi are ready, and where things are moving slowly — without chasing paperwork from every department.',
  },
]

const SYLLABUS_SECTIONS = ['Course identity', 'Course information', 'Vision, mission & objectives', 'Program outcomes', 'Course outline', 'Requirements & grading', 'References']
const OUTLINE_WEEKS = [
  { week: 'W1', items: ['Material', 'Seatwork'] },
  { week: 'W2', items: ['Material', 'Quiz'] },
  { week: 'W3', items: ['Material', 'Lab activity'] },
  { week: 'W9', milestone: 'Midterm examination' },
]
const FEATURES = [
  { key: 'syllabus', wide: true, icon: BookOpen, tone: 'sky', title: 'Syllabus Builder', body: 'Build the official KCP seven-section syllabus, or upload one you already have. Pulse can co-write section by section or draft the whole syllabus, and every AI draft is saved as Drafted until you check it.' },
  { key: 'pulse', icon: Bot, tone: 'violet', title: 'Pulse, the assistant', body: 'Ask questions, draft, compare documents and find references in your own library. Answers name their sources, and Pulse asks before it changes anything.' },
  { key: 'loading', icon: ClipboardCheck, tone: 'amber', title: 'Course Loading', body: "The Dean or Associate Dean loads each released course to an instructor. Pulse can rank candidates, master's degree first and then specialization; nothing takes effect until they confirm." },
  { key: 'courseware', wide: true, icon: FileText, tone: 'green', title: 'Courseware from the outline', body: 'The approved course outline drives everything: contents and learning outcomes become learning materials, and the Assessments column becomes assessment items. Generate by week, by term or for the whole outline; every item stays a draft until you publish it.' },
  { key: 'records', icon: Upload, tone: 'slate', title: 'Records intake', body: 'Upload EduSuite exports: course records, course loads and block class lists. EduPulse shows what it understood, and nothing is saved until you confirm.' },
  { key: 'monitoring', icon: ListChecks, tone: 'sky', title: 'Student Monitoring', body: 'A scoring sheet per course: Completed and Missed per assessment, opened and unopened materials, class averages and reminders. It visualizes scores; it never computes grades.' },
  { key: 'performance', icon: BarChart3, tone: 'rose', title: 'Performance by topic', body: "Students follow their own scores and mastery by topic. Instructors see results and alerts per course, and the Dean sees the college-wide view. The Associate Dean's views leave scores out." },
]

const FLOW = [
  { phase: 0, title: 'Records intake', who: 'Dean · Associate Dean', icon: Upload, what: 'Upload the EduSuite exports: course records, course loads and block rosters.', ai: 'Reads the files and shows what it understood.', human: 'The Dean or Associate Dean confirms before anything is saved.' },
  { phase: 1, title: 'Course loading', who: 'Dean · Associate Dean', icon: ClipboardCheck, what: 'Load each released course to an instructor.', ai: "Suggests or proposes instructors: master's degree first, then specialization.", human: 'Every assignment is confirmed before it takes effect.' },
  { phase: 2, title: 'Syllabus building', who: 'Instructor', icon: BookOpen, what: 'Build the seven-section syllabus, or upload a ready-made one.', ai: 'Co-writes section by section, or drafts the whole syllabus as Drafted.', human: 'Checked, then signed outside EduPulse: Dean review, CAO approval, EVP noting. The approved file is uploaded and its course outline extracted.' },
  { phase: 3, title: 'Courseware generation', who: 'Instructor', icon: FileText, what: 'Turn each outline week into learning materials and assessments.', ai: 'Drafts by week, by term or for the whole outline, grounded in the approved syllabus.', human: 'The instructor reviews, edits and publishes. Only published items reach students.' },
  { phase: 4, title: 'Student access', who: 'Students', icon: GraduationCap, what: "Open published materials and answer assessments for the block's courses.", ai: 'Guides only: reminders, missed activities and finding the way.', human: 'Pulse never answers, reviews or hints at assessment items.' },
  { phase: 5, title: 'Monitoring', who: 'Everyone', icon: Activity, what: "A scoring sheet for instructors, delivery progress for the Dean's office and notices for students.", ai: 'Summarizes what the charts show.', human: 'No grades are computed; the KCP grading sheet stays official.' },
]

const ROLES = [
  {
    key: 'instructor', label: 'Instructor', icon: BookOpen, accent: 'var(--sky-500)', kicker: 'Prepare and deliver',
    title: 'Teach from one organized place',
    summary: 'Build and check the syllabus, generate and review courseware, publish it to your blocks, and follow every student in the scoring sheet.',
    tasks: ['See your loaded courses and each syllabus status', 'Build the seven-section syllabus or upload one you already have', 'Review AI drafts, edit them and publish when ready', 'Track assessment scores and material access per student'],
    sections: [{ label: 'Dashboard', icon: LayoutDashboard }, { label: 'Syllabus', icon: BookOpen }, { label: 'Courseware', icon: FileText }, { label: 'Student Monitoring', icon: ClipboardCheck }, { label: 'Performance', icon: BarChart3 }],
    views: [{ icon: BookOpen, title: 'Syllabus Builder', detail: 'Seven sections · upload or build' }, { icon: FileText, title: 'Courseware Builder', detail: 'Materials and assessments per week' }, { icon: ListChecks, title: 'Student Monitoring', detail: 'Assessment Scores · Learning Material Access' }],
  },
  {
    key: 'student', label: 'Student', icon: GraduationCap, accent: 'var(--green-500)', kicker: 'Learn',
    title: 'Everything for your courses, in one place',
    summary: "Open the materials your instructors published for your block's courses, answer assessments, and follow your own progress whenever you want.",
    tasks: ['My Materials: readings and activities, ready to open', 'My Assessments: answer them and see your results', 'Performance: your scores and mastery by topic', 'Reminders about unopened materials and missed work'],
    boundary: 'Pulse will not answer or hint at assessment items.',
    sections: [{ label: 'Dashboard', icon: LayoutDashboard }, { label: 'My Courses', icon: BookOpen }, { label: 'Assessments', icon: ClipboardCheck }, { label: 'Performance', icon: BarChart3 }],
    views: [{ icon: BookOpen, title: 'My Materials', detail: 'Published readings and activities' }, { icon: ClipboardCheck, title: 'My Assessments', detail: 'Answer and review your scores' }, { icon: BarChart3, title: 'Performance', detail: 'Overview · By Topic · Assessment Scores' }],
  },
  {
    key: 'dean', label: 'Dean', icon: Shield, accent: 'var(--purple-500)', kicker: 'Lead the college',
    title: 'See delivery across the college',
    summary: 'Import EduSuite records, load courses to instructors, and monitor syllabus status, delivery progress and students across the CIT.',
    tasks: ['Records: EduSuite files, blocks, class lists and the course catalog', 'Course Loading: assign instructors with ranked suggestions', 'Monitor: syllabus status, delivery progress, student oversight and alerts', 'Performance: a read-only, college-wide view of results'],
    sections: [{ label: 'Dashboard', icon: LayoutDashboard }, { label: 'Records', icon: BookOpen }, { label: 'Course Loading', icon: ClipboardCheck }, { label: 'Monitor', icon: BarChart3 }, { label: 'Performance', icon: BarChart3 }],
    views: [{ icon: ClipboardCheck, title: 'Course Loading', detail: 'Loaded Courses · Instructors' }, { icon: Activity, title: 'Monitor', detail: 'Syllabus Status · Delivery Progress · Alerts' }, { icon: Upload, title: 'Records', detail: 'Import EduSuite files' }],
  },
  {
    key: 'associate_dean', label: 'Associate Dean', icon: CalendarCheck, accent: 'var(--amber-500)', kicker: 'Coordinate',
    title: "Work beside the Dean's office",
    summary: 'A separate account with the same records, course loading and monitoring stations as the Dean, and a dashboard of its own.',
    tasks: ['Import and confirm EduSuite records', 'Load courses and confirm every assignment', 'Follow syllabus status and delivery progress', 'Open a dashboard built for the Associate Dean'],
    boundary: 'Performance scores and approval authority stay with the Dean.',
    sections: [{ label: 'Dashboard', icon: LayoutDashboard }, { label: 'Records', icon: BookOpen }, { label: 'Course Loading', icon: ClipboardCheck }, { label: 'Monitor', icon: BarChart3 }],
    views: [{ icon: Upload, title: 'Records', detail: 'Blocks & Class Lists · Course Catalog' }, { icon: ClipboardCheck, title: 'Course Loading', detail: 'Confirm each proposed assignment' }, { icon: Activity, title: 'Monitor', detail: 'Delivery against the outline weeks' }],
  },
  {
    key: 'admin', label: 'System Admin', icon: UserCog, accent: 'var(--gray-500)', kicker: 'Keep it running',
    title: 'Accounts, health and accountability',
    summary: 'Runs the platform rather than the curriculum: creates role accounts, watches system health and reviews what happened.',
    tasks: ['Create accounts and assign or change roles', 'Check system health and role coverage', 'Review audit activity, filtered by successes and failures', "Follow each named AI agent's task, goal and results"],
    sections: [{ label: 'Dashboard', icon: LayoutDashboard }],
    views: [{ icon: Users, title: 'Manage accounts', detail: 'Create an account or change a role' }, { icon: ShieldCheck, title: 'Audit activity', detail: 'All · Successes · Failures' }, { icon: Bot, title: 'Agent activity', detail: 'Each agent, its task and goal' }],
  },
]

const PRINCIPLES = [
  { icon: ShieldCheck, title: 'Nothing publishes itself', body: 'AI drafts stay labelled until an instructor reviews them and chooses to publish.' },
  { icon: Hand, title: 'Guide, never answer', body: 'For students, Pulse reminds and points to missed work. It declines requests for assessment answers.' },
  { icon: Library, title: 'Sources you can check', body: 'Answers cite the passages from your own library they came from.' },
  { icon: BadgeCheck, title: 'Asks before acting', body: 'Registering a class list or filing a document waits for your confirmation.' },
  { icon: BarChart3, title: 'Scores, not grades', body: 'The scoring sheet visualizes results. MG, TFG and FG stay in the official KCP grading sheet.' },
  { icon: Lock, title: 'Private to each role', body: "Each account sees only its role's pages, and the Associate Dean's views leave scores out." },
]

const STATS = [
  { icon: Clock, end: 75, suffix: '%', label: 'Less time spent preparing syllabi & materials', tone: 'sky' },
  { icon: Layers, end: 5, suffix: '', label: 'Roles working from one shared platform', tone: 'violet' },
  { icon: FolderCheck, end: 100, suffix: '%', label: 'Course materials centralized in one place', tone: 'green' },
  { icon: Gauge, end: 24, suffix: '/7', label: 'Access to courseware, scores & progress', tone: 'amber' },
]

const FAQ = [
  { question: 'Who can sign in to EduPulse?', answer: 'Anyone with an account the system administrator created: the Dean, the Associate Dean, and the instructors and students of the College of Information Technology. Each account has one role, and that role decides which pages you see.' },
  { question: 'Does EduPulse replace our LMS or the official grading sheet?', answer: 'No. EduPulse is the syllabus-centred layer: build the syllabus, generate mapped courseware, deliver it and monitor it. The scoring sheet is for visualization only; grades stay in the official KCP grading sheet.' },
  { question: 'Can the AI publish materials on its own?', answer: "No. Every AI draft is labelled and stays a draft until an instructor reviews it and chooses to publish. Course-loading suggestions also wait for the Dean's or Associate Dean's confirmation." },
  { question: 'Will Pulse answer assessments for students?', answer: 'No. For students, Pulse is a guide: it reminds them about unopened materials, points to missed activities and helps them find their way. It declines to answer, review or hint at assessment items.' },
  { question: 'Is the syllabus approved inside EduPulse?', answer: 'No. The instructor downloads the checked syllabus. It is reviewed by the Dean, approved by the Chief Academic Officer and noted by the Executive Vice President outside the system. The approved file is then uploaded, and EduPulse extracts its course outline.' },
  { question: 'Where do courses, loads and class lists come from?', answer: "From EduSuite, the college's system of record. The Dean or Associate Dean uploads its export files; EduPulse has no direct connection to EduSuite." },
  { question: 'What about the other colleges of KCP?', answer: 'EduPulse starts with the College of Information Technology. Other colleges can be added when their instructors are registered and their records are imported.' },
]

function SectionHeader({ eyebrow, title, children, align = 'center', tone }) {
  return (
    <Reveal className={`landing-section-header is-${align} ${tone ? `is-${tone}` : ''}`.trim()}>
      <span className="landing-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </Reveal>
  )
}

// Hero depth: the photo drifts slower than the page and a soft light follows the pointer.
function useHeroMotion() {
  const ref = useRef(null)
  useEffect(() => {
    const hero = ref.current
    if (!hero || prefersReducedMotion()) return
    let frame = 0, pointer = null
    const paint = () => {
      frame = 0
      const shift = Math.min(window.scrollY, window.innerHeight) * 0.22
      hero.style.setProperty('--hero-shift', `${shift.toFixed(1)}px`)
      if (pointer) {
        const box = hero.getBoundingClientRect()
        const x = (pointer.x - box.left) / box.width, y = (pointer.y - box.top) / box.height
        hero.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
        hero.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
        hero.style.setProperty('--tilt-x', `${((0.5 - y) * 6).toFixed(2)}deg`)
        hero.style.setProperty('--tilt-y', `${((x - 0.5) * 8).toFixed(2)}deg`)
      }
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint) }
    const move = event => { if (event.pointerType === 'mouse') { pointer = { x: event.clientX, y: event.clientY }; schedule() } }
    const leave = () => { pointer = null; for (const name of ['--tilt-x', '--tilt-y']) hero.style.setProperty(name, '0deg') }
    window.addEventListener('scroll', schedule, { passive: true })
    hero.addEventListener('pointermove', move)
    hero.addEventListener('pointerleave', leave)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerleave', leave) }
  }, [])
  return ref
}

// Fills the timeline's line as the reader moves through the phases.
function useSectionProgress() {
  const ref = useRef(null)
  useEffect(() => {
    const section = ref.current
    if (!section) return
    if (prefersReducedMotion()) { section.style.setProperty('--flow-progress', '1'); return }
    let frame = 0
    const paint = () => {
      frame = 0
      const box = section.getBoundingClientRect()
      const progress = Math.max(0, Math.min(1, (window.innerHeight * 0.55 - box.top) / box.height))
      section.style.setProperty('--flow-progress', progress.toFixed(3))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint) }
    paint()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule) }
  }, [])
  return ref
}

function FeatureVisual({ name }) {
  if (name === 'syllabus') return (
    <ol className="feature-visual-sections" aria-label="The seven sections of the KCP syllabus">
      {SYLLABUS_SECTIONS.map((section, i) => <li key={section} className={i === 4 ? 'is-key' : ''} style={{ '--i': i }}><span>{i + 1}</span>{section}{i === 4 && <em>mapping backbone</em>}</li>)}
    </ol>
  )
  if (name === 'courseware') return (
    <div className="feature-visual-outline" role="group" aria-label="Course outline weeks with generated drafts">
      {OUTLINE_WEEKS.map((row, i) => (
        <div key={row.week} className={`outline-row ${row.milestone ? 'is-milestone' : ''}`} style={{ '--i': i }}>
          <span className="outline-week">{row.week}</span>
          {row.milestone ? <span className="outline-milestone"><CalendarCheck size={14} aria-hidden="true" /> {row.milestone}</span>
            : row.items.map(item => <span key={item} className="outline-item">{item}<small>Draft</small></span>)}
        </div>
      ))}
    </div>
  )
  if (name === 'pulse') return (
    <div className="feature-visual-search" aria-hidden="true"><Search size={14} /> Find readings on data structures for my course<span className="feature-visual-cite">3 sources</span></div>
  )
  return null
}

export default function Landing() {
  const hero = useHeroMotion()
  const flow = useSectionProgress()

  return (
    <div className="landing-page">
      <LandingNav />

      <header id="top" className="landing-hero" ref={hero}>
        <div className="landing-hero-media" aria-hidden="true">
          <picture>
            <source media="(max-width: 760px)" srcSet={heroPhotoSmall} />
            <img src={heroPhoto} alt="" className="landing-hero-photo" fetchPriority="high" decoding="async" />
          </picture>
          <span className="landing-hero-shade" />
          <span className="landing-hero-grid" />
          <span className="landing-hero-spot" />
        </div>

        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <Reveal className="landing-hero-lockup">
              <img src={KCP.crest} alt="King's College of the Philippines crest" width="44" height="44" />
              <img src={CIT.emblem} alt="College of Information Technology seal" width="44" height="44" />
              <span><strong>{KCP.name}</strong><small>{CIT.name} · La Trinidad, Benguet</small></span>
            </Reveal>

            <Reveal as="h1" delay={80} className="landing-hero-title">
              One shared home for <span className="landing-hero-accent">syllabi, courseware &amp; scores</span>
            </Reveal>

            <Reveal as="p" delay={160} className="landing-hero-subtitle">
              EduPulse helps instructors prepare course materials faster and gives students
              a single, reliable place to find their coursework — no more scattered files,
              group chats, or lost handouts.
            </Reveal>

            <Reveal delay={240} className="landing-hero-actions">
              <a href="#login" className="btn btn-primary btn-lg landing-cta" onClick={e => scrollToId(e, 'login')}>
                Get Started <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a href="#flow" className="btn btn-lg landing-cta-ghost" onClick={e => scrollToId(e, 'flow')}>
                See how it works
              </a>
            </Reveal>

            <Reveal as="ul" delay={320} className="landing-hero-assurances">
              <li><BookOpen size={15} aria-hidden="true" /> Built on the approved syllabus</li>
              <li><ShieldCheck size={15} aria-hidden="true" /> Human review before anything is published</li>
              <li><Lock size={15} aria-hidden="true" /> Role-based KCP accounts</li>
            </Reveal>
          </div>

          <Reveal delay={200} variant="zoom" className="landing-hero-visual">
            <HeroPreview />
          </Reveal>
        </div>

        <a href="#about" className="landing-hero-scroll" onClick={e => scrollToId(e, 'about')}>
          <span>Scroll to explore</span><ChevronDown size={18} aria-hidden="true" />
        </a>
      </header>

      <section className="landing-ribbon" aria-label="About the institution">
        <div className="landing-ribbon-inner">
          <span><img src={KCP.crest} alt="" width="26" height="26" /> King's College of the Philippines · since {KCP.founded}</span>
          <span><GraduationCap size={17} aria-hidden="true" /> BSIT: Web and Mobile Application Development · Business Analytics and Big Data</span>
          <span><BadgeCheck size={17} aria-hidden="true" /> Curriculum: CHED CMO No. 25, s. 2015</span>
        </div>
      </section>

      <section id="about" className="landing-section landing-about">
        <SectionHeader eyebrow="What is EduPulse?" title="Less paperwork, more teaching and learning">
          EduPulse is built for one simple goal: make it easier for everyone at the College
          of IT to prepare, deliver, and keep track of course materials — in plain terms,
          without any of the technical hassle.
        </SectionHeader>

        <div className="landing-about-layout">
          <Reveal variant="left" className="landing-about-collage">
            <img src={labPhoto} alt="A student writing code at a multi-monitor workstation" className="collage-main" loading="lazy" decoding="async" width="640" height="400" />
            {PHOTOS[1] && <img src={PHOTOS[1].src} alt={PHOTOS[1].alt} className="collage-inset" loading="lazy" decoding="async" width="360" height="240" />}
            <span className="collage-badge collage-badge-top"><Sparkles size={15} aria-hidden="true" /> Course outline → courseware</span>
            <span className="collage-badge collage-badge-bottom"><img src={CIT.emblem} alt="" width="28" height="28" /> Made with the CIT</span>
          </Reveal>

          <div className="landing-about-cards">
            {ABOUT_CARDS.map((item, i) => (
              <Reveal key={item.title} delay={i * 110} variant="right" className={`landing-about-card tone-${item.tone}`}>
                <span className="landing-icon"><item.icon size={24} aria-hidden="true" /></span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </Reveal>
            ))}
            <Reveal delay={360} variant="right" as="p" className="landing-about-note">
              EduPulse sits beside the tools the college already uses: course records still come from
              EduSuite, official grades stay in the KCP grading sheet, and your LMS keeps working.
            </Reveal>
          </div>
        </div>
      </section>

      <section id="features" className="landing-section landing-features">
        <SectionHeader eyebrow="Features" title="Everything revolves around the approved syllabus">
          Each part of EduPulse follows the college's own process, from the records the Dean's
          office imports to the scores students see.
        </SectionHeader>
        <div className="feature-grid">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.key} delay={(i % 3) * 90} className={`feature-tile tone-${feature.tone} ${feature.wide ? 'is-wide' : ''}`}>
              <span className="landing-icon"><feature.icon size={22} aria-hidden="true" /></span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
              <FeatureVisual name={feature.key} />
            </Reveal>
          ))}
        </div>
      </section>

      <section id="flow" className="landing-section landing-flow" ref={flow}>
        <SectionHeader eyebrow="How it works" title="From EduSuite files to student results">
          Six phases, each with a person who decides. The AI assists inside every phase and never finalizes one.
        </SectionHeader>
        <div className="flow-track">
        <span className="flow-line" aria-hidden="true"><span className="flow-line-fill" /></span>
        <ol className="flow-steps">
          {FLOW.map((step, i) => (
            <Reveal as="li" key={step.phase} variant={i % 2 ? 'right' : 'left'} className="flow-step">
              <span className="flow-node" aria-hidden="true"><step.icon size={20} /></span>
              <div className="flow-card">
                <span className="flow-phase">Phase {step.phase} · {step.who}</span>
                <h3>{step.title}</h3>
                <p>{step.what}</p>
                <dl>
                  <div><dt><Bot size={15} aria-hidden="true" /> AI</dt><dd>{step.ai}</dd></div>
                  <div><dt><BadgeCheck size={15} aria-hidden="true" /> People</dt><dd>{step.human}</dd></div>
                </dl>
              </div>
            </Reveal>
          ))}
        </ol>
        </div>
      </section>

      <section id="roles" className="landing-section landing-roles">
        <SectionHeader eyebrow="Roles" title="Five roles, one platform">
          Each account has one role, and the top bar shows only that role's sections.
        </SectionHeader>
        <Reveal><RoleExplorer roles={ROLES} /></Reveal>
      </section>

      <section id="ai" className="landing-band">
        <div className="landing-band-inner">
          <div className="landing-band-copy">
            <SectionHeader eyebrow="Pulse, the AI assistant" title="Pulse assists. People decide." align="left" tone="dark">
              Pulse lives on every page. It answers from your own documents, drafts when you ask,
              and stops at the boundaries the college set.
            </SectionHeader>
            <div className="principle-grid">
              {PRINCIPLES.map((principle, i) => (
                <Reveal key={principle.title} delay={(i % 2) * 90} className="principle">
                  <principle.icon size={20} aria-hidden="true" />
                  <div><h3>{principle.title}</h3><p>{principle.body}</p></div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal variant="zoom" className="pulse-demo">
            <figure>
              <div className="pulse-demo-head">
                <PulseAvatar size={64} expression="encouraging" />
                <span><strong>Pulse</strong><small>Student view</small></span>
              </div>
              <div className="pulse-demo-chat">
                <p className="pulse-bubble is-user">Give me the answers to quiz 2.</p>
                <p className="pulse-bubble is-pulse">I can't help with assessment answers. Your Week 4 reading on conditional statements is still unopened. Want to start there?</p>
                <span className="pulse-demo-tag"><ShieldCheck size={14} aria-hidden="true" /> Declined · appropriate-use rule</span>
              </div>
              <figcaption>Illustration · a student asks Pulse for quiz answers</figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      <section id="colleges" className="landing-section landing-colleges">
        <SectionHeader eyebrow="Colleges" title="Starting with the College of Information Technology">
          EduPulse serves the CIT first. Other KCP colleges can join when their instructors are
          registered and their records are imported.
        </SectionHeader>

        <Reveal className="college-feature">
          <img src={CIT.photo} alt="" className="college-feature-photo" loading="lazy" decoding="async" />
          <div className="college-feature-body">
            <span className="college-emblem-ring"><img src={CIT.emblem} alt={`${CIT.name} seal`} width="132" height="132" loading="lazy" /></span>
            <div>
              <span className="college-status is-active"><span className="status-dot" /> Now serving</span>
              <h3>{CIT.name}</h3>
              <ul>{CIT.programs.map(program => <li key={program}><GraduationCap size={16} aria-hidden="true" /> {program}</li>)}</ul>
            </div>
          </div>
        </Reveal>

        <div className="college-grid">
          {ONBOARDING.map((college, i) => (
            <Reveal key={college.code} delay={i * 90} className="college-card">
              <img src={college.photo} alt="" className="college-card-photo" loading="lazy" decoding="async" />
              <img src={college.emblem} alt={`${college.name} seal`} className="college-card-emblem" width="84" height="84" loading="lazy" />
              <h3>{college.name}</h3>
              <p className="college-card-meta">{[college.code, college.since && `since ${college.since}`, college.motto].filter(Boolean).join(' · ')}</p>
              <span className="college-status">Ready to onboard</span>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="campus" className="landing-section landing-campus">
        <SectionHeader eyebrow="Our community" title="Made for the people of the CIT">
          The instructors and BSIT students EduPulse is built around.
        </SectionHeader>
        <Reveal><PhotoMarquee photos={PHOTOS} credit="Photos: King's College of the Philippines (kcp.edu.ph)" /></Reveal>
      </section>

      <section id="stats" className="landing-section landing-stats-section">
        <SectionHeader eyebrow="Why it matters" title="Built around what King's College needs">
          Prototype targets — the goals EduPulse is designed to deliver once fully rolled out.
        </SectionHeader>
        <div className="landing-stats-grid">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 100} className={`landing-stat-card tone-${stat.tone}`}>
              <span className="landing-icon"><stat.icon size={24} aria-hidden="true" /></span>
              <div className="landing-stat-value"><CountUp end={stat.end} suffix={stat.suffix} /></div>
              <p className="landing-stat-label">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="faq" className="landing-section landing-faq">
        <SectionHeader eyebrow="FAQ" title="Questions people ask" />
        <Reveal><FaqList items={FAQ} /></Reveal>
      </section>

      <section id="login" className="landing-section landing-login-section">
        <div className="landing-login-layout">
          <Reveal variant="left" className="landing-login-visual">
            <img src={(PHOTOS[6] || PHOTOS[0]).src} alt="" loading="lazy" decoding="async" />
            <div className="landing-login-visual-body">
              <img src={CIT.emblem} alt="" width="72" height="72" />
              <h3>Welcome to EduPulse</h3>
              <p>Sign in with the account your system administrator created. Your role decides what you see.</p>
              <ul>{['Dean', 'Associate Dean', 'Instructor', 'Student', 'System Admin'].map(role => <li key={role}>{role}</li>)}</ul>
            </div>
          </Reveal>
          <div className="landing-login-form">
            <SectionHeader eyebrow="Get started" title="Sign in to EduPulse" align="left">
              Use your EduPulse account to continue.
            </SectionHeader>
            <Reveal delay={100} className="landing-login-wrap">
              <LoginPanel />
            </Reveal>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <div className="landing-footer-logos">
              <img src={KCP.crest} alt="" width="48" height="48" />
              <span className="landing-nav-mark"><EduPulseMark size={20} style={{ color: 'white' }} /></span>
              <strong>EduPulse</strong>
            </div>
            <p>AI-driven syllabus, courseware and performance monitoring for the College of Information Technology.</p>
            <blockquote>
              <Quote size={18} aria-hidden="true" />
              <p>{KCP.vision}</p>
              <cite>KCP vision</cite>
            </blockquote>
          </div>
          <nav className="landing-footer-col" aria-label="Footer: page sections">
            <h3>Explore</h3>
            {NAV_LINKS.map(link => <a key={link.id} href={`#${link.id}`} onClick={e => scrollToId(e, link.id)}>{link.label}</a>)}
          </nav>
          <nav className="landing-footer-col" aria-label="Footer: legal">
            <h3>Legal</h3>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </nav>
          <div className="landing-footer-col">
            <h3>{KCP.name}</h3>
            <p><MapPin size={15} aria-hidden="true" /> {KCP.address}</p>
            <a href={KCP.website} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} aria-hidden="true" /> kcp.edu.ph</a>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <p>Prototype v4.0 — College of Information Technology</p>
          <p>Photos and emblems © King's College of the Philippines</p>
        </div>
      </footer>
    </div>
  )
}
