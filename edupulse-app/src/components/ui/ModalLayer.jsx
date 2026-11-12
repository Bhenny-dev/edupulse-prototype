import { createContext, useContext, useLayoutEffect, useRef } from 'react'
const ModalDepth=createContext(0)
import { createPortal } from 'react-dom'

// Portals keep nested dialogs out of transformed/scrolling parent containers.
// Pulse stays available beside the current dialog; only the top dialog handles Escape.
export default function ModalLayer({ children, onClick, onDismiss = onClick, className = 'overlay-backdrop', ...props }) {
  const depth=useContext(ModalDepth)
  const ref = useRef(null)
  const origin = useRef(null)
  const closeHandler = useRef(onDismiss)
  useLayoutEffect(() => { closeHandler.current = onDismiss })
  useLayoutEffect(() => {
    const previous = document.activeElement
    // Portals can mount child-first on reload. Keep the logical child above its
    // restored parent before choosing focus or the active Escape handler.
    const layers=[...document.querySelectorAll('.overlay-backdrop[data-modal-depth]')]
    const ordered=[...layers].sort((a,b)=>Number(a.dataset.modalDepth)-Number(b.dataset.modalDepth))
    if(ordered.some((layer,index)=>layer!==layers[index]))for(const layer of ordered)document.body.appendChild(layer)
    const content = ref.current?.querySelector('.modal-content') || ref.current?.firstElementChild
    content?.setAttribute('data-pulse-zone', origin.current?.closest('[data-pulse-zone]')?.getAttribute('data-pulse-zone') || 'general')
    const isTop = () => [...document.querySelectorAll('.overlay-backdrop')].at(-1) === ref.current
    const escape = event => {
      // The fullscreen office owns its own focus and Escape handling.
      if (document.querySelector('[data-pulse-ui="office"]')) return
      if (event.key === 'Tab' && isTop()) {
        const surfaces = [ref.current, document.querySelector('[data-pulse-ui="panel"]'), document.querySelector('[data-pulse-ui="mascot"]')].filter(Boolean)
        const controls = surfaces.flatMap(surface => [surface, ...surface.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')]).filter(element => element.matches('button, input, select, textarea, a[href], [tabindex="0"]') && !element.disabled && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden')
        const index = controls.indexOf(document.activeElement)
        if (controls.length) {
          event.preventDefault(); event.stopImmediatePropagation()
          const next = index < 0 ? event.shiftKey ? controls.length - 1 : 0 : (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length
          controls[next].focus()
        }
      }
      if (event.key !== 'Escape' || !isTop() || event.target.closest?.('[data-pulse-ui="panel"]')) return
      event.preventDefault(); event.stopImmediatePropagation()
      if (closeHandler.current) closeHandler.current(event)
      else ref.current?.querySelector('.modal-close')?.click()
    }
    if(isTop())ref.current?.querySelector('.modal-close, input, button, [tabindex="0"]')?.focus({ preventScroll: true })
    document.addEventListener('keydown', escape, true)
    return () => {
      document.removeEventListener('keydown', escape, true)
      queueMicrotask(() => { if (previous?.isConnected) previous.focus({ preventScroll: true }) })
    }
  }, [])
  return <ModalDepth.Provider value={depth+1}><span hidden ref={origin} />{createPortal(<div ref={ref} data-modal-depth={depth} className={className} onClick={onClick} {...props}>{children}</div>, document.body)}</ModalDepth.Provider>
}
