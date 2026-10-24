import { z } from 'zod'
import { ApiError, type Identity } from '../contracts.js'
import { userDb } from '../database.js'

const identifier = z.string().regex(/^[a-f0-9]{32}$/)
export const academicCommand = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('sync') }),
  z.object({ operation: z.literal('open'), publication: identifier, version: identifier }),
  z.object({ operation: z.literal('submit'), publication: identifier, version: identifier, responses: z.array(z.number().int().min(0).max(3)).min(3).max(5) }),
])
export async function readAcademic(identity: Identity) {
  if (identity.role === 'guest') throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Sign in to read academic records.')
  if (identity.local) return { mode: 'local', courses: [], enrollments: [], publications: [], attempts: [], accesses: [] }
  const client = userDb(identity)
  const tables = ['courses', 'enrollments', 'publications', ...(identity.role === 'associate_dean' ? [] : ['attempts', 'material_access'])]
  const rows = await Promise.all(tables.map(async table => {
    const { data, error } = await client.from(`edupulse_${table}`).select('*').limit(1000)
    if (error) throw new ApiError(503, 'ACADEMIC_UNAVAILABLE', 'Academic records are unavailable. Check the connection and academic migration; no sample records are substituted.')
    return [table === 'material_access' ? 'accesses' : table, data || []] as const
  }))
  return { mode: 'cloud', attempts: [], accesses: [], ...Object.fromEntries(rows) }
}
export async function executeAcademic(identity: Identity, input: z.infer<typeof academicCommand>) {
  if (identity.local || identity.role === 'guest') throw new ApiError(403, 'FORBIDDEN', 'Use an authenticated academic account for shared records.')
  const client = userDb(identity)
  if (input.operation === 'sync') {
    if (!['instructor', 'admin'].includes(identity.role)) throw new ApiError(403, 'FORBIDDEN', 'Only an instructor can sync their own academic workspace.')
    const { error } = await client.rpc('edupulse_sync_academic_workspace')
    if (error) throw new ApiError(503, 'ACADEMIC_SYNC_FAILED', 'Your workspace could not be synchronized. Review its publication states and retry.')
    return { synced: true }
  }
  if (identity.role !== 'student') throw new ApiError(403, 'FORBIDDEN', 'Only enrolled students can open materials or submit assessment responses.')
  const { data, error } = await client.rpc('edupulse_academic_action', { ...input, responses: input.operation === 'submit' ? input.responses : [] })
  if (error) throw new ApiError(error.code === '42501' ? 403 : error.code === '22023' ? 400 : 503, 'ACADEMIC_ACTION_FAILED', 'The published material, enrollment or responses could not be verified. Refresh and try again.')
  return data
}
