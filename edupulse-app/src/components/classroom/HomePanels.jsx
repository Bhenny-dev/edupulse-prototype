import { CalendarClock, ClipboardCheck } from 'lucide-react'
import PageModal from '../ui/PageModal'
import './classroom.css'

const when = value => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** The two circle buttons on the left edge of Home. Each opens its own page; a count badge shows what is waiting. */
export function HomeRail({ reviewCount, upcomingCount, onOpen }) {
  return <nav className="class-home-rail" aria-label="Across your classes">
    <button type="button" className="class-rail-button" data-panel="review" data-label="To review" aria-label={reviewCount ? `To review, ${reviewCount} waiting` : 'To review'} onClick={() => onOpen('review')}>
      <ClipboardCheck size={22} aria-hidden="true" />{reviewCount > 0 && <span className="class-rail-badge" aria-hidden="true">{reviewCount}</span>}
    </button>
    <button type="button" className="class-rail-button" data-panel="upcoming" data-label="Upcoming" aria-label={upcomingCount ? `Upcoming, ${upcomingCount} coming up` : 'Upcoming'} onClick={() => onOpen('upcoming')}>
      <CalendarClock size={22} aria-hidden="true" />{upcomingCount > 0 && <span className="class-rail-badge" aria-hidden="true">{upcomingCount}</span>}
    </button>
  </nav>
}

/** To review: written responses waiting for the instructor's marking, class by class and assessment by assessment. */
export function ReviewPanel({ classes, named, onOpenClass, onClose }) {
  const total = classes.reduce((sum, item) => sum + item.count, 0)
  return <PageModal title="To review" subtitle={total ? `${total} written ${total === 1 ? 'response' : 'responses'} waiting for your marking` : 'Written responses waiting for your marking'} label="To review" closeLabel="Close To review and return to Home" onClose={onClose} className="class-modal" bodyClassName="classroom">
    {classes.length ? classes.map(({ course, count, assessments }) => <section key={course.id} className="class-section" aria-label={`${named(course)} to review`}>
      <div className="class-section-heading"><h2>{named(course)} <span className="text-muted">· {course.title}</span></h2><button type="button" className="btn btn-secondary btn-sm" onClick={() => onOpenClass(course, { tab: 'scores' })}>Open Scores</button></div>
      <p className="text-sm text-muted mb-8">{count} written {count === 1 ? 'response' : 'responses'} to mark.</p>
      {assessments.map(item => <button type="button" key={item.key} className="class-work-row" onClick={() => onOpenClass(course, { tab: 'scores' })}><strong>{item.title}</strong><span>{item.count} to mark{item.week ? ` · Week ${item.week}` : ''}</span></button>)}
    </section>) : <p className="text-muted" role="status">Nothing is waiting for your marking. Written responses that need an instructor appear here as students submit them.</p>}
  </PageModal>
}

/** Upcoming: the next due dates and week openings of every class, soonest first. */
export function UpcomingPanel({ items, named, onOpenClass, onClose }) {
  return <PageModal title="Upcoming" subtitle="Saved due dates and week openings across your classes" label="Upcoming" closeLabel="Close Upcoming and return to Home" onClose={onClose} className="class-modal" bodyClassName="classroom">
    {items.length ? <section className="class-section" aria-label="Upcoming across classes">
      {items.map(item => <button type="button" key={item.key} className="class-work-row" onClick={() => onOpenClass(item.course, { tab: 'materials' })}><strong>{named(item.course)}</strong><span>{item.text}</span><time dateTime={item.at}>{when(item.at)}</time></button>)}
    </section> : <p className="text-muted" role="status">No saved openings or due dates soon. Blocks without saved dates follow their class schedule (open a class and choose Block sections to set dates).</p>}
  </PageModal>
}
