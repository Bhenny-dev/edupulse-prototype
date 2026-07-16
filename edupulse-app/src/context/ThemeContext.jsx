import { createContext, useContext, useState, useEffect } from 'react'

/* ─── Theme Context ───
 * Shared dark/light mode state with localStorage persistence.
 * Toggles .dark-mode class on <html> element for CSS variable overrides.
 */

const ThemeContext = createContext(null)

function getInitialDark() {
  try {
    const stored = localStorage.getItem('edupulse-dark-mode')
    if (stored !== null) return stored === 'true'
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(getInitialDark)

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark-mode')
    } else {
      root.classList.remove('dark-mode')
    }
    try { localStorage.setItem('edupulse-dark-mode', String(dark)) } catch {}
  }, [dark])

  const toggleDark = () => setDark(prev => !prev)

  return (
    <ThemeContext.Provider value={{ dark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
