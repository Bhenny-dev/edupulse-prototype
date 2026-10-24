// Shared capability display and server role policy. Resource ownership is still
// enforced by the workspace/document services and database RLS.
export const PERFORMANCE_ROLES = Object.freeze(['dean', 'instructor', 'student'])
export const COURSEWARE_AUTHOR_ROLES = Object.freeze(['instructor', 'admin'])

/** @param {string | undefined} role */
export function canViewPerformance(role) {
  return PERFORMANCE_ROLES.includes(role || '')
}

/** @param {string | undefined} role */
export function canGenerateCourseware(role) {
  // Admin requests retain the owner's identity during instructor view switching.
  return COURSEWARE_AUTHOR_ROLES.includes(role || '')
}

/** @param {{ demo?: boolean, authenticated?: boolean } | null} user */
export function canUseSamplePerformance(user) {
  return user?.demo === true && user.authenticated !== true
}
