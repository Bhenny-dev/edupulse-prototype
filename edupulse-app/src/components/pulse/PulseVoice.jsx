import { LoadingDots } from '../ui/LoadingFeedback'

export default function PulseVoice({ voice }) {
  if (!voice.hearing && !voice.error) return null
  const labels = { starting: 'Allow microphone access to record.', listening: 'Listening... Tap Stop beside the message box when finished.', transcribing: 'Transcribing your voice message...' }
  return <section className="pulse-voice" aria-label="Voice input status">
    {voice.hearing && <><div role="status" className="pulse-voice-status"><LoadingDots />{labels[voice.state]}</div><p className="pulse-voice-note">Filipino, English or mixed speech is detected automatically. Audio is sent to your connected provider for transcription. Review the text, then press Send.</p></>}
    {voice.error && <p role="alert">{voice.error}</p>}
  </section>
}
