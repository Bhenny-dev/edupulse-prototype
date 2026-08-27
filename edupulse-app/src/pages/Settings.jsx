import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../context/ThemeContext'
import { exportCSV, timestampedFilename } from '../utils/exportUtils'
import {
  Shield, Palette, Bell, Check, Cpu, Server, KeyRound, Download,
  Trash2, AlertTriangle, ShieldCheck, Plus, Eye, EyeOff, ChevronDown,
  ChevronUp, Zap, Activity, BarChart2, X, Info,
} from 'lucide-react'

/* ───────────────────────── Account (FR-SET-03) ───────────────────────── */

function AccountSettings() {
  const { user } = useAuth()
  const { addToast } = useToast()
  return (
    <div className="card">
      <div className="card-header"><h3><Shield size={18} /> Account</h3></div>
      <div className="card-body">
        <div className="grid-2">
          <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" defaultValue={user?.name} /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" defaultValue={user?.email} /></div>
          <div className="form-group"><label className="form-label">Department</label><input className="form-input" defaultValue={user?.department} /></div>
          <div className="form-group"><label className="form-label">Role</label><input className="form-input" value={user?.title || ''} disabled /></div>
          <div className="form-group"><label className="form-label">New Password</label><input className="form-input" type="password" placeholder="Leave blank to keep current password" /></div>
        </div>
        <button className="btn btn-primary" onClick={() => addToast('Profile updated', 'success')}><Check size={14} /> Save Changes</button>
      </div>
    </div>
  )
}

/* ───────────────────────── Appearance (FR-SET-03, NFR-ACC-05) ───────────────────────── */

