import { invokeModel } from '../providers.js'
import { sealProviderState, unsealProviderState, type Connection } from '../connections.js'
import { ApiError, type Identity } from '../contracts.js'
import { operatorInput, planValidatedTool } from '../../src/agents/toolPlanner.js'
import { scheduledSyllabusDraft } from '../../src/agents/draftValidation.js'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { researchCourse } from '../external/web.js'
import {outlineDraftProgress} from '../../src/agents/draftProgress.js'
export { operatorInput }
const checkpoint = z.object({
  purpose: z.literal('syllabus-draft-v1'), binding: z.string(), expires: z.number(),
  pending: z.object({ research: z.custom<import('../../src/lib/rag/types.js').WebResearch>().optional(), draft: z.object({ next: z.number().int().min(0).max(100), patch: z.record(z.string(), z.unknown()), repair: z.object({ code: z.string(), details: z.array(z.string()) }).optional() }) }),
}).strict()
export async function operatorRequest(input: z.infer<typeof operatorInput>, identity: Identity, connection: Connection | undefined, signal: AbortSignal) {
  const staged = input.staged && input.operation === 'revise' && scheduledSyllabusDraft(input)
  if (input.continuation && !staged) throw new ApiError(400, 'DRAFT_STATE_INVALID', 'This draft step does not match the current request. Prepare a fresh preview.')
  const binding = createHash('sha256').update(JSON.stringify({ input: { ...input, continuation: undefined }, owner: identity.id, role: identity.role, provider: connection?.provider, model: connection?.model, connection: connection?.id })).digest('hex')
  let resume: z.infer<typeof checkpoint> | undefined
  if (input.continuation) {
    try { resume = checkpoint.parse(unsealProviderState(input.continuation, 220000)) }
    catch { throw new ApiError(400, 'DRAFT_STATE_INVALID', 'The draft checkpoint could not be verified. Prepare a fresh preview.') }
    if (resume.binding !== binding || resume.expires <= Date.now()) throw new ApiError(409, 'DRAFT_STATE_EXPIRED', 'The course, account, model or request changed, or this draft expired. Prepare a fresh preview.')
  }
  const result = await planValidatedTool(input, identity, signal, (system, prompt, signal, json) => invokeModel(system, prompt, signal, json, connection, input.operation === 'revise' ? 5000 : 1800), 26000, (query, abort) => researchCourse(query, abort, connection), staged ? { initialize: !resume, ...resume?.pending } : undefined)
  if ('pending' in result && result.pending) {
    const continuation = sealProviderState({ purpose: 'syllabus-draft-v1', binding, expires: resume?.expires || Date.now() + 30 * 60_000, pending: result.pending })
    if (continuation.length > 220000) throw new ApiError(413, 'DRAFT_STATE_LIMIT', 'The draft and sources exceed the checkpoint limit. Use a shorter source excerpt; nothing has been applied.')
    return { continuation, pending: true, generated: result.generated, progress: input.editor ? outlineDraftProgress(result.pending.draft.patch,input.editor) : null }
  }
  return result
}
