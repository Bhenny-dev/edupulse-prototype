import PulseAvatar from '../pulse/PulseAvatar'
import { CHATS } from './pulseChats'

// A sample exchange with Pulse (see pulseChats.js), told in keywords and icons.

export default function PulseChat({ chat = CHATS.student, caption = 'Illustration · sample exchange' }) {
  const { view, viewIcon: ViewIcon, ask, checks, reply, actions, outcome } = chat
  const Outcome = outcome.icon
  return (
    <figure className="pulse-demo">
      <div className="pulse-scope">
        <div className="pulse-demo-head">
          <PulseAvatar size={52} expression="encouraging" />
          <span><strong>Pulse</strong><small><ViewIcon size={13} aria-hidden="true" /> {view}</small></span>
        </div>
        <p className="pulse-msg pulse-bubble is-user">{ask}</p>
        <ul className="pulse-msg pulse-checks" aria-label="What Pulse checked">
          {checks.map(({ icon: Icon, tone, name, state }) => (
            <li key={name} className={`is-${tone}`}>
              <span className="pulse-source-link" aria-hidden="true" />
              <i aria-hidden="true"><Icon size={15} strokeWidth={2.4} /></i>
              <b>{name}</b><em>{state}</em>
            </li>
          ))}
        </ul>
        <div className="pulse-msg pulse-bubble is-pulse">
          <p>{reply}</p>
          <ul className="pulse-actions" aria-label="Suggested next steps">
            {actions.map(({ icon: Icon, label }) => <li key={label}><Icon size={14} aria-hidden="true" /> {label}</li>)}
          </ul>
        </div>
        <p className={`pulse-msg pulse-tag is-${outcome.tone}`}><Outcome size={15} aria-hidden="true" /> {outcome.label}</p>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  )
}
