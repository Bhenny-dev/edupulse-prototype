export const OWNER_EMAIL = 'riverabenlor461@gmail.com'
/** @type {Record<string, string>} */
export const ROLE_TITLES = { admin: 'System Admin', dean: 'Dean', associate_dean: 'Associate Dean', instructor: 'Instructor', student: 'Student' }

/**
 * @param {{id: string, email?: string, app_metadata?: {role?: string, provider?: string, providers?: string[]}, user_metadata?: {full_name?: string, department?: string}} | null} account
 * @param {{id?: string, authenticated?: boolean, role?: string} | null} [previous]
 */
export function accountUser(account, previous) {
  const email = account?.email?.trim().toLowerCase()
  const assignedRole = account?.app_metadata?.role
  if (!account || !email || !assignedRole || !ROLE_TITLES[assignedRole]) return null
  // Roles from editable user_metadata cannot grant access.
  if (assignedRole === 'admin' && (email !== OWNER_EMAIL ||
      !account.app_metadata?.providers?.includes('google'))) return null
  const canSwitchRoles = assignedRole === 'admin' && email === OWNER_EMAIL
  const role = canSwitchRoles && previous?.id === account.id && previous?.authenticated && previous.role && ROLE_TITLES[previous.role]
    ? previous.role : assignedRole
  return {
    id: account.id, email, name: canSwitchRoles ? 'System Admin' : account.user_metadata?.full_name || email.split('@')[0],
    department: account.user_metadata?.department || '', role, baseRole: assignedRole,
    title: ROLE_TITLES[role], canSwitchRoles, provider: canSwitchRoles ? 'google' : account.app_metadata?.provider || 'email',
    authenticated: true, demo: false,
  }
}

/**
 * @param {{authenticated?: boolean, canSwitchRoles?: boolean, baseRole?: string, email?: string} | null} user
 * @param {string} role
 */
export function canSwitchRole(user, role) {
  return Boolean(user?.authenticated && user.canSwitchRoles && user.baseRole === 'admin' &&
    user.email?.toLowerCase() === OWNER_EMAIL && ROLE_TITLES[role])
}
