import type { Identity } from './contracts.js'
import { userDb } from './database.js'
import type { AgentReport } from '../src/lib/rag/registry.js'
import type { UseDecision } from '../src/lib/rag/policy.js'
import type { Verification } from '../src/lib/rag/types.js'

export type RunOutcome = 'answered' | 'quoted-sources' | 'insufficient-evidence' | 'references' | 'declined' | 'failed'
export type AgentRunRow = {
  id: string; actor_id: string; actor_role: string; workflow: 'chat' | 'courseware'; task: string; outcome: RunOutcome
  policy_rule: string | null; provider: string; model: string; duration_ms: number; sources: number; claims: number; unsupported: number
  agents: Pick<AgentReport, 'agent' | 'operation' | 'steps' | 'ms' | 'status' | 'goalMet'>[]
}
type RunResult = {
  requestId: string; task?: string; mode?: string; policy?: UseDecision | null; provider?: string; model?: string | null
  verification?: Verification | null; sources?: unknown[]; agentReport?: AgentReport[]
}

const OUTCOMES: Record<string, RunOutcome> = { generated: 'answered', courseware: 'answered', retrieval: 'quoted-sources', 'insufficient-evidence': 'insufficient-evidence', references: 'references', declined: 'declined' }
const clip = (value: unknown, max: number) => String(value ?? '').slice(0, max)

/** The tracked facts of one run: task, outcome, timing and each agent's goal result. Never prompt, answer or document text. */
export function agentRunRow(identity: Identity, workflow: AgentRunRow['workflow'], result: RunResult, durationMs: number): AgentRunRow {
  const outcome = OUTCOMES[result.mode || ''] || 'answered'
  return {
    id: result.requestId, actor_id: identity.id, actor_role: identity.role, workflow,
    task: outcome === 'declined' ? 'none' : clip(result.task || workflow, 32), outcome,
    policy_rule: result.policy && !result.policy.allowed ? result.policy.rule : null,
    provider: clip(result.provider, 40), model: clip(result.model, 120), duration_ms: Math.max(0, Math.round(durationMs)),
    sources: Math.min(32767, result.sources?.length || 0), claims: Math.min(32767, result.verification?.claims.length || 0),
    unsupported: Math.min(32767, result.verification?.unsupported || 0),
    agents: (result.agentReport || []).map(({ agent, operation, steps, ms, status, goalMet }) => ({ agent, operation, steps, ms, status, goalMet })),
  }
}

export function failedRunRow(identity: Identity, workflow: AgentRunRow['workflow'], durationMs: number): AgentRunRow {
  return { ...agentRunRow(identity, workflow, { requestId: crypto.randomUUID(), task: workflow }, durationMs), outcome: 'failed' }
}

/**
 * Records one run for the System Admin console (FR-AGENT-03). Only signed-in
 * hosted accounts are recorded, as that user under row-level security; local
 * and guest sessions are not stored. Recording never fails or delays the
 * request by more than a moment.
 */
export async function recordAgentRun(identity: Identity, row: AgentRunRow) {
  if (identity.local || !identity.token || identity.role === 'guest') return
  const insert = (async () => {
    const { error } = await userDb(identity).from('edupulse_agent_runs').insert(row)
    if (error) console.error(JSON.stringify({ event: 'agent_run_not_recorded', code: error.code || 'unknown' }))
  })().catch(() => console.error(JSON.stringify({ event: 'agent_run_not_recorded', code: 'network' })))
  await Promise.race([insert, new Promise(resolve => setTimeout(resolve, 2500))])
}
