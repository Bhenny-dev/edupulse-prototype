import { Link } from 'react-router-dom'

export default function SummaryCard({ icon: Icon, label, value, color = 'var(--sky-500)', bg = 'var(--sky-100)', to, onClick, description, children }) {
  const textualValue = typeof value === 'string' && /[a-z]/i.test(value)
  const Container = to ? Link : onClick ? 'button' : 'div'
  const action = to ? { to } : onClick ? { type: 'button', onClick } : {}
  return <Container className="kpi-card" style={{ padding: 'clamp(12px, 2vw, 20px)' }} {...action} {...((to || onClick) ? { 'aria-label': label, 'aria-description': description ?? String(value ?? '—') } : {})}>
    <div className="kpi-icon" style={{ background: bg }}><Icon size={22} style={{ color }} aria-hidden="true" /></div>
    <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}><div className="kpi-value" style={textualValue ? { fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.4 } : undefined}>{children ?? value ?? '—'}</div><div className="kpi-label">{label}</div></div>
  </Container>
}
