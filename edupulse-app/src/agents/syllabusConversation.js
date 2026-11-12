/** Follow-ups are scoped to the current instructor conversation and authorized editor. */
const weekNumber = /\b(?:week|wk)\.?\s*(\d{1,2})\b/i
const allWeeks = /\b(?:all|every|remaining|rest\s+of)\s+(?:the\s+)?weeks?\b/i
const authoring = /\b(?:generate|create|draft|fill|populate|complete|finish|continue|provide|do|make|prepare)\b/i

export function lastSyllabusContext(messages = []) {
  for (const message of [...messages].reverse()) {
    const context = message?.syllabusContext
    if (context?.courseCode) return context
    const text = String(message?.text || '')
    const receipt = text.match(/^Updated ([A-Z][A-Z0-9 .-]{1,40}) syllabus outline\b/i)
    if (message?.from === 'pulse' && receipt) return { courseCode: receipt[1].trim(), weeks: [] }
  }
  return null
}

/** Short phrases like "can you provide week 2 then" inherit the last successful draft, not a generic search task. */
export function syllabusFollowupRequest(message, messages = [], editor = null) {
  if (editor?.kind !== 'syllabus') return null
  const prior = lastSyllabusContext(messages)
  if (!prior || prior.courseCode !== editor.data?.courseCode) return null
  const question = message.trim()
  if (/\b(?:regenerate|replace|rewrite|redesign|explain|compare|what|why|how)\b/i.test(question)) return null
  if (allWeeks.test(question) && authoring.test(question)) {
    return 'Complete the remaining missing weeks of this syllabus course outline, retaining all already-completed weeks, shared sections and examination weeks.'
  }
  const explicit = question.match(weekNumber)
  if (explicit && (authoring.test(question) || /\b(?:then|next|also|same|as well)\b/i.test(question))) {
    return `Complete Week ${Number(explicit[1])} of this syllabus course outline only. Keep the sequence consistent with completed weeks and preserve all other weeks.`
  }
  if (/\b(?:next|following)\s+week\b/i.test(question) && authoring.test(question) && prior.weeks?.length) {
    const previous = Math.max(...prior.weeks)
    const rows = Array.isArray(editor.data?.courseOutline) ? editor.data.courseOutline : []
    const next = rows.find(row => row.week > previous && !/examination/i.test(row.assessments || ''))
    if (next) return `Complete Week ${next.week} of this syllabus course outline only. Preserve all other weeks.`
  }
  return null
}

/** Used when the assistant has left the editor: offer a precise draft link instead of sending a mutation request to search. */
export function isSyllabusOutlineRequest(message, messages = []) {
  const question = message.trim()
  const refersToOutline = /\b(?:syllabus|course\s+outline|weekly\s+outline)\b/i.test(question)
  const refersToWeeks = Boolean(question.match(weekNumber) || allWeeks.test(question) || /\bnext\s+week\b/i.test(question))
  return (refersToOutline || refersToWeeks) && authoring.test(question) &&
    (refersToOutline || Boolean(lastSyllabusContext(messages)))
}

export function pulseFollowupPrompts(messages = [], editor = null) {
  const latest = messages.at(-1)
  if (latest?.from !== 'pulse') return []
  const context = lastSyllabusContext(messages)
  if (context && editor?.kind === 'syllabus' && context.courseCode === editor.data?.courseCode) {
    const rows = Array.isArray(editor.data.courseOutline) ? editor.data.courseOutline : []
    const previous = Math.max(0, ...(context.weeks || []))
    const missing = rows.filter(row => !/examination/i.test(row.assessments || '') &&
      !(String(row.ilos || '').trim() && (row.contents || []).some(text => String(text).trim()) && String(row.activities || '').trim() && String(row.assessments || '').trim()))
    const next = missing.find(row => row.week > previous) || missing[0]
    return [
      ...(next ? [{ label: `Generate Week ${next.week}`, message: `Complete Week ${next.week} of the syllabus course outline only` }] : []),
      ...(missing.length > 1 ? [{ label: 'Complete remaining weeks', message: 'Complete the remaining missing weeks of the syllabus course outline' }] : []),
      { label: 'Review what changed', message: 'Summarize the latest syllabus outline changes for my review' },
    ]
  }
  if (context) return [
    { label: 'Continue syllabus editing', message: `Open the editable draft for ${context.courseCode}` },
    { label: 'Next steps', message: 'What should I do next with this syllabus draft?' },
  ]
  return [
    { label: 'Explain further', message: 'Explain your previous response in more detail' },
    { label: 'Suggested next steps', message: 'What should I do next for the task we are discussing?' },
  ]
}
