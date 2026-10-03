import type { Plan, Task } from './types.js'
import { terms } from './text.js'

type PlanInput = { message: string; task?: Task | 'auto'; history?: { role: string; content: string }[]; attachments?: unknown[] }

const COMPARE = /\b(compare|comparison|contrast|difference|differences|differ|versus|vs\.?|align(?:s|ed|ment)?|consistent|consistency|coverage|overlap)\b/i
const REFERENCES = /\b(references?|books?|textbooks?|readings?|articles?|papers?|bibliograph\w*|journals?|scholarly)\b/i
const REFERENCE_REQUEST = /\b(find|suggest|recommend|look\s+for|search\s+for|give\s+me|need|list|any)\b/i
const OWN_DOCUMENTS = /\b(my|our|these|this|the|attached|uploaded)\s+(?:\w+\s+)?(documents?|files?|pdfs?|uploads?|library|attachments?)\b/i
const SUMMARIZE =/\b(summari[sz]e|summary|overview|key points|main points|tl;?dr)\b/i
const DRAFT = /\b(draft|write|create|generate|compose|rephrase|rewrite|phrase|design|prepare|propose|formulate)\b/i
const GREETING = /^(hi|hello|hey|thanks|thank you|good (morning|afternoon|evening)|kumusta|salamat)\b/i

/**
 * Planner agent. Rule-based so planning adds no model latency on free local
 * models: classifies the task and decomposes the request into search queries.
 */
export function planRequest(input: PlanInput): Plan {
  const message = input.message.trim()
  const revision = /^revise (your|the) previous answer/i.test(message)
  const previous = input.history?.filter(m => m.role === 'user').at(-1)?.content || ''
  let task: Task = 'answer', rationale = 'Question about workflow or document content; answer from retrieved evidence.'
  if (input.task && input.task !== 'auto') { task = input.task; rationale = `Task selected by the user interface: ${task}.` }
  // "Find readings for my course" is an external search; "summarize my uploaded documents" is not.
  else if (REFERENCES.test(message) && REFERENCE_REQUEST.test(message) && !OWN_DOCUMENTS.test(message)) { task = 'references'; rationale = 'Request for external reading material; consult open bibliographic APIs.' }
  else if (COMPARE.test(message)) { task = 'compare'; rationale = 'Comparison or alignment request; retrieve each side and align their statements.' }
  else if (SUMMARIZE.test(message)) { task = 'summarize'; rationale = 'Summary request; retrieve the most relevant passages and condense them.' }
  else if (DRAFT.test(message)) { task = 'draft'; rationale = 'Drafting request; use retrieved evidence as optional grounding and label assumptions.' }
  else if (GREETING.test(message) && message.split(/\s+/).length < 6 && !input.attachments?.length) { task = 'general'; rationale = 'Conversational message; no retrieval needed.' }

  const base = (revision ? previous || message : message.length < 60 && previous ? `${previous.slice(0, 400)} ${message}` : message).slice(0, 1000)
  const queries = [base]
  if (task === 'compare') {
    const sides = message.replace(COMPARE, ' ').split(/\b(?:and|with|against|to|from|vs\.?|versus)\b|[,;]/i).map(s => s.replace(/\b(the|my|this|these|documents?|files?|between)\b/gi, ' ').replace(/\s+/g, ' ').trim()).filter(s => terms(s).length >= 1)
    for (const side of sides.slice(0, 2)) if (!queries.includes(side)) queries.push(side)
  } else if (terms(base).length > 8) {
    // Long questions also get a focused keyword query so specific terms are not diluted.
    const focused = [...new Set(terms(base))].slice(0, 8).join(' ')
    if (focused) queries.push(focused)
  }
  // Catalog topic: the subject only, without the request ("find books and readings … for my course").
  const topic = message
    .replace(/\b(for|in|to)\s+(my|our|the|a|this)\s+(course|class|subject|students?|syllabus|lessons?|module)\b.*$/i, ' ')
    .replace(new RegExp(REFERENCE_REQUEST.source, 'gi'), ' ').replace(new RegExp(REFERENCES.source, 'gi'), ' ')
    .replace(/\b(for|on|about|regarding|some|good|me|a|an|the|please|that|cover|covering|and|or|my|our|i|can|you|could|would|what|which|are|is|useful|relevant|recommended)\b/gi, ' ')
    .replace(/[?!.,;:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
  return { task, queries: queries.slice(0, 3), needsEvidence: !['general', 'references'].includes(task), rationale, topic: topic || message.slice(0, 200), revision }
}
