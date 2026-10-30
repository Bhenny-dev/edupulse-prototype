// The Pulse ring drawn in SVG. It stands in for the 3D ring with reduced motion, without
// WebGL, and until the 3D scene has loaded. Decorative.
export default function PulseRing() {
  return (
    <svg className="pulse-ring-svg" viewBox="0 0 220 220" focusable="false" aria-hidden="true">
      <defs>
        <linearGradient id="lp-ring-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#93c5fd" />
          <stop offset="0.5" stopColor="#2563eb" />
          <stop offset="1" stopColor="#1e40af" />
        </linearGradient>
      </defs>
      <g transform="rotate(-24 110 110)">
        <ellipse cx="110" cy="110" rx="84" ry="54" fill="none" stroke="url(#lp-ring-body)" strokeWidth="13" />
        <ellipse cx="110" cy="110" rx="62" ry="38" fill="none" stroke="#dbeafe" strokeWidth="3" />
        <path d="M 30 98 A 84 54 0 0 1 104 56" fill="none" stroke="#dbeafe" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
      </g>
    </svg>
  )
}
