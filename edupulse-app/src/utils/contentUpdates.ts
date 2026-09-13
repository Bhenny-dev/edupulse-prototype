/** Recheck review state when an asynchronous generation completes. */
export function mergeDrafts<T extends { status: string }>(current: Record<string, T>, updates: Record<string, T>): Record<string, T> {
  const next = { ...current }
  for (const [id, item] of Object.entries(updates)) {
    if (!['checked', 'published'].includes(current[id]?.status)) next[id] = item
  }
  return next
}
