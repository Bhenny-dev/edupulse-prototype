import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { Mail, Lock, LogIn, GraduationCap, BookOpen, Shield, CalendarCog, Eye, EyeOff } from 'lucide-react'

const QUICK_ROLES = [
  { key: 'admin', label: 'System Admin', icon: Shield },
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
  const [passwordVisible, setPasswordVisible] = useState(false)
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
              type={passwordVisible ? 'text' : 'password'}
              required
              className="form-input login-password-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button type="button" className="login-password-toggle" aria-label={passwordVisible ? 'Hide password' : 'Show password'} aria-controls="login-password" aria-pressed={passwordVisible} onClick={() => setPasswordVisible(visible => !visible)}>
              {passwordVisible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
            </button>
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
        <button type="button" className="btn btn-secondary w-full" disabled={busy || !googleEnabled} onClick={handleGoogle}>
          <svg className="login-google-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="#4285F4" d="M22.56 12.25c0-.73-.06-1.42-.19-2.09H12v3.96h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-7.95Z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.8l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.87 0-5.3-1.94-6.17-4.54H2.15v2.85A11 11 0 0 0 12 23Z" />
            <path fill="#FBBC05" d="M5.83 13.96a6.6 6.6 0 0 1 0-3.92V7.19H2.15a11 11 0 0 0 0 9.62l3.68-2.85Z" />
            <path fill="#EA4335" d="M12 5.5c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.56 10.56 0 0 0 12 1a11 11 0 0 0-9.85 6.19l3.68 2.85C6.7 7.44 9.13 5.5 12 5.5Z" />
          </svg>
          Sign in with Google
        </button>
        <p className="login-note">{googleEnabled ? 'System admin: choose your Google account. Other roles use email and password.' : 'Google sign-in is temporarily unavailable.'}</p>
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
