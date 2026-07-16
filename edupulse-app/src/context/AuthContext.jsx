import { createContext, useContext, useState, useEffect, useCallback } from 'react'

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
  admin: ['upload_edusuite_records', 'load_courses', 'confirm_ai_loading', 'manage_block_sections', 'monitor_faculty', 'monitor_delivery', 'view_student_oversight', 'export_reports'],
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
    const saved = localStorage.getItem('edupulse_user')
    return saved ? migrateUser(JSON.parse(saved)) : null
  })
  const [roleHistory, setRoleHistory] = useState([])

  useEffect(() => {
    if (user) localStorage.setItem('edupulse_user', JSON.stringify(user))
    else localStorage.removeItem('edupulse_user')
  }, [user])

  // `persona` is a DEMO_USERS key (dean / associate_dean / instructor / student),
  // not a role — dean and associate_dean both resolve to role 'admin'.
  const login = useCallback((persona) => {
    setUser(DEMO_USERS[persona])
    setRoleHistory(prev => [...prev, { action: 'login', persona, timestamp: new Date().toISOString() }])
  }, [])

  const logout = useCallback(() => {
    setRoleHistory(prev => [...prev, { action: 'logout', role: user?.role, timestamp: new Date().toISOString() }])
    setUser(null)
  }, [user])

  const switchRole = useCallback((persona) => {
    const previous = user?.title
    setUser(DEMO_USERS[persona])
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
    <AuthContext.Provider value={{ user, login, logout, switchRole, hasPermission, canAccess, roleHistory, ROLE_PERMISSIONS }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
