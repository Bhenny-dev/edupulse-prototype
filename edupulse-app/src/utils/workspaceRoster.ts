import { jsonValue } from './jsonValue'

/**
 * A class list written for the instructor (a student joining with a code, the Dean adding a block) changes only
 * the roster keys of the instructor's workspace. Such a change merges into pending edits instead of a conflict.
 */
export const ROSTER_KEYS = ['registrations', 'enrollmentOverrides'] as const
type Workspace = Record<string, unknown> | null | undefined
const withoutRoster = (data: Workspace) => Object.fromEntries(Object.entries(data || {}).filter(([key]) => !(ROSTER_KEYS as readonly string[]).includes(key)))
const rosterOf = (data: Workspace) => ROSTER_KEYS.map(key => (data || {})[key] ?? null)
export const rosterOnlyChange = (base: Workspace, remote: Workspace) => Boolean(base && remote) && jsonValue(withoutRoster(base)) === jsonValue(withoutRoster(remote))
export const sameRoster = (left: Workspace, right: Workspace) => jsonValue(rosterOf(left)) === jsonValue(rosterOf(right))
export function withRoster<T extends Record<string, unknown>>(local: T, remote: Workspace): T {
  const next: Record<string, unknown> = { ...local }
  for (const key of ROSTER_KEYS) { if (remote && key in remote) next[key] = remote[key]; else delete next[key] }
  return next as T
}
