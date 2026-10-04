import type { AgentName, AgentStep, Verification } from './types.js'

/**
 * Who each named agent is, the task it works on and the goal the System Admin
 * console tracks. Single source for the answer timeline, the AI settings and
 * the admin console. Colours keep at least 4.5:1 contrast with white text.
 */
export const AGENTS: Record<AgentName, { title: string; task: string; goal: string; color: string }> = {
  Guardian: { title: 'Appropriate-use officer', task: 'Checks every request against EduPulse use rules before any other agent works', goal: 'No request that breaks a use rule reaches the other agents', color: '#475569' },
  Planner: { title: 'Task router', task: 'Classifies the request and plans the searches', goal: 'Every permitted request gets a task and a search plan', color: '#4f46e5' },
  Researcher: { title: 'Evidence finder', task: 'Runs hybrid vector and keyword search for each planned query', goal: 'Candidate passages found for the request', color: '#0369a1' },
  Ranker: { title: 'Evidence judge', task: 'Reranks candidates with a cross-encoder and keeps relevant, diverse passages', goal: 'Relevant evidence selected; otherwise stop without guessing', color: '#0f766e' },
  Comparator: { title: 'Alignment analyst', task: 'Aligns the statements of two selected documents', goal: 'Both documents aligned with a coverage measure', color: '#7e22ce' },
  Writer: { title: 'Drafter', task: 'Writes the answer or draft from the evidence with citations', goal: 'A model-written answer or draft is produced', color: '#1d4ed8' },
  Verifier: { title: 'Fact checker', task: 'Checks every claim against its cited sources and counts corroboration', goal: 'Every claim shown to the user is supported', color: '#15803d' },
  Corrector: { title: 'Editor', task: 'Repairs citations and requests at most one revision', goal: 'No unverifiable statement reaches the user', color: '#b45309' },
  Librarian: { title: 'Reference finder', task: 'Searches Open Library, OpenAlex and Wikipedia for real references', goal: 'Real references returned for the topic', color: '#be185d' },
}
export const AGENT_ORDER = Object.keys(AGENTS) as AgentName[]

/**
 * Per-agent result of one run, named after the OpenTelemetry GenAI agent
 * conventions (`gen_ai.operation.name` = invoke_agent, `gen_ai.agent.name`).
 */
export type AgentReport = { agent: AgentName; operation: 'invoke_agent'; steps: number; ms: number; status: AgentStep['status']; goalMet: boolean }
export type RunOutcome = { mode: string; verification: Verification | null; sources: number }

const sum = (steps: AgentStep[], key: string) => steps.reduce((total, s) => total + (s.metrics?.[key] || 0), 0)

/** Whether each agent that worked on this run achieved its goal, judged from the final result. */
export function agentReport(steps: AgentStep[], outcome: RunOutcome): AgentReport[] {
  const supported = Boolean(outcome.verification && outcome.verification.unsupported === 0 && !outcome.verification.invalidCitations.length)
  const goal: Record<AgentName, (own: AgentStep[]) => boolean> = {
    Guardian: own => own.length > 0,
    Planner: own => own.some(s => s.status === 'done'),
    Researcher: own => sum(own, 'passages') > 0,
    Ranker: () => outcome.sources > 0,
    Comparator: own => own.some(s => s.status === 'done'),
    Writer: own => own.some(s => s.node === 'writer' && s.status === 'done'),
    // Courseware drafts keep unmatched statements flagged for the instructor, so there the goal is that every statement was checked.
    Verifier: () => outcome.mode === 'courseware' ? Boolean(outcome.verification) : supported,
    Corrector: () => outcome.mode === 'courseware' || supported || outcome.mode === 'retrieval',
    Librarian: own => sum(own, 'references') > 0,
  }
  return AGENT_ORDER.flatMap(agent => {
    const own = steps.filter(s => s.agent === agent)
    if (!own.length) return []
    return [{ agent, operation: 'invoke_agent' as const, steps: own.length, ms: own.reduce((t, s) => t + s.ms, 0), status: own.at(-1)!.status, goalMet: goal[agent](own) }]
  })
}
