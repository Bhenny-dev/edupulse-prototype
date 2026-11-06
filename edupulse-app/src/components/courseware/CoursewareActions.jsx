import { useId, useLayoutEffect, useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Ellipsis } from 'lucide-react'
import './courseware.css'

export default function CoursewareActions({ label, actions, disabled = false }) {
  const id = useId()
  const trigger = useRef(null), menu = useRef(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const close = (restoreFocus = true) => { setOpen(false); if (restoreFocus) trigger.current?.focus({ preventScroll: true }) }
  useLayoutEffect(() => {
    if (!open) return
    const updatePosition = () => {
      const anchor = trigger.current.getBoundingClientRect(), box = menu.current.getBoundingClientRect()
      const left = Math.max(12, Math.min(anchor.right - box.width, innerWidth - box.width - 12))
      const top = anchor.bottom + box.height + 8 <= innerHeight ? anchor.bottom + 4 : Math.max(12, anchor.top - box.height - 4)
      setPosition(previous => previous.left === left && previous.top === top ? previous : { left, top })
    }
    updatePosition()
    menu.current.querySelector('button:not(:disabled)')?.focus({ preventScroll: true })
    window.addEventListener('scroll', updatePosition, true)
    return () => window.removeEventListener('scroll', updatePosition, true)
  }, [open])
  useEffect(() => {
    if (!open) return
    const dismiss = event => { if (!menu.current?.contains(event.target) && !trigger.current?.contains(event.target)) setOpen(false) }
    const reposition = () => setOpen(false)
    document.addEventListener('pointerdown', dismiss)
    window.addEventListener('resize', reposition)
    return () => { document.removeEventListener('pointerdown', dismiss); window.removeEventListener('resize', reposition) }
  }, [open])
  const onKeyDown = event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return }
    if (event.key === 'Tab') { close(); return }
    const buttons = [...menu.current.querySelectorAll('button:not(:disabled)')]
    const index = buttons.indexOf(document.activeElement)
    const next = { ArrowDown: (index + 1) % buttons.length, ArrowUp: (index - 1 + buttons.length) % buttons.length, Home: 0, End: buttons.length - 1 }[event.key]
    if (next !== undefined) { event.preventDefault(); buttons[next]?.focus() }
  }
  return <>
    <button ref={trigger} type="button" className="btn btn-ghost cw-more" aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} disabled={disabled} onClick={() => setOpen(value => !value)} onKeyDown={event => { if (open && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() } else if (open && event.key === 'Tab') setOpen(false); else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true) } }}><Ellipsis size={20} aria-hidden="true" /></button>
    {open && createPortal(<div ref={menu} id={id} role="menu" aria-label={label} className="cw-actions-menu" style={position} onKeyDown={onKeyDown}>
      {actions.map(({ label: actionLabel, icon: Icon, onSelect, disabled: unavailable }) => <button type="button" role="menuitem" tabIndex={-1} key={actionLabel} disabled={unavailable} onClick={() => { close(); onSelect() }}>{Icon && <Icon size={16} aria-hidden="true" />}<span>{actionLabel}</span></button>)}
    </div>, document.body)}
  </>
}
