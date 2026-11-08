import { useEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, LogOut, RotateCcw, Trophy, X } from 'lucide-react'

// One game (its rounds are in gameRounds.js) on a cabinet's screen, with the cabinet's keys under
// it. An answer stays with its round, so Previous goes back to it and Next moves on. `press` asks the robot to push
// the cabinet's control for an action (a button for an answer, the joystick for Next or Previous)
// and resolves when its hand touches it; only then does the game move. `screen` receives the
// element laid over the cabinet's screen; `ready` says the camera has arrived.
export function ArcadeGame({ game, press, onExit, screen, ready, flat }) {
  const { title, who, rounds } = game
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [moving, setMoving] = useState(false)
  const lock = useRef(false)
  const done = index >= rounds.length
  const round = rounds[index]
  const picked = answers[index]
  const score = answers.filter((value, i) => value !== undefined && value === rounds[i].answer).length

  const act = async (control, then) => {
    if (lock.current || !ready) return
    lock.current = true
    setMoving(true)
    try { await press(control) } finally { lock.current = false; setMoving(false) }
    then()
  }
  const choose = (choice, i) => { if (picked === undefined) act(i, () => setAnswers(list => { const next = [...list]; next[index] = choice.value; return next })) }
  const next = () => { if (!done) act('next', () => setIndex(i => i + 1)) }
  const previous = () => { if (index > 0) act('prev', () => setIndex(i => i - 1)) }
  const again = () => act(1, () => { setIndex(0); setAnswers([]) })

  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') onExit()
      if (event.key === 'ArrowRight') next()
      if (event.key === 'ArrowLeft') previous()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <>
      <div className={`ps-arcade-screen ${flat ? 'is-flat' : ''}`} ref={screen} data-on={flat ? '' : undefined}>
        <div className="ps-crt" aria-live="polite">
          <p className="ps-crt-head"><b>{title}</b><span>{done ? 'Done' : `${index + 1} / ${rounds.length}`}</span><span>Score {score}</span></p>
          {done ? (
            <div className="ps-crt-result">
              <Trophy aria-hidden="true" />
              <b>{score} / {rounds.length}</b>
              <span>{score === rounds.length ? 'Perfect!' : score >= rounds.length / 2 ? 'Nicely done.' : 'Try another round.'}</span>
              <button type="button" className="ps-crt-choice" disabled={moving} onClick={again}><RotateCcw aria-hidden="true" /> Play again</button>
            </div>
          ) : (
            <>
              <p className="ps-crt-card"><span className="ps-crt-who">{who}</span>{round.text}</p>
              <div className="ps-crt-choices">
                {round.choices.map((choice, i) => {
                  const Icon = choice.icon
                  const state = picked === undefined ? '' : choice.value === round.answer ? 'is-right' : choice.value === picked ? 'is-wrong' : 'is-dim'
                  return (
                    <button key={choice.value} type="button" className={`ps-crt-choice ${choice.tone ? `is-${choice.tone}` : 'is-agent'} ${state}`} style={choice.tint ? { '--tint': choice.tint } : undefined}
                      disabled={moving || picked !== undefined} aria-pressed={picked === choice.value} onClick={() => choose(choice, i)}>
                      {Icon ? <Icon aria-hidden="true" /> : <i aria-hidden="true" />}{choice.label}
                    </button>
                  )
                })}
              </div>
              {picked !== undefined && <p className={`ps-crt-feedback ${picked === round.answer ? 'is-right' : 'is-wrong'}`} role="status">{picked === round.answer ? <Check aria-hidden="true" /> : <X aria-hidden="true" />} {round.why}</p>}
            </>
          )}
        </div>
      </div>
      <div className="ps-arcade-keys" role="group" aria-label={`${title} controls`}>
        <button type="button" className="ps-arcade-key" disabled={!ready || moving || index === 0} onClick={previous}><ChevronLeft size={18} aria-hidden="true" /> Previous</button>
        <button type="button" className="ps-arcade-key is-next" disabled={!ready || moving || done} onClick={next}>Next <ChevronRight size={18} aria-hidden="true" /></button>
        <button type="button" className="ps-arcade-key is-exit" onClick={onExit}><LogOut size={17} aria-hidden="true" /> Exit</button>
      </div>
    </>
  )
}
