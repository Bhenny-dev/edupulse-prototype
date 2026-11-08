import { useEffect, useId, useRef, useState } from 'react'
import { ArrowUp, Armchair, BookOpen, Bot, Camera, DoorOpen, Frame, GraduationCap, Pause, Pin, Play, Presentation, School, Sparkles, Users, X } from 'lucide-react'
import { scrollToId } from './navigation'
import { currentMode } from './classroom/mode'

const STOPS = [
  { id: 'top', label: 'Back to top', icon: School, tint: '#3b82f6' },
  { id: 'problem', label: 'Bulletin board', icon: Pin, tint: '#f59e0b' },
  { id: 'features', label: 'Blackboard', icon: Presentation, tint: '#0d9488' },
  { id: 'flow', label: 'Class seats', icon: Armchair, tint: '#f97316' },
  { id: 'roles', label: 'Classmates', icon: Users, tint: '#10b981' },
  { id: 'ai', label: "Teacher's desk", icon: Bot, tint: '#3b82f6' },
  { id: 'workspace', label: 'Agent room', icon: Sparkles, tint: '#8b5cf6' },
  { id: 'impact', label: 'Gallery', icon: Frame, tint: '#ec4899' },
  { id: 'colleges', label: 'Front stage', icon: GraduationCap, tint: '#6366f1' },
  { id: 'campus', label: 'Courtyard', icon: Camera, tint: '#84cc16' },
  { id: 'faq', label: 'Notebook', icon: BookOpen, tint: '#06b6d4' },
  { id: 'login', label: 'The door', icon: DoorOpen, tint: '#2563eb' },
]
const RING = 2 * Math.PI * 25

// The speed dial, in the corner of the screen once the hero is reached: a ring shows how far along the
// walk you are, and opening it fans out every room, so any of them is one tap away. It replaces the
// plain back-to-top button and keeps its job as the first stop, and it holds the pause control for
// the 3D school's idle motion (WCAG 2.2.2). Every public page uses it: a page passes its own sections
// as `stops` and how to reach one as `jump`; the home page keeps the rooms of the school.
export default function RoomDial({ stops = STOPS, jump = scrollToId, revealAt = 0.7, pausable = currentMode() !== 'flat', label = 'Jump to a room', icon: Icon = ArrowUp }) {
  const [shown, setShown] = useState(false)
  const [open, setOpen] = useState(false)
  const [paused, setPaused] = useState(false)
  const ring = useRef(null), root = useRef(null), button = useRef(null)
  const id = useId()

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight
      setShown(y > window.innerHeight * revealAt)
      ring.current?.style.setProperty('stroke-dashoffset', String(RING * (1 - (max > 0 ? Math.min(1, y / max) : 0))))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule) }
  }, [revealAt])

  useEffect(() => { if (!shown) setOpen(false) }, [shown])
  useEffect(() => { document.dispatchEvent(new CustomEvent('classroom:pause', { detail: paused })) }, [paused])

  useEffect(() => {
    if (!open) return undefined
    const onKey = event => { if (event.key === 'Escape') { setOpen(false); button.current?.focus() } }
    const onPointer = event => { if (!root.current?.contains(event.target)) setOpen(false) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onPointer) }
  }, [open])

  return (
    <div className={`room-dial ${shown ? 'is-shown' : ''} ${open ? 'is-open' : ''}`} ref={root} aria-hidden={!shown}>
      <nav id={id} className="room-dial-list" aria-label={label} hidden={!open}>
        {pausable && (
          <button type="button" className="room-dial-stop" style={{ '--i': stops.length + 1, '--tint': '#475569' }} onClick={() => setPaused(value => !value)}>
            <span>{paused ? 'Play room motion' : 'Pause room motion'}</span>
            <i aria-hidden="true">{paused ? <Play size={17} strokeWidth={2.2} /> : <Pause size={17} strokeWidth={2.2} />}</i>
          </button>
        )}
        {stops.map(({ id: stop, label: name, icon: Icon, tint }, i) => (
          <a key={stop} href={`#${stop}`} className="room-dial-stop" style={{ '--i': stops.length - i, '--tint': tint }}
            onClick={event => { jump(event, stop); setOpen(false) }}>
            <span>{name}</span>
            <i aria-hidden="true"><Icon size={17} strokeWidth={2.2} /></i>
          </a>
        ))}
      </nav>
      <button type="button" ref={button} className="room-dial-main" tabIndex={shown ? 0 : -1} aria-expanded={open} aria-controls={id}
        aria-label={open ? 'Close the speed dial' : `Open the speed dial: ${stops.map(stop => stop.label).slice(0, 3).join(', ')} and more`} onClick={() => setOpen(value => !value)}>
        <svg viewBox="0 0 56 56" aria-hidden="true" focusable="false">
          <circle cx="28" cy="28" r="25" className="room-dial-track" />
          <circle cx="28" cy="28" r="25" className="room-dial-fill" ref={ring} strokeDasharray={RING} />
        </svg>
        {open ? <X size={20} aria-hidden="true" /> : <Icon size={20} aria-hidden="true" />}
      </button>
    </div>
  )
}
