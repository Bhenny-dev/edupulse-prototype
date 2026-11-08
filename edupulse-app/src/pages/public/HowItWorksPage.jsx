import { Activity, Atom, Bot, BookOpen, FolderInput, GraduationCap, Layers, Scale, UserCheck, Users, Workflow } from 'lucide-react'
import RoomPage, { DetailCard, Extra } from '../../components/public/RoomPage'
import { PHASES } from '../../components/landing/content'

const LOOK = {
  records: { icon: FolderInput, tint: '#2563eb', short: 'Records' },
  loading: { icon: UserCheck, tint: '#f59e0b', short: 'Loading' },
  syllabus: { icon: BookOpen, tint: '#10b981', short: 'Syllabus' },
  courseware: { icon: Layers, tint: '#ec4899', short: 'Courseware' },
  access: { icon: GraduationCap, tint: '#8b5cf6', short: 'Students' },
  monitoring: { icon: Activity, tint: '#06b6d4', short: 'Monitor' },
}
const ITEMS = [
  ...PHASES.map(phase => ({ key: phase.icon, ...LOOK[phase.icon], short: `${phase.phase} · ${LOOK[phase.icon].short}` })),
  { key: 'chain', short: 'Newton’s cradle', icon: Workflow, tint: '#2563eb' },
  { key: 'forces', short: 'The forces', icon: Scale, tint: '#f59e0b' },
]

function detail(key) {
  if (key === 'chain') return <Extra icon={Workflow} tint="#2563eb" title="A chain reaction: records to results"><Chain /></Extra>
  if (key === 'forces') return <Extra icon={Scale} tint="#f59e0b" title="The forces: AI drafts. People decide."><Balance /></Extra>
  const phase = PHASES.find(entry => entry.icon === key)
  const look = LOOK[key]
  return (
    <DetailCard icon={look.icon} tint={look.tint} kicker={`Phase ${phase.phase} · ${phase.who.join(' · ')}`} name={phase.title}>
      <div className="ps-lanes">
        <p className="ps-lane is-ai"><i aria-hidden="true"><Bot size={16} /></i><span><b>AI</b>{phase.ai}</span></p>
        <p className="ps-lane is-people"><i aria-hidden="true"><Users size={16} /></i><span><b>People</b>{phase.human}</span></p>
      </div>
    </DetailCard>
  )
}

// The six phases as a chain reaction: a pulse runs along the line from records to monitoring.
function Chain() {
  return (
    <ol className="ps-chain">
      {PHASES.map(phase => {
        const look = LOOK[phase.icon]
        return (
          <li key={phase.icon} style={{ '--tint': look.tint }}>
            <i aria-hidden="true"><look.icon size={22} strokeWidth={2.2} /></i>
            <b>{phase.title}</b>
            <span>{phase.who.join(' · ')}</span>
          </li>
        )
      })}
    </ol>
  )
}

// A balance: the AI drafts on one pan, people decide on the other, and the beam leans to people.
function Balance() {
  return (
    <div className="ps-balance">
      <svg viewBox="0 0 420 210" role="img" aria-label="A balance leaning toward people: AI drafts, people decide">
        <polygon points="210,196 182,206 238,206" className="ps-balance-foot" />
        <rect x="205" y="70" width="10" height="128" rx="4" className="ps-balance-post" />
        <g className="ps-balance-beam">
          <rect x="40" y="62" width="340" height="9" rx="4" />
          <path d="M70 70 L52 128 M70 70 L88 128" /><path d="M350 70 L332 128 M350 70 L368 128" />
          <ellipse cx="70" cy="130" rx="44" ry="10" className="is-ai" /><ellipse cx="350" cy="130" rx="44" ry="10" className="is-people" />
        </g>
      </svg>
      <ul className="ps-balance-keys">
        <li className="is-ai"><Bot size={18} aria-hidden="true" /><b>AI</b><span>drafts · reads · ranks · reminds</span></li>
        <li className="is-people"><Users size={18} aria-hidden="true" /><b>People</b><span>confirm · check · publish · decide</span></li>
      </ul>
    </div>
  )
}

export default function HowItWorksPage() {
  return (
    <RoomPage theme="physics" room="Physics room" icon={Atom} tint="#6366f1" title="Six stations, one run." lead="Follow the marble, then tap a station, the cradle or the board." items={ITEMS} detail={detail} />
  )
}
