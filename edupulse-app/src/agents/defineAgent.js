// Shared shape for every task-specific agent in this directory.
// An agent is a guiding rule for one real EduPulse workflow — it owns a
// drop zone (data-pulse-zone), a role-scoped set of intents, and the
// step-by-step guidance for each intent. Pulse (src/components/pulse)
// dispatches to whichever agent matches the zone the user dropped it on.
//
// This is the seam where a real model gets plugged in later: today
// `greeting`/`steps` are authored copy, grounded in the five-step process
// in Chapter 1-2 Fig. 2; swapping in an LLM means replacing the body of
// `greeting()` and generating `steps` dynamically, without changing how
// Pulse discovers or invokes agents.
export function defineAgent({ id, zone, label, roles, greeting, intents }) {
  return { id, zone, label, roles, greeting, intents }
}
