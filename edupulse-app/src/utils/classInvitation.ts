import { isClassCode, normalizeClassCode } from './classroom'

export const classInvitationPath = (raw: string) => {
  if (!isClassCode(raw)) throw new Error('This class has no active invitation code.')
  return `/join/${normalizeClassCode(raw)}`
}
/** Fragment links stay on this application and contain no account credentials. */
export function classInvitationUrl(code: string, base = window.location.href) {
  const url = new URL(base)
  url.search = ''
  url.hash = classInvitationPath(code)
  return url.href
}
