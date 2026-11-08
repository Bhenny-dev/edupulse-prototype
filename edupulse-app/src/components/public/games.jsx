import { useState } from 'react'
import { Ban, Check, RotateCcw, ShieldCheck, Trophy, X } from 'lucide-react'
import { AGENTS } from '../landing/content'
import { AGENT_COLORS } from '../landing/agentLook'

// Three short games about how EduPulse behaves. Each keeps its own score and starts over on demand.

function Result({ score, total, again }) {
  return (
    <div className="ps-game-result" role="status">
      <Trophy size={28} aria-hidden="true" />
      <b>{score} / {total}</b>
      <span>{score === total ? 'Perfect!' : score >= total / 2 ? 'Nicely done.' : 'Try another round.'}</span>
      <button type="button" className="lp-button is-small" onClick={again}><RotateCcw size={15} aria-hidden="true" /> Play again</button>
    </div>
  )
}

function Progress({ index, total, score }) {
  return (
    <p className="ps-game-progress">
      <span>{Math.min(index + 1, total)} / {total}</span>
      <span aria-hidden="true" className="ps-game-dots">{Array.from({ length: total }, (_, i) => <i key={i} className={i < index ? 'is-done' : i === index ? 'is-now' : ''} />)}</span>
      <span>Score {score}</span>
    </p>
  )
}

// Guardian Gate: be the Guardian. A student's request comes in; let it through or decline it.
// Pulse guides students (reminders, missed work, finding things) and never answers, reviews or
// hints at assessment items.
const REQUESTS = [
  { text: 'Quiz 2 answers, please.', allow: false, why: 'Assessment answers' },
  { text: 'Which materials haven’t I opened?', allow: true, why: 'A reminder' },
  { text: 'A hint for midterm question 4?', allow: false, why: 'Assessment hint' },
  { text: 'Did I miss an activity this week?', allow: true, why: 'Missed work' },
  { text: 'Check my answers before I submit.', allow: false, why: 'Assessment review' },
  { text: 'Where is the Week 4 reading?', allow: true, why: 'Finding your way' },
  { text: 'Solve the lab exam for me.', allow: false, why: 'Assessment answers' },
  { text: 'What’s next in my course?', allow: true, why: 'Finding your way' },
]
export function GuardianGate() {
  const [index, setIndex] = useState(0), [score, setScore] = useState(0), [last, setLast] = useState(null)
  const done = index >= REQUESTS.length
  const decide = allow => {
    const request = REQUESTS[index], right = request.allow === allow
    setLast({ right, request })
    if (right) setScore(value => value + 1)
    setIndex(value => value + 1)
  }
  const again = () => { setIndex(0); setScore(0); setLast(null) }
  return (
    <div className="ps-game is-gate">
      {done ? <Result score={score} total={REQUESTS.length} again={again} /> : (
        <>
          <Progress index={index} total={REQUESTS.length} score={score} />
          <p className="ps-game-card" aria-live="polite"><span className="ps-game-who">Student</span>{REQUESTS[index].text}</p>
          <div className="ps-game-actions">
            <button type="button" className="ps-game-choice is-allow" onClick={() => decide(true)}><ShieldCheck size={18} aria-hidden="true" /> Allow</button>
            <button type="button" className="ps-game-choice is-decline" onClick={() => decide(false)}><Ban size={18} aria-hidden="true" /> Decline</button>
          </div>
        </>
      )}
      {last && <p className={`ps-game-feedback ${last.right ? 'is-right' : 'is-wrong'}`} role="status">{last.right ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />} {last.request.allow ? 'Allowed' : 'Declined'}: {last.request.why}</p>}
    </div>
  )
}

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
export function AgentMatch() {
  const [index, setIndex] = useState(0), [score, setScore] = useState(0), [last, setLast] = useState(null)
  const done = index >= JOBS.length
  const choose = key => {
    const right = JOBS[index][0] === key
    setLast({ right, answer: JOBS[index][0] })
    if (right) setScore(value => value + 1)
    setIndex(value => value + 1)
  }
  const again = () => { setIndex(0); setScore(0); setLast(null) }
  const name = key => AGENTS.find(agent => agent.key === key)?.name
  return (
    <div className="ps-game is-match">
      {done ? <Result score={score} total={JOBS.length} again={again} /> : (
        <>
          <Progress index={index} total={JOBS.length} score={score} />
          <p className="ps-game-card" aria-live="polite"><span className="ps-game-who">Job</span>{JOBS[index][1]}</p>
          <div className="ps-game-actions">
            {optionsFor(index).map(key => (
              <button key={key} type="button" className="ps-game-choice is-agent" style={{ '--tint': AGENT_COLORS[key] }} onClick={() => choose(key)}>
                <i aria-hidden="true" />{name(key)}
              </button>
            ))}
          </div>
        </>
      )}
      {last && <p className={`ps-game-feedback ${last.right ? 'is-right' : 'is-wrong'}`} role="status">{last.right ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />} {last.right ? 'Right' : `It was ${name(last.answer)}`}</p>}
    </div>
  )
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
export function QuickQuiz() {
  const [index, setIndex] = useState(0), [score, setScore] = useState(0), [last, setLast] = useState(null)
  const done = index >= QUIZ.length
  const answer = value => {
    const [, truth, why] = QUIZ[index], right = truth === value
    setLast({ right, truth, why })
    if (right) setScore(points => points + 1)
    setIndex(next => next + 1)
  }
  const again = () => { setIndex(0); setScore(0); setLast(null) }
  return (
    <div className="ps-game is-quiz">
      {done ? <Result score={score} total={QUIZ.length} again={again} /> : (
        <>
          <Progress index={index} total={QUIZ.length} score={score} />
          <p className="ps-game-card" aria-live="polite"><span className="ps-game-who">True or false?</span>{QUIZ[index][0]}</p>
          <div className="ps-game-actions">
            <button type="button" className="ps-game-choice is-allow" onClick={() => answer(true)}><Check size={18} aria-hidden="true" /> True</button>
            <button type="button" className="ps-game-choice is-decline" onClick={() => answer(false)}><X size={18} aria-hidden="true" /> False</button>
          </div>
        </>
      )}
      {last && <p className={`ps-game-feedback ${last.right ? 'is-right' : 'is-wrong'}`} role="status">{last.right ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />} {last.truth ? 'True' : 'False'}: {last.why}</p>}
    </div>
  )
}
