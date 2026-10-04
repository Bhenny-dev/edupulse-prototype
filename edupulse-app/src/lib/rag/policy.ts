/**
 * Guardian agent: EduPulse appropriate-use rules, checked before any other
 * agent works. Rule-based and explainable, so a decline can always cite the
 * specification it enforces and never depends on a model following a prompt.
 */
export type UseRule = 'assessment-integrity' | 'excluded-feature' | 'official-grades'
export type UseDecision =
  | { allowed: true; rule: null; note: string }
  | { allowed: false; rule: UseRule; reason: string; guidance: string; spec: string }

const ASSESSMENT = String.raw`(?:quiz(?:zes)?|exams?|midterms?|finals?|prelims?|tests?|assessments?|assignments?|homework|activit(?:y|ies)|seatwork|problem sets?|worksheets?|essays?)`
const ITEM = String.raw`(?:questions?|items?|problems?|numbers?|nos?\.?|#)\s*\d+`
const POLITE = String.raw`(?:please\s+|pls\s+|(?:can|could|would|will)\s+you\s+(?:please\s+)?|help\s+me\s+)?`
// Doing, solving or checking assessment work for a learner. Asking how to open, take or submit it stays allowed.
const INTEGRITY = [
  // "give me the answers to quiz 2", "answer key for the midterm", "solutions for assignment 3"
  new RegExp(String.raw`\b(?:answers?|answer key|solutions?|correct (?:option|choice|letter))\b[^.?!\n]{0,60}\b${ASSESSMENT}\b`, 'i'),
  new RegExp(String.raw`\b${ASSESSMENT}\b[^.?!\n]{0,60}\b(?:answers|answer key|solutions?)\b`, 'i'),
  // "solve question 3", "answer item 5", "what is the answer to number 2"
  new RegExp(String.raw`\b(?:solve|answer|complete|finish|do)\b[^.?!\n]{0,30}\b${ITEM}`, 'i'),
  new RegExp(String.raw`\b(?:answer|solution)\s+(?:to|for|of)\s+${ITEM}`, 'i'),
  // "do my homework", "please write my essay", "finish this activity for me"
  new RegExp(String.raw`^${POLITE}(?:do|write|complete|finish|answer)\s+(?:my|our|this|the|these)\s+(?:\w+\s+)?${ASSESSMENT}\b`, 'i'),
  new RegExp(String.raw`\b(?:do|write|complete|finish|answer)\s+(?:my|our|this|the|these)\s+(?:\w+\s+)?${ASSESSMENT}\b[^.?!\n]{0,30}\bfor me\b`, 'i'),
  // "check my answers for quiz 1", "grade my essay"; reviewing one's own results or feedback stays allowed
  new RegExp(String.raw`\b(?:check|review|grade|mark|correct|evaluate)\s+(?:my|our)\s+(?:\w+\s+)?(?:answers?|work|essays?|submissions?|solutions?|${ASSESSMENT}\b(?!\s+(?:results?|scores?|grades?|feedback|schedule|deadlines?|due)))`, 'i'),
  // multiple choice: "is option B correct", "which choice is right"
  /\b(?:is|was)\s+(?:option|choice|letter)\s+[a-e]\b[^.?!\n]{0,20}\b(?:correct|right)\b/i,
  /\bwhich\s+(?:option|choice|letter|answer)\s+is\s+(?:correct|right)\b/i,
]
// Features the specification excludes everywhere. Learning about a topic (what plagiarism is) stays allowed.
const WORK = String.raw`(?:this|these|it|his|her|their|the\s+(?:essay|work|paper|text|submission|answer|code|assignment)s?)`
const EXCLUDED = [
  /\b(?:check|detect|scan|test|verify|find|catch|flag|analy[sz]e|screen)\w*\b[^.?!\n]{0,40}\bplagiari\w*/i,
  /\bplagiari\w*\s+(?:check|checker|detection|detector|scan|scanner|score|report|test)\b/i,
  new RegExp(String.raw`\b(?:is|was|are|were)\s+${WORK}\s+(?:\w+\s+)?plagiari[sz]ed\b`, 'i'),
  /\b(?:originality|integrity)\s+(?:score|scoring|check|report|index)\b/i,
  /\b(?:ai|chatgpt|gpt|llm)[-\s]?(?:detector|detection|checker)\b/i,
  /\b(?:detect|check|tell|determine|identify|verify)\w*\b[^.?!\n]{0,40}\b(?:ai|chatgpt|gpt|llm)[-\s]?(?:generated|written|use)\b/i,
  new RegExp(String.raw`\b(?:is|was|are|were)\s+${WORK}\s+(?:\w+\s+)?(?:(?:ai|chatgpt|gpt|llm)[-\s]?(?:generated|written)|(?:written|generated|made)\s+(?:by|with|using)\s+(?:ai|chatgpt|gpt|an? (?:ai|llm|chatbot)))\b`, 'i'),
  /\b(?:did|does|has)\s+(?:the |this |a |my )?(?:student|learner|author)s?\b[^.?!\n]{0,30}\b(?:use[ds]?|cheat(?:ed)?|copy|copied)\b/i,
  /\bauthorship\s+(?:verification|check|detection)\b/i,
  /\bpredict\w*\b[^.?!\n]{0,60}\b(?:fail\w*|drop\s?(?:out|outs)|at[-\s]risk)\b/i,
  /\bat[-\s]risk\s+(?:prediction|model|score|scoring|probability)\b/i,
  /\b(?:proctor\w*|lockdown browser)\b/i,
]
// Official grades are computed in the KCP grading sheet, never in EduPulse ("grade 10" is not a grade computation).
const GRADES = [
  /\b(?:compute|calculate|calc|derive|work out|determine)\b[^.?!\n]{0,40}\b(?:final|midterm|prelim|semestral|term|overall|official)?\s*grades?\b(?!\s*\d)/i,
  /\b(?:final|midterm|prelim|semestral|overall|official)\s+grades?\b[^.?!\n]{0,40}\b(?:compute|calculate|computation|formula)\b/i,
  /\b(?:gwa|gpa|transmut(?:e|ed|ation))\b/i,
]

