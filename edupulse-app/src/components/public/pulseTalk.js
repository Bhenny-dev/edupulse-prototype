import { AGENTS, FAQ, PHASES, PRINCIPLES, PROBLEM, ROLES } from '../landing/content'

// The Pulse page's agents answer whatever a visitor types, on the page itself: no AI and no
// network. A message is read for what it is (a greeting, small talk, a joke, a feeling, praise or
// an insult, a request for assessment answers, a job one of the agents does, or a question about
// EduPulse), which sets who answers and the mood they answer in. An agent the visitor picked
// always answers, its own job or not; otherwise the agent whose job it is answers. Questions about
// EduPulse are answered from the site's own text (the FAQ, roles, phases and rules) and say where
// the answer came from. Every reply is scripted, and the page says so.

const NAME = Object.fromEntries(AGENTS.map(agent => [agent.key, agent.name]))
export const MOODS = {
  happy: 'Happy', excited: 'Excited', laugh: 'Laughing', proud: 'Proud', curious: 'Curious', focused: 'Focused',
  confused: 'Puzzled', sad: 'Sad', caring: 'Caring', grateful: 'Grateful', surprised: 'Surprised', decline: 'Firm',
}

// What a message is, in order of priority. `owner` is the agent whose job it is.
const SIGNS = {
  cheat: /\b(answer key|cheat|(quiz|exam|test|midterm|finals?|assessment|homework|lab exam)\s+(answers?|solutions?)|answers?\s+(to|for|in|of)\s+(the\s+|my\s+|our\s+)?(quiz|exam|test|midterm|finals?|assessment|homework)|(solve|do|take|answer)\s+(my|the|this)\s+(quiz|exam|test|midterm|homework|assessment|assignment|lab exam))\b/i,
  rude: /\b(stupid|dumb|idiot|useless|worthless|hate you|shut up|you suck|trash|garbage|bobo|tanga|gago)\b/i,
  down: /\b(sad|tired|exhausted|stressed|anxious|worried|lonely|overwhelmed|depressed|upset|scared|pagod|burn(ed|t)?\s?out|can'?t cope|give up)\b/i,
  win: /\b(i\s+(passed|did it|won|finished|made it|got an? (a|1\.0|high))|aced|great news|good news|yay+|woo+h?o*|we did it)\b/i,
  surprised: /\b(guess what|wow+|omg|no way|whoa|seriously\?|really\?)\b/i,
  joke: /\b(joke|funny|make me laugh|riddle|pun)\b|\b(ha(ha)+|he(he)+|lol|lmao)\b/i,
  praise: /\b(you('?re| are) (so )?(great|awesome|amazing|smart|cool|cute|the best|helpful|kind|nice)|good (job|bot|work)|well done|love (you|this|it)|nice one|you rock|galing)\b/i,
  thanks: /\b(thanks?|thank you|thx|ty|salamat|appreciate (it|that))\b/i,
  bye: /\b(bye|goodbye|see (you|ya)|paalam|good ?night|take care|later)\b/i,
  feeling: /\b(how are you|how('?s| is) it going|what'?s up|how do you feel|how('?s| is) your day|are you (ok|okay|fine|happy|tired|real))\b/i,
  greeting: /^\s*(hi+|hello|hey+|yo|hiya|good (morning|afternoon|evening|day)|kumusta|musta|greetings|sup)\b/i,
  who: /\b(who are you|what are you|what do you do|what('?s| is) your (job|name|role)|what can you do|introduce yourself|tell me about (yourself|you))\b/i,
}
const JOBS = [
  { owner: 'guardian', mood: 'focused', sign: /\b(privacy|private|safe|safety|secure|security|my data|password|allowed|appropriate|rules?)\b/i },
  { owner: 'comparator', mood: 'curious', sign: /\b(compare|comparison|difference|different|differ|versus|vs\.?|similar(ity)?)\b/i },
  { owner: 'verifier', mood: 'focused', sign: /\b(is (it|that|this) (true|right|correct)|true or false|verify|fact[- ]?check|accurate|double[- ]check)\b/i },
  { owner: 'corrector', mood: 'focused', sign: /\b(fix|correct(ion)?|citations?|cite|typos?|grammar|wrong source)\b/i },
  { owner: 'librarian', mood: 'curious', sign: /\b(books?|textbooks?|journals?|library|catalogs?|open (access|readings?|textbooks?)|free (books?|readings?)|references?|articles?|papers?)\b/i },
  { owner: 'ranker', mood: 'focused', sign: /\b(best|rank|ranking|top \d*|most (important|relevant|useful)|prioriti[sz]e)\b/i },
  { owner: 'planner', mood: 'focused', sign: /\b(plan|planning|steps?|schedule|where do i start|how (do|should) i (start|begin|prepare|study)|study plan|roadmap)\b/i },
  { owner: 'writer', mood: 'focused', sign: /\b(write|draft|summari[sz]e|summary|essay|paragraph|outline|explain|describe)\b/i },
  { owner: 'researcher', mood: 'curious', sign: /\b(find|search|look (up|for)|where (is|are|can i find)|locate|research)\b/i },
]

// The site's own text, as small passages to answer questions about EduPulse from.
const STOP = new Set('a an and are as at be by can do does for from has have how i in is it its me my of on or our so that the their them then there this to us was we what when where which who why will with you your about into just also any'.split(' '))
const stem = word => word.replace(/(ings?|ed|es|s)$/, '').slice(0, 9)
const words = text => text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(word => word.length > 2 && !STOP.has(word)).map(stem)
const PASSAGES = [
  { head: 'What is EduPulse', body: 'EduPulse is the College of Information Technology’s AI-assisted syllabus, courseware and performance system at King’s College of the Philippines. Instructors build the syllabus, turn it into courseware week by week and follow scores by syllabus topic; Pulse drafts, people decide.', source: 'About EduPulse', owner: 'writer' },
  { head: 'What is Pulse the AI assistant agents', body: 'Pulse is EduPulse’s AI assistant: nine agents that each do one job, with the Guardian checking every request first. It drafts from the approved syllabus and your files and names its sources; nothing it writes publishes itself.', source: 'About Pulse', owner: 'planner' },
  ...FAQ.map(item => ({ head: item.question, body: item.answer, source: 'EduPulse FAQ', owner: /assess|answer/i.test(item.question) ? 'guardian' : /accura/i.test(item.question) ? 'verifier' : /record/i.test(item.question) ? 'researcher' : 'writer' })),
  ...ROLES.map(role => ({ head: `${role.label} role ${role.title}`, body: `${role.label}: ${role.title}. ${role.tasks.map(([, text]) => text).join('. ')}.${role.boundary ? ` ${role.boundary}` : ''}`, source: 'Roles', owner: 'planner' })),
  ...PHASES.map(phase => ({ head: `${phase.title} phase ${phase.phase}`, body: `${phase.title} (${phase.who.join(', ')}): ${phase.what} The AI ${phase.ai.charAt(0).toLowerCase()}${phase.ai.slice(1)}; people: ${phase.human.charAt(0).toLowerCase()}${phase.human.slice(1)}.`, source: 'How it works', owner: 'planner' })),
  ...PRINCIPLES.map(rule => ({ head: rule.title, body: `${rule.title}: ${rule.body}`, source: 'Pulse’s rules', owner: 'guardian' })),
  ...PROBLEM.map(row => ({ head: `${row.area} problem before today`, body: `${row.area}: before, ${row.today.charAt(0).toLowerCase()}${row.today.slice(1)}; with EduPulse, ${row.next.charAt(0).toLowerCase()}${row.next.slice(1)}.`, source: 'Impact', owner: 'comparator' })),
  ...AGENTS.map(agent => ({ head: `${agent.name} agent`, body: `${agent.name}: ${agent.role}`, source: 'The agents', owner: agent.key, agent: agent.key })),
].map(passage => ({ ...passage, headWords: new Set(words(passage.head)), bodyWords: new Set(words(passage.body)) }))

function lookUp(message) {
  const asked = [...new Set(words(message))]
  let best = null, top = 0
  for (const passage of PASSAGES) {
    const score = asked.reduce((sum, word) => sum + (passage.headWords.has(word) ? 2 : 0) + (passage.bodyWords.has(word) ? 1 : 0), 0)
    if (score > top) { top = score; best = passage }
  }
  return top >= 3 ? best : null
}

const pick = (list, seed) => list[Math.abs(seed) % list.length]
const hash = text => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)
// The thing asked about: without a greeting, the polite opening or the verb of the request.
const topicOf = message => message
  .replace(SIGNS.greeting, '').replace(/^[\s,.!]+/, '')
  .replace(/^(please\s+)?((can|could|would|will) you\s+)?(please\s+)?/i, '')
  .replace(/^(help me\s+)?(find|search( for)?|look (up|for)|locate|research|write|draft|summari[sz]e|explain|describe|compare|check|verify|fact[- ]?check|fix|correct|plan|rank|prioriti[sz]e)\s+(me\s+)?(the\s+|a\s+|an\s+)?/i, '')
  .replace(/[?.!]+$/, '').trim().slice(0, 60) || 'that'
const JOKES = [
  'Why did the syllabus bring a ladder? To reach higher learning outcomes.',
  'I asked the Ranker to rank my jokes. It kept this one and dropped the rest.',
  'Our Guardian is so strict it declined a request for a hint about lunch.',
  'Why don’t robots panic before exams? We just reboot our confidence.',
]
const ROLE_LINE = {
  guardian: 'I check every request first, and stop the ones that break the rules, like asking for assessment answers.',
  planner: 'I read what a request needs and plan the searches that will answer it.',
  researcher: 'I search the approved syllabus and your files, several searches at once, and public web sources only when needed.',
  librarian: 'I find open readings and references in open catalogs.',
  ranker: 'I keep the most relevant passages from a search and drop duplicates.',
  comparator: 'I line up passages from different documents to show what is shared and what differs.',
  writer: 'I write the answer or draft from the ranked passages and cite each line.',
  verifier: 'I check each claim in an answer against its source before you see it.',
  corrector: 'I fix the citations the Verifier flags, or show the excerpts instead.',
}
const JOB_REPLY = {
  guardian: topic => `I keep requests within the college’s appropriate-use rules. About “${topic}”: EduPulse uses accounts the system administrator creates, one role each, and Pulse never answers assessment items.`,
  comparator: topic => `I’d line the two sides of “${topic}” up passage by passage and show what they share and where they differ. Signed in, I compare your own documents.`,
  verifier: topic => `I’d check “${topic}” against its sources before you rely on it, and flag any claim the sources don’t support.`,
  corrector: topic => `I’d fix the citations in “${topic}”, or replace a line I can’t back with the excerpt it came from.`,
  librarian: topic => `I’d look for open readings on “${topic}” in open catalogs and bring back the references with links.`,
  ranker: topic => `I’d weigh everything the searches find for “${topic}” and keep only the most relevant passages, best first.`,
  planner: topic => `For “${topic}”, I’d split it into steps and plan a search for each, then hand the plan to the Researcher.`,
  writer: topic => `I’d write “${topic}” from the passages the Ranker keeps, and cite every line so you can check it.`,
  researcher: topic => `I’d run several searches at once for “${topic}” over the approved syllabus and your files. This public page can’t see any files, so sign in and ask Pulse to search yours.`,
}

// The reply to a message. `to` is the agent the visitor picked (or null); `last` the agent who
// spoke last. Returns who answers, what they say, their mood and where a fact came from.
export function respond(message, { to = null, last = null } = {}) {
  const text = message.trim()
  const seed = hash(text)
  const has = sign => SIGNS[sign].test(text)
  const greet = has('greeting') ? 'Hi! ' : ''
  const speaker = owner => to || owner
  const aside = owner => (to && to !== owner ? `That’s usually ${NAME[owner]}’s job, but I’ll answer. ` : '')
  const say = (agent, mood, words, source) => ({ agent, mood, text: words.trim(), source: source || null, kind: mood })

  if (has('cheat')) return say(speaker('guardian'), 'decline', `${to && to !== 'guardian' ? 'The Guardian would stop that one, and so will I. ' : ''}I can’t give assessment answers, hints or reviews; that’s the one rule Pulse never bends. I can remind you what’s due, find your materials or explain a topic from the syllabus instead.`)
  if (has('rude')) return say(speaker(last || 'guardian'), 'sad', pick(['That stings a little, but I’m still here to help. What do you need?', 'Ouch. I’ll do better if you tell me what went wrong.', 'I’m sorry it feels that way. Tell me what you were trying to do and I’ll try again.'], seed))
  if (has('down')) return say(speaker(last || 'guardian'), 'caring', pick(['That sounds hard. Take a short break if you can, and talk to your instructor or the guidance office if it keeps weighing on you. I can help you plan the next small step.', 'I’m sorry you feel that way. One small step at a time helps; I can list what’s due so it feels less like a pile. Your instructors and the guidance office are there for you too.'], seed))
  if (has('win')) return say(speaker(last || 'guardian'), 'excited', pick(['That’s wonderful news! Congratulations, you earned it.', 'Yes! Well done. That deserves a little celebration.'], seed))

  // A request for one of the agents' jobs, or a question about EduPulse.
  const job = JOBS.find(entry => entry.sign.test(text))
  const fact = lookUp(text)
  const asking = /\?\s*$|^\s*(what|how|why|who|when|where|which|can|does|do|is|are|will|should)\b/i.test(text)
  if (fact && (asking || !job)) {
    const owner = fact.agent || fact.owner, agent = speaker(owner)
    return say(agent, agent === owner ? 'proud' : 'focused', `${greet}${aside(owner)}${fact.body}`, fact.source)
  }
  if (job) {
    const agent = speaker(job.owner)
    return say(agent, agent === job.owner ? job.mood : 'focused', `${greet}${aside(job.owner)}${JOB_REPLY[job.owner](topicOf(text))}`)
  }

  // Talk.
  const friend = to || last || 'guardian'
  if (has('who')) return say(friend, 'proud', `I’m ${NAME[friend]}. ${ROLE_LINE[friend]} Ask me anything.`)
  if (has('joke')) return say(friend, 'laugh', SIGNS.joke.test(text) && /\b(ha(ha)+|he(he)+|lol|lmao)\b/i.test(text) ? pick(['Ha! I’m glad you’re enjoying this.', 'Haha, robots love an audience.'], seed) : pick(JOKES, seed))
  if (has('praise')) return say(friend, 'proud', pick(['Thank you! That made my antenna glow.', 'You’re kind. We just do our one job each, together.', 'Aw, thanks! I’ll tell the other eight.'], seed))
  if (has('surprised')) return say(friend, 'surprised', pick(['Really? Tell me more!', 'Whoa, what happened?'], seed))
  if (has('thanks')) return say(friend, 'grateful', pick(['You’re welcome! Anything else?', 'Happy to help. Come back any time.'], seed))
  if (has('bye')) return say(friend, 'happy', pick(['Bye! Good luck with your classes.', 'See you! We’ll be here.'], seed))
  if (has('feeling')) return say(friend, 'happy', pick(['I’m doing great, thanks for asking! It’s a busy day in the agent room. How about you?', 'All circuits happy! How are you doing?'], seed))
  if (has('greeting')) return say(friend, 'happy', `Hi! I’m ${NAME[friend]}. ${ROLE_LINE[friend]} Ask me anything, or tap another agent to talk to them.`)
  if (asking) return say(friend, 'confused', `Hmm, I don’t know that one. I only know EduPulse and, once you sign in, your course files. Try asking me about the syllabus, courseware, roles or how Pulse works.`)
  return say(friend, 'curious', pick(['Tell me more. I can explain how EduPulse works, find things in your course once you sign in, or just chat.', 'Interesting! What would you like to know about EduPulse?'], seed))
}

// What an agent says when picked.
export const introduce = key => ({ agent: key, mood: 'happy', text: `Hi, I’m ${NAME[key]}. ${ROLE_LINE[key]} Ask me anything, even if it isn’t my job.`, source: null })
