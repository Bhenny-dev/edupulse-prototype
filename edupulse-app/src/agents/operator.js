import { terms } from '../lib/rag/text.js'

// Operator: turns a Pulse conversation into proposed app actions. Rule-based and
// deterministic, like the Planner and the Guardian: model output never decides
// or runs an action. Every proposal that changes data waits for the user's
// Confirm in the Pulse panel; searches and page changes only read or navigate.

const REGISTER = /\b(register|enrol+|enroll|import|add|upload|load|put)\b[^.?!]{0,50}\b(students?|class\s*lists?|rosters?|master\s*lists?|learners?|block|section)\b|\b(class\s*list|roster|master\s*list)\b/i
const FILE = /\b(file|save|add|put|upload|store|keep|organi[sz]e|categori[sz]e|assign|tag|move|index)\b[^.?!]{0,50}\b(to|under|in|into|for|with)\b[^.?!]{0,40}\b(course|class|subject|library|folder|[A-Z]{2,5}\s?-?\d{1,3})/i
const WHICH_COURSE = /\b(which|what)\s+(course|class|subject)\b|\b(belongs?|related|relevant)\s+to\b|\bthis\s+is\s+(?:for|from|in)\b/i
const STUDY = /\b(reviewers?|study\s+guides?|flash\s?cards?|practice\s+(?:questions?|quiz(?:zes)?|tests?|items?)|self[-\s]?tests?|summar(?:y|i[sz]e)|key\s+points|main\s+points|notes?|outline|explain|quiz\s+me|lesson\s+plan|handouts?)\b/i
const SUMMARY = /\b(summar(?:y|i[sz]e)|key\s+points|main\s+points|overview|tl;?dr)\b/i
const GENERATE = /\b(generate|create|draft|make|prepare|build|produce)\b/i
const WEEK = /\b(?:week|wk)\.?\s*(\d{1,2})\b/i
const COURSEWARE = /\b(courseware|materials?|lessons?|lecture\s+notes|activit(?:y|ies)|assessments?|quiz(?:zes)?|content)\b/i
const NAVIGATE = /^(?:please\s+|can\s+you\s+|could\s+you\s+)?(?:go\s+to|open|take\s+me\s+to|bring\s+me\s+to|navigate\s+to|show\s+me|switch\s+to|where\s+(?:is|are|can\s+i\s+find)|i\s+want\s+to\s+see)\b/i
const SEARCH = /^(?:please\s+|can\s+you\s+|could\s+you\s+|help\s+me\s+)?(?:find|search(?:\s+for)?|look\s*up|look\s+for|locate|who\s+is|is\s+there|do\s+i\s+have|check\s+if)\b|\bis\s+.{2,60}?\s+(?:registered|enrolled|listed|in\s+(?:my|the|this)\s+(?:class|course|list|roster|block|section|file))\b/i
const REFERENCES = /\b(books?|textbooks?|readings?|articles?|papers?|journals?|bibliograph\w*|scholarly|references?)\b/i
const CONTENT_QUESTION = /\b(what|why|how|explain|define|describe|says?|discuss\w*|mention\w*)\b/i

