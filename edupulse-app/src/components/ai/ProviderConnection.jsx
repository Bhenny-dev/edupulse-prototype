import { Spinner, SkeletonContent, LoadingStatus } from '../ui/LoadingFeedback'
import { useEffect, useState } from 'react'
import { Cpu, Plug, RefreshCw } from 'lucide-react'
import { aiRequest } from '../../lib/aiClient'
import { useAI } from '../../context/AIContext'
import { useAuth } from '../../context/AuthContext'
import { browserCapability, browserPresets, removeBrowserModel, setAiPreference, startBrowserAI, stopBrowserAI } from '../../lib/browserAI'
import { recordAudit } from '../../lib/audit'
import { rememberProviderAuthorization } from '../../lib/providerOAuth'

const providers = [
  { id: 'browser', name: 'On this device · no API key' },
  { id: 'ollama', name: 'Ollama · local app server' },
  { id: 'gemini', name: 'Google Gemini · free tier', link: 'https://aistudio.google.com/api-keys' },
  { id: 'groq', name: 'Groq · free tier', link: 'https://console.groq.com/keys' },
  { id: 'openrouter', name: 'OpenRouter · free models', link: 'https://openrouter.ai/settings/keys' },
  { id: 'huggingface', name: 'Hugging Face Inference · free credits', link: 'https://huggingface.co/settings/tokens' },
  { id: 'openai', name: 'OpenAI', link: 'https://platform.openai.com/api-keys' },
  { id: 'anthropic', name: 'Claude (Anthropic)', link: 'https://platform.claude.com/settings/keys' },
]

