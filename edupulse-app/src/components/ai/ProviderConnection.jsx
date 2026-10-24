import { useEffect, useState } from 'react'
import { Cpu, Plug, RefreshCw } from 'lucide-react'
import { aiRequest } from '../../lib/aiClient'
import { useAI } from '../../context/AIContext'
import { useAuth } from '../../context/AuthContext'
import { browserCapability, browserPresets, removeBrowserModel, setAiPreference, startBrowserAI, stopBrowserAI } from '../../lib/browserAI'
import { recordAudit } from '../../lib/audit'

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
  const [busy, setBusy] = useState(false), [editingKey, setEditingKey] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [capability, setCapability] = useState(null)
  useEffect(() => {
    let alive = true
    browserCapability().then(value => { if (alive) { setCapability(value); if (value.supported && !value.halfPrecision) setBrowserModel(browserPresets[1].id) } }).catch(() => { if (alive) setCapability({ supported: false, message: 'The graphics adapter could not be checked.' }) })
    return () => { alive = false }
  }, [])
  useEffect(() => {
    let alive = true
    const controller = new AbortController()
    aiRequest('providers', 'GET', undefined, controller.signal).then(result => { if (alive) { setConnection(result.connection); setModels(result.models); if (result.connection && ai.preference !== 'browser') setProvider(result.connection.provider) } }).catch(() => { /* Connection form remains usable when no provider is available. */ })
    return () => { alive = false; controller.abort() }
  }, [ai.connectionRevision, ai.preference, user?.id])
  async function connect(event, model) {
    event?.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      const result = await aiRequest('providers', 'POST', { provider, ...(!model && key.trim() ? { apiKey: key.trim() } : {}), ...(model ? { model } : {}) })
      setConnection(result.connection); setModels(result.models); setAiPreference('server'); stopBrowserAI()
      void recordAudit(user, 'ai_connection', 'success', provider)
      setKey(''); setEditingKey(false)
      try {
        const status = await ai.refresh()
        setNotice(status.ready ? 'Connection saved. Model access checked; prompts use the selected model. Generation remains subject to provider quota.' : `Connection saved. ${status.message}`)
      } catch { setNotice('Connection saved. The status check could not finish; use Check active connection to retry.') }
    } catch (err) { void recordAudit(user, 'ai_connection', 'failure', provider); setError(err.message) }
    finally { setBusy(false) }
  }
  async function authorizeOpenRouter() {
    setBusy(true); setError(''); setNotice('')
    try { const result = await aiRequest('provider-oauth', 'POST', { operation: 'start', provider: 'openrouter' }); window.location.assign(result.authorizationUrl) }
    catch (err) { setError(err.message); setBusy(false) }
  }
  async function checkConnection() {
    setBusy(true); setError(''); setNotice('')
    try { const status = await ai.refresh(); setNotice(status.message) }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const savedCredential = connection?.source === 'personal' && connection.provider === provider && provider !== 'ollama'
  async function disconnect() {
    setBusy(true); setError('')
    try { await aiRequest('providers', 'DELETE'); void recordAudit(user, 'ai_connection', 'success', 'Disconnected'); setConnection(null); setModels([]); setNotice('Personal provider disconnected.'); await ai.refresh() }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const selected = providers.find(p => p.id === provider), preset = browserPresets.find(p => p.id === browserModel)
  return <div className="card mb-24" data-pulse-target="AI connection"><div className="card-header"><h3><Cpu size={18} /> Pulse AI connection</h3><span className={`badge ${ai.ready ? 'badge-published' : 'badge-draft'}`}>{ai.label}</span></div>
    <div className="card-body">
      <p>Choose where Pulse thinks. Conversation, drafting, document help and courseware use this connection. Your knowledge library adds context to the same assistant.</p>
      {user?.authenticated && <p className="text-sm text-muted">This provider key belongs only to your account. Switching the admin view keeps the same account and key.</p>}
      <div className="ai-notice"><strong>Connect an account</strong><p>Authorize OpenRouter in your browser to use its available OpenAI, Claude and other models. Usage is billed to your OpenRouter account; provider subscriptions are separate.</p><button className="btn btn-secondary" disabled={busy || !user} onClick={authorizeOpenRouter}><Plug size={16} /> Connect with OpenRouter</button><p className="text-sm text-muted">Direct ChatGPT sign-in requires approval for this hosted app. Claude currently uses an API key or an authorized OpenRouter connection. You can also connect a provider API key below.</p></div>
      <label className="form-label" htmlFor="ai-provider">AI provider</label>
      <select id="ai-provider" className="form-input" value={provider} disabled={busy || ai.local.status === 'loading'} onChange={e => { setProvider(e.target.value); setKey(''); setEditingKey(false); setError(''); setNotice('') }}>{providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
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
        {provider !== 'ollama' && <>{savedCredential && !editingKey ? <div role="status"><label className="form-label" htmlFor="saved-provider-key">Saved provider credential</label><input id="saved-provider-key" className="form-input" type="password" value="saved-credential" readOnly aria-describedby="saved-provider-note" /><p id="saved-provider-note" className="text-sm text-muted">Saved securely for this browser and account{connection.expiresAt ? ` until ${new Date(connection.expiresAt).toLocaleString()}` : ''}. This masked indicator does not contain your key.</p><button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => setEditingKey(true)}>Replace API key</button></div> : <><label className="form-label" htmlFor="provider-key">Provider API key</label><input id="provider-key" className="form-input" type="password" autoComplete="off" spellCheck={false} value={key} onChange={e => setKey(e.target.value)} placeholder="Paste your provider key" maxLength={1024} />{savedCredential && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditingKey(false); setKey('') }}>Keep saved credential</button>}</>}<p className="text-sm text-muted">The server encrypts the credential in a protected connection cookie for up to seven days, tied to your account. The saved key is never returned to application JavaScript or stored in local storage. <a href={selected.link} target="_blank" rel="noreferrer">Get a key from {selected.name}</a>. Provider quotas and charges apply.{provider === 'openai' ? ' A ChatGPT subscription does not supply an OpenAI API key.' : ''}</p></>}
        {provider === 'ollama' && <p>In the downloaded local app, Pulse discovers models installed in Ollama automatically. On the hosted site, use the on-device model above unless the server has its own reachable Ollama installation.</p>}
        <div className="ai-actions"><button className="btn btn-primary" disabled={busy || (provider !== 'ollama' && !key.trim() && (!savedCredential || editingKey))}><Plug size={16} /> {busy ? 'Connecting…' : savedCredential && !editingKey ? 'Refresh models' : 'Connect and load models'}</button>{connection?.source === 'personal' && <button type="button" className="btn btn-secondary" disabled={busy} onClick={disconnect}>Disconnect provider</button>}</div>
        {connection?.provider === provider && models.length > 0 && <div className="ai-provider-content"><label className="form-label" htmlFor="provider-model">Available model</label><select id="provider-model" className="form-input" value={connection.model} disabled={busy} onChange={e => { void connect(null, e.target.value) }}>{models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select><p className="text-sm text-muted">{models.length} models discovered from the API{models.some(m => m.free) ? `; ${models.filter(m => m.free).length} free models are listed first` : ''}. Availability does not guarantee account quota. Your selection takes effect without reloading.</p></div>}
      </form>}
      <div className="ai-actions ai-provider-content"><button className="btn btn-secondary btn-sm" disabled={busy} onClick={checkConnection}><RefreshCw size={14} /> Check active connection</button>{ai.preference === 'browser' && <button className="btn btn-secondary btn-sm" onClick={() => { stopBrowserAI(); setAiPreference('server') }}>Use server connection</button>}</div>
      {error && <p role="alert" className="ai-notice">{error}</p>}{(notice || ai.connectionNotice) && <p role="status" className="ai-notice">{notice || ai.connectionNotice}</p>}
    </div>
  </div>
}
