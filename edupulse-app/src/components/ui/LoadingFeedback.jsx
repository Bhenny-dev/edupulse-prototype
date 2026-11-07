import './LoadingSkeleton.css'
import { SkeletonCard, SkeletonKPI, SkeletonTable } from './LoadingSkeleton'

export function LoadingDots() {
  return <span className="loading-dots" aria-hidden="true"><i /><i /><i /></span>
}

export function LoadingStatus({ label = 'Loading…', dots = false, className = '' }) {
  return <div className={`loading-status ${className}`} role="status">{dots ? <LoadingDots /> : <Spinner />}<span>{label}</span></div>
}

export function SkeletonContent({ label = 'Loading content…', variant = 'lines', rows = 4 }) {
  return <section className={`loading-content loading-content-${variant}`} aria-label={label} aria-busy="true">
    <LoadingStatus label={label} />
    <div aria-hidden="true">{variant === 'table' ? <SkeletonTable rows={rows} /> : variant === 'page' ? <><div className="kpi-grid mb-24">{[0, 1, 2, 3].map(id => <SkeletonKPI key={id} />)}</div><SkeletonTable rows={rows} /></> : <SkeletonCard lines={rows} />}</div>
  </section>
}

export function Spinner({ size = 16 }) {
  return <span className="loading-spinner" style={{ width: size, height: size }} aria-hidden="true" />
}

export function LoadingProgress({ label, value, max = 1 }) {
  return <div className="loading-progress" role="status">
    <span>{label}</span>
    <progress aria-label={label} max={max} {...(Number.isFinite(value) ? { value } : {})} />
  </div>
}
