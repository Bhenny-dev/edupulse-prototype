export const OWNER_EMAIL = 'riverabenlor461@gmail.com'
export const SYSTEM_ADMIN_EMAILS = Object.freeze([OWNER_EMAIL, '2024-1-0262.botay@kcp.edu.ph'])
/** @param {string | undefined | null} email */
export const isSystemAdminEmail = email => typeof email === 'string' && SYSTEM_ADMIN_EMAILS.includes(email.trim().toLowerCase())
/** @type {Record<string, string>} */
export const ROLE_TITLES = { admin: 'System Admin', dean: 'Dean', associate_dean: 'Program Coordinator', instructor: 'Instructor', student: 'Student' }

/**
 * @param {{id: string, email?: string, app_metadata?: {role?: string, provider?: string, providers?: string[]}, user_metadata?: {full_name?: string, department?: string, student_number?: string, year_level?: number, program?: string}} | null} account
 * @param {{id?: string, authenticated?: boolean, role?: string} | null} [previous]
 */
export function accountUser(account, previous) {
  const email = account?.email?.trim().toLowerCase()
  const assignedRole = account?.app_metadata?.role
  if (!account || !email || typeof assignedRole !== 'string' || !Object.hasOwn(ROLE_TITLES, assignedRole)) return null
  // Roles from editable user_metadata cannot grant access.
  if (assignedRole === 'admin' && (!isSystemAdminEmail(email) ||
      !account.app_metadata?.providers?.includes('google'))) return null
  const canSwitchRoles = assignedRole === 'admin' && isSystemAdminEmail(email)
  const role = canSwitchRoles && previous?.id === account.id && previous?.authenticated && typeof previous.role === 'string' && Object.hasOwn(ROLE_TITLES, previous.role)
    ? previous.role : assignedRole
  return {
    id: account.id, email, name: canSwitchRoles ? 'System Admin' : account.user_metadata?.full_name || email.split('@')[0],
    department: account.user_metadata?.department || '', role, baseRole: assignedRole,
    studentNumber:account.user_metadata?.student_number || '', yearLevel:account.user_metadata?.year_level || null, program:account.user_metadata?.program || '',
    title: ROLE_TITLES[role], canSwitchRoles, provider: canSwitchRoles ? 'google' : account.app_metadata?.provider || 'email',
    authenticated: true, demo: false,
  }
}

/**
 * @param {{authenticated?: boolean, canSwitchRoles?: boolean, baseRole?: string, email?: string, accountEmail?: string} | null} user
 * @param {string} role
 */
export function canSwitchRole(user, role) {
  return Boolean(user?.authenticated && user.canSwitchRoles && user.baseRole === 'admin' &&
    isSystemAdminEmail(user.accountEmail || user.email) && typeof role === 'string' && Object.hasOwn(ROLE_TITLES, role))
}
