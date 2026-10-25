import { useEffect, useRef, useState } from 'react'
import { BUDDIES } from '../../../agents/buddies'
/** Lazy WebGL scene. Accessibility and all controls remain in the ordinary DOM beside it. */
export default function OfficeCanvas({ tasks, selected, onSelect, paused, reducedMotion }) {
  const host = useRef(null), live = useRef({ tasks, selected, onSelect, paused, reducedMotion })
  live.current = { tasks, selected, onSelect, paused, reducedMotion }
  const [fallback, setFallback] = useState('')
  useEffect(() => {
    let disposed = false, stop
    import('./officeScene').then(({ createOffice }) => {
      if (disposed) return
      try { stop = createOffice(host.current, () => live.current, () => setFallback('3D paused by the graphics device. The buddy controls below still work.')) }
      catch { setFallback('3D is unavailable on this device. Meet the same buddies using the accessible desk controls below.') }
    }).catch(() => setFallback('The office graphics could not load. Buddy conversations and tools are still available below.'))
    return () => { disposed = true; stop?.() }
  }, [])
  return <div className="buddy-office-viewport" ref={host} aria-label="Animated three-dimensional workspace" role="img">
    <div className="office-scene-caption"><span>EDUPULSE / STUDIO 01</span><strong>A little office. Real teamwork.</strong><small>Tap a buddy, or choose a desk below.</small></div>
    <div className="office-floor-label">THE COMMON ROOM <span>☕</span></div>
    {fallback && <div className="office-fallback" role="status">{fallback}</div>}
    <div className="office-legend">{BUDDIES.map(buddy => <span key={buddy.id}><i style={{ background: buddy.color }} />{buddy.name}</span>)}</div>
  </div>
}
