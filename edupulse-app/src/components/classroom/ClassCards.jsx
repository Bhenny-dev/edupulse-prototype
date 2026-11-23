import { School } from 'lucide-react'
import { classTone } from '../../utils/classroom'
import './classroom.css'

/** One class on Home: the course code and title on a coloured banner, then its section, term and status. */
export function ClassCard({ code, title, lines = [], chips = [], status, onOpen, label, waiting = false, buttonClassName = '' }) {
  return <article className={`class-card${waiting ? ' is-waiting' : ''}`} data-tone={waiting ? 'gray' : classTone(code)}>
    <button type="button" className={`class-card-open ${buttonClassName}`} onClick={onOpen} disabled={!onOpen} aria-label={label}>
      <span className="class-card-banner"><strong className="class-card-code">{code}</strong><span className="class-card-title">{title}</span></span>
      <span className="class-card-body">
        {lines.filter(Boolean).map(line => <span key={line}>{line}</span>)}
        {chips.length > 0 && <span className="class-card-chips">{chips.map(chip => <span className="class-chip" key={chip}>{chip}</span>)}</span>}
        {status && <span className="class-card-status">{status}</span>}
      </span>
    </button>
  </article>
}

/** Home without classes says what this account can do next, and nothing else. */
export function EmptyClasses({ title, children, actions }) {
  return <section className="class-empty" aria-label={title}>
    <span className="class-empty-mark" aria-hidden="true"><School size={36} /></span>
    <h2>{title}</h2>
    <p>{children}</p>
    {actions && <div className="class-empty-actions">{actions}</div>}
  </section>
}
