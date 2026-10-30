import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap, prefersReducedMotion } from './motion'

// Roles: a WAI-ARIA tablist (arrow keys, Home and End). A marker slides to the selected tab
// (CSS, about 240 ms). The five panels share one grid cell, so switching never changes the
// section's height, and a change masks the old panel out and the new one in, in the direction
// of travel. Focus stays on the tab that was chosen.
export default function RoleExplorer({ roles }) {
  const [current, setCurrent] = useState(0)
  const [orientation, setOrientation] = useState('vertical')
  const tabs = useRef([]), panels = useRef([]), list = useRef(null), previous = useRef(0)

  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 899px)')
    const apply = () => setOrientation(narrow.matches ? 'horizontal' : 'vertical')
    apply()
    narrow.addEventListener?.('change', apply)
    return () => narrow.removeEventListener?.('change', apply)
  }, [])

  useLayoutEffect(() => {
    const element = list.current
    if (!element) return undefined
    const place = () => {
      const tab = tabs.current[current]
      if (!tab) return
      element.style.setProperty('--marker-x', `${tab.offsetLeft}px`)
      element.style.setProperty('--marker-y', `${tab.offsetTop}px`)
      element.style.setProperty('--marker-w', `${tab.offsetWidth}px`)
      element.style.setProperty('--marker-h', `${tab.offsetHeight}px`)
    }
    place()
    const sizes = new ResizeObserver(place)
    sizes.observe(element)
    return () => sizes.disconnect()
  }, [current, orientation])

  useLayoutEffect(() => {
    const from = previous.current
    previous.current = current
    if (from === current || prefersReducedMotion()) return
    const forward = current > from
    const outgoing = panels.current[from], incoming = panels.current[current]
    // A quick second change interrupts the first one cleanly.
    panels.current.forEach(panel => { gsap.killTweensOf(panel); gsap.set(panel, { clearProps: 'clipPath,transform' }); delete panel.dataset.leaving; panel.removeAttribute('aria-hidden') })
    outgoing.dataset.leaving = ''
    outgoing.setAttribute('aria-hidden', 'true')
    gsap.fromTo(outgoing, { clipPath: 'inset(0% 0% 0% 0%)' }, {
      clipPath: forward ? 'inset(0% 0% 100% 0%)' : 'inset(100% 0% 0% 0%)', duration: 0.22, ease: 'power2.in', clearProps: 'clipPath',
      onComplete: () => { delete outgoing.dataset.leaving; outgoing.removeAttribute('aria-hidden') },
    })
    gsap.fromTo(incoming, { clipPath: forward ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)', y: forward ? 14 : -14 }, {
      clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 0.42, ease: 'power3.out', delay: 0.08, clearProps: 'clipPath,transform',
    })
  }, [current])

  const select = next => { setCurrent(next); tabs.current[next]?.focus() }
  const onKeyDown = event => {
    const moves = { ArrowRight: current + 1, ArrowDown: current + 1, ArrowLeft: current - 1, ArrowUp: current - 1, Home: 0, End: roles.length - 1 }
    if (!(event.key in moves)) return
    event.preventDefault()
    select((moves[event.key] + roles.length) % roles.length)
  }

  return (
    <div className="roles">
      <div className="role-tabs" ref={list} role="tablist" aria-label="EduPulse roles" aria-orientation={orientation}>
        <span className="role-marker" aria-hidden="true" />
        {roles.map((role, i) => (
          <button key={role.key} type="button" role="tab" id={`role-tab-${role.key}`} className={`role-tab ${i === current ? 'is-active' : ''}`}
            aria-selected={i === current} aria-controls={`role-panel-${role.key}`} tabIndex={i === current ? 0 : -1}
            ref={element => { tabs.current[i] = element }} onClick={() => setCurrent(i)} onKeyDown={onKeyDown}>
            {role.label}
          </button>
        ))}
      </div>
      <div className="role-panels">
        {roles.map((role, i) => (
          <div key={role.key} ref={element => { panels.current[i] = element }} id={`role-panel-${role.key}`} role="tabpanel"
            aria-labelledby={`role-tab-${role.key}`} className={`role-panel ${i === current ? 'is-active' : ''}`} tabIndex={i === current ? 0 : -1}>
            <p className="role-kicker">{role.kicker}</p>
            <h3>{role.title}</h3>
            <p className="role-summary">{role.summary}</p>
            <ul className="role-tasks">{role.tasks.map(task => <li key={task}>{task}</li>)}</ul>
            {role.boundary && <p className="role-boundary">{role.boundary}</p>}
            <div className="role-sections"><span>Top bar</span>{role.sections.map(section => <em key={section}>{section}</em>)}</div>
            {role.benefit && <p className="role-benefit">{role.benefit}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
