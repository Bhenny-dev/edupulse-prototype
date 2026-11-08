import { useState } from 'react'
import { ArrowRight, BadgeCheck, Columns2, Cpu, Library, ListOrdered, MessagesSquare, PenLine, Route, Search, ShieldCheck, Workflow, Wrench } from 'lucide-react'
import RoomPage, { DetailCard } from '../../components/public/RoomPage'
import PulseChat from '../../components/landing/PulseChat'
import { CHATS } from '../../components/landing/pulseChats'
import { AGENTS } from '../../components/landing/content'
import { AGENT_COLORS } from '../../components/landing/agentLook'

const LOOK = {
  guardian: { icon: ShieldCheck }, planner: { icon: Route }, researcher: { icon: Search }, librarian: { icon: Library }, ranker: { icon: ListOrdered },
  comparator: { icon: Columns2 }, writer: { icon: PenLine }, verifier: { icon: BadgeCheck }, corrector: { icon: Wrench },
}
const ITEMS = AGENTS.map(agent => ({ key: agent.key, short: agent.name, icon: LOOK[agent.key].icon, tint: AGENT_COLORS[agent.key] }))

function detail(key) {
  const index = AGENTS.findIndex(agent => agent.key === key)
  const agent = AGENTS[index]
  return <DetailCard icon={LOOK[key].icon} tint={AGENT_COLORS[key]} kicker={`Agent ${index + 1} of 9`} name={agent.name} words={agent.words} />
}

// A request passes the agents it needs, Guardian always first.
function Relay() {
  return (
    <ol className="ps-relay">
      {AGENTS.map((agent, i) => {
        const Icon = LOOK[agent.key].icon
        return (
          <li key={agent.key} style={{ '--tint': AGENT_COLORS[agent.key] }}>
            <i aria-hidden="true"><Icon size={20} strokeWidth={2.2} /></i>
            <b>{agent.name}</b>
            {i < AGENTS.length - 1 && <ArrowRight className="ps-relay-arrow" size={16} aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}

// Two sample exchanges, the student's and the instructor's.
function Ask() {
  const [view, setView] = useState('student')
  return (
    <div className="ps-ask">
      <div className="ps-switch" role="group" aria-label="Whose view">
        {Object.entries(CHATS).map(([key, chat]) => (
          <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)}><chat.viewIcon size={15} aria-hidden="true" /> {chat.view}</button>
        ))}
      </div>
      <PulseChat key={view} chat={CHATS[view]} />
    </div>
  )
}

export default function PulsePage() {
  return (
    <RoomPage theme="lab" room="Computer lab" icon={Cpu} tint="#2563eb" title="Nine agents, one answer." lead="Tap an agent." items={ITEMS} detail={detail}
      sections={[
        { id: 'relay', label: 'The relay', title: 'Guardian first, then only what’s needed', icon: Workflow, tint: '#2563eb', node: <Relay /> },
        { id: 'ask', label: 'Ask Pulse', title: 'Two sample exchanges', icon: MessagesSquare, tint: '#10b981', node: <Ask /> },
      ]} />
  )
}
