import { useCallback, useEffect, useRef, useState } from 'react'
import { transcribeVoice } from '../../lib/aiClient'
import { vadStart, vadStep } from './voiceConversation'

// Dictation is long listening: up to three minutes at speech quality stays under the 1 MB transcription limit.
const DICTATION_MS = 180000, DICTATION_BYTES = 950000, QUIET_ROUNDS = 6
const audioType = () => ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type))

/**
 * Two voice modes. Dictate records until Stop, then hands the transcript to Pulse as a request.
 * Conversation keeps the microphone open: it hears one request at a time (speech, then a pause),
 * Pulse works on it and answers aloud, then it listens again until stopped.
 */
export default function usePulseVoice({ owner, active, blocked, onDictation, onUtterance }) {
  const [state, setState] = useState('idle'), [mode, setMode] = useState(null), [error, setError] = useState(''), [readingId, setReadingId] = useState(null)
  const epoch = useRef(0), session = useRef(null), timer = useRef(null), request = useRef(null), finishSpeech = useRef(null), recording = useRef(false), finish = useRef(null)
  const conversation = useRef(null), listenRef = useRef(null)
  const current = useRef(null)
  current.current = { active, blocked, onDictation, onUtterance }
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
    const live = conversation.current; conversation.current = null
    if (live) {
      clearInterval(live.poll)
      if (live.recorder) { live.recorder.ondataavailable = live.recorder.onstop = live.recorder.onerror = null; if (live.recorder.state !== 'inactive') live.recorder.stop() }
      live.stream.getTracks().forEach(track => track.stop())
      void live.context.close?.().catch(() => {})
    }
    if (finishSpeech.current) { const done = finishSpeech.current; finishSpeech.current = null; window.speechSynthesis?.cancel(); done() }
    setState('idle'); setMode(null); setReadingId(null)
  }, [])
  useEffect(() => { stop(); setError(''); return stop }, [owner, stop])
  useEffect(() => { if (!active) stop() }, [active, stop])
  useEffect(() => {
    const hidden = () => { if (document.hidden) stop() }
    document.addEventListener('visibilitychange', hidden)
    return () => document.removeEventListener('visibilitychange', hidden)
  }, [stop])
  const microphoneError = failure => failure?.name === 'NotAllowedError' ? 'Microphone access was denied. Allow access for this site, then try again.' : 'The microphone could not start. Check your device and browser permissions.'
  finish.current = () => {
    const currentSession = session.current
    if (!currentSession || currentSession.recorder.state === 'inactive') return
    clearTimeout(timer.current); recording.current = false; setState('transcribing')
    currentSession.recorder.stop()
  }
  const dictate = async () => {
    const version = epoch.current
    recording.current = true; setMode('dictate'); setState('starting')
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (version !== epoch.current) { stream.getTracks().forEach(track => track.stop()); return }
      const mimeType = audioType()
      const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 24000 })
      const captured = { recorder, stream, chunks: [], bytes: 0 }
      session.current = captured
      recorder.ondataavailable = event => {
        if (version !== epoch.current || !event.data.size) return
        captured.bytes += event.data.size
        captured.chunks.push(event.data)
        // A long message ends at the size limit and is still transcribed, instead of being discarded.
        if (captured.bytes >= DICTATION_BYTES) finish.current()
      }
      recorder.onerror = () => { if (version === epoch.current) { stop(); setError('The microphone could not record this message. Check the device and try again.') } }
      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        if (version !== epoch.current) return
        clearTimeout(timer.current); recording.current = false; session.current = null
        const audio = new Blob(captured.chunks, { type: recorder.mimeType || captured.chunks[0]?.type || 'audio/webm' })
        captured.chunks.length = 0
        if (!audio.size) { setState('idle'); setMode(null); setError('No audio was recorded. Try again, or type your message.'); return }
        const controller = new AbortController(); request.current = controller; setState('transcribing')
        try {
          const result = await transcribeVoice(audio, controller.signal)
          if (version === epoch.current) { request.current = null; setState('idle'); setMode(null) }
          if (version === epoch.current && current.current.active && result.text?.trim()) current.current.onDictation(result.text.trim())
          else if (version === epoch.current) setError('No speech was recognized. Try again closer to the microphone, or type your message.')
        } catch (failure) { if (version === epoch.current) setError(failure.message || 'Transcription failed. Try again, or type your message.') }
        finally { if (version === epoch.current) { request.current = null; setState('idle'); setMode(null) } }
      }
      recorder.start(1000); setState('listening')
      timer.current = setTimeout(() => finish.current(), DICTATION_MS)
    } catch (failure) {
      stream?.getTracks().forEach(track => track.stop())
      if (version !== epoch.current) return
      stop(); setError(microphoneError(failure))
    }
  }
  /** Speaks one line in a conversation. Resolves when it ends, immediately where speech is unavailable. */
  const say = async text => {
    if (!text || !canSpeak || !conversation.current) return
    const version = epoch.current
    setState('speaking')
    const speech = new window.SpeechSynthesisUtterance(text.slice(0, 2400))
    await new Promise(resolve => {
      const done = () => { if (finishSpeech.current === resolve) finishSpeech.current = null; resolve() }
      finishSpeech.current = resolve
      speech.onend = done; speech.onerror = done
      try { window.speechSynthesis.speak(speech) } catch { done() }
    })
    if (version === epoch.current && conversation.current) setState('working')
  }
  const endWith = async text => { await say(text); stop() }
  listenRef.current = () => {
    const live = conversation.current
    if (!live || live.version !== epoch.current) return
    const version = epoch.current
    clearInterval(live.poll); live.poll = 0
    const mimeType = audioType()
    const recorder = new MediaRecorder(live.stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 24000 })
    const chunks = []
    let vad = vadStart(performance.now()), outcome = null
    live.recorder = recorder
    recorder.ondataavailable = event => { if (version === epoch.current && event.data.size) chunks.push(event.data) }
    recorder.onerror = () => { if (version === epoch.current) { stop(); setError('The microphone stopped recording. Start the voice conversation again.') } }
    recorder.onstop = async () => {
      if (version !== epoch.current || live.recorder !== recorder) return
      live.recorder = null
      if (outcome === 'idle') {
        // Silence is discarded; after about a minute and a half of it the conversation ends by itself.
        if (++live.quiet >= QUIET_ROUNDS) { await endWith('I have not heard anything for a while, so voice conversation is off.'); return }
        listenRef.current(); return
      }
      const audio = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || 'audio/webm' })
      if (!audio.size) { listenRef.current(); return }
      live.quiet = 0
      const controller = new AbortController(); request.current = controller; setState('transcribing')
      let text = ''
      try { text = (await transcribeVoice(audio, controller.signal)).text?.trim() || '' }
      catch (failure) { if (version === epoch.current) { const message = failure.message || 'Transcription failed.'; stop(); setError(`${message} Voice conversation stopped; you can still type.`) } return }
      finally { if (request.current === controller) request.current = null }
      if (version !== epoch.current) return
      if (!text) { listenRef.current(); return }
      setState('working')
      try { await current.current.onUtterance(text) }
      catch (failure) { if (version === epoch.current) { stop(); setError(failure.message || 'Voice conversation stopped.') } }
    }
    recorder.start(250); setState('listening')
    live.poll = setInterval(() => {
      if (version !== epoch.current) return
      live.analyser.getFloatTimeDomainData(live.data)
      let sum = 0
      for (const value of live.data) sum += value * value
      const step = vadStep(vad, Math.sqrt(sum / live.data.length), performance.now())
      vad = step.vad
      if (step.event === 'speech') setState('hearing')
      else if (step.event) { clearInterval(live.poll); live.poll = 0; outcome = step.event === 'idle' ? 'idle' : 'spoken'; if (recorder.state !== 'inactive') recorder.stop() }
    }, 50)
  }
  const converse = async greeting => {
    const Context = window.AudioContext || window.webkitAudioContext
    if (!Context) { setError('Voice conversation is unavailable in this browser. Use Dictate, or type your message.'); return }
    const version = epoch.current
    recording.current = true; setMode('conversation'); setState('starting')
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      if (version !== epoch.current) { stream.getTracks().forEach(track => track.stop()); return }
      const context = new Context(), analyser = context.createAnalyser()
      analyser.fftSize = 1024
      context.createMediaStreamSource(stream).connect(analyser)
      conversation.current = { stream, context, analyser, data: new Float32Array(analyser.fftSize), poll: 0, recorder: null, quiet: 0, version }
      recording.current = false
      await say(greeting)
      if (version === epoch.current) listenRef.current()
    } catch (failure) {
      stream?.getTracks().forEach(track => track.stop())
      if (version !== epoch.current) return
      stop(); setError(microphoneError(failure))
    }
  }
  const start = async (voiceMode = 'dictate', greeting = '') => {
    if (!current.current.active || current.current.blocked || recording.current || session.current || request.current || conversation.current) return
    stop(); setError('')
    if (!supported) { setError('Voice recording is unavailable in this browser. Use a current browser over HTTPS, or type your message.'); return }
    if (voiceMode === 'conversation') await converse(greeting)
    else await dictate()
  }
  const read = async (text, id) => {
    // Do not discard a recording, a pending transcript or a voice conversation to play another reply.
    if (recording.current || session.current || request.current || conversation.current) return
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
  const conversing = mode === 'conversation' && state !== 'idle'
  return {
    supported, canSpeak, start, finish: () => finish.current(), stop, read, say, endWith, listen: () => listenRef.current(), readingId, state, mode, error, conversing,
    hearing: conversing || ['starting', 'listening', 'transcribing'].includes(state), engaged: state !== 'idle',
  }
}
