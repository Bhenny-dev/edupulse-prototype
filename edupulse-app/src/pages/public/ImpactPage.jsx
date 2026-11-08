import { ArrowRight, Check, Clock3, Globe2, Hourglass, Landmark, Scale, ScrollText, Target, X } from 'lucide-react'
import RoomPage, { Chips, DetailCard, Extra } from '../../components/public/RoomPage'
import { EVIDENCE, GOALS, PROBLEM } from '../../components/landing/content'

const LOOK = { clock: { icon: Hourglass, tint: '#f59e0b' }, less: { icon: Scale, tint: '#2563eb' }, recovered: { icon: Clock3, tint: '#ec4899' } }
const ITEMS = [
  { key: 'goals', short: 'SDGs', icon: Globe2, tint: '#10b981' },
  ...EVIDENCE.map(finding => ({ key: finding.icon, short: `${finding.value}${finding.suffix.trim() === '%' ? '%' : ' h'}`, ...LOOK[finding.icon] })),
  { key: 'then-now', short: 'The timeline', icon: ScrollText, tint: '#b45309' },
]
const number = finding => `${finding.value.toFixed(finding.decimals)}${finding.suffix}`

function detail(key) {
  if (key === 'goals') return (
    <>
      <DetailCard icon={Globe2} tint="#10b981" kicker="UN Sustainable Development Goals" name="The goals it serves" words={GOALS.map(goal => goal.code)} />
      <Extra icon={Target} tint="#10b981" title="Four goals, one college" level={3}><Goals /></Extra>
    </>
  )
  if (key === 'then-now') return <Extra icon={ScrollText} tint="#b45309" title="Then and now: five changes"><ThenNow /></Extra>
  const finding = EVIDENCE.find(entry => entry.icon === key)
  return (
    <DetailCard icon={LOOK[key].icon} tint={LOOK[key].tint} kicker="A cited finding" name={number(finding)}>
      <p className="ps-detail-line">{finding.label}</p>
      <p className="ps-cite">{finding.source}</p>
    </DetailCard>
  )
}

// Then and now, row by row: what the study found, what EduPulse does instead.
function ThenNow() {
  return (
    <ul className="ps-then">
      {PROBLEM.map(row => (
        <li key={row.key}>
          <b>{row.area}</b>
          <span className="is-then"><X size={15} aria-hidden="true" /> {row.today}</span>
          <ArrowRight className="ps-then-arrow" size={18} aria-hidden="true" />
          <span className="is-now"><Check size={15} aria-hidden="true" /> {row.next}</span>
        </li>
      ))}
    </ul>
  )
}

function Goals() {
  return (
    <ul className="ps-goals">
      {GOALS.map(goal => (
        <li key={goal.code} style={{ '--tint': goal.code.startsWith('SDG 4') ? '#c5192d' : '#fd6925' }}>
          <b>{goal.code}</b>
          <Chips words={[goal.text]} />
        </li>
      ))}
    </ul>
  )
}

export default function ImpactPage() {
  return (
    <RoomPage theme="history" room="History room" icon={Landmark} tint="#b45309" title="Then, now, and why." lead="Tap an exhibit, the globe or the timeline. Findings from cited studies, not EduPulse results." items={ITEMS} detail={detail} />
  )
}
