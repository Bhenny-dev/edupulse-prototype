import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import LandingNav from '../landing/LandingNav'
import LandingFooter from '../landing/LandingFooter'
import RoomDial from '../landing/RoomDial'
import { jumpTo } from './jump'
import { KCP } from '../../data/colleges'
import RoomStage from './RoomStage'
import '../landing/landing.css'
import '../landing/classroom.css'
import './public-site.css'

// One public page: its themed room at the top with the item picked in it, then a few short
// sections. The speed dial lists the room and the sections; the bar lists the pages.
export default function RoomPage({ theme, room, icon: RoomIcon, tint = '#2563eb', title, lead, items, detail, sections = [], images }) {
  const [selected, setSelected] = useState(items[0]?.key ?? null)
  useEffect(() => { window.scrollTo(0, 0) }, [])
  useEffect(() => {
    const before = document.title
    document.title = `${room}: ${title.replace(/\.$/, '')} | EduPulse`
    return () => { document.title = before }
  }, [room, title])

  const stops = [
    { id: 'top', label: 'Back to top', icon: ArrowUp, tint: '#3b82f6' },
    { id: 'room', label: room, icon: RoomIcon, tint },
    ...sections.map(({ id, label, icon, tint: color }) => ({ id, label, icon, tint: color })),
  ]

  return (
    <div className="landing-page public-site" data-room-theme={theme}>
      <a href="#room" className="skip-to-content" onClick={event => jumpTo(event, 'room')}>Skip to content</a>
      <LandingNav />
      <main>
        <section id="room" className="ps-hero" tabIndex={-1} aria-labelledby="ps-title">
          <RoomStage theme={theme} items={items} selected={selected} onSelect={setSelected} images={images} />
          <div className="ps-hero-copy">
            <p className="ps-kicker" style={{ '--tint': tint }}><i aria-hidden="true"><RoomIcon size={15} strokeWidth={2.4} /></i>{room}</p>
            <h1 id="ps-title">{title}</h1>
            {lead && <p className="ps-lead">{lead}</p>}
          </div>
          <div className="ps-detail" aria-live="polite">{selected && detail(selected)}</div>
        </section>
        {sections.map(({ id, label, title: heading, icon: Icon, tint: color, node }) => (
          <section key={id} id={id} className="ps-section" tabIndex={-1} aria-labelledby={`${id}-title`}>
            <div className="ps-wrap">
              <header className="ps-head">
                <p className="ps-kicker" style={{ '--tint': color }}><i aria-hidden="true"><Icon size={15} strokeWidth={2.4} /></i>{label}</p>
                <h2 id={`${id}-title`}>{heading}</h2>
              </header>
              {node}
            </div>
          </section>
        ))}
      </main>
      <LandingFooter kcp={KCP} />
      <RoomDial stops={stops} jump={jumpTo} revealAt={0.35} pausable label="Jump to a part of this page" />
    </div>
  )
}

// Keyword chips: a few words in place of a sentence.
export function Chips({ words, tone }) {
  return <ul className={`ps-chips ${tone ? `is-${tone}` : ''}`}>{words.map(word => <li key={word}>{word}</li>)}</ul>
}

// The card for the item picked in the room.
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
