import { useId } from 'react'
import { X } from 'lucide-react'
import ModalLayer from './ModalLayer'
import './page-modal.css'

/** A full working page with a fixed heading and one independently scrolling body. */
export default function PageModal({ title, subtitle, label, closeLabel, onClose, children, footer, className = '', bodyClassName = '' }) {
  const heading = useId()
  return <ModalLayer className="overlay-backdrop page-modal-overlay" onDismiss={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className={`modal-content page-modal ${className}`} role="dialog" aria-modal="true" aria-label={label} aria-labelledby={label ? undefined : heading}>
      <header className="page-modal-header"><div><h2 id={heading}>{title}</h2>{subtitle && <p className="text-sm text-muted">{subtitle}</p>}</div><button type="button" className="modal-close" aria-label={closeLabel || `Close ${label || (typeof title === 'string' ? title : 'page')}`} onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
      <div className={`page-modal-body ${bodyClassName}`}>{children}</div>
      {footer && <footer className="page-modal-footer">{footer}</footer>}
    </section>
  </ModalLayer>
}
