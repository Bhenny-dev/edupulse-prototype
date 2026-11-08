import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { aiRequest, setAiAccessToken, setAiSubject } from '../lib/aiClient'
import { accountUser, canSwitchRole, ROLE_TITLES } from '../lib/authRoles'
import { recordAudit } from '../lib/audit'
import AccountSwitchModal from '../components/admin/AccountSwitchModal'

const AuthContext = createContext(null)

// Sample personas are available only on the local development server.
const DEMO_USERS = {
  admin: { id: 0, name: 'System Admin', role: 'admin', title: 'System Admin', department: 'EduPulse', canSwitchRoles: false },
  dean: { id: 1, name: 'Ginard S. Guaki', role: 'dean', title: 'Dean', email: 'ginard.guaki@kcp.edu.ph', department: 'College of IT' },
  associate_dean: { id: 2, name: 'Marielle Angela Fianza-Buya', role: 'associate_dean', title: 'Associate Dean', email: 'marielle.fianza-buya@kcp.edu.ph', department: 'College of IT' },
  instructor: { id: 1, name: 'Sir Rogelio L. Guisdan', role: 'instructor', title: 'Instructor', email: 'rogelio.guisdan@kcp.edu.ph', department: 'College of IT', specialization: 'Web & Mobile Development' },
  student: { id: 4, name: 'Bhenny Benlor D. Rivera', role: 'student', title: 'Student', email: 'bhenny.rivera@kcp.edu.ph', department: 'College of IT', yearLevel: 3, section: 'BSIT-3A' },
}

