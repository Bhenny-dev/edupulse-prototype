import { useCallback, useEffect, useRef, useState } from 'react'
import { describeDrop, describeTarget, REASONS } from './targets'

export default function usePulseInteraction({ dockRef, role, onTarget, onToggle }) {
  const [dragging, setDragging] = useState(false), [hovered, setHovered] = useState(null), [notice, setNotice] = useState(''), [rejection, setRejection] = useState('')
  const pointer = useRef(null), suppressClick = useRef(0), frame = useRef(0), targetRef = useRef(null), perched = useRef(null), rejectTimer = useRef(0)
  const callbacks = useRef({ onTarget, onToggle, role }); callbacks.current = { onTarget, onToggle, role }
  const reset = useCallback(() => {
    perched.current = null
    const dock = dockRef.current
    if (!dock) return
    dock.classList.remove('is-perched')
    for (const key of ['left', 'top', 'right', 'bottom']) dock.style[key] = ''
    dock.style.setProperty('--drag-tilt', '0deg')
  }, [dockRef])
  /** Places Pulse beside the component it is helping with and keeps it there while the page scrolls. */
  const perch = useCallback(element => {
    perched.current = element
    const dock = dockRef.current
    if (!dock || !element?.isConnected) return
    const r = element.getBoundingClientRect(), w = dock.offsetWidth, h = dock.offsetHeight
    const left = r.right + 10 + w < innerWidth ? r.right + 10 : r.left - w - 10 > 0 ? r.left - w - 10 : Math.max(8, r.right - w - 6)
    dock.classList.add('is-perched')
    dock.style.left = `${Math.round(Math.max(8, Math.min(innerWidth - w - 8, left)))}px`
    dock.style.top = `${Math.round(Math.max(8, Math.min(innerHeight - h - 8, r.top - 6)))}px`
    dock.style.right = 'auto'; dock.style.bottom = 'auto'
  }, [dockRef])
  useEffect(() => {
    const follow = () => { if (!perched.current || pointer.current) return; cancelAnimationFrame(frame.current); frame.current = requestAnimationFrame(() => perched.current?.isConnected ? perch(perched.current) : reset()) }
    window.addEventListener('resize', follow); window.addEventListener('scroll', follow, true)
    return () => { window.removeEventListener('resize', follow); window.removeEventListener('scroll', follow, true); cancelAnimationFrame(frame.current); clearTimeout(rejectTimer.current) }
  }, [perch, reset])
  useEffect(() => {
    const keyboard = event => {
      if (event.altKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        const target = describeTarget(document.activeElement, callbacks.current.role) || describeTarget(document.querySelector('[data-pulse-zone]') || document.querySelector('#main-content'), callbacks.current.role)
        if (target) callbacks.current.onTarget(target)
        else callbacks.current.onToggle()
      }
      if (event.key === 'Escape' && pointer.current) { pointer.current = null; setDragging(false); setHovered(null); reset() }
    }
    document.addEventListener('keydown', keyboard)
    return () => document.removeEventListener('keydown', keyboard)
  }, [reset])
  function resolve(x, y) {
    let reason = null
    for (const element of document.elementsFromPoint(x, y)) {
      const result = describeDrop(element, callbacks.current.role)
      if (result.target) return { target: result.target }
      if (result.reason !== 'self') { reason ??= result; if (result.reason !== 'outside') break }
    }
    return reason || { reason: 'outside' }
  }
  function reject(result) {
    const message = result.reason === 'role' ? REASONS.role(result.area) : REASONS[result.reason] || REASONS.outside
    setRejection(message); setNotice(message)
    dockRef.current?.classList.add('is-rejected')
    clearTimeout(rejectTimer.current)
    rejectTimer.current = setTimeout(() => { setRejection(''); dockRef.current?.classList.remove('is-rejected') }, 2600)
    reset()
  }
  return {
    dragging, hovered, notice, rejection, reset, perch,
    handlers: {
      onPointerDown(event) {
        if (event.button !== 0) return
        const rect = event.currentTarget.getBoundingClientRect()
        pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, moved: false }
        event.currentTarget.setPointerCapture(event.pointerId)
      },
      onPointerMove(event) {
        const current = pointer.current
        if (!current || current.id !== event.pointerId) return
        if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 8) return
        if (!current.moved) { current.moved = true; perched.current = null; dockRef.current?.classList.remove('is-perched'); setDragging(true); setRejection(''); setNotice('Drop Pulse on the part you want help with.') }
        const { clientX: x, clientY: y } = event
        cancelAnimationFrame(frame.current)
        frame.current = requestAnimationFrame(() => {
          const dock = dockRef.current
          if (!dock || !pointer.current) return
          dock.style.left = `${Math.max(8, Math.min(innerWidth - dock.offsetWidth - 8, x - current.offsetX))}px`
          dock.style.top = `${Math.max(8, Math.min(innerHeight - dock.offsetHeight - 8, y - current.offsetY))}px`
          dock.style.right = 'auto'; dock.style.bottom = 'auto'
          dock.style.setProperty('--drag-tilt', `${Math.max(-12, Math.min(12, (x - current.x) / 15))}deg`)
          // Pulse's own elements under the pointer are skipped; the first page component wins.
          const target = resolve(x, y).target || null
          if (target?.element !== targetRef.current?.element) { targetRef.current = target; setHovered(target) }
        })
      },
      onPointerUp(event) {
        const current = pointer.current
        if (!current || current.id !== event.pointerId) return
        pointer.current = null; cancelAnimationFrame(frame.current)
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
        setDragging(false); setHovered(null); targetRef.current = null
        if (current.moved) {
          suppressClick.current = Date.now() + 600
          dockRef.current?.style.setProperty('--drag-tilt', '0deg')
          const result = resolve(event.clientX, event.clientY)
          if (result.target) { setNotice(`Guidance for ${result.target.label}`); callbacks.current.onTarget(result.target); perch(result.target.element) }
          else reject(result)
        }
      },
      onPointerCancel() { pointer.current = null; cancelAnimationFrame(frame.current); setDragging(false); setHovered(null); reset(); suppressClick.current = Date.now() + 600 },
      onClick() { if (Date.now() > suppressClick.current) callbacks.current.onToggle() },
    },
  }
}