const DECLINES: Record<UseRule, { reason: string; guidance: string; spec: string }> = {
  'assessment-integrity': {
    reason: 'Pulse guides and reminds students but never answers, solves or reviews assessment items for them.',
    guidance: 'I can’t answer, solve or check assessment items for you; that work has to be your own. I can explain the topic behind the question, point you to the learning material for it, or remind you what is due. Which topic would you like explained?',
    spec: 'FLOW_SPEC student role; Help & Support (“never answers for them”)',
  },
  'excluded-feature': {
    reason: 'EduPulse does not offer plagiarism or AI-authorship detection, integrity scoring, at-risk prediction or proctoring.',
    guidance: 'EduPulse doesn’t offer plagiarism or AI-authorship detection, integrity scoring, at-risk prediction or proctoring, so I can’t do that. I can compare two documents for shared and unique content (coverage, not authorship), or show students below the mastery cutoff you set in Performance → Alerts.',
    spec: 'FR-CW-18, FR-ASM-11, NFR-SEC-09, NFR-AI-08',
  },
  'official-grades': {
    reason: 'EduPulse collates scores for visualization only; official grades are computed outside the system.',
    guidance: 'EduPulse doesn’t compute official grades. Midterm, final and term grades come from the official KCP grading sheet. I can help you read the recorded scores in Performance or Student Monitoring instead.',
    spec: 'FLOW_SPEC ground truth 7 (scoring sheet, not grading sheet)',
  },
}

export function checkAppropriateUse(message: string, role: string): UseDecision {
  const text = message.replace(/\s+/g, ' ').trim()
  const learner = role === 'student' || role === 'guest'
  const rule: UseRule | null = EXCLUDED.some(p => p.test(text)) ? 'excluded-feature'
    : GRADES.some(p => p.test(text)) ? 'official-grades'
      : learner && INTEGRITY.some(p => p.test(text)) ? 'assessment-integrity'
        : null
  if (rule) return { allowed: false, rule, ...DECLINES[rule] }
  return { allowed: true, rule: null, note: learner ? 'Permitted for a learner session: no assessment answers, excluded features or grade computation requested.' : 'Permitted: no excluded feature or grade computation requested.' }
}
