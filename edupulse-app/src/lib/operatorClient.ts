import { aiRequest } from './aiClient.js'
import { aiPreference, invokeBrowserModel } from './browserAI.js'
import type { z } from 'zod'
import type { operatorInput } from '../agents/toolPlanner.js'

/** Both runtimes use the same strict planner and patch validation, never an executable model result. */
export async function requestOperator(input: z.input<typeof operatorInput>, signal: AbortSignal) {
  if (aiPreference() !== 'browser') return aiRequest('operator', 'POST', input, signal)
  const { operatorInput: schema, planValidatedTool } = await import('../agents/toolPlanner.js')
  const parsed = schema.parse(input)
  return planValidatedTool(parsed, { id: 'on-device-proposal', role: parsed.viewRole, local: true }, signal, invokeBrowserModel, 6000, (topic, abort) => aiRequest('web-search', 'POST', { topic: topic.slice(0, 200), bibliography: true }, abort))
}
