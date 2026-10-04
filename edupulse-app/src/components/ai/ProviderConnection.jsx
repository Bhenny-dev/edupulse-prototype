import { useEffect, useState } from 'react'
import { Cpu, Plug, RefreshCw } from 'lucide-react'
import { aiRequest } from '../../lib/aiClient'
import { useAI } from '../../context/AIContext'
import { useAuth } from '../../context/AuthContext'
import { browserCapability, browserPresets, removeBrowserModel, setAiPreference, startBrowserAI, stopBrowserAI } from '../../lib/browserAI'

const providers = [
  { id: 'browser', name: 'On this device · no API key' },
  { id: 'ollama', name: 'Ollama · local app server' },
  { id: 'gemini', name: 'Google Gemini · free tier', link: 'https://aistudio.google.com/api-keys' },
  { id: 'groq', name: 'Groq · free tier', link: 'https://console.groq.com/keys' },
  { id: 'openrouter', name: 'OpenRouter · free models', link: 'https://openrouter.ai/settings/keys' },
  { id: 'huggingface', name: 'Hugging Face Inference · free credits', link: 'https://huggingface.co/settings/tokens' },
  { id: 'openai', name: 'OpenAI', link: 'https://platform.openai.com/api-keys' },
  { id: 'anthropic', name: 'Anthropic', link: 'https://console.anthropic.com/settings/keys' },
]

