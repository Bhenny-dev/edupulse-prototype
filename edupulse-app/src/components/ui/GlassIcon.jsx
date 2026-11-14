import './glass-icon.css'

const SIZES = { sm: [36, 17], md: [48, 22], lg: [60, 28] }

/** A tilted, coloured glass tile: body colour, rim light, specular band and a cast shadow in the same hue. */
export default function GlassIcon({ icon: Icon, color = 'var(--sky-500)', size = 'md', className = '' }) {
  const [box, glyph] = SIZES[size] || SIZES.md
  return <span className={`glass-icon ${className}`} style={{ '--glass-hue': color, '--glass-size': `${box}px` }} aria-hidden="true">
    <span className="glass-icon-face">{Icon && <Icon size={glyph} strokeWidth={2.25} />}</span>
  </span>
}
