import syllabusAgent from './syllabusAgent'
import coursewareAgent from './coursewareAgent'
import recordsAgent from './recordsAgent'
import courseLoadingAgent from './courseLoadingAgent'
import performanceAgent from './performanceAgent'
import monitorAgent from './monitorAgent'

// The full registry of task-specific agents. Each owns one drop zone
// (see data-pulse-zone on the corresponding page) and one real EduPulse
// workflow from FLOW_SPEC.md: syllabus, courseware, records intake, course
// loading, performance/scoring, and Dean/Assoc Dean monitoring. Pulse never
// talks to the app directly — it always goes through the matching agent, so
// a new workflow only needs a new agent module here, not changes to Pulse itself.
export const AGENTS = [syllabusAgent, coursewareAgent, recordsAgent, courseLoadingAgent, performanceAgent, monitorAgent]

export function getAgentForZone(zone, role) {
  const agent = AGENTS.find(a => a.zone === zone)
  if (!agent) return null
  if (agent.roles !== 'all' && !agent.roles.includes(role)) return null
  return agent
}

export function intentsForRole(agent, role) {
  if (!agent) return []
  return agent.intents.filter(i => !i.roles || i.roles.includes(role))
}
