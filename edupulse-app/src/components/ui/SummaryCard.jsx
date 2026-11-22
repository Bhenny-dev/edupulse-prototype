import { Link } from 'react-router-dom'

// One cell of a flat stat strip (UI redesign U2): plain icon, value and label inside `.kpi-grid`.
// A linked cell keeps its label as the accessible name and its value as the description.
export default function SummaryCard({ icon: Icon, label, value, color = 'var(--sky-600)', to, onClick, description, children }) {
  const textualValue = typeof value === 'string' && /[a-z]/i.test(value)
  const Container = to ? Link : onClick ? 'button' : 'div'
  const action = to ? { to } : onClick ? { type: 'button', onClick } : {}
  return <Container className="kpi-card" {...action} {...((to || onClick) ? { 'aria-label': label, 'aria-description': description ?? String(value ?? '—') } : {})}>
    {Icon && <span className="kpi-icon" style={{ color }} aria-hidden="true"><Icon size={18} /></span>}
    <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}><div className={`kpi-value${textualValue ? ' kpi-value-text' : ''}`}>{children ?? value ?? '—'}</div><div className="kpi-label">{label}</div></div>
  </Container>
}
