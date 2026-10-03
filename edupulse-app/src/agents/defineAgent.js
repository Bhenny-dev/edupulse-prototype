// Shared shape for every task-specific agent in this directory.
// An agent is a guiding rule for one real EduPulse workflow — it owns a
// drop zone (data-pulse-zone), a role-scoped set of intents, and the
// step-by-step guidance for each intent. Pulse (src/components/pulse)
// dispatches to whichever agent matches the zone the user dropped it on.
//
// These steps remain authored and tied to visible controls. The connected
// model handles open-ended conversation through Pulse; it does not invent
// workflow actions or selectors.
export function defineAgent({ id, zone, label, roles, greeting, intents }) {
  return { id, zone, label, roles, greeting, intents }
}