/** Pages Pulse may open, with the roles each route allows (src/App.jsx). */
export const PAGES = [
  { path: '/syllabus?tab=register', label: 'Syllabus → My Courses', words: /\b(my\s+courses|registered\s+courses|class\s*lists?|rosters?|registrations?)\b/i, roles: ['instructor'] },
  { path: '/syllabus?tab=builder', label: 'Syllabus Builder', words: /\b(syllabus\s+builder|(new|build|create)\s+(a\s+)?syllabus)\b/i, roles: ['instructor'] },
  { path: '/syllabus?tab=repository', label: 'Shared Repository', words: /\b(shared\s+)?repository\b/i, roles: ['instructor'] },
  { path: '/syllabus?tab=mine', label: 'Syllabus → My Syllabus', words: /\bsyllab(us|i)\b/i, roles: ['instructor'] },
  { path: '/student-monitoring', label: 'Student Monitoring', words: /\b(student\s+monitoring|scoring\s+sheet|scores?\s+sheet)\b/i, roles: ['instructor'] },
  { path: '/assessment', label: 'Assessments', words: /\b(assessments?|quizz?(es)?)\b/i, roles: ['student'] },
  { path: '/courseware', label: 'My Courses', words: /\b(my\s+courses|courseware|materials?|lessons?)\b/i, roles: ['student'] },
  { path: '/courseware', label: 'Courseware', words: /\b(courseware|materials?|lessons?)\b/i, roles: ['instructor', 'dean', 'associate_dean'] },
  { path: '/records', label: 'Records', words: /\b(records?|edusuite|class\s*lists?|blocks?)\b/i, roles: ['dean', 'associate_dean'] },
  { path: '/course-loading', label: 'Course Loading', words: /\b(course\s+loading|course\s+loads?|loading)\b/i, roles: ['dean', 'associate_dean'] },
  { path: '/monitor', label: 'Monitor', words: /\bmonitor(ing)?\b/i, roles: ['dean', 'associate_dean'] },
  { path: '/performance', label: 'Performance', words: /\b(performance|progress|scores?|grades?)\b/i, roles: ['instructor', 'student', 'dean', 'associate_dean'] },
  { path: '/settings?tab=ai-provider', label: 'Settings → AI & Knowledge', words: /\b(knowledge\s+library|my\s+library|library|ai\s+settings|ai\s+(?:&|and)\s+knowledge|ai\s+provider)\b/i, roles: 'all' },
  { path: '/settings', label: 'Settings', words: /\b(settings|preferences|profile)\b/i, roles: 'all' },
  { path: '/notifications', label: 'Notifications', words: /\bnotifications?\b/i, roles: 'all' },
  { path: '/help', label: 'Help & Support', words: /\bhelp(\s+(?:&|and)\s+support)?\b/i, roles: 'all' },
  { path: '/dashboard', label: 'Dashboard', words: /\b(dashboard|home(\s*page)?)\b/i, roles: 'all' },
]
const allowed = (page, role) => page.roles === 'all' || page.roles.includes(role)

