import { invokeModel } from '../providers.js'
import type { Connection } from '../connections.js'
import type { Identity } from '../contracts.js'
import { operatorInput, planValidatedTool } from '../../src/agents/toolPlanner.js'
import type { z } from 'zod'
import { researchCourse } from '../external/web.js'
export { operatorInput }
export function operatorRequest(input: z.infer<typeof operatorInput>, identity: Identity, connection: Connection | undefined, signal: AbortSignal) {
  return planValidatedTool(input, identity, signal, (system, prompt, signal, json) => invokeModel(system, prompt, signal, json, connection, input.operation === 'revise' ? 14000 : 1800), 26000, (query, abort) => researchCourse(query, abort, connection))
}
