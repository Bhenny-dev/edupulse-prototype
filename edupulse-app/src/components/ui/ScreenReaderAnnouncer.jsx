import { useEffect } from 'react'

/**
 * ScreenReaderAnnouncer — renders a visually hidden live region.
 * Usage: <ScreenReaderAnnouncer message="3 items loaded" />
 */
export default function ScreenReaderAnnouncer({ message = '' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0,0,0,0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {message}
    </div>
  )
}
