/**
 * Opening another account view remounts the app, and Pulse with it. The conversation that was open is parked here, in
 * this tab's memory only, and the remounted panel resumes it while the same person is signed in. Cards that would
 * change records belong to the view that prepared them, so they are not carried into another view.
 */
type Proposal = { type: string; [key: string]: unknown }
type Message = { id: string; from: string; proposals?: Proposal[]; [key: string]: unknown }
export type ThreadSnapshot = { id: string | null; created: boolean; saved: string[] }
export type Parked = { owner: string; view: string; open: boolean; messages: Message[]; thread: ThreadSnapshot; at: number }

/** A view switch remounts within milliseconds; anything older is not the same move. */
const FRESH_MS = 60_000
/** Proposals whose confirm buttons act for the account view that prepared them. */
export const VIEW_BOUND = new Set(['teaching-load-import', 'register', 'file', 'syllabus-import', 'editor-edit', 'roster-edit', 'generate-week', 'syllabus-followups', 'open-editable-syllabus'])
let parked: Parked | null = null

export function parkConversation(state: Omit<Parked, 'at'>, now = Date.now()) {
  parked = state.owner ? { ...state, at: now } : null
}

/** The parked conversation for this principal, or null. Another person's conversation is dropped, never shown. */
export function resumeConversation(owner: string | null, view: string, now = Date.now()) {
  const state = parked
  if (!state) return null
  if (!owner || state.owner !== owner || now - state.at > FRESH_MS) { parked = null; return null }
  return { ...state, messages: carriedMessages(state.messages, state.view, view) }
}

export function clearParkedConversation() { parked = null }

/** Messages as they continue in another view: a card that would change records there becomes a note. */
export function carriedMessages(messages: Message[], from: string, to: string): Message[] {
  if (from === to) return messages
  return messages.map(message => message.proposals?.some(proposal => VIEW_BOUND.has(proposal.type))
    ? { ...message, proposals: message.proposals.map(proposal => VIEW_BOUND.has(proposal.type) ? { type: 'notice', text: 'This card was prepared in another account view, so it cannot be confirmed here. Ask again in this view to prepare it.' } : proposal) }
    : message)
}
