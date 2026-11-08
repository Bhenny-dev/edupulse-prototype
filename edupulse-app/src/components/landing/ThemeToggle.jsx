import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

// Day or night for the public site. It is the app's own dark-mode setting, so the choice carries
// on into the dashboard after signing in. The 3D school follows the same setting.
export default function ThemeToggle() {
  const { dark, toggleDark } = useTheme()
  return (
    <button type="button" className="theme-toggle" aria-pressed={dark} aria-label="Dark mode" title={dark ? 'Switch to day' : 'Switch to night'} onClick={toggleDark}>
      <span className="theme-toggle-knob" aria-hidden="true">{dark ? <Moon size={15} strokeWidth={2.4} /> : <Sun size={15} strokeWidth={2.4} />}</span>
    </button>
  )
}
