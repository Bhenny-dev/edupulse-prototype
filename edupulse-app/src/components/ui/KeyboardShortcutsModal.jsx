import { useState, useRef, useEffect, useCallback } from 'react'
import { Keyboard, X } from 'lucide-react'

const SHORTCUTS = [
  { category: 'Navigation', items: [
    { keys: ['Ctrl', 'K'], desc: 'Open search' },
    { keys: ['G', 'then', 'D'], desc: 'Go to Dashboard' },
    { keys: ['G', 'then', 'S'], desc: 'Go to Syllabus' },
    { keys: ['G', 'then', 'C'], desc: 'Go to Courseware' },
    { keys: ['G', 'then', 'P'], desc: 'Go to Performance' },
    { keys: ['G', 'then', 'A'], desc: 'Go to AI Assistant' },
  ]},
  { category: 'Actions', items: [
    { keys: ['Ctrl', 'E'], desc: 'Export current view' },
    { keys: ['Ctrl', 'S'], desc: 'Save current form' },
    { keys: ['Ctrl', 'Z'], desc: 'Undo last action' },
  ]},
  { category: 'General', items: [
    { keys: ['?'], desc: 'Open keyboard shortcuts' },
    { keys: ['Esc'], desc: 'Close modal / overlay' },
    { keys: ['Tab'], desc: 'Move to next element' },
    { keys: ['Shift', 'Tab'], desc: 'Move to previous element' },
  ]},
]

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  const modalRef = useRef(null)
  const closeRef = useRef(null)

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'Tab' && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      closeRef.current?.focus()
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div
      className="overlay-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="modal-content"
        style={{ maxWidth: '560px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Keyboard size={18} /> Keyboard Shortcuts
          </h2>
          <button ref={closeRef} className="modal-close" onClick={onClose} aria-label="Close shortcuts modal">✕</button>
        </div>

        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0 4px' }}>
          {SHORTCUTS.map(section => (
            <div key={section.category} style={{ marginBottom: '20px' }}>
              <h3 style={{
                fontFamily: 'var(--font-heading)', fontSize: '0.75rem', fontWeight: 700,
                color: 'var(--sky-500)', textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: '10px',
              }}>
                {section.category}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {section.items.map(item => (
                  <div key={item.desc} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--gray-700)' }}>{item.desc}</span>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {item.keys.map((key, i) => (
                        <span key={i} style={{ display: 'inline-block' }}>
                          <kbd style={{
                            display: 'inline-block', padding: '3px 8px', fontSize: '0.6875rem',
                            fontFamily: 'var(--font-body)', fontWeight: 600,
                            background: 'var(--gray-100)', border: '1px solid var(--gray-200)',
                            borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                            color: 'var(--gray-600)', lineHeight: 1.4,
                          }}>
                            {key}
                          </kbd>
                          {i < item.keys.length - 1 && item.keys.length > 2 && (
                            <span style={{ fontSize: '0.625rem', color: 'var(--gray-400)', margin: '0 2px' }}>+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