export default function ProviderConnection() {
  const ai = useAI()
  const { user } = useAuth()
  const [provider, setProvider] = useState(ai.preference === 'browser' ? 'browser' : user?.authenticated ? 'openai' : 'browser')
  const [key, setKey] = useState(''), [models, setModels] = useState([]), [connection, setConnection] = useState(null)
  const [connections, setConnections] = useState([]), [loading, setLoading] = useState(true)
  const [loadAttempt, setLoadAttempt] = useState(0), [loadFailed, setLoadFailed] = useState(false)
  const [workspaceId, setWorkspaceId] = useState(''), [workspaces, setWorkspaces] = useState([])
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
    setLoading(true); setLoadFailed(false); setError('')
    aiRequest('providers', 'GET', undefined, controller.signal).then(result => { if (alive) { setConnection(result.connection); setConnections(result.connections || []); setModels(result.models); if (result.warning) setError(result.warning); if (result.connection && ai.preference !== 'browser') setProvider(result.connection.provider) } }).catch(err => { if (alive) { setError(err.message); setLoadFailed(true) } }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false; controller.abort() }
  }, [ai.connectionRevision, ai.preference, user?.id, loadAttempt])
  useEffect(() => { if (ai.health?.connection?.provider === provider) setConnection(ai.health.connection) }, [ai.health, provider])
  useEffect(() => { setWorkspaceId(connection?.provider === 'anthropic' ? connection.workspaceId || '' : '') }, [connection?.provider, connection?.workspaceId])
  async function connect(event, model) {
    event?.preventDefault(); setBusy(model ? 'Selecting model…' : 'Saving connection and loading models…'); setError(''); setNotice(''); ai.clearConnectionNotice()
    try {
      const result = await aiRequest('providers', 'POST', { provider, ...(!model && key.trim() ? { apiKey: key.trim() } : {}), ...(model ? { model } : {}), ...(provider === 'anthropic' ? { workspaceId: model ? connection?.workspaceId || '' : workspaceId.trim() } : {}) })
      setConnection(result.connection); setModels(result.models); setAiPreference('server'); stopBrowserAI()
      setConnections(previous => [...previous.filter(item => item.provider !== provider).map(item => ({ ...item, active: false })), { ...result.connection, active: true }])
      void recordAudit(user, 'ai_connection', 'success', provider)
      setKey(''); setEditingKey(false)
      try {
        const status = await ai.refresh()
        setNotice(`Connection saved. ${status.message}`)
      } catch { setNotice('Connection saved. The status check could not finish; use Check active connection to retry.') }
    } catch (err) { void recordAudit(user, 'ai_connection', 'failure', provider); setError(err.message) }
    finally { setBusy(false) }
  }
  async function authorizeOpenRouter() {
    setBusy('Opening OpenRouter authorization…'); setError(''); setNotice(''); ai.clearConnectionNotice()
    try { const result = await aiRequest('provider-oauth', 'POST', { operation: 'start', provider: 'openrouter' }); rememberProviderAuthorization(result.authorizationUrl); window.location.assign(result.authorizationUrl) }
    catch (err) { setError(err.message); setBusy(false) }
  }
  async function checkConnection() {
    setBusy('Checking active connection…'); setError(''); setNotice(''); ai.clearConnectionNotice()
    try { const status = await ai.refresh(); setNotice(status.message) }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  async function testModel() {
    setBusy('Testing selected model…'); setError(''); setNotice(''); ai.clearConnectionNotice()
    try {
      const result = await aiRequest('provider-test', 'POST', {})
      setConnection(result.connection)
      await ai.refresh()
      setNotice('Generation verified. The selected model answered a test request. Provider limits can still change.')
    } catch (err) { setError(err.message); await ai.refresh().catch(() => {}) }
    finally { setBusy(false) }
  }
  async function loadWorkspaces() {
    setBusy('Loading Claude workspaces…'); setError(''); setNotice('')
    try {
      const result = await aiRequest('provider-workspaces', 'POST', { ...(editingKey || !savedCredential ? { apiKey: key.trim() } : {}) })
      setWorkspaces(result.workspaces)
      setNotice(result.workspaces.length ? 'Choose the workspace for this connection, then save it. No workspace was selected automatically.' : 'No workspaces were returned. Use the workspace ID from Claude Console if this key needs one.')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  function chooseProvider(value) {
    const saved = connections.find(item => item.provider === value) || (connection?.provider === value ? connection : null)
    setProvider(value); setConnection(saved); setModels([]); setKey(''); setWorkspaceId(saved?.workspaceId || ''); setWorkspaces([]); setEditingKey(false); setError(''); setNotice(''); ai.clearConnectionNotice()
  }
  const connecting = Boolean(busy && (busy.startsWith('Saving connection') || busy.startsWith('Selecting model')))
  const savedCredential = connection?.source === 'personal' && connection.provider === provider && provider !== 'ollama'
  async function disconnect() {
    setBusy('Disconnecting provider…'); setError(''); setNotice(''); ai.clearConnectionNotice()
    try { await aiRequest('providers', 'DELETE', undefined, undefined, { query: { provider } }); void recordAudit(user, 'ai_connection', 'success', 'Disconnected'); setConnections(previous => previous.filter(item => item.provider !== provider)); setConnection(null); setModels([]); setNotice('Provider removed from your saved connections.'); await ai.refresh() }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const selected = providers.find(p => p.id === provider), preset = browserPresets.find(p => p.id === browserModel)
  const shownError = error || (ai.connectionFailed ? ai.connectionNotice : '')
  const shownNotice = notice || (!ai.connectionFailed ? ai.connectionNotice : '')
  const verified = ai.ready && (ai.preference === 'browser' || ai.health?.connection?.source !== 'personal' || ai.health?.connection?.testedAt)
  return <div className="card mb-24" data-pulse-target="AI connection"><div className="card-header"><h3><Cpu size={18} /> Pulse AI connection</h3><span className={`badge ${verified ? 'badge-published' : 'badge-draft'}`}>{ai.label}</span></div>
    <div className="card-body" aria-busy={loading || Boolean(busy)}>
      <p>Choose where Pulse thinks. Conversation, drafting, document help and courseware use this connection. Your knowledge library adds context to the same assistant.</p>
      {user?.authenticated && <p className="text-sm text-muted">This provider key belongs only to your account. Switching the admin view keeps the same account and key.</p>}
      <div className="ai-notice"><strong>Choose a connection</strong><div className="ai-connection-options">
        <div><strong>ChatGPT plan</strong><p>Subscription sign-in is separate from API billing. This hosted app needs OpenAI approval before it can offer ChatGPT plan usage.</p><a href="https://developers.openai.com/siwc/token-sharing-open-source" target="_blank" rel="noreferrer">ChatGPT connection requirements</a></div>
        <div><strong>OpenAI API</strong><p>Use an OpenAI API key and its API billing account. This does not use your ChatGPT subscription allowance.</p><button className="btn btn-secondary btn-sm" disabled={busy || loading} onClick={() => chooseProvider('openai')}>Connect OpenAI API</button></div>
        <div><strong>Claude</strong><p>Connect an Anthropic API key from Claude Console. API credits are separate from a Claude or Claude Code subscription.</p><button className="btn btn-secondary btn-sm" disabled={busy || loading} onClick={() => chooseProvider('anthropic')}>Connect Claude API</button></div>
        <div><strong>OpenRouter account</strong><p>Authorize in your browser to use available OpenAI, Claude and other models with OpenRouter credits.</p><button className="btn btn-secondary btn-sm" disabled={busy || loading || !user} onClick={authorizeOpenRouter}><Plug size={16} /> Connect with OpenRouter</button></div>
      </div><p className="text-sm text-muted">API usage has its own credits and permissions. A ChatGPT or Claude subscription does not supply an API key.</p></div>
      {loading ? <SkeletonContent label="Loading saved AI connections…" rows={3} /> : <>
      {connections.length > 0 && <p className="text-sm text-muted">Saved to your account: {connections.map(item => `${item.provider}${item.active ? ' (active)' : ''}`).join(', ')}. Select a provider below to reuse its saved connection.</p>}
      <label className="form-label" htmlFor="ai-provider">AI provider</label>
      <select id="ai-provider" className="form-input" value={provider} disabled={busy || ai.local.status === 'loading'} onChange={e => chooseProvider(e.target.value)}>{providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
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
        {provider !== 'ollama' && <>{savedCredential && !editingKey ? <div role="status"><label className="form-label" htmlFor="saved-provider-key">Saved provider credential</label><input id="saved-provider-key" className="form-input" type="password" value="saved-credential" readOnly aria-describedby="saved-provider-note" /><p id="saved-provider-note" className="text-sm text-muted">{user?.authenticated ? 'Saved encrypted to your EduPulse account. Sign out and return without reconnecting.' : 'Saved for this browser session.'} Provider expiry or revocation still applies. This masked indicator does not contain your key.</p><button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => { setEditingKey(true); setWorkspaceId(''); setWorkspaces([]) }}>Replace API key</button></div> : <><label className="form-label" htmlFor="provider-key">Provider API key</label><input id="provider-key" className="form-input" type="password" disabled={busy} autoComplete="off" spellCheck={false} value={key} onChange={e => setKey(e.target.value)} placeholder="Paste your provider key" maxLength={1024} />{savedCredential && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setEditingKey(false); setKey(''); setWorkspaceId(connection.workspaceId || ''); setWorkspaces([]) }}>Keep saved credential</button>}</>}<p className="text-sm text-muted">Saved credentials are encrypted on the server and private to your account. Sign out clears the device connection; Disconnect provider removes the saved connection. Keys are never returned to application JavaScript or stored in local storage. <a href={selected.link} target="_blank" rel="noreferrer">Get a key from {selected.name}</a>. Provider quotas and charges apply.</p></>}
        {provider === 'anthropic' && <div className="ai-provider-content">
          <label className="form-label" htmlFor="claude-workspace">Claude workspace</label>
          <input id="claude-workspace" className="form-input" value={workspaceId} disabled={busy} onChange={e => setWorkspaceId(e.target.value)} list="claude-workspaces" placeholder="Optional for scoped keys" autoComplete="off" spellCheck={false} maxLength={107} aria-describedby="claude-workspace-note" />
          <datalist id="claude-workspaces">{workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</datalist>
          <p id="claude-workspace-note" className="text-sm text-muted">Leave blank for a key scoped to one workspace. Other keys need the workspace ID from <a href="https://platform.claude.com/settings/workspaces" target="_blank" rel="noreferrer">Claude Console</a>. This selects where API usage is billed and data is handled.</p>
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy || (!key.trim() && (!savedCredential || editingKey))} onClick={loadWorkspaces}>Load Claude workspaces</button>
          {workspaces.length > 0 && <><label className="form-label" htmlFor="claude-workspace-choice">Available Claude workspaces</label><select id="claude-workspace-choice" className="form-input" disabled={busy} value={workspaces.some(w => w.id === workspaceId) ? workspaceId : ''} onChange={e => setWorkspaceId(e.target.value)}><option value="">Choose a workspace</option>{workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></>}
        </div>}
        {provider === 'ollama' && <p>In the downloaded local app, Pulse discovers models installed in Ollama automatically. On the hosted site, use the on-device model above unless the server has its own reachable Ollama installation.</p>}
        <div className="ai-actions"><button className="btn btn-primary" disabled={busy || (provider !== 'ollama' && !key.trim() && (!savedCredential || editingKey))}>{connecting ? <Spinner /> : <Plug size={16} />} {connecting ? 'Connecting…' : provider === 'anthropic' && workspaceId.trim() !== (connection?.workspaceId || '') ? 'Save workspace and load models' : savedCredential && !editingKey ? ai.health?.connection?.provider === provider ? 'Refresh models' : 'Use saved connection' : 'Connect and load models'}</button>{connection?.source === 'personal' && <button type="button" className="btn btn-secondary" disabled={busy} onClick={disconnect}>Disconnect provider</button>}</div>
        {connection?.provider === provider && models.length > 0 && <div className="ai-provider-content"><label className="form-label" htmlFor="provider-model">Available model</label><select id="provider-model" className="form-input" value={connection.model} disabled={busy} onChange={e => { void connect(null, e.target.value) }}>{!connection.model && <option value="" disabled>Choose a model</option>}{models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select><p className="text-sm text-muted">{models.length} models discovered from the API{models.some(m => m.free) ? `; ${models.filter(m => m.free).length} free models are listed first` : ''}. Model listing does not verify inference access or quota. Your selection takes effect without reloading.</p></div>}
      </form>}
      <div className="ai-actions ai-provider-content"><button className="btn btn-secondary btn-sm" disabled={busy} onClick={checkConnection}>{busy && busy.startsWith('Checking active connection') ? <Spinner size={14} /> : <RefreshCw size={14} />} Check active connection</button>{connection?.provider === provider && connection.model && provider !== 'browser' && <button className="btn btn-primary btn-sm" disabled={busy || editingKey || ai.health?.connection?.provider !== provider || (provider === 'anthropic' && workspaceId.trim() !== (connection.workspaceId || ''))} onClick={testModel}>{busy && busy.startsWith('Testing selected model') && <Spinner size={14} />} Test selected model</button>}{ai.preference === 'browser' && <button className="btn btn-secondary btn-sm" onClick={() => { stopBrowserAI(); setAiPreference('server') }}>Use server connection</button>}</div>
      {connection?.provider === provider && provider !== 'browser' && <p className="text-sm text-muted">Test selected model sends a short generation request and uses provider quota.{connection.testedAt ? ` Last successful generation: ${new Date(connection.testedAt).toLocaleString()}.` : ' Generation has not been verified.'}</p>}
      {busy && <LoadingStatus label={busy} />}
      </>}
      {loadFailed && !loading && <button className="btn btn-secondary btn-sm" onClick={() => setLoadAttempt(value => value + 1)}>Retry saved connections</button>}
      {shownError && <p role="alert" className="ai-notice">{shownError}</p>}{shownNotice && shownNotice !== shownError && <p role="status" className="ai-notice">{shownNotice}</p>}
    </div>
  </div>
}
