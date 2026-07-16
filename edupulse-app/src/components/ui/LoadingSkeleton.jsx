import './LoadingSkeleton.css'

export function SkeletonLine({ width = '100%', height = '16px', style }) {
  return <div className="skeleton-line" style={{ width, height, ...style }} />
}

export function SkeletonCircle({ size = 40, style }) {
  return <div className="skeleton-circle" style={{ width: size, height: size, ...style }} />
}

export function SkeletonCard({ lines = 3, style }) {
  return (
    <div className="skeleton-card" style={style}>
      <SkeletonLine width="60%" height="20px" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === lines - 1 ? '40%' : '100%'} />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4, style }) {
  return (
    <div className="skeleton-card" style={{ padding: 0, overflow: 'hidden', ...style }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 0, borderBottom: '2px solid var(--gray-100)', background: 'var(--sky-50)', padding: '12px 16px' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} width="70%" height="14px" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 0, padding: '12px 16px', borderBottom: r < rows - 1 ? '1px solid var(--gray-100)' : 'none' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} width={c === 0 ? '80%' : '50%'} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonKPI({ style }) {
  return (
    <div className="skeleton-card" style={{ textAlign: 'center', ...style }}>
      <SkeletonCircle size={48} style={{ margin: '0 auto 12px' }} />
      <SkeletonLine width="60%" height="24px" style={{ margin: '0 auto 8px' }} />
      <SkeletonLine width="40%" height="12px" style={{ margin: '0 auto' }} />
    </div>
  )
}
