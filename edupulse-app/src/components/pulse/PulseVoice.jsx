import { Mic, Square } from 'lucide-react'
import { LoadingDots } from '../ui/LoadingFeedback'
import { VOICE_LANGUAGES } from './usePulseVoice'

export default function PulseVoice({ voice, blocked, hasDraft }) {
  if (!voice.enabled) return null
  const labels = { starting: 'Starting microphone…', listening: 'Listening…', waiting: 'Waiting for Pulse…', speaking: 'Reading reply…', idle: 'Microphone off' }
  return <section className="pulse-voice" aria-label="Voice controls">
    <div className="pulse-voice-options">
      <label>Speech language<select aria-label="Speech language" value={voice.prefs.language} disabled={voice.engaged} onChange={event => voice.configure({ language: event.target.value })}>{VOICE_LANGUAGES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label>Voice mode<select aria-label="Voice mode" value={voice.prefs.mode} disabled={voice.engaged} onChange={event => voice.configure({ mode: event.target.value })}><option value="review">Review before sending</option><option value="conversation">Conversation · send after pause</option></select></label>
    </div>
    <p className="pulse-voice-note">Your browser may send audio to its speech service. English and Filipino, including mixed speech, depend on that service. Ilocano and Kankanaey are experimental; review the transcript.</p>
    {voice.supported ? <>
      {voice.prefs.mode === 'conversation' && <p className="pulse-voice-note">Conversation sends completed speech automatically using your connected model’s quota. Data changes still need confirmation.</p>}
      <div className="pulse-voice-actions">{voice.prefs.mode === 'conversation' && <label><input type="checkbox" checked={voice.prefs.readReplies} disabled={!voice.canSpeak || voice.engaged} onChange={event => voice.configure({ readReplies: event.target.checked })} /> Read replies aloud</label>}
        {voice.engaged ? <button type="button" onClick={voice.stop}><Square size={15} /> Stop voice</button> : <button type="button" disabled={blocked || (hasDraft && voice.prefs.mode === 'conversation')} onClick={voice.start}><Mic size={16} /> Start listening</button>}
      </div>
      {voice.prefs.mode === 'conversation' && !voice.canSpeak && <p className="pulse-voice-note">Spoken replies are unavailable in this browser.</p>}
      {hasDraft && voice.prefs.mode === 'conversation' && !voice.engaged && <p className="pulse-voice-note">Send or clear your typed draft before starting a conversation.</p>}
      <div role="status" className="pulse-voice-status">{voice.engaged && <LoadingDots />}{labels[voice.state]}</div>
      {voice.interim && <p className="pulse-voice-transcript" aria-label="Live voice transcript">{voice.interim}</p>}
    </> : <p role="status">Speech recognition is unavailable in this browser. Use a browser that provides it over HTTPS, or type your request.</p>}
    {voice.error && <p role="alert">{voice.error}</p>}
  </section>
}
