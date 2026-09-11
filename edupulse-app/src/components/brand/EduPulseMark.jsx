// EduPulse's mark: an open book — two page shapes fanned open around a
// spine — with the spine itself drawn as a small pulse/heartbeat bolt.
// Rectangular pages read unambiguously as paper at any size (arches read
// as eyebrows); the pulse detail rides in the spine gap without competing
// with the book silhouette. Color comes from `currentColor` so it adapts
// to whatever the parent's text color is (white on the gradient badge,
// brand blue on a light background, etc).
const PAGE_LEFT = 'M16,14 L48,30 L46,68 L12,84 Z'
const PAGE_RIGHT = 'M84,14 L52,30 L54,68 L88,84 Z'
const SPINE_PULSE = 'M50,34 L45,49 L55,57 L50,72'

export default function EduPulseMark({ size = 24, strokeWidth = 7, className = '', style, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
      {...props}
    >
      <path d={PAGE_LEFT} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d={PAGE_RIGHT} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d={SPINE_PULSE} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
