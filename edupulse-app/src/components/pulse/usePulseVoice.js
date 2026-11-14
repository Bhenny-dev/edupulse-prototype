import { useCallback, useEffect, useRef, useState } from 'react'

export const VOICE_LANGUAGES = [
  ['fil-PH', 'Filipino / Tagalog'], ['en-PH', 'English (Philippines)'],
  ['ilo-PH', 'Ilocano (experimental)'], ['kne-PH', 'Kankanaey (experimental)'],
]
const defaults = { language: 'fil-PH', mode: 'review', readReplies: false }
function preferences(owner) {
  try {
    const value = JSON.parse(localStorage.getItem(`edupulse-voice-${owner}`) || '{}')
    return { owner, language: VOICE_LANGUAGES.some(([id]) => id === value.language) ? value.language : defaults.language, mode: value.mode === 'conversation' ? 'conversation' : 'review', readReplies: value.readReplies === true }
  } catch { return { owner, ...defaults } }
}
const errors = {
  'not-allowed': 'Microphone access was denied. Allow microphone access for this site, then try again.',
  'service-not-allowed': 'The browser’s speech service is unavailable. You can still type your request.',
  'audio-capture': 'No microphone is available. Check your microphone and try again.',
  'language-not-supported': 'This browser’s speech service does not support the selected language. Try Filipino or English, or type your request.',
  'no-speech': 'No speech was detected. Start listening again when you are ready.',
  network: 'The browser could not reach its speech service. Check your connection or type your request.',
}

export default function usePulseVoice({ owner, active, blocked, onTranscript, onPrompt }) {
  const [enabled, setEnabled] = useState(false), [prefs, setPrefs] = useState(() => preferences(owner))
  const [state, setState] = useState('idle'), [interim, setInterim] = useState(''), [error, setError] = useState('')
  const [readingId, setReadingId] = useState(null)
  const engine = useRef(null), epoch = useRef(0), running = useRef(false), timer = useRef(null), finishSpeech = useRef(null)
  const current = useRef(null), begin = useRef(null)
  current.current = { active, blocked, prefs, onTranscript, onPrompt }
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const supported = typeof Recognition === 'function' && window.isSecureContext
  const canSpeak = Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance)
  const stop = useCallback(() => {
    running.current = false; epoch.current++; clearTimeout(timer.current)
    const recognition = engine.current; engine.current = null
    if (recognition) { recognition.onend = recognition.onresult = recognition.onerror = recognition.onstart = null; try { recognition.abort() } catch { /* Already ended. */ } }
    if (finishSpeech.current) { const finish = finishSpeech.current; finishSpeech.current = null; window.speechSynthesis?.cancel(); finish() }
    setState('idle'); setInterim(''); setReadingId(null)
  }, [])
  useEffect(() => { stop(); setEnabled(false); setError(''); setPrefs(preferences(owner)); return stop }, [owner, stop])
  useEffect(() => {
    if (prefs.owner !== owner) return
    try { localStorage.setItem(`edupulse-voice-${owner}`, JSON.stringify({ language: prefs.language, mode: prefs.mode, readReplies: prefs.readReplies })) } catch { /* Preferences still apply this session. */ }
  }, [prefs, owner])
  useEffect(() => { if (!active) stop() }, [active, stop])
  useEffect(() => {
    const hidden = () => { if (document.hidden) stop() }
    document.addEventListener('visibilitychange', hidden)
    return () => document.removeEventListener('visibilitychange', hidden)
  }, [stop])
  async function speak(text, version) {
    if (!canSpeak || !text) return
    setState('speaking')
    const speech = new window.SpeechSynthesisUtterance(text.replace(/https?:\/\/\S+/g, ' link ').replace(/[*_#`]/g, '').slice(0, 2400))
    speech.lang = current.current.prefs.language
    await new Promise(resolve => {
      finishSpeech.current = resolve
      const finish = () => { if (finishSpeech.current === resolve) finishSpeech.current = null; resolve() }
      speech.onend = finish
      speech.onerror = () => { if (version === epoch.current) { running.current = false; setError('This device could not read the reply aloud. Try another speech language in Voice input.'); setState('idle') } finish() }
      try { window.speechSynthesis.speak(speech) } catch { speech.onerror() }
    })
  }
  const read = async (text, id) => {
    stop(); setError('')
    if (!current.current.active) return
    if (!canSpeak) { setError('Spoken replies are unavailable in this browser. You can still read the reply in chat.'); return }
    const version = epoch.current
    setReadingId(id)
    await speak(text, version)
    if (version === epoch.current) { setReadingId(null); setState('idle') }
  }
  begin.current = () => {
    if (!current.current.active || current.current.blocked || !running.current) { running.current = false; setState('idle'); return }
    const version = epoch.current
    let recognition
    try { recognition = new Recognition() } catch { stop(); setError('The browser could not initialize speech recognition. You can still type your request.'); return }
    engine.current = recognition
    recognition.lang = current.current.prefs.language; recognition.continuous = false; recognition.interimResults = true; recognition.maxAlternatives = 1
    let final = '', heard = ''
    setState('starting'); setInterim('')
    recognition.onstart = () => { if (version === epoch.current) setState('listening') }
    recognition.onresult = event => {
      if (version !== epoch.current) return
      final = ''; heard = ''
      for (let i = 0; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript || ''
        if (event.results[i].isFinal) final += `${text} `
        else heard += `${text} `
      }
      setInterim((final + heard).trim().slice(0, 4000))
    }
    recognition.onerror = event => {
      if (version !== epoch.current) return
      stop(); setError(errors[event.error] || 'Speech recognition stopped. Try listening again, or type your request.')
    }
    recognition.onend = async () => {
      clearTimeout(timer.current)
      if (version !== epoch.current || !running.current) return
      engine.current = null; setState('idle'); setInterim('')
      const text = final.trim().slice(0, 4000)
      if (!text) { running.current = false; setError(errors['no-speech']); return }
      if (/^(?:stop(?: voice| listening)?|(?:itigil|ihinto|tigil)(?: ang)? (?:boses|pakikinig))[.!?]*$/i.test(text)) { stop(); return }
      if (current.current.prefs.mode === 'review') { running.current = false; current.current.onTranscript(text); return }
      setState('waiting')
      try {
        const reply = await current.current.onPrompt(text)
        if (version !== epoch.current || !running.current) return
        if (reply === false) { running.current = false; setState('idle'); return }
        if (current.current.prefs.readReplies) await speak(typeof reply === 'string' ? reply : '', version)
        if (version === epoch.current && running.current) { setState('idle'); requestAnimationFrame(() => begin.current()) }
      } catch { if (version === epoch.current) { stop(); setError('Voice conversation stopped. Review the chat before trying again.') } }
    }
    try {
      recognition.start()
      timer.current = setTimeout(() => { if (engine.current === recognition) { try { recognition.stop() } catch { stop() } } }, 45000)
    } catch { stop(); setError('The microphone could not start. Check browser permissions and try again.') }
  }
  const start = () => {
    if (!supported || !active || blocked || running.current) return
    setError(''); running.current = true; begin.current()
  }
  const configure = change => { stop(); setError(''); setPrefs(previous => ({ ...previous, ...change })) }
  const toggle = () => { stop(); setError(''); setEnabled(value => !value) }
  return { enabled, toggle, supported, canSpeak, prefs, configure, start, stop, read, readingId, state, interim, error, hearing: state === 'starting' || state === 'listening', engaged: state !== 'idle' }
}
