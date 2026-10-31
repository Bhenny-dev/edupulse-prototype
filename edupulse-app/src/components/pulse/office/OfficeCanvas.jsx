import { useEffect, useRef, useState } from 'react'
import { BUDDIES } from '../../../agents/buddies'

// The office is the studio of the landing page's agent workspace (components/studio), with the
// six buddies as its crew: each one's station, its coffee-break spot and what it holds at work.
const CREW = {
  pip: { station: 'podium', rest: 'pouf' },
  luma: { station: 'armchair', rest: 'sofaLeft', prop: 'book' },
  quill: { station: 'writingDesk', rest: 'sofaMiddle' },
  ro: { station: 'chartDesk', rest: 'nookLeft' },
  sage: { station: 'benchLeft', rest: 'sofaRight' },
  milo: { station: 'twinScreens', rest: 'nookRight' },
}
// What each buddy is doing, from the real task events only: at work, holding a result for your
// review, or on a coffee break.
const crewState = (tasks, selected) => Object.fromEntries(BUDDIES.map(({ id }) => {
  const own = tasks.filter(task => task.buddy === id)
  const activity = own.some(task => task.status === 'working') ? 'work' : own.some(task => task.status === 'review') ? 'review' : 'break'
  return [id, { activity, selected: id === selected }]
}))

/** Lazy WebGL scene. Accessibility and all controls remain in the ordinary DOM beside it. */
export default function OfficeCanvas({ tasks, selected, onSelect, paused, reducedMotion, handoff }) {
  const stage = useRef(null), canvas = useRef(null), labels = useRef({}), scene = useRef(null)
  const live = useRef({}), known = useRef(null), handed = useRef({ to: null, at: 0 })
  const still = paused || reducedMotion
  live.current = { tasks, selected, onSelect, still }
  const [ready, setReady] = useState(false), [hovered, setHovered] = useState(null), [fallback, setFallback] = useState('')

  useEffect(() => {
    let cancelled = false, api = null
    const lose = message => () => { if (cancelled) return; api?.dispose(); scene.current = null; setReady(false); setFallback(message) }
    import('../../studio/workspaceScene.js').then(({ createWorkspaceScene }) => {
      if (cancelled) return
      api = createWorkspaceScene({
        canvas: canvas.current, stage: stage.current, labels: labels.current, crew: true, assemble: false, maxFps: 30,
        cast: BUDDIES.map(buddy => ({ key: buddy.id, color: buddy.color, ...CREW[buddy.id] })),
        still: live.current.still, onPick: key => live.current.onSelect(key), onHover: key => setHovered(key),
        onReady: () => { if (!cancelled) setReady(true) },
        onLost: lose('3D paused by the graphics device. The buddy controls below still work.'),
      })
      if (!api) { lose('3D is unavailable on this device. Meet the same buddies using the accessible desk controls below.')(); return }
      api.setCrew(crewState(live.current.tasks, live.current.selected))
      api.reveal()
      scene.current = api
    }).catch(lose('The office graphics could not load. Buddy conversations and tools are still available below.'))
    return () => { cancelled = true; api?.dispose(); scene.current = null }
  }, [])
  useEffect(() => { scene.current?.setCrew(crewState(tasks, selected)) }, [tasks, selected, ready])
  useEffect(() => { scene.current?.setStill(still) }, [still, ready])
  // A new task reaches its buddy as a paper plane through the doorway, unless it was just handed
  // over desk to desk. Tasks that existed when the office opened only show their state.
  useEffect(() => {
    if (!known.current) { known.current = new Set(tasks.map(task => task.id)); return }
    for (const task of tasks) {
      if (known.current.has(task.id)) continue
      known.current.add(task.id)
      const handedOver = handed.current.to === task.buddy && performance.now() - handed.current.at < 4000
      if (task.status === 'working' && !handedOver) scene.current?.arrive(task.buddy)
    }
  }, [tasks])
  useEffect(() => {
    if (!handoff?.toId) return
    handed.current = { to: handoff.toId, at: performance.now() }
    scene.current?.travel(handoff.fromId, handoff.toId)
  }, [handoff])

  return <div ref={stage} className={`buddy-office-viewport${ready ? ' is-scene' : ''}${hovered ? ' is-pointing' : ''}`} aria-label="Animated three-dimensional workspace" role="img">
    <canvas ref={canvas} className="office-canvas" aria-hidden="true" />
    <div className="office-labels" aria-hidden="true">{BUDDIES.map(buddy => <span key={buddy.id} ref={element => { labels.current[buddy.id] = element }} className={`office-label${buddy.id === selected || buddy.id === hovered ? ' is-on' : ''}`} style={{ '--buddy-color': buddy.color }}><i />{buddy.name}</span>)}</div>
    <div className="office-scene-caption"><span>EDUPULSE / STUDIO 01</span><strong>A little office. Real teamwork.</strong><small>Tap a buddy, or choose a desk below.</small></div>
    {fallback && <div className="office-fallback" role="status">{fallback}</div>}
  </div>
}
