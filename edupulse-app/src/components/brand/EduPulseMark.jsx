// EduPulse's mark: an open book — two pages curving up from the spine —
// where the spine itself is drawn as a small pulse tick. One continuous
// stroke, no unrelated icon set. Color comes from `currentColor` so it
// adapts to whatever the parent's text color is (white on the gradient
// badge, brand blue on a light background, etc).
export default function EduPulseMark({ size = 24, strokeWidth = 11, className = '', style, ...props }) {
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
      <path
        d="M10,60 Q30,20 50,44 L50,58 L50,44 Q70,20 90,60"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
