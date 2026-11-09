import { aiRequest, aiSessionVersion, ApiRequestError } from './aiClient.js'
import { aiPreference, invokeBrowserModel, browserAIState } from './browserAI.js'
import type { z } from 'zod'
import type { operatorInput } from '../agents/toolPlanner.js'
import { scheduledSyllabusDraft } from '../agents/draftValidation.js'
import {outlineDraftProgress} from '../agents/draftProgress.js'
import type {PlannerExecution} from '../agents/toolPlanner.js'

type OperatorReply = Record<string, any>
// Only opaque, authenticated checkpoints live here; never apply partial fields.
// Account/session changes, a different editor/request and cancellation invalidate it.
let checkpoint: { key: string; continuation: string; expires: number } | undefined
let browserCheckpoint:{key:string;state:PlannerExecution;expires:number}|undefined

/** Both runtimes use the same strict planner and patch validation, never an executable model result. */
export async function requestOperator(input: z.input<typeof operatorInput>, signal: AbortSignal, onProgress?:(progress:NonNullable<ReturnType<typeof outlineDraftProgress>>)=>void): Promise<OperatorReply> {
  if (aiPreference() !== 'browser') {
    if (input.operation !== 'revise' || !scheduledSyllabusDraft({ ...input, editor: input.editor || null, section: input.section || null, context: input.context || '' })) return aiRequest<OperatorReply>('operator', 'POST', input, signal)
    const session = aiSessionVersion(), key = JSON.stringify({ input, session })
    if (checkpoint?.key !== key || checkpoint.expires <= Date.now()) checkpoint = undefined
    let continuation = checkpoint?.continuation
    try {
      for (let step = 0; step < 160; step++) {
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
        if (!result.pending) { checkpoint = undefined; if(result.patch&&input.editor){const progress=outlineDraftProgress(result.patch,input.editor);if(progress)onProgress?.(progress)};return result }
        if(result.progress&&input.editor){const progress=outlineDraftProgress({courseOutline:result.progress.rows},input.editor);if(progress)onProgress?.(progress)}
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
  if(parsed.operation==='revise'&&scheduledSyllabusDraft(parsed)) {
    const session=aiSessionVersion(),key=JSON.stringify({input:parsed,session,model:browserAIState().model})
    if(browserCheckpoint?.key!==key||browserCheckpoint.expires<=Date.now())browserCheckpoint=undefined
    let execution:PlannerExecution=browserCheckpoint?.state||{initialize:true}
    try {
      for(let step=0;step<160;step++) {
        signal.throwIfAborted()
        if(session!==aiSessionVersion())throw new Error('The account session changed. Prepare a fresh preview.')
        const result=await planValidatedTool(parsed,{id:'on-device-proposal',role:parsed.viewRole,local:true},signal,invokeBrowserModel,6000,(topic,abort)=>aiRequest('web-search','POST',{topic:topic.slice(0,200),bibliography:true},abort),execution)
        signal.throwIfAborted()
        if(session!==aiSessionVersion())throw new Error('The account session changed. Prepare a fresh preview.')
        if('patch' in result&&result.patch&&parsed.editor){const progress=outlineDraftProgress(result.patch,parsed.editor);if(progress)onProgress?.(progress)}
        if(!('pending' in result)||!result.pending){browserCheckpoint=undefined;return result}
        execution={initialize:false,...result.pending}
        browserCheckpoint={key,state:execution,expires:Date.now()+30*60_000}
        if(parsed.editor){const progress=outlineDraftProgress(execution.draft!.patch,parsed.editor);if(progress)onProgress?.(progress)}
      }
      throw new Error('This draft exceeded the bounded preparation steps. Completed draft weeks remain available for review.')
    }catch(error){if(session!==aiSessionVersion())browserCheckpoint=undefined;throw error}
  }
  return planValidatedTool(parsed, { id: 'on-device-proposal', role: parsed.viewRole, local: true }, signal, invokeBrowserModel, 6000, (topic, abort) => aiRequest('web-search', 'POST', { topic: topic.slice(0, 200), bibliography: true }, abort))
}
