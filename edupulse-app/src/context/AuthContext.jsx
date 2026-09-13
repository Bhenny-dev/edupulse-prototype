import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { setAiAccessToken } from '../lib/aiClient'

const AuthContext = createContext(null)

// Three roles — FLOW_SPEC.md ground truth #5: the Dean and the Associate Dean
// have the SAME role in the business process. One shared UI and permission set
// (role: 'admin', displayed as Dean / Associate Dean). They remain separate
// demo personas below so both people can be demoed, but everything they can
// see and do is identical. No System Admin persona — account provisioning is a
// one-time cutover activity, not a role.
const DEMO_USERS = {
  dean: { id: 1, name: 'Ginard S. Guaki', role: 'admin', title: 'Dean', email: 'ginard.guaki@kcp.edu.ph', department: 'College of IT' },
  associate_dean: { id: 2, name: 'Marielle Angela Fianza-Buya', role: 'admin', title: 'Associate Dean', email: 'marielle.fianza-buya@kcp.edu.ph', department: 'College of IT' },
  // id: 1 — matches INSTRUCTORS[0] ("Sir Rogelio L. Guisdan") in src/data/mockData.js so
  // pages that filter mock data by the logged-in instructor's id resolve to his own records.
  instructor: { id: 1, name: 'Sir Rogelio L. Guisdan', role: 'instructor', title: 'Instructor', email: 'rogelio.guisdan@kcp.edu.ph', department: 'College of IT', specialization: 'Web & Mobile Development' },
  // Login.jsx and Layout.jsx's role switcher both key off 'student' — keep this key stable.
  student: { id: 4, name: 'Bhenny Benlor D. Rivera', role: 'student', title: 'Student', email: 'bhenny.rivera@kcp.edu.ph', department: 'College of IT', yearLevel: 3, section: 'BSIT-3A' },
}

// Permissions mirror the FLOW_SPEC phases. Note what is deliberately absent:
// no in-system syllabus approval for anyone (the signatory chain — Dean review
// → CAO approval → EVP noting — happens OUTSIDE the system on the downloaded
// file) and no grading permissions (EduPulse collates scores for visualization
// only; MG/TFG/FG stay in the official KCP grading sheet).
const ROLE_PERMISSIONS = {
  admin: ['load_courses', 'confirm_ai_loading', 'manage_block_sections', 'monitor_faculty', 'monitor_delivery', 'view_student_oversight', 'export_reports'],
  instructor: ['manage_syllabus', 'download_for_approval', 'upload_approved_syllabus', 'extract_outline', 'generate_courseware', 'review_courseware', 'publish_courseware', 'view_scoring_sheet', 'record_scores', 'notify_students'],
  student: ['view_published', 'open_materials', 'answer_assessments', 'view_own_performance'],
}

// Old saved sessions may carry the pre-unification roles — fold them into 'admin'.
function migrateUser(saved) {
  if (!saved) return null
  if (saved.role === 'dean') return DEMO_USERS.dean
  if (saved.role === 'associate_dean') return DEMO_USERS.associate_dean
  return saved
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('edupulse_user') || 'null')
      return saved && !saved.authenticated ? { ...migrateUser(saved), demo: true } : null
    } catch { return null }
  })
  const [authLoading, setAuthLoading] = useState(Boolean(supabase))
  const [roleHistory, setRoleHistory] = useState([])

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAiAccessToken(session?.access_token)
      if (session?.user) {
        const account = session.user
        const role = ['admin', 'instructor'].includes(account.app_metadata.role) ? account.app_metadata.role : 'student'
        setUser({ id: account.id, email: account.email, name: account.user_metadata.full_name || account.email, department: account.user_metadata.department || '', role, title: role === 'admin' ? 'Dean / Associate Dean' : role === 'instructor' ? 'Instructor' : 'Student', authenticated: true, demo: false })
      } else setUser(previous => previous?.authenticated ? null : previous)
      setAuthLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email, password) => {
    if (!supabase) throw new Error('Sign-in is not configured. Use the local preview or configure Supabase.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error('Sign-in failed. Check your credentials and the Supabase connection.')
  }, [])

  const updateProfile = useCallback(async (profile) => {
    if (user?.authenticated) {
      const { error } = await supabase.auth.updateUser({ data: { full_name: profile.name, department: profile.department }, ...(profile.password ? { password: profile.password } : {}) })
      if (error) throw new Error('Profile could not be saved. Please try again.')
    }
    setUser(previous => ({ ...previous, name: profile.name, department: profile.department }))
  }, [user])

  useEffect(() => {
    if (user) localStorage.setItem('edupulse_user', JSON.stringify(user))
    else localStorage.removeItem('edupulse_user')
  }, [user])

  // `persona` is a DEMO_USERS key (dean / associate_dean / instructor / student),
  // not a role — dean and associate_dean both resolve to role 'admin'.
  const login = useCallback((persona) => {
    if (!DEMO_USERS[persona] || user?.authenticated) return
    setAiAccessToken(undefined)
    setUser({ ...DEMO_USERS[persona], demo: true })
    setRoleHistory(prev => [...prev, { action: 'login', persona, timestamp: new Date().toISOString() }])
  }, [user])

  const logout = useCallback(async () => {
    if (user?.authenticated) await supabase?.auth.signOut()
    setAiAccessToken(undefined)
    setRoleHistory(prev => [...prev, { action: 'logout', role: user?.role, timestamp: new Date().toISOString() }])
    setUser(null)
  }, [user])

  const switchRole = useCallback((persona) => {
    if (user?.authenticated || !DEMO_USERS[persona]) return
    const previous = user?.title
    setUser({ ...DEMO_USERS[persona], demo: true })
    setRoleHistory(prev => [...prev, { action: 'role_switch', from: previous, to: persona, timestamp: new Date().toISOString() }])
  }, [user])

  const hasPermission = useCallback((permission) => {
    if (!user) return false
    return ROLE_PERMISSIONS[user.role]?.includes(permission) || false
  }, [user])

  const canAccess = useCallback((requiredRoles) => {
    if (!user) return false
    if (requiredRoles === 'all') return true
    return requiredRoles.includes(user.role)
  }, [user])

  return (
    <AuthContext.Provider value={{ user, login, signIn, logout, updateProfile, authLoading, switchRole, hasPermission, canAccess, roleHistory, ROLE_PERMISSIONS }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
