import { Link } from 'react-router-dom'

export default function SummaryCard({ icon: Icon, label, value, color = 'var(--sky-500)', bg = 'var(--sky-100)', to, onClick, description, children }) {
  const Container = to ? Link : onClick ? 'button' : 'div'
  const action = to ? { to } : onClick ? { type: 'button', onClick } : {}
  return <Container className="kpi-card" {...action} {...((to || onClick) ? { 'aria-label': label, 'aria-description': description ?? String(value ?? '—') } : {})}>
    <div className="kpi-icon" style={{ background: bg }}><Icon size={22} style={{ color }} aria-hidden="true" /></div>
    <div><div className="kpi-value">{children ?? value ?? '—'}</div><div className="kpi-label">{label}</div></div>
  </Container>
}