export function FocusSpotlight({ target, dragging = false }) {
  const [rect, setRect] = useState(null)
  useEffect(() => {
    if (!target?.element) { setRect(null); return }
    let frame = 0
    const update = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { if (!target.element.isConnected) { setRect(null); return }; const r = target.element.getBoundingClientRect(); setRect({ left: Math.max(4, r.left - 5), top: Math.max(4, r.top - 5), width: Math.min(innerWidth - 8, r.width + 10), height: Math.min(innerHeight - 8, r.height + 10) }) }) }
    const observer = new ResizeObserver(update); observer.observe(target.element)
    update(); window.addEventListener('scroll', update, true); window.addEventListener('resize', update)
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update) }
  }, [target])
  return rect ? <div data-pulse-ui="spotlight" aria-hidden="true" className={`pulse-spotlight ${dragging ? 'is-dragging' : ''}`} style={rect} /> : null
}

export function DwellHelp({ role, disabled, onTarget }) {
  const [target, setTarget] = useState(null)
  useEffect(() => {
    let timer
    const hover = event => {
      if (event.target.closest('[data-pulse-ui]')) return
      clearTimeout(timer); setTarget(null)
      if (disabled || event.pointerType === 'touch') return
      const next = describeTarget(event.target, role)
      if (next && next.element !== next.zoneElement) timer = setTimeout(() => setTarget(next), 1100)
    }
    const clear = () => { clearTimeout(timer); setTarget(null) }
    document.addEventListener('pointerover', hover); window.addEventListener('scroll', clear, true)
    return () => { clearTimeout(timer); document.removeEventListener('pointerover', hover); window.removeEventListener('scroll', clear, true) }
  }, [role, disabled])
  if (!target || disabled || !target.element.isConnected) return null
  const rect = target.element.getBoundingClientRect()
  return <button data-pulse-ui="dwell" className="pulse-dwell-help" style={{ left: Math.max(8, Math.min(innerWidth - 160, rect.right - 135)), top: Math.max(8, rect.top - 30) }} onClick={() => { onTarget(target); setTarget(null) }}>Ask Pulse about this</button>
}