const ROLE_PERMISSIONS = {
  admin: ['manage_users', 'view_audit_logs', 'view_system_health', 'load_courses', 'confirm_ai_loading', 'manage_block_sections', 'monitor_faculty', 'monitor_delivery', 'view_student_oversight', 'export_reports'],
  dean: ['load_courses', 'confirm_ai_loading', 'manage_block_sections', 'monitor_faculty', 'monitor_delivery', 'view_student_oversight', 'export_reports'],
  associate_dean: ['load_courses', 'confirm_ai_loading', 'manage_block_sections', 'monitor_faculty', 'monitor_delivery', 'view_student_oversight', 'export_reports'],
  instructor: ['manage_syllabus', 'download_for_approval', 'upload_approved_syllabus', 'extract_outline', 'generate_courseware', 'review_courseware', 'publish_courseware', 'view_scoring_sheet', 'record_scores', 'notify_students'],
  student: ['view_published', 'open_materials', 'answer_assessments', 'view_own_performance'],
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Preview personas exist only in development and in the documentation capture build (vite --mode capture).
    if (!import.meta.env.DEV && import.meta.env.MODE !== 'capture') return null
    try {
      const saved = JSON.parse(localStorage.getItem('edupulse_user') || 'null')
      return saved?.demo ? saved : null
    } catch { return null }
  })
  const [authLoading, setAuthLoading] = useState(Boolean(supabase))
  const [roleHistory, setRoleHistory] = useState([])
  const principal = useRef(null), pendingSwitch = useRef(null)
  const [accountPicker, setAccountPicker] = useState(null)

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAiAccessToken(session?.access_token)
      const signedInUser = session?.user ? accountUser(session.user) : null
      principal.current = signedInUser
      if (!signedInUser?.canSwitchRoles) { setAiSubject(undefined); pendingSwitch.current?.(false); pendingSwitch.current = null; setAccountPicker(null) }
      setUser(previous => session?.user ? (signedInUser?.canSwitchRoles && previous?.supportSubject && previous.accountId === session.user.id ? { ...previous, canSwitchRoles: Boolean(signedInUser?.canSwitchRoles) } : accountUser(session.user, previous)) : previous?.authenticated ? null : previous)
      if (session?.user && !signedInUser) {
        setTimeout(() => { void supabase.auth.signOut() }, 0)
      }
      if (event === 'SIGNED_IN' && session?.user) {
        const marker = `${session.user.id}:${session.user.last_sign_in_at || ''}`
        if (signedInUser && sessionStorage.getItem('edupulse_last_audited_login') !== marker) {
          sessionStorage.setItem('edupulse_last_audited_login', marker)
          setTimeout(() => { void recordAudit(signedInUser, 'sign_in') }, 0)
        }
      }
      setAuthLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email, password) => {
    if (!supabase) throw new Error('Sign-in is not configured. Contact the EduPulse administrator.')
    if (email.trim().toLowerCase() === 'riverabenlor461@gmail.com') throw new Error('Use Google sign-in for the system admin account.')
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw new Error('Sign-in failed. Check your email and password.')
    if (!accountUser(data.user)) {
      await supabase.auth.signOut()
      throw new Error('This account has no EduPulse role. Contact the administrator.')
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error('Google sign-in is not configured.')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    })
    if (error) throw new Error('Google sign-in is unavailable. Contact the EduPulse administrator.')
  }, [])

  const updateProfile = useCallback(async (profile) => {
    if (user?.supportSubject) throw new Error('Return to System Admin to change your account profile or credentials.')
    if (user?.authenticated) {
      const { error } = await supabase.auth.updateUser({ data: { full_name: profile.name, department: profile.department }, ...(profile.password ? { password: profile.password } : {}) })
      if (error) throw new Error('Profile could not be saved. Please try again.')
    }
    setUser(previous => ({ ...previous, name: profile.name, department: profile.department }))
  }, [user])

  useEffect(() => {
    if (user?.demo) localStorage.setItem('edupulse_user', JSON.stringify(user))
    else localStorage.removeItem('edupulse_user')
  }, [user])

  const login = useCallback((persona) => {
    if ((!import.meta.env.DEV && import.meta.env.MODE !== 'capture') || !DEMO_USERS[persona] || user?.authenticated) return
    setAiAccessToken(undefined)
    setUser({ ...DEMO_USERS[persona], demo: true })
    setRoleHistory(prev => [...prev, { action: 'login', persona, timestamp: new Date().toISOString() }])
  }, [user])

  const logout = useCallback(async () => {
    if (user?.supportSubject) await aiRequest('support', 'POST', { id: user.supportSubject, operation: 'leave' }).catch(() => {})
    setAiSubject(undefined)
    await recordAudit(principal.current || user, 'sign_out')
    // Clear only the device cookie. Explicit Disconnect removes the saved key.
    await aiRequest('providers', 'DELETE', undefined, undefined, { query: { sessionOnly: 'true' } }).catch(() => {})
    if (user?.authenticated) await supabase?.auth.signOut()
    setAiAccessToken(undefined)
    setRoleHistory(prev => [...prev, { action: 'logout', role: user?.role, timestamp: new Date().toISOString() }])
    pendingSwitch.current?.(false); pendingSwitch.current = null; setAccountPicker(null)
    setUser(null)
  }, [user])

  const closePicker = useCallback(() => { pendingSwitch.current?.(false); pendingSwitch.current = null; setAccountPicker(null) }, [])
  const selectAccount = useCallback(async (account) => {
    const base = principal.current
    if (!base?.canSwitchRoles) throw new Error('Sign in again as the system admin.')
    const selected = account ? await aiRequest('support', 'POST', { id: account.id, operation: 'enter' }) : null
    if (user?.supportSubject && !selected) await aiRequest('support', 'POST', { id: user.supportSubject, operation: 'leave' })
    setAiSubject(selected?.id)
    const role = selected?.role || accountPicker
    setUser({ ...base, ...(selected || {}), accountId: base.id, accountEmail: base.email, role, title: ROLE_TITLES[role], supportSubject: selected?.id || null })
    setRoleHistory(previous => [...previous, { action: 'role_switch', to: role, subject: selected?.id || base.id, timestamp: new Date().toISOString() }])
    if (!selected) void recordAudit(base, 'view_switch', 'success', ROLE_TITLES[role])
    pendingSwitch.current?.(true); pendingSwitch.current = null; setAccountPicker(null)
  }, [accountPicker, user?.supportSubject])
  const switchRole = useCallback(async (role) => {
    if (!canSwitchRole(user, role)) return false
    if (role === 'admin') {
      if (user?.supportSubject) await aiRequest('support', 'POST', { id: user.supportSubject, operation: 'leave' }).catch(() => recordAudit(principal.current, 'view_switch', 'failure', 'Support exit audit unavailable; returned to admin locally'))
      setAiSubject(undefined); setUser(principal.current); closePicker(); return true
    }
    pendingSwitch.current?.(false)
    setAccountPicker(role)
    return new Promise(resolve => { pendingSwitch.current = resolve })
  }, [user, closePicker])

  const hasPermission = useCallback((permission) => Boolean(user && ROLE_PERMISSIONS[user.role]?.includes(permission)), [user])
  const canAccess = useCallback((requiredRoles) => Boolean(user && (requiredRoles === 'all' || requiredRoles.includes(user.role))), [user])

  return (
    <AuthContext.Provider value={{ user, login, signIn, signInWithGoogle, logout, updateProfile, authLoading, switchRole, hasPermission, canAccess, roleHistory, ROLE_PERMISSIONS }}>
      {children}
      {accountPicker && user?.canSwitchRoles && <AccountSwitchModal key={accountPicker} role={accountPicker} onSelect={selectAccount} onClose={closePicker} />}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
