/** Pure rules for Pulse's hands-free voice conversation: when to stop, when speech ends, what to say. */

const words = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}'\s]/gu, ' ').replace(/\s+/g, ' ').trim()

const LEAD = String.raw`(?:(?:ok(?:ay)?|alright|all right|sige|yes|yeah|no|nope|thanks?|thank you(?: so much)?|salamat(?: po)?|(?:that's|that is) (?:ok(?:ay)?|fine|good|all)|(?:i'm|i am|we're|we are) (?:done|finished|good|fine))\s+)*(?:you can |please |pulse |just |now )*`
const ENDING = [
  String.raw`stop(?: listening| talking| now| na| for now| voice(?: mode)?)?`,
  String.raw`turn (?:it |yourself |voice |the voice |the mic(?:rophone)? )?off`,
  String.raw`turn off(?: the)?(?: voice(?: mode)?| mic(?:rophone)?| listening)?`,
  String.raw`end(?: the)? (?:voice(?: mode)?|conversation|chat|call)`,
  String.raw`(?:that's|that is) all`, String.raw`(?:i'm|i am|we're|we are) (?:done|finished)`,
  String.raw`nothing else`, String.raw`no(?:thing)? more`, String.raw`no thanks?`, String.raw`no thank you`,
  String.raw`good ?bye`, String.raw`bye(?: bye)?`, String.raw`(?:tama|wala|ayos|okay|ok|sige) na`,
].join('|')
const STOP = new RegExp(String.raw`^${LEAD}(?:${ENDING})(?:\s+(?:po|na|now|for now|thanks?|thank you|salamat(?: po)?|pulse))*$`)
const THANKS = /^(?:(?:ok(?:ay)?|alright|sige)\s+)?(?:thanks?|thank you(?: so much)?|salamat(?: po)?)(?:\s+(?:pulse|po))?$/
const NO = /^(?:no|nope|none|hindi|wala|not now|no need)(?:\s+(?:po|thanks?|thank you))?$/

/** True when a short utterance ends the conversation ("that's ok, you can stop", "no thanks", "tama na"). */
export function endsConversation(text: string) {
  const said = words(text)
  if (!said || said.split(' ').length > 9) return false
  return STOP.test(said) || THANKS.test(said)
}
/** A plain "no", which ends the conversation only as the answer to "Anything else?". */
export const declines = (text: string) => NO.test(words(text))

const YES = /^(?:yes|yeah|yep|sure|ok(?:ay)?|go ahead|please do|do it|sige|oo|opo|oo nga|tara)(?:\s+(?:please|po|pulse|go ahead|do it))*$/
/** A short yes to Pulse's suggested next step. */
export const affirmative = (text: string) => YES.test(words(text))

/** Voice activity detection over microphone loudness (RMS, 0..1), one reading every few tens of ms. */
export type Vad = { startedAt: number; calibratingUntil: number; floor: number; samples: number; speech: boolean; voicedMs: number; quietMs: number; heardAt: number | null; last: number }
export type VadEvent = 'speech' | 'end' | 'idle' | 'too-long' | null
export const VAD = { calibrateMs: 350, minThreshold: 0.018, floorFactor: 2.6, voicedMs: 140, endSilenceMs: 1100, idleMs: 15000, maxUtteranceMs: 40000 }
export const vadStart = (now: number): Vad => ({ startedAt: now, calibratingUntil: now + VAD.calibrateMs, floor: 0, samples: 0, speech: false, voicedMs: 0, quietMs: 0, heardAt: null, last: now })
export const vadThreshold = (vad: Vad) => Math.max(VAD.minThreshold, vad.floor * VAD.floorFactor)

