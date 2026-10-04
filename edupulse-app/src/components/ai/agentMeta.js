import { AGENTS, AGENT_ORDER } from '../../lib/rag/registry'

// One colour and task line per named agent, from the agent registry (src/lib/rag/registry.ts).
export const AGENT_META = Object.fromEntries(AGENT_ORDER.map(name => [name, { color: AGENTS[name].color, role: AGENTS[name].task, title: AGENTS[name].title }]))
