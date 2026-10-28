import { useState } from 'react'
import { Pause, Play } from 'lucide-react'

// Two rows drift in opposite directions. Each row is rendered twice so the loop
// is seamless; the copy is hidden from assistive technology. Moving content has
// a visible pause control (WCAG 2.2.2), and it also pauses on hover or focus.
// With reduced motion the rows stand still and scroll sideways instead.
export default function PhotoMarquee({ photos, credit }) {
  const [paused, setPaused] = useState(false)
  const half = Math.ceil(photos.length / 2)
  const rows = [photos.slice(0, half), photos.slice(half)]
  return (
    <div className={`marquee ${paused ? 'is-paused' : ''}`}>
      {rows.map((row, r) => (
        <div key={r} className={`marquee-row ${r ? 'is-reverse' : ''}`}>
          <ul className="marquee-track">
            {[...row, ...row].map((photo, i) => {
              const copy = i >= row.length
              return (
                <li key={i} className={copy ? 'is-copy' : undefined} aria-hidden={copy || undefined}>
                  <img src={photo.src} alt={copy ? '' : photo.alt} loading="lazy" decoding="async" width="360" height="240" />
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      <div className="marquee-footer">
        <p className="marquee-credit">{credit}</p>
        <button type="button" className="marquee-toggle" aria-pressed={paused} onClick={() => setPaused(value => !value)}>
          {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
          {paused ? 'Play photos' : 'Pause photos'}
        </button>
      </div>
    </div>
  )
}
