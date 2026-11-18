import { affirmative, declines } from './voiceConversation'

/**
 * Follow-ups in a Pulse conversation. A short "yes" or "no" answers what Pulse's latest reply offered, and a message
 * that names an earlier file ("this form", "the screenshot") is about the file attached before it. Attachments
 * otherwise belong to the one message they were sent with.
 */
type Proposal = { type: string; path?: string; label?: string; viewRole?: string; text?: string }
type Message = { id: string; from: string; text?: string; proposals?: Proposal[]; offer?: Offer }
export type Offer =
  | { kind: 'navigate'; path: string; label: string; viewRole?: string }
  | { kind: 'review'; messageId: string; index: number; type: string }
  | { kind: 'request'; message: string }

/** Cards that change records: a yes opens their review or points to them; only their own confirm button saves. */
const REVIEWED = new Set(['teaching-load-import', 'register', 'file', 'syllabus-import', 'editor-edit', 'roster-edit', 'generate-week'])
/** A reply that ends by proposing a step: "Would you like me to open Course Loading?" */
const ASKED = /(?:would you like me to|do you want me to|want me to|should i|shall i)\s+([^?]{3,160})\?\s*$/i

/** 'yes', 'no', or null when the message is a request of its own. */
export function shortAnswer(text: string): 'yes' | 'no' | null {
  if (!text || text.length > 40) return null
  return affirmative(text) ? 'yes' : declines(text) ? 'no' : null
}

/** What Pulse's replies since the person's last message offered: a card to review, a page it asked about, or a step it proposed. */
export function lastOffer(messages: Message[]): Offer | null {
  let start = messages.length - 1
  while (start >= 0 && messages[start].from !== 'user') start--
  const replies = messages.slice(start + 1).filter(message => message.from === 'pulse')
  for (const message of replies.reverse()) {
    if (message.offer) return message.offer
    const proposals = message.proposals || []
    for (let index = proposals.length - 1; index >= 0; index--) {
      const proposal = proposals[index]
      if (REVIEWED.has(proposal.type)) return { kind: 'review', messageId: message.id, index, type: proposal.type }
      if (proposal.type === 'confirm-navigation' && proposal.path) return { kind: 'navigate', path: proposal.path, label: proposal.label || 'that page', ...(proposal.viewRole ? { viewRole: proposal.viewRole } : {}) }
    }
    const asked = ASKED.exec(message.text?.trim() || '')
    if (asked) return { kind: 'request', message: asked[1].replace(/\s+for you$/i, '').trim() }
  }
  return null
}

const EARLIER_FILE = /\b(?:the|this|that|these|those|same|attached|uploaded|previous|earlier|last)\s+(?:(?:attached|uploaded|same)\s+)?(?:files?|documents?|docs?|pictures?|images?|photos?|screenshots?|scans?|forms?|pdfs?|attachments?|tables?|teaching\s+loads?|class\s+lists?|rosters?)\b/i
/** True when a message without attachments is about the file sent before it. */
export const refersToEarlierFile = (text: string) => EARLIER_FILE.test(text)
