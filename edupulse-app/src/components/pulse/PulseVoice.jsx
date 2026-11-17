import { LoadingDots } from '../ui/LoadingFeedback'

const DICTATION = { starting: 'Allow microphone access to record.', listening: 'Listening... Speak as long as you need (up to 3 minutes), then tap Stop to send your request.', transcribing: 'Transcribing your voice message...' }
const CONVERSATION = { starting: 'Starting the voice conversation. Allow microphone access.', listening: 'Listening. Tell Pulse what you need.', hearing: 'Hearing you. Pause when you are finished.', transcribing: 'Transcribing what you said...', working: 'Working on your request...', speaking: 'Speaking. Pulse listens again when it finishes.' }

export default function PulseVoice({ voice }) {
  if (!voice.hearing && !voice.error) return null
  const conversation = voice.mode === 'conversation'
  const label = (conversation ? CONVERSATION : DICTATION)[voice.state]
  return <section className={`pulse-voice ${conversation ? 'is-conversation' : ''}`} aria-label={conversation ? 'Voice conversation status' : 'Voice input status'}>
    {voice.hearing && label && <><div role="status" className="pulse-voice-status">{['listening', 'hearing'].includes(voice.state) ? <span className={`pulse-voice-meter ${voice.state === 'hearing' ? 'is-hearing' : ''}`} aria-hidden="true"><i /><i /><i /></span> : <LoadingDots />}{label}{conversation && <button type="button" className="btn btn-ghost btn-sm" onClick={voice.stop}>End conversation</button>}</div>
      <p className="pulse-voice-note">{conversation
        ? 'Voice conversation is on. Pulse hears one request at a time, does it, says what it did and listens again. Say “stop” or “that’s all” to end. Record changes still need your Confirm click.'
        : 'Filipino, English or mixed speech is detected automatically. Audio is sent to your connected provider for transcription, and the text is sent to Pulse when you tap Stop.'}</p></>}
    {voice.error && <p role="alert">{voice.error}</p>}
  </section>
}
