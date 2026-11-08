import { Gamepad2, HelpCircle, Puzzle, ShieldCheck } from 'lucide-react'
import RoomPage, { DetailCard } from '../../components/public/RoomPage'
import { jumpTo } from '../../components/public/jump'
import { AgentMatch, GuardianGate, QuickQuiz } from '../../components/public/games'

const ITEMS = [
  { key: 'gate', short: 'Guardian Gate', icon: ShieldCheck, tint: '#2563eb', words: ['Be the Guardian', 'Allow or decline', '8 requests'] },
  { key: 'match', short: 'Agent Match', icon: Puzzle, tint: '#10b981', words: ['Match the job', '9 agents', '3 choices'] },
  { key: 'quiz', short: 'Quick Quiz', icon: HelpCircle, tint: '#f59e0b', words: ['True or false', '6 questions'] },
]

function detail(key) {
  const item = ITEMS.find(entry => entry.key === key)
  return (
    <DetailCard icon={item.icon} tint={item.tint} kicker="Game" name={item.short} words={item.words}>
      <a href={`#${key}`} className="lp-button is-small ps-detail-go" onClick={event => jumpTo(event, key)}><Gamepad2 size={16} aria-hidden="true" /> Play</a>
    </DetailCard>
  )
}

export default function PlayPage() {
  return (
    <RoomPage theme="arcade" room="Game room" icon={Gamepad2} tint="#db2777" title="Three games. Learn by playing." lead="Pick a cabinet." items={ITEMS} detail={detail}
      sections={[
        { id: 'gate', label: 'Guardian Gate', title: 'Allow or decline?', icon: ShieldCheck, tint: '#2563eb', node: <GuardianGate /> },
        { id: 'match', label: 'Agent Match', title: 'Who does this job?', icon: Puzzle, tint: '#10b981', node: <AgentMatch /> },
        { id: 'quiz', label: 'Quick Quiz', title: 'True or false?', icon: HelpCircle, tint: '#f59e0b', node: <QuickQuiz /> },
      ]} />
  )
}
