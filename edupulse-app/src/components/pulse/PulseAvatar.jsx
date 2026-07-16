// The Pulse character — a 2D, dimensionally-shaded chibi figure (SVG, not a
// 3D rig; see docs/REQUIREMENTS.md FR-GUIDE-05/06). Six expression states,
// each tied to a real product moment rather than decorative variety.

const EYES = {
  idle: <g className="pulse-blink">
    <ellipse cx="44" cy="66" rx="7" ry="8" fill="#1A2233" />
    <ellipse cx="76" cy="66" rx="7" ry="8" fill="#1A2233" />
    <circle cx="46.5" cy="63" r="2" fill="#fff" />
    <circle cx="78.5" cy="63" r="2" fill="#fff" />
  </g>,
  curious: <g>
    <ellipse cx="44" cy="64" rx="7.5" ry="9" fill="#1A2233" />
    <ellipse cx="77" cy="67" rx="6.5" ry="7.5" fill="#1A2233" />
    <circle cx="46.5" cy="61" r="2.1" fill="#fff" />
    <circle cx="79" cy="64.5" r="1.9" fill="#fff" />
    <path d="M36 52 Q44 46 52 51" stroke="#1A2233" strokeWidth="2.6" fill="none" strokeLinecap="round" />
  </g>,
  thinking: <g>
    <path d="M38 66 Q44 61 50 66" stroke="#1A2233" strokeWidth="4.5" fill="none" strokeLinecap="round" />
    <path d="M70 66 Q76 61 82 66" stroke="#1A2233" strokeWidth="4.5" fill="none" strokeLinecap="round" />
  </g>,
  encouraging: <g>
    <path d="M37 68 Q44 58 51 68" stroke="#1A2233" strokeWidth="4.5" fill="none" strokeLinecap="round" />
    <path d="M69 68 Q76 58 83 68" stroke="#1A2233" strokeWidth="4.5" fill="none" strokeLinecap="round" />
  </g>,
  cheerful: <g>
    <path d="M36 64 Q44 52 52 64" stroke="#1A2233" strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d="M68 64 Q76 52 84 64" stroke="#1A2233" strokeWidth="5" fill="none" strokeLinecap="round" />
  </g>,
  concern: <g>
    <ellipse cx="44" cy="68" rx="6.5" ry="7" fill="#1A2233" />
    <ellipse cx="76" cy="68" rx="6.5" ry="7" fill="#1A2233" />
    <path d="M37 56 Q44 60 51 57" stroke="#1A2233" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <path d="M69 57 Q76 60 83 56" stroke="#1A2233" strokeWidth="2.6" fill="none" strokeLinecap="round" />
  </g>,
}

const MOUTHS = {
  idle: <path d="M52 84 Q60 89 68 84" stroke="#1A2233" strokeWidth="3" fill="none" strokeLinecap="round" />,
  curious: <ellipse cx="60" cy="86" rx="5" ry="6" fill="#1A2233" />,
  thinking: <circle cx="60" cy="87" r="3" fill="#1A2233" />,
  encouraging: <path d="M48 82 Q60 96 72 82" stroke="#1A2233" strokeWidth="3.4" fill="none" strokeLinecap="round" />,
  cheerful: <path d="M45 80 Q60 100 75 80 Q60 92 45 80 Z" fill="#7A2E2E" stroke="#1A2233" strokeWidth="2.5" strokeLinejoin="round" />,
  concern: <path d="M52 90 Q60 85 68 90" stroke="#1A2233" strokeWidth="3" fill="none" strokeLinecap="round" />,
}

const BLUSH = <>
  <ellipse cx="33" cy="78" rx="6" ry="3.5" fill="#FF9E9E" opacity="0.55" />
  <ellipse cx="87" cy="78" rx="6" ry="3.5" fill="#FF9E9E" opacity="0.55" />
</>

function Extras({ expression }) {
  if (expression === 'thinking') {
    return (
      <g className="pulse-think-dots">
        <circle cx="94" cy="34" r="3" fill="var(--sky-300, #7dd3fc)" />
        <circle cx="102" cy="24" r="4" fill="var(--sky-300, #7dd3fc)" />
        <circle cx="112" cy="12" r="5" fill="var(--sky-300, #7dd3fc)" />
      </g>
    )
  }
  if (expression === 'cheerful') {
    return (
      <g className="pulse-sparkle">
        <path d="M14 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" fill="#FFD166" />
        <path d="M104 50 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="#FFD166" />
        <path d="M18 88 l2 4.5 4.5 2 -4.5 2 -2 4.5 -2 -4.5 -4.5 -2 4.5 -2 Z" fill="#8CE0D0" />
      </g>
    )
  }
  return null
}

export default function PulseAvatar({ expression = 'idle', size = 56, className = '' }) {
  const armUp = expression === 'encouraging' || expression === 'cheerful'
  return (
    <svg
      width={size} height={size} viewBox="0 0 120 120"
      className={`pulse-avatar pulse-avatar-${expression} ${className}`}
      role="img"
      aria-label={`Pulse, looking ${expression}`}
    >
      <defs>
        <radialGradient id="pulseBodyGrad" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#8FE3D8" />
          <stop offset="55%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </radialGradient>
        <filter id="pulseShadow" x="-40%" y="-20%" width="180%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* heartbeat antenna — ties the character to the product name */}
      <g className="pulse-antenna">
        <path d="M60 30 V16 L52 16 L58 4 L64 16 L70 16 L60 16" fill="none" />
        <path d="M60 30 L60 22 M52 22 L56 22 L59 14 L62 28 L65 22 L68 22"
          stroke="#0284C7" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="60" cy="12" r="4" fill="#FFD166" />
      </g>

      <Extras expression={expression} />

      {/* body */}
      <g filter="url(#pulseShadow)">
        <ellipse cx="60" cy="70" rx="42" ry="38" fill="url(#pulseBodyGrad)" />
      </g>

      {/* left arm */}
      <ellipse cx="20" cy={armUp ? 62 : 82} rx="9" ry="13"
        fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5"
        transform={armUp ? 'rotate(-25 20 62)' : ''} />
      {/* right arm */}
      <ellipse cx="100" cy="82" rx="9" ry="13" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" />

      {/* face plate */}
      <ellipse cx="60" cy="72" rx="34" ry="30" fill="#F5FBFF" opacity="0.94" />

      {BLUSH}
      {EYES[expression] || EYES.idle}
      {MOUTHS[expression] || MOUTHS.idle}
    </svg>
  )
}
