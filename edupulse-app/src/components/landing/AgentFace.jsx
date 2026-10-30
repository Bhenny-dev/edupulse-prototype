import { AGENT_COLORS } from './agentLook'

// The prop each agent holds up, drawn around (0, 0).
const PROPS = {
  guardian: c => <path d="M0 -16 L13 -11 L12 2 Q9 12 0 17 Q-9 12 -12 2 L-13 -11 Z" fill={c} stroke="#ffffff" strokeWidth="2.5" />,
  planner: c => <g><path d="M0 17 C-8 6 -12 0 -12 -5 A12 12 0 1 1 12 -5 C12 0 8 6 0 17 Z" fill={c} /><circle cx="0" cy="-5" r="4.5" fill="#ffffff" /></g>,
  researcher: c => <g><circle cx="-3" cy="-4" r="10" fill="#eff6ff" stroke={c} strokeWidth="4.5" /><path d="M5 4 L13 12" stroke={c} strokeWidth="5.5" strokeLinecap="round" /></g>,
  librarian: c => <g><path d="M-15 -11 Q-7 -14 0 -9 Q7 -14 15 -11 L15 11 Q7 8 0 13 Q-7 8 -15 11 Z" fill={c} /><path d="M0 -9 L0 13" stroke="#ffffff" strokeWidth="2" /></g>,
  ranker: c => <g fill={c}><rect x="-14" y="-12" width="7.5" height="26" rx="2.5" /><rect x="-3.5" y="-4" width="7.5" height="18" rx="2.5" opacity="0.75" /><rect x="7" y="3" width="7.5" height="11" rx="2.5" opacity="0.5" /></g>,
  comparator: c => <g><rect x="-16" y="-13" width="14" height="20" rx="2.5" fill="#ffffff" stroke={c} strokeWidth="2.5" /><rect x="2" y="-7" width="14" height="20" rx="2.5" fill="#ffffff" stroke={c} strokeWidth="2.5" /><path d="M-12 -7h6M-12 -2h6M6 -1h6M6 4h6" stroke={c} strokeWidth="2" strokeLinecap="round" /></g>,
  writer: c => <g transform="rotate(35)"><rect x="-4" y="-16" width="8" height="24" rx="2" fill={c} /><path d="M-4 8 L0 17 L4 8 Z" fill="#fde68a" /><path d="M-1.4 14 L0 17 L1.4 14 Z" fill="#0f172a" /></g>,
  verifier: c => <g><circle r="14" fill={c} /><path d="M-6 0 L-1.5 5 L7 -5" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></g>,
  corrector: c => <g transform="rotate(-40)" fill={c}><rect x="-3.5" y="-2" width="7" height="20" rx="3.5" /><path d="M-10 -12 A10 10 0 0 0 10 -12 L5 -12 L5 -6 L-5 -6 L-5 -12 Z" /></g>,
}

// A small portrait of one agent, drawn like its 3D figure in the workspace. Decorative: it is
// always hidden from assistive technology, and CSS animates the wave, the blink and the
// agent's own gesture (none with reduced motion).
export default function AgentFace({ agent, className = '' }) {
  const color = AGENT_COLORS[agent.key] || '#3b82f6'
  return (
    <svg className={`agent-face is-${agent.key} ${className}`} viewBox="-6 0 180 180" aria-hidden="true" focusable="false" style={{ '--agent': color }}>
      <ellipse className="face-shadow" cx="80" cy="172" rx="36" ry="6" />
      <g className="face-figure">
        <g className="face-arm is-rest"><rect x="33" y="104" width="15" height="40" rx="7.5" transform="rotate(14 40 108)" /><circle className="face-hand" cx="35" cy="146" r="8.5" /></g>
        <rect className="face-body" x="46" y="96" width="68" height="64" rx="30" />
        <rect x="63" y="112" width="34" height="24" rx="9" fill={color} />
        <circle cx="80" cy="124" r="4" fill="#ffffff" opacity="0.9" />
        <g className="face-head">
          <line className="face-stem" x1="80" y1="24" x2="80" y2="10" />
          <circle className="face-bulb" cx="80" cy="8" r="6.5" fill={color} />
          <circle cx="29" cy="62" r="9.5" fill={color} />
          <circle cx="131" cy="62" r="9.5" fill={color} />
          <rect className="face-skull" x="30" y="22" width="100" height="80" rx="32" />
          <rect className="face-screen" x="42" y="35" width="76" height="54" rx="20" />
          <g className="face-eyes"><rect x="59" y="51" width="12" height="19" rx="6" /><rect x="89" y="51" width="12" height="19" rx="6" /></g>
          <path className="face-mouth" d="M72 77 Q80 83 88 77" />
        </g>
        {/* The raised arm, in front of the head, holding the agent's prop up beside it. */}
        <g className="face-arm is-wave">
          <g transform="rotate(38 116 106)">
            <rect x="109" y="62" width="15" height="46" rx="7.5" />
            <circle className="face-hand" cx="116.5" cy="60" r="9" />
          </g>
          <g transform="translate(152 50)"><g className="face-prop">{PROPS[agent.key]?.(color)}</g></g>
        </g>
      </g>
    </svg>
  )
}
