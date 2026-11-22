import { Link } from 'react-router-dom'
import { toneFor } from './classTone'
import './class-card.css'

// Classroom Home card (UI redesign rule 2): a colored banner with the course, then up to three
// due or next items. Cards appear only on Home; every other list is a DataTable.

// `to` renders a link; `onClick` renders a button (pages that switch the open class in place). `label` names it.
export default function ClassCard({ to, onClick, label, code, title, subtitle, meta, items = [], emptyItems, className = '', tone, children }) {
  const Container = to ? Link : 'button'
  return <Container className={`class-card class-tone-${tone || toneFor(code)} ${className}`} {...(to ? { to } : { type: 'button', onClick })} aria-label={label}>
    <span className="class-card-banner">
      <strong className="class-card-title">{code}{title ? ` — ${title}` : ''}</strong>
      {subtitle && <span className="class-card-subtitle">{subtitle}</span>}
    </span>
    <span className="class-card-body">
      {items.length ? <ul className="class-card-items">{items.slice(0, 3).map(item => <li key={item.key}><span>{item.label}</span>{item.detail && <small>{item.detail}</small>}</li>)}</ul>
        : emptyItems && <span className="class-card-empty">{emptyItems}</span>}
      {children}
    </span>
    {meta && <span className="class-card-meta">{meta}</span>}
  </Container>
}

export function ClassCardGrid({ children }) {
  return <div className="class-card-grid">{children}</div>
}
