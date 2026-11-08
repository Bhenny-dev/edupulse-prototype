import { ArrowRight, BarChart3, Bot, BookOpen, Compass, FlaskConical, FolderOpen, Hand, Lock, Microscope, Quote, ShieldCheck, Sigma } from 'lucide-react'
import RoomPage, { DetailCard, Extra } from '../../components/public/RoomPage'
import { CHAPTERS, PRINCIPLES } from '../../components/landing/content'

const ITEMS = [
  { key: 'records', short: 'Records', icon: FolderOpen, tint: '#f59e0b', words: ['EduSuite exports', 'Course loading', 'Confirm first'] },
  { key: 'syllabus', short: 'Syllabus', icon: BookOpen, tint: '#2563eb', words: ['7-section KCP format', 'Co-write with Pulse', 'You check'] },
  { key: 'courseware', short: 'Courseware', icon: FlaskConical, tint: '#06b6d4', words: ['Week by week', 'From your sources', 'Publish when ready'] },
  { key: 'performance', short: 'Scores', icon: BarChart3, tint: '#10b981', words: ['Mastery by topic', 'Missed work', 'Scores, not grades'] },
  { key: 'pulse', short: 'Pulse', icon: Bot, tint: '#3b82f6', words: ['Grounded', 'Cites sources', 'Drafts only'] },
  { key: 'formula', short: 'The formula', icon: Sigma, tint: '#2563eb' },
  { key: 'rules', short: 'Lab rules', icon: ShieldCheck, tint: '#f59e0b' },
  { key: 'screens', short: 'Microscope', icon: Microscope, tint: '#10b981' },
]
const RULE_ICONS = [ShieldCheck, Quote, Lock, Compass, Hand, BarChart3]

function detail(key) {
  if (key === 'formula') return <Extra icon={Sigma} tint="#2563eb" title="Syllabus in, classes out"><Formula /></Extra>
  if (key === 'rules') return <Extra icon={ShieldCheck} tint="#f59e0b" title="Six rules Pulse keeps"><Rules /></Extra>
  if (key === 'screens') return <Extra icon={Microscope} tint="#10b981" title="Under the microscope: the real screens"><Screens /></Extra>
  const item = ITEMS.find(entry => entry.key === key)
  const chapter = CHAPTERS.find(entry => entry.key === key)
  return (
    <DetailCard icon={item.icon} tint={item.tint} kicker={chapter ? chapter.who : 'AI assistant'} name={chapter ? chapter.title : 'Pulse'} words={item.words}>
      {chapter && <img className="ps-detail-shot" src={chapter.image} alt={chapter.alt} width="320" height="172" loading="lazy" />}
    </DetailCard>
  )
}

// The four steps as a lab formula: records and the syllabus react into courseware, then scores.
function Formula() {
  const terms = [ITEMS[0], '+', ITEMS[1], '→', ITEMS[2], '→', ITEMS[3]]
  return (
    <div className="ps-formula" role="img" aria-label="Records plus the syllabus become courseware, then scores">
      {terms.map((term, i) => typeof term === 'string'
        ? <span key={i} className="ps-formula-op" aria-hidden="true">{term}</span>
        : <span key={term.key} className="ps-formula-term" style={{ '--tint': term.tint }}><i><term.icon size={26} strokeWidth={2.1} /></i><b>{term.short}</b></span>)}
    </div>
  )
}

function Rules() {
  return (
    <ul className="ps-signs">
      {PRINCIPLES.map(({ title }, i) => {
        const Icon = RULE_ICONS[i]
        return <li key={title} className="ps-sign"><i aria-hidden="true"><Icon size={22} strokeWidth={2.2} /></i><span>{title}</span></li>
      })}
    </ul>
  )
}

function Screens() {
  return (
    <div className="ps-shots">
      {CHAPTERS.map(chapter => (
        <figure key={chapter.key} className="ps-shot">
          <img src={chapter.image} alt={chapter.alt} width="480" height="258" loading="lazy" />
          <figcaption><ArrowRight size={14} aria-hidden="true" /> {chapter.screen}</figcaption>
        </figure>
      ))}
    </div>
  )
}

export default function FeaturesPage() {
  return (
    <RoomPage theme="science" room="Science lab" icon={FlaskConical} tint="#0d9488" title="Five stations, one syllabus." lead="Tap a station, the formula, the rules or the microscope." items={ITEMS} detail={detail} />
  )
}
