import { aiRequest, aiSessionVersion, ApiRequestError } from './aiClient.js'
import { aiPreference, invokeBrowserModel } from './browserAI.js'
import type { z } from 'zod'
import type { operatorInput } from '../agents/toolPlanner.js'
import { scheduledSyllabusDraft } from '../agents/draftValidation.js'

type OperatorReply = Record<string, any>
// Only opaque, authenticated checkpoints live here; never apply partial fields.
// Account/session changes, a different editor/request and cancellation invalidate it.
let checkpoint: { key: string; continuation: string; expires: number } | undefined

/** Both runtimes use the same strict planner and patch validation, never an executable model result. */
export async function requestOperator(input: z.input<typeof operatorInput>, signal: AbortSignal): Promise<OperatorReply> {
  if (aiPreference() !== 'browser') {
    if (input.operation !== 'revise' || !scheduledSyllabusDraft({ ...input, editor: input.editor || null, section: input.section || null, context: input.context || '' })) return aiRequest<OperatorReply>('operator', 'POST', input, signal)
    const session = aiSessionVersion(), key = JSON.stringify({ input, session })
    if (checkpoint?.key !== key || checkpoint.expires <= Date.now()) checkpoint = undefined
    let continuation = checkpoint?.continuation
    try {
      for (let step = 0; step < 110; step++) {
        signal.throwIfAborted()
        let result: OperatorReply | undefined
        for (let attempt = 0; attempt < 2; attempt++) {
          try { result = await aiRequest<OperatorReply>('operator', 'POST', { ...input, staged: true, ...(continuation ? { continuation } : {}) }, signal); break }
          catch (error) {
            if (signal.aborted || !(error instanceof ApiRequestError) || !['NETWORK_ERROR', 'TIMEOUT'].includes(error.code || '') || attempt) throw error
          }
        }
        signal.throwIfAborted()
        if (session !== aiSessionVersion()) throw new Error('The account session changed. Prepare a fresh preview.')
        if (!result) throw new Error('The draft step returned no response. Prepare a fresh preview.')
        if (!result.pending) { checkpoint = undefined; return result }
        if (!result.continuation) throw new Error('The draft step did not return a valid checkpoint. Prepare a fresh preview.')
        continuation = result.continuation
        checkpoint = { key, continuation: result.continuation, expires: Date.now() + 30 * 60_000 }
      }
      throw new Error('This draft exceeded the bounded preparation steps. Nothing has been applied.')
    } catch (error) {
      if (signal.aborted || session !== aiSessionVersion() || error instanceof ApiRequestError && ['DRAFT_STATE_INVALID', 'DRAFT_STATE_EXPIRED'].includes(error.code || '')) checkpoint = undefined
      throw error
    }
  }
  const { operatorInput: schema, planValidatedTool } = await import('../agents/toolPlanner.js')
  const parsed = schema.parse(input)
  return planValidatedTool(parsed, { id: 'on-device-proposal', role: parsed.viewRole, local: true }, signal, invokeBrowserModel, 6000, (topic, abort) => aiRequest('web-search', 'POST', { topic: topic.slice(0, 200), bibliography: true }, abort))
}
