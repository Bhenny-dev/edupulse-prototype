import { useCallback, useRef, useState } from 'react'
import { Gamepad2, HelpCircle, Puzzle, ShieldCheck } from 'lucide-react'
import RoomPage, { DetailCard } from '../../components/public/RoomPage'
import { ArcadeGame } from '../../components/public/games'
import { GAMES } from '../../components/public/gameRounds'

const ITEMS = [
  { key: 'gate', short: 'Guardian Gate', icon: ShieldCheck, tint: '#2563eb', words: ['Be the Guardian', 'Allow or decline', '8 requests'] },
  { key: 'match', short: 'Agent Match', icon: Puzzle, tint: '#10b981', words: ['Match the job', '9 agents', '3 choices'] },
  { key: 'quiz', short: 'Quick Quiz', icon: HelpCircle, tint: '#f59e0b', words: ['True or false', '6 questions'] },
]

// The game room. Tap a cabinet to see its game; Play sends the robot over to it, the camera looks
// over its shoulder at the screen, and the game runs on the screen. The robot pushes the cabinet's
// buttons for each answer and its joystick for Next and Previous; Exit walks it back.
export default function PlayPage() {
  const room = useRef(null)
  const [playing, setPlaying] = useState(null)
  const [phase, setPhase] = useState('off') // walking | on | leaving
  const run = useRef(0)

  const start = async key => {
    const turn = ++run.current
    setPlaying(key)
    setPhase('walking')
    await room.current?.play(key)
    if (turn === run.current) setPhase('on')
  }
  const exit = async () => {
    const turn = ++run.current
    setPhase('leaving')
    await room.current?.leave()
    if (turn === run.current) { setPlaying(null); setPhase('off') }
  }
  const press = useCallback(control => room.current?.press(control) ?? Promise.resolve(), [])
  const screen = useCallback(element => { room.current?.setScreen(element) }, [])
  const onRoom = useCallback(api => { room.current = api }, [])

  const detail = key => {
    const item = ITEMS.find(entry => entry.key === key)
    return (
      <DetailCard icon={item.icon} tint={item.tint} kicker="Game" name={item.short} words={item.words}>
        <button type="button" className="lp-button is-small ps-detail-go" onClick={() => start(key)}><Gamepad2 size={16} aria-hidden="true" /> Play</button>
      </DetailCard>
    )
  }

  const overlay = playing && phase !== 'leaving' && (
    <>
      {phase === 'walking' && <p className="ps-arcade-status" role="status">The robot walks over to {GAMES[playing].title}…</p>}
      <ArcadeGame key={playing} game={GAMES[playing]} press={press} onExit={exit} screen={screen} ready={phase === 'on'} flat={!room.current} />
    </>
  )

  return (
    <RoomPage theme="arcade" room="Game room" icon={Gamepad2} tint="#db2777" title="Three games. Learn by playing." lead="Tap a cabinet, then Play." items={ITEMS} detail={detail}
      onRoom={onRoom} overlay={overlay} busy={Boolean(playing)} />
  )
}