export function vadStep(vad: Vad, level: number, now: number): { vad: Vad; event: VadEvent } {
  const elapsed = Math.max(0, Math.min(250, now - vad.last))
  const next = { ...vad, last: now }
  if (now < vad.calibratingUntil && !vad.speech) {
    next.samples = vad.samples + 1
    next.floor = (vad.floor * vad.samples + level) / next.samples
    return { vad: next, event: null }
  }
  const threshold = vadThreshold(next)
  if (!next.speech) {
    next.voicedMs = level > threshold ? vad.voicedMs + elapsed : Math.max(0, vad.voicedMs - elapsed)
    if (next.voicedMs >= VAD.voicedMs) { next.speech = true; next.heardAt = now; next.quietMs = 0; return { vad: next, event: 'speech' } }
    return { vad: next, event: now - vad.startedAt >= VAD.idleMs ? 'idle' : null }
  }
  next.quietMs = level > threshold * 0.8 ? 0 : vad.quietMs + elapsed
  if (next.quietMs >= VAD.endSilenceMs) return { vad: next, event: 'end' }
  if (now - (next.heardAt ?? now) >= VAD.maxUtteranceMs) return { vad: next, event: 'too-long' }
  return { vad: next, event: null }
}

type Proposal = { type: string; label?: string; text?: string; query?: string; results?: unknown[]; path?: string }
type Message = { from: string; mode?: string; text?: string; proposals?: Proposal[] }
const MUTATIONS: Record<string, string> = { register: 'class list registration', file: 'library filing', 'generate-week': 'courseware draft', 'editor-edit': 'form edit', 'roster-edit': 'class list change', 'syllabus-import': 'syllabus import', 'teaching-load-import': 'teaching load import' }

/** Readable speech from chat text: no citation markers, links or markdown, at most two sentences. */
export function speakable(text: string, limit = 320) {
  const plain = text.replace(/\s*\[\d+\]/g, '').replace(/\[([^\]]+)\]\((?:https?:)?[^)]+\)/g, '$1').replace(/https?:\/\/\S+/g, '').replace(/[*_#`>|]/g, '').replace(/\s+/g, ' ').trim()
  const sentences = plain.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || []
  let spoken = ''
  for (const sentence of sentences) {
    if (spoken && (spoken + sentence).length > limit) break
    spoken += sentence
    if (spoken.split(/[.!?]+(?=\s|$)/).filter(Boolean).length >= 2) break
  }
  return (spoken || plain).slice(0, limit).trim()
}

/**
 * What Pulse says after a voice request: what happened, then one next step. A suggested next
 * command runs only when the person answers yes; changes to records are never confirmed by voice.
 */
export function spokenSummary(replies: Message[], error = ''): { speech: string; follow: string; suggestion?: string } {
  if (error) return { speech: `That did not work. ${speakable(error, 220)}`, follow: 'Do you want to try something else?' }
  const parts: string[] = []
  let review = false, opened = '', guided = false
  for (const reply of replies.filter(message => message.from === 'pulse')) {
    if (reply.mode === 'actions') for (const proposal of reply.proposals || []) {
      if (proposal.type === 'navigate') { opened = proposal.label || 'the page'; parts.push(`I opened ${opened}.`) }
      else if (proposal.type === 'guide') { guided = true; parts.push(`I opened ${proposal.label || 'the page'} and started a walkthrough.`) }
      else if (proposal.type === 'search') { const found = proposal.results?.length || 0; parts.push(found ? `I found ${found} matching record${found === 1 ? '' : 's'} for ${proposal.query}.` : `No record matched ${proposal.query}.`) }
      else if (MUTATIONS[proposal.type]) { review = true; parts.push(`I prepared a ${MUTATIONS[proposal.type]} for your review.`) }
      else if (proposal.text) parts.push(speakable(proposal.text, 220))
    } else if (reply.text) parts.push(speakable(reply.text))
  }
  const speech = parts.join(' ') || 'Done.'
  if (review) return { speech, follow: 'Check it in the panel and press Confirm when it is right. I do not confirm changes by voice. Anything else?' }
  if (opened && !guided) return { speech, follow: 'Do you want a walkthrough of this page?', suggestion: 'Guide me through this page' }
  return { speech, follow: 'Anything else? Say stop when you are done.' }
}

/** Speech for the goal Pulse is working on, without typographic quotes. */
export const goalSpeech = (label: string) => `${label.replace(/[“”"]/g, '')}.`
