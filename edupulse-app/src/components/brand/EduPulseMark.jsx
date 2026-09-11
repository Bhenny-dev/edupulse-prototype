// EduPulse's mark: a heartbeat/pulse line that resolves into an upward
// trend — the "pulse" of academic activity, trending up. One continuous
// stroke, no unrelated icon set. Color comes from `currentColor` so it
// adapts to whatever the parent's text color is (white on the gradient
// badge, brand blue on a light background, etc).
export default function EduPulseMark({ size = 24, strokeWidth = 12, className = '', style, ...props }) {
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
        d="M6,58 L18,58 L26,70 L36,30 L45,60 L56,48 L70,48 L92,20"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
