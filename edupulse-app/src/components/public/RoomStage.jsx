import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { prefersReducedMotion } from '../landing/motion'

// The 3D room that fills a public page. The canvas is decoration; the labels are real buttons,
// carried over their props while the room runs, and laid out as a row of chips when it cannot
// (no WebGL). Reduced motion keeps the room still. `onRoom` hands the room's controls to the page.
export default function RoomStage({ theme, items, selected, onSelect, images, onRoom, hidden = false }) {
  const canvas = useRef(null), labels = useRef({}), api = useRef(null), pick = useRef(onSelect), ready = useRef(onRoom)
  const [mode, setMode] = useState('loading')
  const [hovered, setHovered] = useState(null)
  const { dark } = useTheme()
  pick.current = onSelect
  ready.current = onRoom

  useEffect(() => {
    let cancelled = false, room = null
    import('./room/themedRoom.js').then(({ createThemedRoom }) => {
      if (cancelled) return
      room = createThemedRoom({
        canvas: canvas.current, theme, images, labels: labels.current,
        compact: window.matchMedia('(max-width: 760px)').matches, still: prefersReducedMotion(),
        onPick: key => pick.current(key), onHover: key => setHovered(key), onReady: () => { if (!cancelled) setMode('scene') },
      })
      if (!room) { setMode('flat'); ready.current?.(null); return }
      api.current = room
      room.setNight(document.documentElement.classList.contains('dark-mode'))
      ready.current?.(room)
    }).catch(() => { if (!cancelled) { setMode('flat'); ready.current?.(null) } })
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onReduce = () => api.current?.setStill(reduce.matches)
    reduce.addEventListener?.('change', onReduce)
    return () => { cancelled = true; reduce.removeEventListener?.('change', onReduce); room?.dispose(); api.current = null }
  }, [theme, images])
  useEffect(() => { api.current?.setNight(dark) }, [dark])
  useEffect(() => { api.current?.focus(selected) }, [selected, mode])

  return (
    <div className={`room-stage is-${mode} ${selected ? 'is-zoomed' : ''}`}>
      <canvas ref={canvas} className="room-stage-canvas" aria-hidden="true" />
      <div className="room-stage-labels" role="group" aria-label="Things in the room" inert={Boolean(selected) || hidden}>
        {items.map(({ key, short, icon: Icon, tint }) => (
          <button key={key} ref={element => { labels.current[key] = element }} type="button" style={{ '--tint': tint }} data-pick={key}
            className={`room-label ${selected === key ? 'is-on' : ''} ${hovered === key ? 'is-hot' : ''}`} aria-pressed={selected === key} onClick={() => onSelect(key)}>
            {Icon && <i aria-hidden="true"><Icon size={14} strokeWidth={2.4} /></i>}
            <span>{short}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
