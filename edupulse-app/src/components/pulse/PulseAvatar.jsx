import { useEffect, useId, useRef } from 'react'

// Cursor response is continuous. Workflow expression adds brows/mouth/arms;
// it never replaces tracking with a collection of static character images.
// lookAt: an element Pulse is carried over or helping with; its eyes follow it instead of the cursor.
export default function PulseAvatar({ expression = 'idle', size = 56, className = '', dragging = false, lookAt = null }) {
  const ref = useRef(null), id = useId().replace(/:/g, ''), lookAtRef = useRef(lookAt), aimRef = useRef(null)
  useEffect(() => {
    const element = ref.current, reduce = matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0, lastX = innerWidth / 2, lastY = innerHeight / 2
    const reset = () => { element?.style.setProperty('--look-x', '0px'); element?.style.setProperty('--look-y', '0px'); element?.style.setProperty('--body-lean', '0deg') }
    const aim = () => {
      if (reduce.matches || !element) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const focus = lookAtRef.current?.isConnected ? lookAtRef.current.getBoundingClientRect() : null
        const x = focus ? focus.left + focus.width / 2 : lastX, y = focus ? focus.top + focus.height / 2 : lastY
        const r = element.getBoundingClientRect(), dx = x - r.left - r.width / 2, dy = y - r.top - r.height / 2
        const distance = Math.max(90, Math.hypot(dx, dy))
        element.style.setProperty('--look-x', `${(dx / distance * 4).toFixed(2)}px`)
        element.style.setProperty('--look-y', `${(dy / distance * 3).toFixed(2)}px`)
        element.style.setProperty('--body-lean', `${(dx / distance * 5).toFixed(2)}deg`)
      })
    }
    aimRef.current = aim
    const move = event => { lastX = event.clientX; lastY = event.clientY; aim() }
    window.addEventListener('pointermove', move, { passive: true }); window.addEventListener('scroll', aim, { passive: true, capture: true }); document.addEventListener('pointerleave', reset); reduce.addEventListener('change', reset)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('pointermove', move); window.removeEventListener('scroll', aim, { capture: true }); document.removeEventListener('pointerleave', reset); reduce.removeEventListener('change', reset) }
  }, [])
  useEffect(() => { lookAtRef.current = lookAt; aimRef.current?.() }, [lookAt])
  const happy = ['encouraging', 'cheerful'].includes(expression)
  return <span ref={ref} className={`pulse-character expression-${expression} ${dragging ? 'is-carried' : ''} ${className}`} style={{ width: size, height: size }}>
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`Pulse, ${dragging ? 'being carried' : expression}`}>
      <defs><radialGradient id={`${id}-body`} cx="32%" cy="26%" r="80%"><stop offset="0" stopColor="#a7f3d0" /><stop offset=".48" stopColor="#38bdf8" /><stop offset="1" stopColor="#0284c7" /></radialGradient></defs>
      <ellipse cx="60" cy="111" rx="27" ry="4" fill="#075985" opacity=".12" />
      <g className="pulse-body-motion">
        <g className="pulse-antenna"><path d="M60 33V20M48 22h7l4-11 5 20 5-9h5" fill="none" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><circle cx="59" cy="9" r="4" fill="#fbbf24" /></g>
        <ellipse cx="60" cy="70" rx="42" ry="38" fill={`url(#${id}-body)`} />
        <ellipse className="pulse-arm pulse-arm-left" cx="20" cy="78" rx="9" ry="13" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
        <ellipse className="pulse-arm pulse-arm-right" cx="100" cy="78" rx="9" ry="13" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
        <ellipse cx="60" cy="72" rx="34" ry="30" fill="#f5fbff" />
        <g className="pulse-face-motion">
          <ellipse cx="33" cy="80" rx="6" ry="3.5" fill="#fda4af" opacity=".7" /><ellipse cx="87" cy="80" rx="6" ry="3.5" fill="#fda4af" opacity=".7" />
          <g className="pulse-eye-blink">
            <ellipse cx="44" cy="66" rx="9" ry="10" fill="white" /><ellipse cx="76" cy="66" rx="9" ry="10" fill="white" />
            <g className="pulse-pupils" data-testid="pulse-pupils"><ellipse cx="44" cy="66" rx="6" ry={happy ? 6 : 8} fill="#172b46" /><ellipse cx="76" cy="66" rx="6" ry={happy ? 6 : 8} fill="#172b46" /><circle cx="46" cy="63" r="2" fill="white" /><circle cx="78" cy="63" r="2" fill="white" /></g>
          </g>
          <path className="pulse-brow-left" d="M37 53q7-4 14 0" fill="none" stroke="#172b46" strokeWidth="2.3" strokeLinecap="round" /><path className="pulse-brow-right" d="M69 53q7-4 14 0" fill="none" stroke="#172b46" strokeWidth="2.3" strokeLinecap="round" />
          <path d={expression === 'concern' ? 'M52 90q8-7 16 0' : happy ? 'M48 82q12 19 24 0' : 'M52 84q8 8 16 0'} fill={happy ? '#7c3f51' : 'none'} stroke="#172b46" strokeWidth="2.8" strokeLinecap="round" />
          {expression === 'thinking' && <g className="pulse-thinking-bubbles" fill="#0284c7"><circle cx="48" cy="94" r="2" /><circle cx="60" cy="94" r="2" /><circle cx="72" cy="94" r="2" /></g>}
        </g>
      </g>
    </svg>
  </span>
}
