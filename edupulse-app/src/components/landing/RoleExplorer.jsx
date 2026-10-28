import { useLayoutEffect, useRef, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

// Tabs follow the WAI-ARIA pattern: arrow keys, Home and End move between roles.
// The panel is keyed by role so each switch replays its entrance animation.
export default function RoleExplorer({ roles }) {
  const [current, setCurrent] = useState(roles[0].key)
  const tabs = useRef([])
  const list = useRef(null)
  const index = roles.findIndex(role => role.key === current)
  const role = roles[index]

  useLayoutEffect(() => {
    const tab = tabs.current[index]
    if (!tab || !list.current) return
    list.current.style.setProperty('--tab-x', `${tab.offsetLeft}px`)
    list.current.style.setProperty('--tab-w', `${tab.offsetWidth}px`)
  }, [index])

  const select = next => { setCurrent(roles[next].key); tabs.current[next]?.focus() }
  const onKeyDown = event => {
    const moves = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: roles.length - 1 }
    if (!(event.key in moves)) return
    event.preventDefault()
    select((moves[event.key] + roles.length) % roles.length)
  }

  return (
    <div className="role-explorer">
      <div className="role-tabs" role="tablist" aria-label="EduPulse roles" ref={list}>
        <span className="role-tab-indicator" aria-hidden="true" />
        {roles.map((item, i) => (
          <button key={item.key} type="button" role="tab" id={`role-tab-${item.key}`} className={`role-tab ${item.key === current ? 'is-active' : ''}`}
            aria-selected={item.key === current} aria-controls="role-panel" tabIndex={item.key === current ? 0 : -1}
            ref={element => { tabs.current[i] = element }} onClick={() => setCurrent(item.key)} onKeyDown={onKeyDown}>
            <item.icon size={17} aria-hidden="true" /> {item.label}
          </button>
        ))}
      </div>

      <div key={role.key} id="role-panel" role="tabpanel" aria-labelledby={`role-tab-${role.key}`} className="role-panel" style={{ '--role-accent': role.accent }}>
        <div className="role-panel-copy">
          <span className="role-panel-kicker">{role.kicker}</span>
          <h3>{role.title}</h3>
          <p>{role.summary}</p>
          <ul className="role-panel-list">
            {role.tasks.map(task => <li key={task}><CheckCircle2 size={18} aria-hidden="true" /> <span>{task}</span></li>)}
          </ul>
          {role.boundary && <p className="role-panel-boundary">{role.boundary}</p>}
        </div>

        <div className="role-window" role="group" aria-label={`${role.label}: top bar sections and main views`}>
          <div className="role-window-bar" aria-hidden="true"><span /><span /><span /></div>
          <div className="role-window-nav">
            {role.sections.map((section, i) => (
              <span key={section.label} className={`role-window-pill ${i === 0 ? 'is-current' : ''}`} style={{ '--i': i }}>
                <section.icon size={14} aria-hidden="true" /> {section.label}
              </span>
            ))}
          </div>
          <div className="role-window-body">
            {role.views.map((view, i) => (
              <div key={view.title} className="role-window-card" style={{ '--i': i }}>
                <span className="role-window-icon"><view.icon size={18} aria-hidden="true" /></span>
                <span><strong>{view.title}</strong><small>{view.detail}</small></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