function AppearanceSettings() {
  const { dark: darkMode, toggleDark } = useTheme()
  const [fontScale, setFontScale] = useState('medium')
  const { addToast } = useToast()

  return (
    <div className="card">
      <div className="card-header"><h3><Palette size={18} /> Appearance</h3></div>
      <div className="card-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--sky-100)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Dark Mode</div>
              <div className="text-sm text-muted">Switch to dark theme (also available in the top bar)</div>
            </div>
            <div className={`toggle ${darkMode ? 'active' : ''}`} onClick={() => { toggleDark(); addToast('Theme updated', 'success') }}><div className="toggle-knob" /></div>
          </div>
          <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--sky-100)' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Font Size</div>
            <div className="text-sm text-muted mb-8">Adjustable text scale — layout won't break at any size</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['small', 'medium', 'large'].map(size => (
                <button key={size} className={`btn ${fontScale === size ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => { setFontScale(size); addToast('Font size updated', 'success') }}>
                  {size.charAt(0).toUpperCase() + size.slice(1)}{size === 'medium' ? ' (Default)' : ''}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Notifications (FR-SET-04) ───────────────────────── */

function NotificationSettings() {
  const { addToast } = useToast()
  const [prefs, setPrefs] = useState({
    emailNotif: true, syllabusAlerts: true, coursewareAlerts: false, performanceAlerts: true, weeklyDigest: true,
  })
  const toggle = (key) => { setPrefs(prev => ({ ...prev, [key]: !prev[key] })); addToast('Notification preference updated', 'success') }

  return (
    <div className="card">
      <div className="card-header"><h3><Bell size={18} /> Notifications</h3></div>
      <div className="card-body">
        {[
          { key: 'emailNotif', label: 'Email Notifications', desc: 'Receive email alerts for important events' },
          { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Summary of activity sent every Monday' },
          { key: 'syllabusAlerts', label: 'Syllabus Alerts', desc: 'Approval and revision-request updates' },
          { key: 'coursewareAlerts', label: 'Courseware Alerts', desc: 'Generation-complete and publishing notifications' },
          { key: 'performanceAlerts', label: 'Performance Alerts', desc: 'Score-threshold and mastery updates' },
        ].map(item => (
          <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--sky-100)', marginBottom: '8px' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{item.label}</div>
              <div className="text-sm text-muted">{item.desc}</div>
            </div>
            <div className={`toggle ${prefs[item.key] ? 'active' : ''}`} onClick={() => toggle(item.key)}><div className="toggle-knob" /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────── AI Provider — admin/instructor only (FR-SET-01/02/08) ───────────────────────── */

// Provider catalogue with model tiers (free vs. paid subscriptions)
const PROVIDER_CATALOGUE = {
  anthropic: {
    name: 'Claude (Anthropic)',
    color: '#d97757',
    icon: '🟠',
    freeModels: ['claude-haiku-3-5', 'claude-3-haiku'],
    allModels: [
      { id: 'claude-haiku-3-5', label: 'Claude Haiku 3.5', tier: 'free', ctx: '200K tokens' },
      { id: 'claude-3-haiku', label: 'Claude 3 Haiku', tier: 'free', ctx: '200K tokens' },
      { id: 'claude-3-sonnet', label: 'Claude 3 Sonnet', tier: 'paid', ctx: '200K tokens' },
      { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', tier: 'paid', ctx: '200K tokens' },
      { id: 'claude-3-opus', label: 'Claude 3 Opus', tier: 'paid', ctx: '200K tokens' },
      { id: 'claude-opus-4-5', label: 'Claude Opus 4.5', tier: 'paid', ctx: '200K tokens' },
    ],
    docsUrl: 'https://console.anthropic.com',
  },
  openai: {
    name: 'ChatGPT (OpenAI)',
    color: '#10a37f',
    icon: '🟢',
    freeModels: ['gpt-4o-mini'],
    allModels: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini', tier: 'free', ctx: '128K tokens' },
      { id: 'gpt-4o', label: 'GPT-4o', tier: 'paid', ctx: '128K tokens' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', tier: 'paid', ctx: '128K tokens' },
      { id: 'o1-mini', label: 'o1-mini (Reasoning)', tier: 'paid', ctx: '128K tokens' },
      { id: 'o1', label: 'o1 (Reasoning)', tier: 'paid', ctx: '200K tokens' },
      { id: 'o4-mini', label: 'o4-mini (Reasoning)', tier: 'paid', ctx: '200K tokens' },
      { id: 'o3', label: 'o3 (Reasoning)', tier: 'paid', ctx: '200K tokens' },
    ],
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  google: {
    name: 'Gemini (Google)',
    color: '#4285f4',
    icon: '🔵',
    freeModels: ['gemini-2.0-flash'],
    allModels: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', tier: 'free', ctx: '1M tokens' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', tier: 'paid', ctx: '1M tokens' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', tier: 'paid', ctx: '1M tokens' },
    ],
    docsUrl: 'https://aistudio.google.com/apikey',
  },
  mistral: {
    name: 'Mistral AI',
    color: '#ff7000',
    icon: '🔶',
    freeModels: ['mistral-small'],
    allModels: [
      { id: 'mistral-small', label: 'Mistral Small 3', tier: 'free', ctx: '32K tokens' },
      { id: 'mistral-large', label: 'Mistral Large 2', tier: 'paid', ctx: '128K tokens' },
      { id: 'codestral', label: 'Codestral', tier: 'paid', ctx: '256K tokens' },
    ],
    docsUrl: 'https://console.mistral.ai/api-keys',
  },
}

// Seeded mock usage data per provider (FR-SET-01 — usage visibility for informed decisions)
const SEED_USAGE = {
  anthropic: { used: 124800, limit: 500000, requests: 47, requestLimit: 100, period: 'this month' },
  openai:    { used: 89200,  limit: 200000, requests: 31, requestLimit: 60,  period: 'this month' },
  google:    { used: 320000, limit: 1000000, requests: 58, requestLimit: 200, period: 'this month' },
  mistral:   { used: 44000,  limit: 100000, requests: 12, requestLimit: 50,  period: 'this month' },
}

function UsageBar({ used, limit, color }) {
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : color || '#22c55e'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--gray-600)' }}>
        <span>{used.toLocaleString()} / {limit.toLocaleString()} tokens</span>
        <span style={{ fontWeight: 700, color: barColor }}>{pct}%</span>
      </div>
      <div style={{ height: '6px', borderRadius: '3px', background: 'var(--gray-100)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '3px', transition: 'width 0.5s ease' }} />
      </div>
      {pct >= 90 && (
        <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertTriangle size={10} /> Approaching limit — consider upgrading your plan or switching to another provider.
        </div>
      )}
    </div>
  )
}

function validateApiKey(providerId, apiKey) {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate tier detection based on API key structure or just randomly for prototype
      // For demo, if key contains "pro" or "paid" we simulate a paid tier, else free.
      const isPaid = apiKey.toLowerCase().includes('pro') || apiKey.toLowerCase().includes('paid')
      resolve({ tier: isPaid ? 'paid' : 'free' })
    }, 1500)
  })
}

function ProviderCard({ providerId, entry, onRemove, onUpdate }) {
  const catalogue = PROVIDER_CATALOGUE[providerId]
  const usage = SEED_USAGE[providerId] || { used: 0, limit: 100000, requests: 0, requestLimit: 50, period: 'this month' }
  const [showKey, setShowKey] = useState(false)
  const [expanded, setExpanded] = useState(entry.status === 'configuring' || entry.status === 'validating')

  const reqPct = Math.min(100, Math.round((usage.requests / usage.requestLimit) * 100))
  const reqColor = reqPct >= 90 ? '#ef4444' : reqPct >= 70 ? '#f59e0b' : catalogue.color

  const handleValidate = async () => {
    if (!entry.apiKey.trim()) return
    onUpdate({ ...entry, status: 'validating' })
    const result = await validateApiKey(providerId, entry.apiKey)
    const availableModels = catalogue.allModels.filter(m => m.tier === 'free' || result.tier === 'paid')
    onUpdate({
      ...entry,
      status: 'active',
      tier: result.tier,
      model: availableModels[0]?.id || entry.model // select first available
    })
  }

  // Determine border color based on status
  let borderColor = `1.5px solid ${catalogue.color}35`
  if (entry.status === 'configuring') borderColor = `1.5px dashed var(--gray-300)`
  if (entry.status === 'validating') borderColor = `1.5px solid var(--sky-400)`

  return (
    <div style={{
      border: borderColor, borderRadius: 'var(--radius-lg)',
      background: 'var(--white)', overflow: 'hidden',
      transition: 'border-color 0.3s',
    }}>
      {/* Header row */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: entry.status === 'active' ? `${catalogue.color}08` : 'var(--gray-50)', cursor: 'pointer' }}
        onClick={() => setExpanded(p => !p)}
      >
        <span style={{ fontSize: '1.2rem', opacity: entry.status === 'active' ? 1 : 0.5 }}>{catalogue.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{catalogue.name}</div>
          {entry.status === 'active' ? (
            <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>
              Active model: <strong>{catalogue.allModels.find(m => m.id === entry.model)?.label || entry.model}</strong>
            </div>
          ) : (
            <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>
              Setup pending
            </div>
          )}
        </div>

        {/* Badges & Caret */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {entry.status === 'active' && entry.tier === 'paid' && (
            <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.65rem', fontWeight: 700, background: 'var(--purple-100)', color: 'var(--purple-700)' }}>Tier 1 (Production)</span>
          )}
          {entry.status === 'active' && entry.tier === 'free' && (
            <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.65rem', fontWeight: 700, background: 'var(--gray-100)', color: 'var(--gray-600)' }}>Free Tier</span>
          )}
          {entry.status === 'validating' && (
            <span style={{ fontSize: '0.75rem', color: 'var(--sky-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="spinner" style={{ width: 10, height: 10, borderWidth: 2 }} /> Validating...
            </span>
          )}
          {expanded ? <ChevronUp size={14} color="var(--gray-400)" /> : <ChevronDown size={14} color="var(--gray-400)" />}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px', borderTop: `1px solid ${entry.status === 'active' ? `${catalogue.color}20` : 'var(--gray-200)'}` }}>

          {/* Step 1: Configuration */}
          {(entry.status === 'configuring' || entry.status === 'validating') && (
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '8px' }}>1. Enter your API Key</div>
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    className="form-input"
                    type={showKey ? 'text' : 'password'}
                    value={entry.apiKey}
                    onChange={e => onUpdate({ ...entry, apiKey: e.target.value })}
                    placeholder={`Paste your ${catalogue.name} API key... (hint: type "pro" to test paid tier)`}
                    style={{ fontSize: '0.8125rem' }}
                    disabled={entry.status === 'validating'}
                  />
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowKey(p => !p)} disabled={entry.status === 'validating'} title={showKey ? 'Hide key' : 'Reveal key'}>
                    {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleValidate} disabled={!entry.apiKey.trim() || entry.status === 'validating'}>
                    Save & Validate
                  </button>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: '3px' }}>
                  Stored server-side only. <a href={catalogue.docsUrl} target="_blank" rel="noreferrer" style={{ color: catalogue.color }}>Get your key →</a>
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Active Dashboard */}
          {entry.status === 'active' && (
            <>
              {/* API Key (editable) */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>API Key</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    className="form-input"
                    type={showKey ? 'text' : 'password'}
                    value={entry.apiKey}
                    onChange={e => onUpdate({ ...entry, apiKey: e.target.value, status: 'configuring' })} // typing resets validation
                    style={{ fontSize: '0.8125rem' }}
                  />
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowKey(p => !p)} title={showKey ? 'Hide key' : 'Reveal key'}>
                    {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              {/* Model picker */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Active Model</label>
                <select
                  className="form-input"
                  value={entry.model}
                  onChange={e => onUpdate({ ...entry, model: e.target.value })}
                  style={{ fontSize: '0.8125rem' }}
                >
                  <optgroup label="✅ Free Tier Models">
                    {catalogue.allModels.filter(m => m.tier === 'free').map(m => (
                      <option key={m.id} value={m.id}>{m.label} — {m.ctx}</option>
                    ))}
                  </optgroup>
                  {entry.tier === 'paid' && (
                    <optgroup label="💳 Paid Models (Unlocked)">
                      {catalogue.allModels.filter(m => m.tier === 'paid').map(m => (
                        <option key={m.id} value={m.id}>{m.label} — {m.ctx}</option>
                      ))}
                    </optgroup>
                  )}
                  {entry.tier === 'free' && (
                    <optgroup label="🔒 Paid Models (Upgrade Required)" disabled>
                      {catalogue.allModels.filter(m => m.tier === 'paid').map(m => (
                        <option key={m.id} value={m.id}>{m.label} (Requires Tier 1+)</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <p style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: '3px' }}>
                  {entry.tier === 'free'
                    ? `You are on the Free tier. Upgrade your ${catalogue.name} billing account to unlock production models.`
                    : `You have access to all ${catalogue.name} models.`}
                </p>
              </div>

              {/* Usage dashboard */}
              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--gray-50)', border: '1px solid var(--gray-100)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <Activity size={13} style={{ color: catalogue.color }} />
                  <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>Usage — {usage.period}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Info size={10} /> Limits dynamically determined by {catalogue.name}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Token progress bar */}
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Token Consumption
                    </div>
                    <UsageBar used={usage.used} limit={usage.limit} color={catalogue.color} />
                  </div>

                  {/* Request segmented bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '5px', color: 'var(--gray-600)' }}>
                      <span>API Requests: <strong>{usage.requests}</strong> / {usage.requestLimit} {usage.period}</span>
                      <span style={{ fontWeight: 700, color: reqColor }}>{reqPct}%</span>
                    </div>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} style={{
                          flex: 1, height: '8px', borderRadius: '2px',
                          background: i < Math.ceil(reqPct / 10) ? reqColor : 'var(--gray-100)',
                          transition: 'background 0.3s',
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {entry.status === 'active' && entry.tier === 'free' ? (
              <a href={catalogue.docsUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: catalogue.color, fontWeight: 600 }}>
                Upgrade to Paid Tier ↗
              </a>
            ) : <div />}
            <button className="btn btn-danger btn-sm" onClick={onRemove} style={{ fontSize: '0.75rem' }}>
              <Trash2 size={12} /> Remove Provider
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AIProviderSettings() {
  const { addToast } = useToast()
  const [mode, setMode] = useState('local')

  // Local engine config
  const LOCAL_ENGINES = [
    { id: 'ollama',    label: 'Ollama',           defaultEndpoint: 'http://localhost:11434' },
    { id: 'lmstudio', label: 'LM Studio',         defaultEndpoint: 'http://localhost:1234' },
    { id: 'jan',      label: 'Jan.ai',            defaultEndpoint: 'http://localhost:1337' },
    { id: 'openwebui',label: 'Open WebUI',        defaultEndpoint: 'http://localhost:3000' },
    { id: 'llamacpp', label: 'llama.cpp server',  defaultEndpoint: 'http://localhost:8080' },
    { id: 'vllm',     label: 'vLLM',             defaultEndpoint: 'http://localhost:8000' },
  ]
  const [localEngine, setLocalEngine] = useState('ollama')
  const [localEndpoint, setLocalEndpoint] = useState('http://localhost:11434')
  const [localModel, setLocalModel] = useState('llama3.3')

  // API providers — seeded with one demo provider
  const [providers, setProviders] = useState([
    { id: 'anthropic', apiKey: 'sk-ant-demo-••••••••', model: 'claude-haiku-3-5', status: 'active', tier: 'paid' },
  ])
  const [addingProvider, setAddingProvider] = useState(false)
  const [newProviderId, setNewProviderId] = useState('')

  const availableToAdd = Object.keys(PROVIDER_CATALOGUE).filter(pk => !providers.find(p => p.id === pk))

  const handleEngineChange = (engineId) => {
    const eng = LOCAL_ENGINES.find(e => e.id === engineId)
    setLocalEngine(engineId)
    setLocalEndpoint(eng?.defaultEndpoint || 'http://localhost:11434')
  }

  const handleAddProvider = () => {
    if (!newProviderId) return
    const cat = PROVIDER_CATALOGUE[newProviderId]
    setProviders(prev => [...prev, { id: newProviderId, apiKey: '', model: '', status: 'configuring', tier: 'free' }])
    setNewProviderId('')
    setAddingProvider(false)
    addToast(`${cat.name} added — enter your API key to activate it.`, 'info')
  }

  const handleRemoveProvider = (id) => {
    if (!confirm(`Remove ${PROVIDER_CATALOGUE[id]?.name}?`)) return
    setProviders(prev => prev.filter(p => p.id !== id))
    addToast('Provider removed', 'success')
  }

  const handleUpdateProvider = (id, updated) => {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p))
  }

  const totalTokensUsed = providers.reduce((a, p) => a + (SEED_USAGE[p.id]?.used || 0), 0)
  const totalRequests   = providers.reduce((a, p) => a + (SEED_USAGE[p.id]?.requests || 0), 0)

  return (
    <div className="card">
      <div className="card-header"><h3><Cpu size={18} /> AI Provider</h3></div>
      <div className="card-body">

        {/* Mode selector */}
        <p className="text-sm text-muted mb-16">
          Choose how EduPulse's courseware and syllabus generation is powered. No paid service is required — both options support free-tier access.
        </p>

        <div style={{ display: 'grid', gap: '10px', marginBottom: '24px' }}>
          {/* Local option */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px',
            borderRadius: 'var(--radius-md)', border: `2px solid ${mode === 'local' ? 'var(--sky-400)' : 'var(--gray-200)'}`,
            background: mode === 'local' ? 'var(--sky-50)' : 'transparent', cursor: 'pointer', transition: 'border-color 0.2s',
          }}>
            <input type="radio" name="ai-provider-mode" checked={mode === 'local'} onChange={() => setMode('local')} style={{ marginTop: '3px' }} />
            <Server size={20} style={{ color: 'var(--sky-500)', flexShrink: 0, marginTop: '1px' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Locally Hosted Model</div>
              <div className="text-sm text-muted" style={{ marginTop: '4px', lineHeight: 1.6 }}>
                Run AI <strong>entirely on your own hardware or institution server</strong> — zero external API calls, no data leaves your network.
                Connects to any OpenAI-compatible local runtime:
                <ul style={{ margin: '6px 0 0 16px', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 16px', listStyle: 'disc' }}>
                  <li><strong>Ollama</strong> — Llama 3.3, Gemma 3, Phi-4, Mistral, DeepSeek-R1, Qwen 2.5, Mixtral, and 100+ more</li>
                  <li><strong>LM Studio</strong> — GUI-based model runner for any GGUF model</li>
                  <li><strong>Jan.ai</strong> — offline-first desktop AI</li>
                  <li><strong>Open WebUI</strong> — self-hosted web frontend for local models</li>
                  <li><strong>llama.cpp</strong> — lightweight C++ inference server</li>
                  <li><strong>vLLM</strong> — high-throughput inference for production deployments</li>
                </ul>
                <span style={{ display: 'block', marginTop: '6px', fontStyle: 'italic' }}>
                  Best for institutions requiring full data sovereignty, compliance environments, or areas with unreliable internet.
                </span>
              </div>
            </div>
          </label>

          {/* API option */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px',
            borderRadius: 'var(--radius-md)', border: `2px solid ${mode === 'api' ? 'var(--sky-400)' : 'var(--gray-200)'}`,
            background: mode === 'api' ? 'var(--sky-50)' : 'transparent', cursor: 'pointer', transition: 'border-color 0.2s',
          }}>
            <input type="radio" name="ai-provider-mode" checked={mode === 'api'} onChange={() => setMode('api')} style={{ marginTop: '3px' }} />
            <KeyRound size={20} style={{ color: 'var(--sky-500)', flexShrink: 0, marginTop: '1px' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>API Key Providers</div>
              <div className="text-sm text-muted" style={{ marginTop: '4px', lineHeight: 1.6 }}>
                Connect to leading cloud AI providers using your own API keys. Each provider offers a <strong>free-tier model</strong> accessible with any
                API key — higher subscription plans unlock more powerful models with larger context windows and advanced reasoning.
                <br /><br />
                Supported providers: <strong>Claude</strong> (Anthropic) · <strong>ChatGPT / GPT-4o / o-series</strong> (OpenAI) · <strong>Gemini</strong> (Google) · <strong>Mistral AI</strong>.
                <br />
                You can connect <strong>2 or more providers simultaneously</strong> — each workflow (syllabus, courseware, student guide) can use a different provider.
                API keys are stored server-side only and are never exposed to the browser.
              </div>
            </div>
          </label>
        </div>

        {/* ── Local model section ── */}
        {mode === 'local' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--sky-100)', background: 'var(--sky-50)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={14} style={{ color: 'var(--sky-500)' }} /> Local Engine Configuration
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Engine / Runtime</label>
              <select
                className="form-input"
                value={localEngine}
                onChange={e => handleEngineChange(e.target.value)}
                style={{ fontSize: '0.8125rem' }}
              >
                {LOCAL_ENGINES.map(eng => <option key={eng.id} value={eng.id}>{eng.label}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>API Endpoint (OpenAI-compatible)</label>
              <input
                className="form-input"
                value={localEndpoint}
                onChange={e => setLocalEndpoint(e.target.value)}
                placeholder="http://localhost:11434"
                style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: '3px' }}>
                Ollama: <code>http://localhost:11434</code> · LM Studio: <code>http://localhost:1234</code> · Jan: <code>http://localhost:1337</code> · vLLM: <code>http://localhost:8000</code>
              </p>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Model Name (exact name as loaded in your runtime)</label>
              <input
                className="form-input"
                value={localModel}
                onChange={e => setLocalModel(e.target.value)}
                placeholder="e.g. llama3.3, gemma3:12b, phi4, deepseek-r1:8b..."
                style={{ fontSize: '0.8125rem' }}
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: '3px' }}>
                Popular Ollama models: <code>llama3.3</code> · <code>gemma3</code> · <code>gemma2</code> · <code>phi4</code> · <code>mistral</code> · <code>deepseek-r1</code> · <code>qwen2.5</code> · <code>mixtral</code>
              </p>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => addToast('Testing connection to local model...', 'info')}
            >
              <Activity size={13} /> Test Connection
            </button>
          </div>
        )}

        {/* ── API providers section ── */}
        {mode === 'api' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* Summary stats bar */}
            {providers.length > 0 && (
              <div style={{
                display: 'flex', gap: '12px', padding: '10px 14px',
                borderRadius: 'var(--radius-md)', background: 'var(--gray-50)', border: '1px solid var(--gray-100)',
                marginBottom: '4px', flexWrap: 'wrap', alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BarChart2 size={14} style={{ color: 'var(--sky-500)' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>All providers this month:</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                  <strong>{totalTokensUsed.toLocaleString()}</strong> tokens consumed
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                  <strong>{totalRequests}</strong> API requests
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginLeft: 'auto' }}>
                  {providers.length} provider{providers.length !== 1 ? 's' : ''} connected
                </span>
              </div>
            )}

            {/* Provider cards */}
            {providers.map(p => (
              <ProviderCard
                key={p.id}
                providerId={p.id}
                entry={p}
                onRemove={() => handleRemoveProvider(p.id)}
                onUpdate={updated => handleUpdateProvider(p.id, updated)}
              />
            ))}

            {/* Add provider button */}
            {availableToAdd.length > 0 && (
              addingProvider ? (
                <div style={{
                  display: 'flex', gap: '8px', padding: '12px 14px',
                  border: '1.5px dashed var(--sky-200)', borderRadius: 'var(--radius-lg)',
                  alignItems: 'center', background: 'var(--sky-50)',
                }}>
                  <select
                    className="form-input"
                    value={newProviderId}
                    onChange={e => setNewProviderId(e.target.value)}
                    style={{ flex: 1, fontSize: '0.8125rem' }}
                  >
                    <option value="">Select a provider to add...</option>
                    {availableToAdd.map(pk => (
                      <option key={pk} value={pk}>{PROVIDER_CATALOGUE[pk].icon} {PROVIDER_CATALOGUE[pk].name}</option>
                    ))}
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={handleAddProvider} disabled={!newProviderId}>
                    <Check size={13} /> Add
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setAddingProvider(false); setNewProviderId('') }}>
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-secondary"
                  style={{ border: '1.5px dashed var(--sky-200)', color: 'var(--sky-600)', fontSize: '0.8125rem' }}
                  onClick={() => setAddingProvider(true)}
                >
                  <Plus size={14} /> Add Another Provider
                </button>
              )
            )}

            {availableToAdd.length === 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textAlign: 'center', padding: '8px' }}>
                All supported providers are connected.
              </p>
            )}
          </div>
        )}

        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => addToast('AI provider settings saved', 'success')}>
          <Check size={14} /> Save Settings
        </button>
      </div>
    </div>
  )
}

/* ───────────────────────── Data & Privacy (FR-SET-05) ───────────────────────── */

function DataPrivacySettings() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [deletionRequested, setDeletionRequested] = useState(false)

  const handleExport = () => {
    exportCSV([{ Name: user?.name, Email: user?.email, Role: user?.role, Department: user?.department }], timestampedFilename('my_edupulse_data', 'csv'))
    addToast('Your data export has started downloading', 'success')
  }

  const handleDeleteRequest = () => {
    if (confirm('Request deletion of your EduPulse account data? This is submitted to the Dean/IT for processing and cannot be undone once approved.')) {
      setDeletionRequested(true)
      addToast('Account deletion request submitted', 'info')
    }
  }

  return (
    <div className="card">
      <div className="card-header"><h3><ShieldCheck size={18} /> Data &amp; Privacy</h3></div>
      <div className="card-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--sky-100)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Export My Data</div>
              <div className="text-sm text-muted">Download a copy of your account and activity data</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleExport}><Download size={14} /> Export</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--red-100)', background: deletionRequested ? 'var(--red-100)' : 'transparent' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Request Account Deletion</div>
              <div className="text-sm text-muted">{deletionRequested ? 'Deletion request submitted — pending processing' : 'Permanently remove your account and associated data'}</div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={handleDeleteRequest} disabled={deletionRequested}>
              {deletionRequested ? <><AlertTriangle size={14} /> Pending</> : <><Trash2 size={14} /> Request Deletion</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Page shell ───────────────────────── */

export default function Settings() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('account')
  const showAIProvider = user?.role === 'admin' || user?.role === 'instructor'

  const tabs = [
    { id: 'account', label: 'Account', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    ...(showAIProvider ? [{ id: 'ai-provider', label: 'AI Provider', icon: Cpu }] : []),
    { id: 'privacy', label: 'Data & Privacy', icon: ShieldCheck },
  ]

  return (
    <div className="container">
      <div className="page-header"><h1>Settings</h1></div>

      <div className="tabs mb-24" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
        {tabs.map(t => (
          <button key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)} style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'account' && <AccountSettings />}
      {activeTab === 'appearance' && <AppearanceSettings />}
      {activeTab === 'notifications' && <NotificationSettings />}
      {activeTab === 'ai-provider' && showAIProvider && <AIProviderSettings />}
      {activeTab === 'privacy' && <DataPrivacySettings />}
    </div>
  )
}
