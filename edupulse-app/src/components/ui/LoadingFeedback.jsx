import './LoadingSkeleton.css'

export function Spinner({ size = 16 }) {
  return <span className="loading-spinner" style={{ width: size, height: size }} aria-hidden="true" />
}

export function LoadingProgress({ label, value, max = 1 }) {
  return <div className="loading-progress" role="status">
    <span>{label}</span>
    <progress aria-label={label} max={max} {...(Number.isFinite(value) ? { value } : {})} />
  </div>
}
