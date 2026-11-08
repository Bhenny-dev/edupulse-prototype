import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, Compass } from 'lucide-react'
import LandingNav from '../landing/LandingNav'
import RoomDial from '../landing/RoomDial'
import RoomStage from './RoomStage'
import '../landing/landing.css'
import '../landing/classroom.css'
import './public-site.css'

// One public page: one themed room filling the screen, with nothing to scroll. Tapping something in
// the room (its label, or its stop on the speed dial) zooms the camera in on it and opens its card
// beside it; Back or Escape returns to the whole room. A drag looks around, the wheel or a pinch
// zooms, and the cats can be petted, carried and annoyed. `overlay` and `busy` let a page run
// something of its own in the room (the game room's cabinets).
export default function RoomPage({ theme, room, icon: RoomIcon, tint = '#2563eb', title, lead, items, detail, images, onRoom, overlay = null, busy = false }) {
  const [selected, setSelected] = useState(null)
  const panel = useRef(null), api = useRef(null), last = useRef(null)
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 900px)').matches)

  useEffect(() => {
    const before = document.title
    document.title = `${room}: ${title.replace(/\.$/, '')} | EduPulse`
    return () => { document.title = before }
  }, [room, title])
  useEffect(() => {
    const query = window.matchMedia('(min-width: 900px)')
    const change = () => setWide(query.matches)
    query.addEventListener?.('change', change)
    return () => query.removeEventListener?.('change', change)
  }, [])

  const select = useCallback(key => { if (key) last.current = key; setSelected(key) }, [])
  const close = useCallback(() => setSelected(null), [])
  const handOver = useCallback(room => { api.current = room; onRoom?.(room) }, [onRoom])

  // The card opens beside the prop: on the left of a wide screen, along the bottom of a phone.
  // The room keeps the prop in the part of the screen the card leaves free.
  useLayoutEffect(() => {
    const element = panel.current
    if (!selected || busy || !element) { api.current?.setInset({ left: 0, bottom: 0 }); return undefined }
    const measure = () => {
      const box = element.getBoundingClientRect()
      api.current?.setInset(wide ? { left: box.right + 12, bottom: 0 } : { left: 0, bottom: window.innerHeight - box.top + 8 })
    }
    measure()
    const sizes = new ResizeObserver(measure)
    sizes.observe(element)
    return () => sizes.disconnect()
  }, [selected, busy, wide])

  // Keyboard: the opened card takes focus; Escape (or Back) returns it to the thing's label.
  useEffect(() => {
    if (selected && !busy) panel.current?.focus({ preventScroll: true })
    else if (!selected && last.current) document.querySelector(`.room-label[data-pick="${last.current}"]`)?.focus({ preventScroll: true })
  }, [selected, busy])
  useEffect(() => {
    if (!selected || busy) return undefined
    const onKey = event => { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, busy, close])

  const stops = items.map(({ key, label, short, icon, tint: color }) => ({ id: key, label: label || short, icon, tint: color }))
  const item = items.find(entry => entry.key === selected)

  return (
    <div className="landing-page public-site is-room" data-room-theme={theme}>
      <LandingNav solid />
      <main id="room" className={`ps-room ${selected ? 'is-open' : ''} ${busy ? 'is-busy' : ''}`} aria-labelledby="ps-title">
        <RoomStage theme={theme} items={items} selected={selected} onSelect={select} images={images} onRoom={handOver} hidden={busy} />
        <header className="ps-room-title" inert={Boolean(selected) || busy}>
          <p className="ps-kicker" style={{ '--tint': tint }}><i aria-hidden="true"><RoomIcon size={15} strokeWidth={2.4} /></i>{room}</p>
          <h1 id="ps-title">{title}</h1>
          {lead && <p className="ps-lead">{lead}</p>}
        </header>
        <p className="ps-room-hint" aria-hidden="true">Drag to look around · tap anything</p>
        {selected && item && !busy && (
          <aside className="ps-panel" ref={panel} tabIndex={-1} aria-label={item.label || item.short}>
            <button type="button" className="ps-back" onClick={close}><ArrowLeft size={16} aria-hidden="true" /> Back to the room</button>
            {detail(selected, { close })}
          </aside>
        )}
        {overlay}
      </main>
      <RoomDial stops={stops} jump={(event, key) => { event.preventDefault(); select(key) }} revealAt={-1} pausable icon={Compass} label="Go to something in this room" />
    </div>
  )
}

// Keyword chips: a few words in place of a sentence.
export function Chips({ words, tone }) {
  return <ul className={`ps-chips ${tone ? `is-${tone}` : ''}`}>{words.map(word => <li key={word}>{word}</li>)}</ul>
}

// A card for a thing in the room that stands for a whole topic (a poster, a board, a model), or for
// the more that comes with a thing's own card.
export function Extra({ icon: Icon, tint, title, level = 2, children }) {
  const Heading = level === 3 ? 'h3' : 'h2'
  return (
    <section className="ps-extra" style={{ '--tint': tint }}>
      <Heading className="ps-extra-title"><i aria-hidden="true"><Icon size={15} strokeWidth={2.4} /></i>{title}</Heading>
      {children}
    </section>
  )
}

// The card for the thing picked in the room.
export function DetailCard({ icon: Icon, tint, kicker, name, words, children }) {
  return (
    <article className="ps-card is-detail" style={{ '--tint': tint }}>
      <span className="ps-card-icon" aria-hidden="true"><Icon size={22} strokeWidth={2.2} /></span>
      <div>
        {kicker && <p className="ps-card-kicker">{kicker}</p>}
        <h2 className="ps-card-name">{name}</h2>
        {words && <Chips words={words} />}
        {children}
      </div>
    </article>
  )
}
