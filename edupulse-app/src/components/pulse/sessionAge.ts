/** Short age of a conversation, as in "2h", "3d" or "2w". */
export function sessionAge(value: string, now = Date.now()) {
  const minutes = Math.max(0, (now - new Date(value).getTime()) / 60000)
  if (!Number.isFinite(minutes)) return ''
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${Math.floor(minutes)}m`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`
  const days = minutes / 1440
  if (days < 7) return `${Math.floor(days)}d`
  if (days < 30) return `${Math.floor(days / 7)}w`
  if (days < 365) return `${Math.floor(days / 30)}mo`
  return `${Math.floor(days / 365)}y`
}
