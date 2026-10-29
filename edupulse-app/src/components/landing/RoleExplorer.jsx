import { useLayoutEffect, useRef, useState } from 'react'
import { gsap, MOTION, EASE, DURATION, TRAVEL, stagger } from './motion'

// Tabs follow the WAI-ARIA pattern: arrow keys, Home and End move between roles.
// With motion allowed, the selected role's details rise in line by line.
export default function RoleExplorer({ roles }) {
  const [current, setCurrent] = useState(roles[0].key)
  const tabs = useRef([])
  const panel = useRef(null)
  const index = roles.findIndex(role => role.key === current)
  const role = roles[index]

  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add(MOTION, () => {
      const lines = panel.current.querySelectorAll('[data-role-in]')
      gsap.from(lines, { y: TRAVEL, autoAlpha: 0, duration: DURATION.slow * 0.9, ease: EASE, stagger: stagger(lines.length) })
    })
    return () => mm.revert()
  }, [current])

  const select = next => { setCurrent(roles[next].key); tabs.current[next]?.focus() }
  const onKeyDown = event => {
    const moves = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: roles.length - 1 }
    if (!(event.key in moves)) return
    event.preventDefault()
    select((moves[event.key] + roles.length) % roles.length)
  }

  return (
    <div className="roles">
      <div className="role-tabs" role="tablist" aria-label="EduPulse roles" aria-orientation="vertical">
        {roles.map((item, i) => (
          <button key={item.key} type="button" role="tab" id={`role-tab-${item.key}`} className={`role-tab ${item.key === current ? 'is-active' : ''}`}
            aria-selected={item.key === current} aria-controls="role-panel" tabIndex={item.key === current ? 0 : -1}
            ref={element => { tabs.current[i] = element }} onClick={() => setCurrent(item.key)} onKeyDown={onKeyDown}>
            <span className="role-tab-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <span className="role-tab-name">{item.label}</span>
          </button>
        ))}
      </div>

      <div ref={panel} key={role.key} id="role-panel" role="tabpanel" aria-labelledby={`role-tab-${role.key}`} className="role-panel">
        <p className="lp-eyebrow" data-role-in>{role.kicker}</p>
        <h3 data-role-in>{role.title}</h3>
        <p className="role-summary" data-role-in>{role.summary}</p>
        <ul className="role-tasks">
          {role.tasks.map(task => <li key={task} data-role-in>{task}</li>)}
        </ul>
        {role.boundary && <p className="role-boundary" data-role-in>{role.boundary}</p>}
        <div className="role-sections" data-role-in>
          <span>Top bar</span>
          {role.sections.map(section => <em key={section}>{section}</em>)}
        </div>
        {role.benefit && <p className="role-benefit" data-role-in>{role.benefit}</p>}
      </div>
    </div>
  )
}
