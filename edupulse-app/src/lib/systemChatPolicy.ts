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
// "Online" names a place only when it is not an EduPulse thing ("the online quiz").
const WEB_PLACE = String.raw`(?:web|internet(?!\s+(?:connection|access|speed|settings?))|google|wikipedia|online(?!\s+(?:class|classes|course|courses|learning|module|modules|quiz|quizzes|exam|exams|assessments?|lessons?|submissions?|portal|materials?)))`
const WEB_VERB = String.raw`(?:search|browse|look\s*up|look\s+(?:for|on|in)|find|research|check|google|hanapin|i-?search)`
const WEB_REQUEST = new RegExp(String.raw`\b${WEB_VERB}\b.{0,45}\b${WEB_PLACE}\b|\b(?:web|internet|online|google)\s+(?:search|research)\b|^\s*(?:please\s+)?google\s+\S`, 'i')
export const explicitWebRequest = (text: string) => WEB_REQUEST.test(text)
/** The subject of an explicit Internet search, without the request words ("search for X on the internet" is X). */
export function webTopic(text: string) {
  return text
    .replace(/^\s*(?:(?:hey|hi|ok(?:ay)?)\s+)?(?:pulse[,\s]+)?(?:(?:can|could|would|will)\s+you\s+|please\s+|kindly\s+|pakis?\s+|i\s+(?:want|need|would\s+like)\s+(?:you\s+)?to\s+)*/i, '')
    .replace(new RegExp(String.raw`^\s*${WEB_VERB}\b(?:\s+(?:for|about|on|up)\b)?`, 'i'), ' ')
    .replace(/\b(?:on|in|from|using|via|through|sa)\s+(?:the\s+)?(?:web|internet|online|google|wikipedia)\b/gi, ' ')
    .replace(/\b(?:the\s+)?(?:web|internet|google|wikipedia)\b(?:\s+(?:for|about|on)\b)?/gi, ' ')
    .replace(/\bonline\b/gi, ' ')
    .replace(/\b(?:for\s+me|please|po)\b/gi, ' ')
    .replace(/^[\s,:;.-]*(?:(?:si|ang|ni|kay|about|for)\s+)?/i, '')
    .replace(/[\s?!.,:;-]+$/, '').replace(/\s+/g, ' ').trim().slice(0, 200)
}

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