const fold = text => String(text || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
const compact = text => fold(text).replace(/[^a-z0-9]+/g, '')
const codePattern = code => new RegExp(`(?:^|[^a-z0-9])${fold(code).split(/[^a-z0-9]+/).filter(Boolean).join('[\\s-]*')}(?![a-z0-9])`, 'i')
const isExam = row => !row?.ilos && /examination/i.test(row?.assessments || '')

/** The newest usable syllabus for a course: active first, then the latest edit. */
export function pickSyllabus(syllabi, code) {
  const rank = s => (s.status === 'active' ? 2 : s.status === 'archived' ? -1 : 1)
  return syllabi.filter(s => s.courseCode === code && s.status !== 'archived').sort((a, b) => rank(b) - rank(a) || String(b.lastUpdated || '').localeCompare(String(a.lastUpdated || '')))[0] || null
}

/**
 * Courses Pulse can act on, from the curriculum plus the syllabi and registrations in the
 * workspace. `yours` marks the courses a person teaches (syllabus or class list) or is enrolled in.
 */
export function courseCatalog({ curriculum, syllabi = [], registrations = [], enrolled = null, role, userId }) {
  return curriculum.map(course => {
    const syllabus = pickSyllabus(syllabi, course.code)
    const yours = role === 'student' ? Boolean(enrolled?.has(course.code)) : Boolean((syllabus && !syllabus.sample) || registrations.some(r => r.courseCode === course.code && r.uploadedBy === userId))
    return { code: course.code, title: course.title, description: course.description || '', outcomes: course.programOutcomes || [], yearLevel: course.yearLevel, syllabus, yours }
  })
}

/** Courses named in a text by code ("IT 102", "it-102") or by full title ("Computer Programming 1"). */
export function findCourseMentions(text, catalog) {
  const value = fold(text)
  const hits = catalog.filter(course => codePattern(course.code).test(value) || (course.title.length >= 8 && value.includes(fold(course.title))))
  // "WMAD 303" names "WMAD 303-1" when that is the only course it can mean.
  if (!hits.length) {
    const partial = catalog.filter(course => /-\d+$/.test(course.code) && codePattern(course.code.replace(/-\d+$/, '')).test(value))
    if (partial.length === 1) return partial
  }
  return hits.sort((a, b) => b.code.length - a.code.length)
}

/** Text that describes a course for matching, with where each part comes from. */
function courseProfile(course) {
  const parts = [{ text: course.title, where: 'course title', weight: 3 }, { text: course.description, where: 'course description', weight: 1.5 }, ...course.outcomes.map(text => ({ text, where: 'program outcome', weight: 1 }))]
  for (const row of course.syllabus?.courseOutline || []) {
    if (isExam(row)) continue
    const topics = (row.contents || []).filter(Boolean).join('; ')
    if (topics) parts.push({ text: topics, where: `Week ${row.week} topics`, weight: 2 })
    if (row.ilos) parts.push({ text: row.ilos, where: `Week ${row.week} learning outcomes`, weight: 1.5 })
  }
  return parts
}
export const profileText = course => courseProfile(course).map(p => p.text).join('. ').slice(0, 2000)

/**
 * Ranks courses for a material by weighted term overlap (TF-IDF over the course
 * profiles). Each suggestion lists the matched words and where in the course they
 * appear, so the reason is visible. A course named in the file name or text wins.
 */
export function rankCourses(text, catalog, { fileName = '', limit = 3, floor = 0.35 } = {}) {
  const words = fold(text.slice(0, 60000)).match(/[a-z0-9]+/g) || []
  const surface = new Map()
  const tf = new Map()
  for (const word of words) {
    const [term] = terms(word)
    if (!term || term.length < 3 || /^\d+$/.test(term)) continue
    tf.set(term, (tf.get(term) || 0) + 1)
    if (!surface.has(term)) surface.set(term, word)
  }
  const profiles = catalog.map(course => {
    const weights = new Map(), where = new Map()
    for (const part of courseProfile(course)) for (const term of new Set(terms(part.text))) {
      if (term.length < 3 || /^\d+$/.test(term)) continue
      if ((weights.get(term) || 0) < part.weight) { weights.set(term, part.weight); where.set(term, part.where) }
    }
    return { course, weights, where }
  })
  const df = new Map()
  for (const p of profiles) for (const term of p.weights.keys()) df.set(term, (df.get(term) || 0) + 1)
  const idf = term => Math.log((profiles.length + 1) / ((df.get(term) || 0) + 0.5))
  const named = new Set(findCourseMentions(`${fileName} ${text.slice(0, 4000)}`, catalog).map(c => c.code))
  const scored = profiles.map(({ course, weights, where }) => {
    let score = 0, norm = 0
    const matched = []
    for (const [term, weight] of weights) {
      const w = weight * idf(term)
      norm += w
      const count = tf.get(term)
      if (!count) continue
      const contribution = w * Math.log(1 + count)
      score += contribution
      matched.push({ term, word: surface.get(term) || term, where: where.get(term), contribution })
    }
    const lexical = norm ? score / Math.sqrt(norm) : 0
    matched.sort((a, b) => b.contribution - a.contribution)
    return { code: course.code, title: course.title, yours: course.yours, named: named.has(course.code), lexical, score: lexical * (course.yours ? 1.15 : 1) + (named.has(course.code) ? 100 : 0), matched: matched.slice(0, 6).map(({ word, where }) => ({ word, where })) }
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score)
  // Weak runners-up (a single shared common word) are noise, not suggestions.
  return labelMatches(scored.filter(s => s.score >= floor * scored[0].score)).slice(0, limit)
}

function labelMatches(ranked) {
  return ranked.map((entry, i) => ({ ...entry, strength: entry.named ? 'named' : i === 0 && (!ranked[1] || entry.score >= 1.5 * ranked[1].score) && entry.matched.length >= 2 ? 'strong' : 'possible' }))
}

/**
 * Re-ranks the lexical shortlist with the embedding model (the server's similarity
 * action). Falls back to the lexical order when the model is unavailable.
 */
export async function refineCourses(text, ranked, catalog, similarity, signal) {
  // Without the model, the keyword ranking stands, with its usual cut-off for weak matches.
  const keywordOnly = () => ({ ranked: labelMatches(ranked.filter(s => s.score >= 0.35 * ranked[0].score)).slice(0, 3), method: 'keyword match' })
  if (!ranked.length || !similarity) return keywordOnly()
  try {
    const shortlist = ranked.slice(0, 12)
    const excerpt = text.replace(/\[\[(?:Page|Slide) \d+\]\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800)
    // The similarity action accepts course profiles of up to 2,000 characters.
    const matrix = await similarity([excerpt], shortlist.map(entry => `${entry.code} ${profileText(catalog.find(c => c.code === entry.code))}`.slice(0, 2000)), signal)
    const semantic = matrix[0] || []
    const top = Math.max(...shortlist.map(s => s.lexical), 1e-9)
    const combined = shortlist.map((entry, i) => ({ ...entry, semantic: semantic[i] ?? 0, score: (entry.named ? 100 : 0) + 0.6 * (semantic[i] ?? 0) + 0.4 * (entry.lexical / top) + (entry.yours ? 0.05 : 0) }))
    combined.sort((a, b) => b.score - a.score)
    return { ranked: labelMatches(combined.filter(s => s.score >= 0.5 * combined[0].score)).slice(0, 3), method: 'meaning (embeddings) and keyword match' }
  } catch (error) {
    if (signal?.aborted) throw error
    return keywordOnly()
  }
}

/** A course's syllabus as a cited reference for Pulse answers (RAG over the user's own records). */
export function syllabusReference(course) {
  const s = course.syllabus
  if (!s) return null
  const weeks = (s.courseOutline || []).map(row => isExam(row)
    ? `Week ${row.week}: ${row.assessments || 'Examination'}`
    : `Week ${row.week}: topics ${(row.contents || []).filter(Boolean).join('; ') || 'not set'}. Learning outcomes: ${row.ilos || 'not set'}.${row.activities ? ` Activities: ${row.activities}.` : ''}${row.assessments ? ` Assessments: ${row.assessments}.` : ''}`)
  const text = [`# ${s.courseCode} ${s.courseTitle || course.title} syllabus`, `Status: ${s.status}${s.version ? `, version ${s.version}` : ''}.`, s.courseDescription || course.description ? `## Course description\n${s.courseDescription || course.description}` : '', weeks.length ? `## Course outline\n${weeks.join('\n')}` : ''].filter(Boolean).join('\n')
  return { title: `${s.courseCode} syllabus (${s.sample ? 'sample record' : 'your workspace'})`, text: text.slice(0, 18000) }
}

/** Removes the request words around a search ("is Maria Reyes in this list?" → "Maria Reyes"). */
export function searchQuery(message) {
  return message
    .replace(/^(?:please\s+|can\s+you\s+|could\s+you\s+|help\s+me\s+)?(?:find|search(?:\s+for)?|look\s*up|look\s+for|locate|who\s+is|is\s+there|do\s+i\s+have|check\s+if)\b/i, ' ')
    .replace(/^\s*is\s+/i, ' ')
    .replace(/\b(?:registered|enrolled|listed)\b.*$/i, ' ')
    .replace(/\b(?:in|on|from|within|among)\s+(?:my|the|this|our|these)\s+(?:class(?:es)?|courses?|lists?|class\s*lists?|rosters?|blocks?|sections?|files?|workspace|records?)\b.*$/i, ' ')
    .replace(/\b(?:a\s+)?(?:students?|learners?)\s+(?:named|called)\b/i, ' ')
    .replace(/\b(?:please|my|the|a|an|any|all|for|named|called)\b/gi, ' ')
    .replace(/[?!.,;:"“”]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
}

const tokensOf = query => fold(query).split(/[^a-z0-9@._-]+/).filter(t => t.length >= 2 && !['in', 'of', 'and', 'or', 'to', 'is'].includes(t))
function matchScore(query, haystack) {
  const tokens = tokensOf(query)
  if (!tokens.length) return 0
  const hay = fold(haystack), packed = compact(haystack)
  const hits = tokens.filter(t => hay.includes(t) || packed.includes(compact(t)))
  if (hits.length < tokens.length) return 0
  return 1 + (hay.includes(fold(query)) || packed.includes(compact(query)) ? 1 : 0)
}

/**
 * Searches the records a person can see: class lists they registered (and any
 * attached list), courses, syllabi, courseware drafts and library documents.
 * Every hit names the record it came from and where to open it.
 */
export function searchRecords(query, { role, userId, catalog = [], registrations = [], rosters = [], syllabi = [], content = {}, documents = [] }) {
  const results = []
  const add = (group, hit) => results.push({ group, ...hit })
  for (const roster of rosters) for (const s of roster.students) {
    const score = matchScore(query, `${s.Name} ${s.StudentID} ${s.Email} ${s.Block}`)
    if (score) add('In the attached class list', { score, title: s.Name, detail: [s.StudentID, s.Block, s.Email].filter(Boolean).join(' · '), source: roster.fileName })
  }
  const own = registrations.filter(r => role !== 'instructor' || r.uploadedBy === userId)
  for (const r of own) {
    for (const s of r.students || []) {
      const score = matchScore(query, `${s.Name} ${s.StudentID} ${s.Email} ${s.Block}`)
      if (score) add('Registered students', { score, title: s.Name || s.StudentID, detail: [s.StudentID, `${r.courseCode} · ${r.blockSection}`].filter(Boolean).join(' · '), source: r.fileName || 'class list', path: role === 'instructor' ? '/syllabus?tab=register' : '/records' })
    }
    const score = matchScore(query, `${r.courseCode} ${r.courseTitle || ''} ${r.blockSection}`)
    if (score) add('Class lists', { score, title: `${r.courseCode} · ${r.blockSection}`, detail: `${r.studentCount} students · ${r.status === 'active' ? 'Active' : 'Pending'}`, source: r.fileName || 'class list', path: role === 'instructor' ? '/syllabus?tab=register' : '/records' })
  }
  for (const course of catalog) {
    const score = matchScore(query, `${course.code} ${course.title}`)
    if (!score) continue
    const path = role === 'student' ? '/courseware' : role === 'instructor' ? (course.syllabus ? '/syllabus?tab=mine' : '/syllabus?tab=builder') : ['dean', 'associate_dean'].includes(role) ? '/course-loading' : null
    add('Courses', { score: score + (course.yours ? 0.5 : 0), title: `${course.code} — ${course.title}`, detail: course.syllabus ? `Syllabus: ${course.syllabus.status.replace(/_/g, ' ')}${course.syllabus.sample ? ' (sample)' : ''}` : role === 'student' ? (course.yours ? 'Enrolled' : 'Curriculum course') : 'No syllabus in your workspace', source: 'BSIT curriculum', path })
  }
  for (const [id, item] of Object.entries(content)) {
    const title = item.title || item.content?.title || ''
    const score = matchScore(query, `${title} week ${item.week} ${item.type}`)
    if (!score || (role === 'student' && item.status !== 'published')) continue
    const syllabus = syllabi.find(s => s.id === item.syllabusId)
    add('Courseware', { score, title, detail: `${syllabus?.courseCode || 'Course'} · Week ${item.week} · ${item.type} · ${item.status}`, source: 'Courseware', path: role === 'instructor' && syllabus ? `/courseware?tab=builder&course=${encodeURIComponent(syllabus.id)}&week=${item.week}` : '/courseware', id })
  }
  for (const document of documents) {
    const score = matchScore(query, `${document.title} ${document.file_name || ''} ${document.quality?.course || ''}`)
    if (score) add('Knowledge library', { score, title: document.title, detail: `${document.chunks} passages${document.page_count ? ` · ${document.page_count} pages` : ''}`, source: document.file_name || 'knowledge library', documentId: document.id, path: '/settings?tab=ai-provider' })
  }
  const order = ['In the attached class list', 'Registered students', 'Class lists', 'Courses', 'Courseware', 'Knowledge library']
  return results.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || b.score - a.score).filter((hit, i, list) => list.findIndex(h => h.group === hit.group && h.title === hit.title && h.detail === hit.detail) === i).slice(0, 12)
}

/** The page a navigation request names, if the role may open it. */
export function pageFor(message, role) {
  if (!NAVIGATE.test(message)) return null
  const rest = message.replace(NAVIGATE, ' ')
  const page = PAGES.find(p => p.words.test(rest) && allowed(p, role))
  if (page) return page
  const blocked = PAGES.find(p => p.words.test(rest))
  return blocked ? { ...blocked, denied: true } : null
}

/**
 * Plans what Pulse should do with one message. Returns the proposals to show
 * and whether the message should also go to the answer pipeline (chat).
 *
 * attachments: [{ title, fileName, text, roster }] where roster comes from parseRoster.
 */
export function planOperator({ message, attachments = [], role, catalog = [], currentCourse = null }) {
  const text = message.trim()
  const rosters = attachments.filter(a => a.roster)
  const materials = attachments.filter(a => !a.roster)
  const proposals = []
  let chat = Boolean(text)
  const mentioned = findCourseMentions(text, catalog)
  const canLibrary = role !== 'guest'

  if (rosters.length) {
    const asksAbout = SEARCH.test(text) || /\b(how\s+many|who|count|list)\b/i.test(text)
    if (role === 'instructor') {
      if (asksAbout) proposals.push({ type: 'search', query: searchQuery(text) || text })
      if (!asksAbout || REGISTER.test(text)) for (const roster of rosters) proposals.push({ type: 'register', attachment: roster, courseCode: mentioned[0]?.code || roster.detectedCourse || '', block: roster.roster.block })
      chat = Boolean(text) && !REGISTER.test(text) && !asksAbout && CONTENT_QUESTION.test(text)
    } else {
      proposals.push({ type: 'notice', text: `${rosters.map(r => r.fileName).join(', ')} looks like a class list. Only instructors register class lists, in Syllabus → My Courses.${role === 'student' ? ' Ask your instructor if your name is missing.' : ''}` })
      if (asksAbout) proposals.push({ type: 'search', query: searchQuery(text) || text })
      chat = Boolean(text) && !asksAbout && CONTENT_QUESTION.test(text)
    }
  }

  if (materials.length) {
    const wantsFile = FILE.test(text) || WHICH_COURSE.test(text)
    const wantsStudy = STUDY.test(text) || CONTENT_QUESTION.test(text)
    if (!text) {
      for (const material of materials) proposals.push({ type: 'file', attachment: material, courseCode: mentioned[0]?.code || '', compact: false })
      proposals.push({ type: 'study', attachments: materials })
      chat = false
    } else if (wantsFile && canLibrary) {
      for (const material of materials) proposals.push({ type: 'file', attachment: material, courseCode: mentioned[0]?.code || '', compact: false })
      chat = wantsStudy && !WHICH_COURSE.test(text)
    } else if (canLibrary && !REGISTER.test(text)) {
      // The answer comes first; filing the material under a course is offered beneath it.
      for (const material of materials) proposals.push({ type: 'file', attachment: material, courseCode: mentioned[0]?.code || '', compact: true, after: true })
    }
    return { proposals, chat, task: chat && SUMMARY.test(text) ? 'summarize' : chat && GENERATE.test(text) && STUDY.test(text) ? 'draft' : 'auto', mentioned }
  }
  if (rosters.length) return { proposals, chat, task: 'auto', mentioned }

  // No attachment.
  if (REGISTER.test(text) && /\b(register|enrol+|enroll|import|upload|add)\b/i.test(text) && !SEARCH.test(text)) {
    proposals.push(role === 'instructor'
      ? { type: 'notice', text: 'Attach the class list (CSV, Excel, PDF or Word) with the paper clip and I will read it, match the course and block, and ask you to confirm before anything is registered.', attach: true, path: '/syllabus?tab=register', pathLabel: 'Open My Courses' }
      : { type: 'notice', text: 'Only instructors register class lists. Class lists come from EduSuite through each course’s instructor.' })
    return { proposals, chat: false, task: 'auto', mentioned }
  }
  if (FILE.test(text) && /\b(this|these|my|the)\s+(file|document|material|notes?|handouts?|slides?|pdf|reviewer)s?\b/i.test(text)) {
    proposals.push({ type: 'notice', text: 'Attach the material with the paper clip. I will suggest the course it belongs to, show why, and add it to your knowledge library only after you confirm.', attach: true })
    return { proposals, chat: false, task: 'auto', mentioned }
  }
  if (role === 'instructor' && GENERATE.test(text) && (WEEK.test(text) || COURSEWARE.test(text)) && !REFERENCES.test(text)) {
    const course = mentioned[0] || currentCourse
    if (course) {
      const week = Number(WEEK.exec(text)?.[1]) || null
      proposals.push({ type: 'generate-week', courseCode: course.code, week, request: text })
      return { proposals, chat: false, task: 'auto', mentioned }
    }
  }
  const page = pageFor(text, role)
  if (page) {
    proposals.push(page.denied ? { type: 'notice', text: `${page.label} is not available for your role.` } : { type: 'navigate', path: page.path, label: page.label })
    return { proposals, chat: false, task: 'auto', mentioned }
  }
  if (SEARCH.test(text) && !REFERENCES.test(text)) {
    const query = searchQuery(text)
    if (query) proposals.push({ type: 'search', query, fallbackToChat: true })
    return { proposals, chat: !query, task: 'auto', mentioned }
  }
  return { proposals, chat, task: 'auto', mentioned }
}
