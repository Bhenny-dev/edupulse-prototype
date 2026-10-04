import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { Mail, Lock, LogIn, GraduationCap, BookOpen, Shield, CalendarCog } from 'lucide-react'

// Same shared admin role as the Dean (FLOW_SPEC ground truth #5) — both
// offered here as separate demo personas so both people can be demoed.
const QUICK_ROLES = [
  { key: 'dean', label: 'Dean', icon: Shield },
  { key: 'associate_dean', label: 'Assoc. Dean', icon: CalendarCog },
  { key: 'instructor', label: 'Instructor', icon: BookOpen },
  { key: 'student', label: 'Student', icon: GraduationCap },
]

export default function LoginPanel({ className = '' }) {
  const { user, login, signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [googleEnabled, setGoogleEnabled] = useState(false)

  useEffect(() => { if (user?.authenticated) navigate('/dashboard', { replace: true }) }, [user, navigate])
  useEffect(() => {
    if (!supabase) return
    const controller = new AbortController()
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, signal: controller.signal,
    }).then(response => response.ok ? response.json() : null)
      .then(settings => { if (settings) setGoogleEnabled(Boolean(settings.external?.google)) })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try { await signIn(email, password); navigate('/dashboard') }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const handleQuickAccess = (persona) => {
    login(persona)
    navigate('/dashboard')
  }

  const handleGoogle = async () => {
    setBusy(true); setError('')
    try { await signInWithGoogle() }
    catch (err) { setError(err.message); setBusy(false) }
  }

  return (
    <div className={`login-panel ${className}`.trim()}>
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="login-email">Email</label>
          <div className="login-input-wrap">
            <Mail size={18} className="login-input-icon" aria-hidden="true" />
            <input
              id="login-email"
              type="email"
              required
              className="form-input"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="login-password">Password</label>
          <div className="login-input-wrap">
            <Lock size={18} className="login-input-icon" aria-hidden="true" />
            <input
              id="login-password"
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        </div>
        {error && <p role="alert" className="text-sm">{error}</p>}
        <button type="submit" disabled={busy} className="btn btn-primary w-full login-submit">
          <LogIn size={16} /> {busy ? 'Signing in…' : 'Sign In'}
        </button>
        <p className="login-note">
          Use the email and password assigned to your EduPulse account.
        </p>
      </form>

      {supabase && <div className="login-google-access">
        <button type="button" className="btn btn-secondary w-full" disabled={busy || !googleEnabled} onClick={handleGoogle}>Sign in with Google</button>
        <p className="login-note">{googleEnabled ? 'Administrators can use their Google account.' : 'Google sign-in is temporarily unavailable.'}</p>
      </div>}

      {(import.meta.env.DEV || import.meta.env.MODE === 'capture') && <div className="login-quick-access">
        <span className="login-quick-access-label">Quick preview access (testing only)</span>
        <div className="login-quick-access-row">
          {QUICK_ROLES.map(role => (
            <button
              key={role.key}
              type="button"
              className="quick-access-btn"
              onClick={() => handleQuickAccess(role.key)}
            >
              <role.icon size={16} aria-hidden="true" />
              {role.label}
            </button>
          ))}
        </div>
      </div>}
    </div>
  )
}
