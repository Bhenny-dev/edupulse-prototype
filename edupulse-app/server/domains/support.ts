import { z } from 'zod'
import { ApiError, type Identity } from '../contracts.js'
import { userDb } from '../database.js'

export const supportFilters = z.object({ role: z.enum(['student','instructor','dean','associate_dean']), q: z.string().trim().max(120).default(''), year: z.coerce.number().int().min(1).max(4).optional(), department: z.string().max(150).default(''), program: z.string().max(250).default(''), offset: z.coerce.number().int().min(0).max(100000).default(0) })
export async function supportAction(identity: Identity, operation: string, input: unknown = {}, signal?: AbortSignal) {
  if (identity.local || (!identity.supportActor && identity.role !== 'admin')) throw new ApiError(403, 'SUPPORT_FORBIDDEN', 'Only the verified system admin can select an account.')
  if(operation==='accounts'&&(input as {role?:string}).role==='student')input={...(input as Record<string,unknown>),department:'College of Information Technology'}
  let request=userDb(identity).rpc('edupulse_support_action', { subject: identity.supportActor ? identity.id : null, operation, input })
  if (signal) request=request.abortSignal(signal)
  const { data, error } = await request
  signal?.throwIfAborted()
  if (error) throw new ApiError(error.code === '42501' ? 403 : error.code === '40001' ? 409 : error.code === '22023' ? 400 : 503, 'SUPPORT_UNAVAILABLE', error.code === '42501' ? 'This support action is not allowed. Student activity and assessment submissions require the student’s own sign-in.' : error.code === '40001' ? 'A newer workspace exists. Reload before saving.' : error.code==='22023'?error.message: 'The selected account could not be verified. Return to System Admin and retry.')
  return data
}
/** The header selects a subject, never grants authorization. SQL rechecks the live owner and target on every operation. */
export async function supportIdentity(actor: Identity, id: string | null): Promise<Identity> {
  if (!id) return actor
  const result=await resolveSupportSubject(actor,id)
  return { ...actor, id: result.id, role: result.role, supportActor: actor.id, name: result.name, email: result.email }
}
/** Resolving a saved view is read-only; it does not replay an enter/leave command. */
export async function resolveSupportSubject(actor:Identity,id:string,signal?:AbortSignal) {
  if (!z.string().uuid().safeParse(id).success || actor.role !== 'admin' || actor.local) throw new ApiError(403, 'SUPPORT_FORBIDDEN', 'A verified system admin and a valid account are required.')
  return supportAction({ ...actor, id, supportActor: actor.id }, 'subject',{},signal)
}
