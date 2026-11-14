import { wordMatch, words } from './rag/lookup.js'

/** Explicit educational authoring is the only chat route that can invoke a generation model. */
export function contentGenerationRequest(message: string, task = 'auto', hasEditor = false) {
  const text = message.trim()
  if (/^(?:please\s+)?(?:how|where|when|what is|what are|paano|saan)\b/i.test(text)) return false
  if (task === 'draft') return true
  const action = /\b(?:generat(?:e|ing)|draft|creat(?:e|ing)|write|compose|make|edit|update|change|replace|revise|rewrite|improve|complete|fill|gumawa|isulat|bumuo|baguhin)\b/i.test(text)
  const content = /\b(?:courseware|syllab(?:us|i)|outline|lesson|teaching|learning material|assessment|quiz|questions?|activity|activities|presentation|slides?|educational|document|summary)\b/i.test(text)
  return action && (content || hasEditor)
}
export const explicitWebRequest = (text: string) => /\b(?:search|browse|look|find|research)\b.{0,45}\b(?:web|internet|online)\b|\b(?:web|internet|online)\s+(?:search|research)\b/i.test(text)

/** Suggest only. A typo correction is never authority to run a command or change a record. */
export function navigationCorrection(message: string) {
  const tokens = words(message)
  if (tokens.length > 4 && !/\b(?:open|go|navigate|show|buksan|pumunta)\b/i.test(message)) return null
  const vocabulary = ['dashboard', 'course', 'courses', 'syllabus', 'students', 'instructors', 'assessment', 'assessments', 'monitoring', 'performance', 'settings', 'notifications', 'materials']
  let changed = false
  const corrected = message.replace(/[\p{L}]+/gu, token => {
    if (vocabulary.includes(token.toLowerCase())) return token
    const candidates = vocabulary.map(word => ({ word, score: wordMatch(token.toLowerCase(), word) })).filter(hit => hit.score >= .8).sort((a, b) => b.score - a.score)
    if (!candidates.length || candidates[1]?.score === candidates[0].score) return token
    changed = true; return candidates[0].word
  })
  return changed ? corrected : null
}

export function sourceDestination(value: { path?: unknown; label?: unknown } | null | undefined) {
  if (!value || typeof value.path !== 'string' || value.path.length > 1500 || !/^\/(?:courseware|dashboard|student-monitoring|records|students|instructors|monitor|settings)(?:\?|$)/.test(value.path) || /[\r\n\\]/.test(value.path)) return null
  return { path: value.path, label: String(value.label || 'Open in EduPulse').slice(0, 100) }
}
