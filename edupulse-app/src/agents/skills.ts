import { z } from 'zod'
export const DRAFT_REQUEST = /\b(?:generate|create|draft|write|compose|make|prepare|build|fill|populate|complete)\b/i
export const WEB_REQUEST = /\b(?:web|internet|online|look\s*up|research|latest|up.to.date)\b/i
export const ALL_FIELDS = /\b(?:all|every|entire|whole|complete)\b.{0,35}\b(?:fields?|sections?|syllabus)\b(?!\s+(?:course\s+)?(?:outline|description|program\s+outcomes?|outcomes?|requirements?|grading|polic(?:y|ies)|references?|books?|section|field)\b)|\b(?:fields?|sections?|syllabus)\b(?!\s+(?:course\s+)?(?:outline|description|program\s+outcomes?|outcomes?|requirements?|grading|polic(?:y|ies)|references?|books?|section|field)\b).{0,25}\b(?:all|every|entire|whole)\b|\b(?:generate|create|draft|build|fill|populate)\s+(?:me\s+)?(?:content\s+(?:in|for)\s+)?(?:(?:a|the|this|my|selected)\s+)?syllabus\b(?!\s+(?:course\s+)?(?:outline|description|program\s+outcomes?|outcomes?|requirements?|grading|polic(?:y|ies)|references?|books?|section|field)\b)/i

/** Versioned application skills. Only these typed tools can be proposed; no shell, JS or arbitrary URL tool. */
export const PULSE_SKILLS = [
  { id: 'navigation', title: 'Open an authorized page', agent: 'Navigator', mutation: false },
  { id: 'walkthrough', title: 'Guide the current page or section', agent: 'Guide', mutation: false },
  { id: 'syllabus', title: 'Import and revise syllabus sections', agent: 'Syllabus', mutation: true },
  { id: 'roster', title: 'Merge, replace or remove roster records', agent: 'Registrar', mutation: true },
  { id: 'courseware', title: 'Generate and revise courseware drafts', agent: 'Writer', mutation: true },
  { id: 'recall', title: 'Recall private chats and saved preferences', agent: 'Memory', mutation: false },
] as const

export const pageIds = ['syllabus-builder', 'my-syllabus', 'my-courses', 'courseware', 'student-monitoring', 'assessment', 'records', 'instructors', 'students', 'course-loading', 'monitor', 'performance', 'ai-settings', 'settings', 'dashboard', 'help'] as const
export const syllabusSections = ['all', 'courseDescription', 'institutionalContext', 'programOutcomes', 'courseOutline', 'courseRequirements', 'gradingSystem', 'coursePolicy', 'books', 'onlineReferences'] as const
export const toolPlan = z.object({
  tool: z.enum(['navigate', 'guide', 'syllabus-import', 'syllabus-edit', 'roster-edit', 'content-edit', 'generate-week', 'clarify', 'chat']),
  page: z.enum(pageIds).nullable(),
  section: z.enum(syllabusSections).nullable(),
  targetId: z.string().max(200).nullable(),
  attachmentIndex: z.number().int().min(0).max(2).nullable(),
  operation: z.enum(['merge', 'replace', 'append', 'remove']).nullable(),
  selector: z.string().max(200).nullable(),
  courseCode: z.string().max(80).nullable(),
  week: z.number().int().min(1).max(52).nullable(),
  instruction: z.string().max(3000),
}).strict()
export type ToolPlan = z.infer<typeof toolPlan>

/** A portable prompt budget, not a claim about any provider's maximum context size. */
export const CONTEXT_CHARACTERS = 30000
export function conversationWindow(messages: { from?: string; role?: string; text?: string; content?: string }[], budget = 18000) {
  const result: { role: 'user' | 'assistant'; content: string }[] = []
  let used = 0
  for (const item of messages.slice().reverse()) {
    const content = (item.text || item.content || '').slice(0, 5000)
    if (!content || used + content.length > budget || result.length >= 12) continue
    result.unshift({ role: item.from === 'user' || item.role === 'user' ? 'user' : 'assistant', content }); used += content.length
  }
  return { history: result, characters: used, omitted: Math.max(0, messages.length - result.length), budget: CONTEXT_CHARACTERS }
}

/** User text, uploaded text and recalled memory never become executable tool instructions. */
export function parseToolPlan(text: string): ToolPlan {
  return toolPlan.parse(parseModelJson(text))
}

/** Read a model's JSON reply. A model without a JSON mode often wraps the object in a sentence or a code
 *  fence, so the reply is the largest complete top-level object in the text. Nothing is repaired: the
 *  caller's schema checks still decide whether it is usable. */
export function parseModelJson(text: string): unknown {
  try { return JSON.parse(text.trim()) } catch { /* not bare JSON: look inside the reply */ }
  let found: unknown, foundLength = 0, depth = 0, start = 0, quoted = false, escaped = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (!depth) { if (char === '{') { depth = 1; start = i } continue }
    if (quoted) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === '"') quoted = false; continue }
    if (char === '"') quoted = true
    else if (char === '{' || char === '[') depth++
    else if ((char === '}' || char === ']') && !--depth && i + 1 - start > foundLength) {
      try { found = JSON.parse(text.slice(start, i + 1)); foundLength = i + 1 - start } catch { /* braces in prose */ }
    }
  }
  if (!foundLength) throw new SyntaxError('The model reply contains no complete JSON object.')
  return found
}
