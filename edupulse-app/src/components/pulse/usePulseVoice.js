import { useCallback, useEffect, useRef, useState } from 'react'
import { transcribeVoice } from '../../lib/aiClient'

export default function usePulseVoice({ owner, active, blocked, onTranscript }) {
  const [state, setState] = useState('idle'), [error, setError] = useState(''), [readingId, setReadingId] = useState(null)
  const epoch = useRef(0), session = useRef(null), timer = useRef(null), request = useRef(null), finishSpeech = useRef(null), recording = useRef(false), finish = useRef(null)
  const current = useRef(null)
  current.current = { active, blocked, onTranscript }
  const supported = Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia && window.MediaRecorder)
  const canSpeak = Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance)
  const stop = useCallback(() => {
    epoch.current++; recording.current = false; clearTimeout(timer.current)
    request.current?.abort(); request.current = null
    const previous = session.current; session.current = null
    if (previous) {
      previous.recorder.ondataavailable = previous.recorder.onstop = previous.recorder.onerror = null
      if (previous.recorder.state !== 'inactive') previous.recorder.stop()
      previous.stream.getTracks().forEach(track => track.stop())
      previous.chunks.length = 0
    }
    if (finishSpeech.current) { const done = finishSpeech.current; finishSpeech.current = null; window.speechSynthesis?.cancel(); done() }
    setState('idle'); setReadingId(null)
  }, [])
  useEffect(() => { stop(); setError(''); return stop }, [owner, stop])
  useEffect(() => { if (!active) stop() }, [active, stop])
  useEffect(() => {
    const hidden = () => { if (document.hidden) stop() }
    document.addEventListener('visibilitychange', hidden)
    return () => document.removeEventListener('visibilitychange', hidden)
  }, [stop])
  finish.current = () => {
    const currentSession = session.current
    if (!currentSession || currentSession.recorder.state === 'inactive') return
    clearTimeout(timer.current); recording.current = false; setState('transcribing')
    currentSession.recorder.stop()
  }
  const start = async () => {
    if (!current.current.active || current.current.blocked || recording.current || session.current || request.current) return
    stop(); setError('')
    if (!supported) { setError('Voice recording is unavailable in this browser. Use a current browser over HTTPS, or type your message.'); return }
    const version = epoch.current
    recording.current = true; setState('starting')
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (version !== epoch.current) { stream.getTracks().forEach(track => track.stop()); return }
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 64000 })
      const captured = { recorder, stream, chunks: [], bytes: 0 }
      session.current = captured
      recorder.ondataavailable = event => {
        if (version !== epoch.current || !event.data.size) return
        captured.bytes += event.data.size
        if (captured.bytes > 1_000_000) { stop(); setError('The recording is too large. Try a shorter voice message.'); return }
        captured.chunks.push(event.data)
      }
      recorder.onerror = () => { if (version === epoch.current) { stop(); setError('The microphone could not record this message. Check the device and try again.') } }
      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        if (version !== epoch.current) return
        clearTimeout(timer.current); recording.current = false; session.current = null
        const audio = new Blob(captured.chunks, { type: recorder.mimeType || captured.chunks[0]?.type || 'audio/webm' })
        captured.chunks.length = 0
        if (!audio.size) { setState('idle'); setError('No audio was recorded. Try again, or type your message.'); return }
        const controller = new AbortController(); request.current = controller; setState('transcribing')
        try {
          const result = await transcribeVoice(audio, controller.signal)
          if (version === epoch.current && current.current.active) current.current.onTranscript(result.text)
        } catch (failure) { if (version === epoch.current) setError(failure.message || 'Transcription failed. Try again, or type your message.') }
        finally { if (version === epoch.current) { request.current = null; setState('idle') } }
      }
      recorder.start(1000); setState('listening')
      timer.current = setTimeout(() => finish.current(), 45000)
    } catch (failure) {
      stream?.getTracks().forEach(track => track.stop())
      if (version !== epoch.current) return
      stop(); setError(failure.name === 'NotAllowedError' ? 'Microphone access was denied. Allow access for this site, then try again.' : 'The microphone could not start. Check your device and browser permissions.')
    }
  }
  const read = async (text, id) => {
    // Do not discard a recording or pending transcript to play another reply.
    if (recording.current || session.current || request.current) return
    stop(); setError('')
    if (!current.current.active) return
    if (!canSpeak) { setError('Spoken replies are unavailable in this browser. You can still read the reply in chat.'); return }
    const version = epoch.current
    setReadingId(id); setState('speaking')
    const speech = new window.SpeechSynthesisUtterance(text.replace(/https?:\/\/\S+/g, ' link ').replace(/[*_#`]/g, '').slice(0, 2400))
    await new Promise(resolve => {
      finishSpeech.current = resolve
      const done = () => { if (finishSpeech.current === resolve) finishSpeech.current = null; resolve() }
      speech.onend = done
      speech.onerror = () => { if (version === epoch.current) setError('This device could not read the reply aloud. You can still read the reply in chat.'); done() }
      try { window.speechSynthesis.speak(speech) } catch { speech.onerror() }
    })
    if (version === epoch.current) { setReadingId(null); setState('idle') }
  }
  return { supported, canSpeak, start, finish: () => finish.current(), stop, read, readingId, state, error, hearing: ['starting', 'listening', 'transcribing'].includes(state), engaged: state !== 'idle' }
}