export default function ProviderConnection() {
  const ai = useAI()
  const { user } = useAuth()
  const [provider, setProvider] = useState(ai.preference === 'browser' ? 'browser' : user?.authenticated ? 'openai' : 'browser')
  const [key, setKey] = useState(''), [models, setModels] = useState([]), [connection, setConnection] = useState(null)
  const [browserModel, setBrowserModel] = useState(ai.local.model || browserPresets[0].id)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [capability, setCapability] = useState(null)
  useEffect(() => {
    let alive = true
    browserCapability().then(value => { if (alive) { setCapability(value); if (value.supported && !value.halfPrecision) setBrowserModel(browserPresets[1].id) } }).catch(() => { if (alive) setCapability({ supported: false, message: 'The graphics adapter could not be checked.' }) })
    const controller = new AbortController()
    aiRequest('providers', 'GET', undefined, controller.signal).then(result => { if (alive) { setConnection(result.connection); setModels(result.models); if (result.connection && ai.preference !== 'browser') setProvider(result.connection.provider) } }).catch(() => { /* Connection form remains usable when no provider is available. */ })
    return () => { alive = false; controller.abort() }
  }, [])
  async function connect(event, model) {
    event?.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      const result = await aiRequest('providers', 'POST', { provider, ...(key.trim() ? { apiKey: key.trim() } : {}), ...(model ? { model } : {}) })
      setConnection(result.connection); setModels(result.models); setAiPreference('server'); stopBrowserAI()
      setNotice('Connected. Models below were returned by this provider’s API. Select the model you want to use.'); await ai.refresh()
    } catch (err) { setError(err.message) }
    finally { setKey(''); setBusy(false) }
  }
  async function disconnect() {
    setBusy(true); setError('')
    try { await aiRequest('providers', 'DELETE'); setConnection(null); setModels([]); setNotice('Personal provider disconnected.'); await ai.refresh() }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const selected = providers.find(p => p.id === provider), preset = browserPresets.find(p => p.id === browserModel)
  return <div className="card mb-24" data-pulse-target="AI connection"><div className="card-header"><h3><Cpu size={18} /> Pulse AI connection</h3><span className={`badge ${ai.ready ? 'badge-published' : 'badge-draft'}`}>{ai.label}</span></div>
    <div className="card-body">
      <p>Choose where Pulse thinks. Conversation, drafting, document help and courseware use this connection. Your knowledge library adds context to the same assistant.</p>
      {user?.authenticated && <p className="text-sm text-muted">This provider key belongs only to your account. Switching the admin view keeps the same account and key.</p>}
      <label className="form-label" htmlFor="ai-provider">AI provider</label>
      <select id="ai-provider" className="form-input" value={provider} disabled={busy || ai.local.status === 'loading'} onChange={e => { setProvider(e.target.value); setKey(''); setError(''); setNotice('') }}>{providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      {provider === 'browser' ? <div className="ai-provider-content">
        <label className="form-label" htmlFor="browser-model">On-device model</label><select id="browser-model" className="form-input" value={browserModel} disabled={ai.local.status === 'loading'} onChange={e => setBrowserModel(e.target.value)}>{browserPresets.map(p => <option key={p.id} value={p.id} disabled={p.id.includes('q4f16') && capability?.supported && !capability.halfPrecision}>{p.name}</option>)}</select>
        <p>{preset?.download} download · {preset?.memory}. Download once; cached models reopen automatically on this browser. A small model can make more mistakes than larger hosted models; review its drafts.</p>
        <p className="text-sm text-muted">{capability?.message || 'Checking WebGPU support…'} Your prompts stay in the browser for inference; signed-in knowledge retrieval still uses your library API.</p>
        {ai.local.status === 'loading' && <div role="status"><progress aria-label="Local model download progress" max="1" value={ai.local.progress} /><p>{ai.local.message}</p></div>}
        {ai.local.status !== 'loading' && ai.local.message && <p role="status">{ai.local.message}</p>}
        <div className="ai-actions">
          {ai.local.status === 'loading' ? <button className="btn btn-secondary" onClick={stopBrowserAI}>Cancel model loading</button> : <button className="btn btn-primary" disabled={capability?.supported === false || busy} onClick={() => { setError(''); void startBrowserAI(browserModel).catch(err => setError(err.message)) }}>{ai.local.status === 'ready' && ai.local.model === browserModel ? 'Use on-device AI' : 'Download / load local model'}</button>}
          {ai.local.model && ai.local.status !== 'loading' && <button className="btn btn-secondary" onClick={() => { void removeBrowserModel().catch(err => setError(err.message)) }}>Remove downloaded model</button>}
        </div>
      </div> : <form onSubmit={connect} className="ai-provider-content">
        {provider !== 'ollama' && <><label className="form-label" htmlFor="provider-key">Provider API key</label><input id="provider-key" className="form-input" type="password" autoComplete="off" spellCheck={false} value={key} onChange={e => setKey(e.target.value)} placeholder={connection?.provider === provider ? 'Already connected — enter a key only to replace it' : 'Paste your provider key'} maxLength={1024} /><p className="text-sm text-muted">On the hosted HTTPS site, the key is encrypted by the server and kept in a protected connection cookie for up to seven days. It is tied to your signed-in account and never returned to application JavaScript or saved in local storage. <a href={selected.link} target="_blank" rel="noreferrer">Get a key from {selected.name}</a>. Provider quotas and any charges belong to your account.{provider === 'openai' ? ' A ChatGPT subscription does not supply an OpenAI API key.' : ''}</p></>}
        {provider === 'ollama' && <p>In the downloaded local app, Pulse discovers models installed in Ollama automatically. On the hosted site, use the on-device model above unless the server has its own reachable Ollama installation.</p>}
        <div className="ai-actions"><button className="btn btn-primary" disabled={busy || (provider !== 'ollama' && !key.trim() && connection?.provider !== provider)}><Plug size={16} /> {busy ? 'Connecting…' : 'Connect and load models'}</button>{connection?.source === 'personal' && <button type="button" className="btn btn-secondary" disabled={busy} onClick={disconnect}>Disconnect provider</button>}</div>
        {connection?.provider === provider && models.length > 0 && <div className="ai-provider-content"><label className="form-label" htmlFor="provider-model">Available model</label><select id="provider-model" className="form-input" value={connection.model} disabled={busy} onChange={e => { void connect(null, e.target.value) }}>{models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select><p className="text-sm text-muted">{models.length} models discovered from the API{models.some(m => m.free) ? `; ${models.filter(m => m.free).length} free models are listed first` : ''}. Availability does not guarantee account quota. Your selection takes effect without reloading.</p></div>}
      </form>}
      <div className="ai-actions ai-provider-content"><button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => { void ai.refresh().catch(err => setError(err.message)) }}><RefreshCw size={14} /> Check active connection</button>{ai.preference === 'browser' && <button className="btn btn-secondary btn-sm" onClick={() => { stopBrowserAI(); setAiPreference('server') }}>Use server connection</button>}</div>
      {error && <p role="alert" className="ai-notice">{error}</p>}{notice && <p role="status" className="ai-notice">{notice}</p>}
    </div>
  </div>
}
