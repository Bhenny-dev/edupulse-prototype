import { Spinner } from '../ui/LoadingFeedback'
import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Loader2, Plus, Sparkles } from 'lucide-react'
import { aiRequest } from '../../lib/aiClient'
import { setAiPreference, stopBrowserAI } from '../../lib/browserAI'
import { recordAudit } from '../../lib/audit'
import { useAI } from '../../context/AIContext'

const NAMES = { ollama: 'Ollama', gemini: 'Google Gemini', groq: 'Groq', openrouter: 'OpenRouter', huggingface: 'Hugging Face', openai: 'OpenAI', anthropic: 'Claude (Anthropic)', deepseek: 'DeepSeek', hermes: 'Hermes (Nous Portal)' }
const providerName = provider => NAMES[provider] || provider

/**
 * Switch the saved AI provider or its model from the chat panel. It uses the same saved
 * connections and server checks as Settings; adding a provider or key stays in Settings.
 */
export default function PulseModelPicker({ open, disabled, user, onToggle, onClose, onManage }) {
  const ai = useAI()
  const [data, setData] = useState({ loading: false, error: '', connection: null, connections: [], models: [] })
  const [busy, setBusy] = useState(''), [filter, setFilter] = useState('')
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setData(previous => ({ ...previous, loading: true, error: '' })); setFilter('')
    aiRequest('providers', 'GET', undefined, controller.signal)
      .then(result => setData({ loading: false, error: result.warning || '', connection: result.connection, connections: result.connections || [], models: result.models || [] }))
      .catch(failure => { if (!controller.signal.aborted) setData(previous => ({ ...previous, loading: false, error: failure.message })) })
    return () => controller.abort()
  }, [open, ai.connectionRevision])
  const onDevice = ai.preference === 'browser'
  const active = !onDevice ? data.connection : null
  const models = useMemo(() => {
    const wanted = filter.trim().toLowerCase()
    return data.models.filter(model => !wanted || `${model.name} ${model.id}`.toLowerCase().includes(wanted)).slice(0, 60)
  }, [data.models, filter])
  const choose = async (provider, model) => {
    if (busy) return
    const saved = data.connections.find(item => item.provider === provider)
    setBusy(model || provider); setData(previous => ({ ...previous, error: '' }))
    try {
      const result = await aiRequest('providers', 'POST', { provider, ...(model ? { model } : {}), ...(provider === 'anthropic' ? { workspaceId: (model ? data.connection : saved)?.workspaceId || '' } : {}) })
      setAiPreference('server'); stopBrowserAI()
      void recordAudit(user, 'ai_connection', 'success', provider)
      setData(previous => ({ ...previous, connection: result.connection, models: result.models || [], connections: previous.connections.map(item => item.provider === provider ? { ...item, ...result.connection, active: true } : { ...item, active: false }) }))
      await ai.refresh().catch(() => {})
      onClose()
    } catch (failure) {
      void recordAudit(user, 'ai_connection', 'failure', provider)
      setData(previous => ({ ...previous, error: failure.message }))
    } finally { setBusy('') }
  }
  return <div className="pulse-model" data-pulse-popover="model">
    <button type="button" className="pulse-model-chip" aria-haspopup="dialog" aria-expanded={open} aria-label={`AI provider and model: ${ai.label}`} title="Change the AI provider or model" disabled={disabled} onClick={onToggle}>
      <Sparkles size={13} aria-hidden="true" /><span>{ai.label}</span><ChevronDown size={13} aria-hidden="true" />
    </button>
    {open && <div className="pulse-popover pulse-model-menu" role="dialog" aria-label="AI provider and model">
      <strong>AI provider and model</strong>
      {onDevice && <p className="pulse-popover-note">Pulse is using the on-device model. Choose a saved provider below to switch.</p>}
      {data.loading && <p className="pulse-popover-note" role="status"><Loader2 size={13} className="pulse-spin" aria-hidden="true" /> Loading your saved connections...</p>}
      {data.connections.length > 0 && <section aria-label="Saved providers"><small>Saved providers</small>
        {data.connections.map(item => { const current = item.active && !onDevice; return <button aria-busy={Boolean(busy === item.provider)} key={item.provider} type="button" className="pulse-popover-item" aria-pressed={current} disabled={Boolean(busy)} onClick={() => current ? onClose() : void choose(item.provider)}>
          <span>{providerName(item.provider)}</span><small>{Boolean(busy === item.provider) && <Spinner />}{busy === item.provider ? 'Switching...' : item.model}</small>{current && <Check size={14} aria-label="Active" />}
        </button> })}
      </section>}
      {active && data.models.length > 0 && <section aria-label={`Models for ${providerName(active.provider)}`}><small>Models · {providerName(active.provider)}</small>
        {data.models.length > 8 && <input className="pulse-popover-filter" type="search" value={filter} placeholder="Filter models" aria-label="Filter models" onChange={event => setFilter(event.target.value)} />}
        <ul>{models.map(model => { const current = model.id === active.model; return <li key={model.id}><button aria-busy={Boolean(busy === model.id)} type="button" className="pulse-popover-item" aria-pressed={current} disabled={Boolean(busy)} onClick={() => current ? onClose() : void choose(active.provider, model.id)}>
          <span>{model.name || model.id}</span>{model.free && <small>Free</small>}{Boolean(busy === model.id) && <Spinner />}{busy === model.id ? <small>Selecting...</small> : current && <Check size={14} aria-label="Active" />}
        </button></li> })}</ul>
        {!models.length && <p className="pulse-popover-note">No model matches that filter.</p>}
      </section>}
      {!data.loading && !data.connections.length && !data.error && <p className="pulse-popover-note">No AI provider is saved for this account yet.</p>}
      {data.error && <p className="pulse-popover-note" role="alert">{data.error}</p>}
      <button type="button" className="pulse-popover-item pulse-popover-link" onClick={onManage}><Plus size={14} aria-hidden="true" /><span>Add or manage providers</span></button>
    </div>}
  </div>
}
