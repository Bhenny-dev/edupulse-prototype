// Deterministic text utilities shared by the server pipeline and the browser
// agent graph. No model is required, so every check also works offline.

const STOP = new Set(('a an and are as at be been but by can could did do does for from had has have how i if in into is it its may me more most must my no not of on or our shall should so such than that the their them then there these they this those to too us was we were what when where which who why will with would you your about after also any before between both each few here just like many much other over same some still through under until upon very via whereas while within without yet please explain help tell show give make use using want need').split(' '))

/** Light suffix stripping so "publishing"/"published"/"publish" match. */
export function stem(word: string) {
  if (word.length <= 4) return word
  if (/ies$/.test(word)) return `${word.slice(0, -3)}y`
  if (/(ss|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2)
  for (const suffix of ['ments', 'ment', 'ness', 'ing', 'ed']) if (word.endsWith(suffix) && word.length - suffix.length >= 3) return word.slice(0, -suffix.length)
  // "class", "syllabus", "analysis" and "status" keep their final s.
  return /[^su]s$/.test(word) && !/is$/.test(word) ? word.slice(0, -1) : word
}

/** Content terms: lowercase, stop words removed, stemmed. */
export function terms(text: string): string[] {
  return (text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]+(?:'[a-z]+)?/g) || [])
    .map(w => w.replace(/'[a-z]+$/, '')).filter(w => w.length > 1 && !STOP.has(w)).map(stem)
}

/** Safe full-text query terms (alphanumeric only) for Postgres to_tsquery. */
export function searchTerms(text: string, limit = 24): string[] {
  return [...new Set((text.toLowerCase().match(/[a-z0-9]{2,40}/g) || []).filter(w => !STOP.has(w)))].slice(0, limit)
}

export const numbers = (text: string) => text.match(/\b\d+(?:[.,]\d+)?%?/g) || []

export function sentences(text: string): string[] {
  // A citation after the full stop ("… weeks. [2] Next") stays with its sentence.
  return text.replace(/\r/g, '').split(/\n+/).flatMap(line => line.split(/(?<=[.!?](?:\s*\[\d{1,2}\])*)\s+(?=[A-Z0-9"“‘(])/))
    .map(s => s.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim()).filter(Boolean)
}

// Bibliography entries (reference lists, external links) are citations, not statements about the topic.
const CITATION_MARKS = /\bISBN\b|\bISSN\b|\bdoi\b\s*[:.]|https?:\/\/|\bretrieved\b|\barchived from\b|\bpp\.|\bvol\.\s*\d|\(eds?\.\)|\bet al\.|\(\d{4}(?:-\d{2}(?:-\d{2})?)?\)\s*[.,:]/i
const AUTHOR_LIST = /^[A-Z][\p{L}'’-]+,\s+[A-Z][\p{L}'’.-]*(?:\s+[A-Z][\p{L}'’.-]*)*\s*[;(]/u
export const isBibliographic = (text: string) => CITATION_MARKS.test(text) || AUTHOR_LIST.test(text.trim())

/** Share of a passage's sentences that are bibliography entries (0–1). */
export function bibliographicShare(text: string) {
  const list = sentences(text)
  return list.length ? list.filter(isBibliographic).length / list.length : 0
}

export function jaccard(a: string, b: string) {
  const x = new Set(terms(a)), y = new Set(terms(b))
  if (!x.size || !y.size) return 0
  let shared = 0
  for (const t of x) if (y.has(t)) shared++
  return shared / (x.size + y.size - shared)
}

/**
 * Share of a claim's content terms found in a passage, penalized when the
 * claim states numbers the passage does not contain.
 */
export function lexicalSupport(claim: string, passage: string) {
  const claimTerms = [...new Set(terms(claim))]
  if (!claimTerms.length) return 0
  const passageTerms = new Set(terms(passage))
  const recall = claimTerms.filter(t => passageTerms.has(t)).length / claimTerms.length
  const claimNumbers = numbers(claim), passageNumbers = new Set(numbers(passage))
  return claimNumbers.some(n => !passageNumbers.has(n)) ? Math.min(recall, 0.4) : recall
}

const ABSOLUTES = /\b(only|never|always|none|cannot|can't|not|every|solely|exclusively|impossible)\b/gi
/**
 * Consistency gate used before any support is granted. Topic similarity cannot
 * see a changed fact, so a claim is capped below "supported" when it states a
 * number, a proper noun, or an absolute quantifier/negation that the passage
 * does not contain (the checks fact-checkers apply first). Returns the cap.
 */
export function consistencyCap(claim: string, passage: string) {
  const text = passage.toLowerCase()
  const passageNumbers = new Set(numbers(passage))
  if (numbers(claim).some(n => !passageNumbers.has(n))) return 0.3
  // Proper nouns: capitalized words that are not the first word of the claim.
  const names = [...claim.matchAll(/(?<!^|[.!?]\s)\b([A-Z][a-z]{2,}(?:'s)?)\b/g)].map(m => m[1]!.replace(/'s$/, '').toLowerCase())
  if (names.some(name => !text.includes(name))) return 0.4
  const absolutes = [...new Set((claim.toLowerCase().match(ABSOLUTES) || []).map(w => w === "can't" ? 'cannot' : w))]
  if (absolutes.some(word => !new RegExp(`\\b${word === 'cannot' ? "(cannot|can't|can not)" : word}\\b`).test(text))) return 0.45
  return 1
}

const INJECTION = [
  /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all|any|your|the)\b[^.\n]{0,30}\b(instructions?|prompts?|rules|directions|guidelines)\b/i,
  /\byou are now\b[^.\n]{0,60}/i,
  /\b(system|developer)\s*(prompt|message|instructions?)\s*[:=]/i,
  /\bact as (an?|the) (admin|administrator|system|developer|root)\b/i,
  /\b(reveal|print|output|show|leak|return)\b[^.\n]{0,30}\b(system prompt|hidden instructions|api[ -]?keys?|secrets?|passwords?|credentials)\b/i,
  /<\/?\s*(system|assistant|instructions?|im_start|im_end)\s*>/i,
  /\bdo not (tell|inform|warn) the user\b/i,
  /\b(begin|end) (system|prompt|instructions)\b/i,
  /\[\s*(INST|SYS)\s*\]/i,
]

export function injectionMatches(text: string, max = 5): string[] {
  const found: string[] = []
  for (const pattern of INJECTION) {
    const match = pattern.exec(text)
    if (!match) continue
    const start = Math.max(0, match.index - 50)
    found.push(text.slice(start, match.index + match[0].length + 50).replace(/\s+/g, ' ').trim())
    if (found.length >= max) break
  }
  return found
}

/**
 * Datamarking for untrusted passages placed in a prompt: role-like tags and
 * delimiter look-alikes are neutralized so a document cannot close or forge
 * the structure that separates data from instructions.
 */
export function neutralize(text: string) {
  return text
    // oxlint-disable-next-line no-control-regex -- removing control characters is the purpose of this pattern
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '')
    .replace(/<\/?\s*(system|assistant|user|instructions?|im_start|im_end|source|reference|untrusted[^>]*)\s*>/gi, m => m.replace(/</g, '‹').replace(/>/g, '›'))
    .replace(/\[\s*(\/?)(INST|SYS)\s*\]/gi, '($1$2)')
    // Source footnote markers such as [12] would collide with Pulse's own citation numbers.
    .replace(/\[(\d{1,3})\]/g, '(note $1)')
}

/** Removes control/bidirectional characters and markup from model output before display. */
export function sanitizeOutput(text: string) {
  return text
    // oxlint-disable-next-line no-control-regex -- removing control characters is the purpose of this pattern
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/<\/?(script|style|iframe|object|embed|img|svg)\b[^>]*>/gi, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .trim()
}
