import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { aiRequest, setAiAccessToken } from '../lib/aiClient'
import { accountUser, canSwitchRole, ROLE_TITLES } from '../lib/authRoles'
import { recordAudit } from '../lib/audit'

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

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAiAccessToken(session?.access_token)
      const signedInUser = session?.user ? accountUser(session.user) : null
      setUser(previous => session?.user ? accountUser(session.user, previous) : previous?.authenticated ? null : previous)
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
    await recordAudit(user, 'sign_out')
    await aiRequest('providers', 'DELETE').catch(() => {})
    if (user?.authenticated) await supabase?.auth.signOut()
    setAiAccessToken(undefined)
    setRoleHistory(prev => [...prev, { action: 'logout', role: user?.role, timestamp: new Date().toISOString() }])
    setUser(null)
  }, [user])

  const switchRole = useCallback((role) => {
    if (!canSwitchRole(user, role)) return false
    const previous = user.role
    setUser(current => ({ ...current, role, title: ROLE_TITLES[role] }))
    void recordAudit(user, 'view_switch', 'success', ROLE_TITLES[role])
    setRoleHistory(prev => [...prev, { action: 'role_switch', from: previous, to: role, timestamp: new Date().toISOString() }])
    return true
  }, [user])

  const hasPermission = useCallback((permission) => Boolean(user && ROLE_PERMISSIONS[user.role]?.includes(permission)), [user])
  const canAccess = useCallback((requiredRoles) => Boolean(user && (requiredRoles === 'all' || requiredRoles.includes(user.role))), [user])

  return (
    <AuthContext.Provider value={{ user, login, signIn, signInWithGoogle, logout, updateProfile, authLoading, switchRole, hasPermission, canAccess, roleHistory, ROLE_PERMISSIONS }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
