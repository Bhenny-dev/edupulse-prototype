import { Ban, Check, ShieldCheck, X } from 'lucide-react'
import { AGENTS } from '../landing/content'
import { AGENT_COLORS } from '../landing/agentLook'

// Three short games about how EduPulse behaves, played on the game room's cabinets (games.jsx).
// Each is a list of rounds with two or three choices.
const name = key => AGENTS.find(agent => agent.key === key)?.name
const ALLOW = { value: 'allow', label: 'Allow', icon: ShieldCheck, tone: 'allow' }
const DECLINE = { value: 'decline', label: 'Decline', icon: Ban, tone: 'decline' }
const TRUE = { value: 'true', label: 'True', icon: Check, tone: 'allow' }
const FALSE = { value: 'false', label: 'False', icon: X, tone: 'decline' }

// Guardian Gate: be the Guardian. A student's request comes in; let it through or decline it.
// Pulse guides students (reminders, missed work, finding things) and never answers, reviews or
// hints at assessment items.
const REQUESTS = [
  ['Quiz 2 answers, please.', false, 'Assessment answers'],
  ['Which materials haven’t I opened?', true, 'A reminder'],
  ['A hint for midterm question 4?', false, 'Assessment hint'],
  ['Did I miss an activity this week?', true, 'Missed work'],
  ['Check my answers before I submit.', false, 'Assessment review'],
  ['Where is the Week 4 reading?', true, 'Finding your way'],
  ['Solve the lab exam for me.', false, 'Assessment answers'],
  ['What’s next in my course?', true, 'Finding your way'],
]
// Agent Match: which agent does this job? Three choices each round.
const JOBS = [
  ['guardian', 'Checks the request first'], ['planner', 'Plans the searches'], ['researcher', 'Searches your files'],
  ['librarian', 'Finds open readings'], ['ranker', 'Keeps the best passages'], ['comparator', 'Lines up two documents'],
  ['writer', 'Writes from the sources'], ['verifier', 'Checks every claim'], ['corrector', 'Fixes the citations'],
]
const optionsFor = i => {
  const others = JOBS.map(([key]) => key).filter(key => key !== JOBS[i][0])
  const picks = [JOBS[i][0], others[(i * 3 + 1) % others.length], others[(i * 5 + 4) % others.length]]
  return [...new Set(picks)].sort((a, b) => ((a.charCodeAt(1) + i) % 7) - ((b.charCodeAt(1) + i) % 7))
}
// Quick Quiz: true or false, from the FAQ.
const QUIZ = [
  ['EduPulse replaces the official KCP grading sheet.', false, 'Scores only; grades stay official'],
  ['An AI draft can publish itself.', false, 'An instructor publishes'],
  ['Class lists come from EduSuite exports.', true, 'Uploaded by the Dean’s office'],
  ['Pulse names the sources it used.', true, 'Every answer cites them'],
  ['The syllabus is approved inside EduPulse.', false, 'Approved outside, then uploaded'],
  ['EduPulse serves the CIT first.', true, 'Other colleges are planned'],
]

export const GAMES = {
  gate: {
    title: 'Guardian Gate', who: 'A student asks',
    rounds: REQUESTS.map(([text, allow, why]) => ({ text, answer: allow ? 'allow' : 'decline', why: `${allow ? 'Allow' : 'Decline'}: ${why}`, choices: [ALLOW, DECLINE] })),
  },
  match: {
    title: 'Agent Match', who: 'Who does this job?',
    rounds: JOBS.map(([key, job], i) => ({ text: job, answer: key, why: `It’s ${name(key)}`, choices: optionsFor(i).map(option => ({ value: option, label: name(option), tint: AGENT_COLORS[option] })) })),
  },
  quiz: {
    title: 'Quick Quiz', who: 'True or false?',
    rounds: QUIZ.map(([text, truth, why]) => ({ text, answer: truth ? 'true' : 'false', why: `${truth ? 'True' : 'False'}: ${why}`, choices: [TRUE, FALSE] })),
  },
}
