import { useCallback, useEffect, useState } from 'react'
import { Cpu, RefreshCw, Workflow } from 'lucide-react'
import { useAI } from '../../context/AIContext'
import { useAuth } from '../../context/AuthContext'
import ProviderConnection from './ProviderConnection'
import KnowledgeLibrary from './KnowledgeLibrary'
import { AGENT_META } from './agentMeta'
import './ai.css'

const modelState = state => ({ loaded: 'Loaded in memory', bundled: 'Bundled with the app', 'downloads on first use': 'Downloads once on first use', missing: 'Missing' })[state] || state

export default function AISettings() {
  const { user } = useAuth()
  const ai = useAI(), { health, refresh: refreshShared } = ai
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const refresh = useCallback(async signal => {
    setBusy(true); setError('')
    try { await refreshShared(signal) } catch (err) { if (!signal?.aborted) setError(err.message) }
    finally { if (!signal?.aborted) setBusy(false) }
  }, [refreshShared])
  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => controller.abort() }, [refresh, user?.id])
  const pipeline = health?.pipeline
  const generationVerified = ai.preference === 'browser' || health?.connection?.source !== 'personal' || Boolean(health?.connection?.testedAt)
  return <div className="ai-library">
    <ProviderConnection />
    <div className="card mb-24" data-pulse-target="AI pipeline status"><div className="card-header"><h3><Workflow size={18} /> Agentic RAG pipeline</h3><button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => refresh()}><RefreshCw size={14} /> Check status</button></div>
      <div className="card-body">
        <div className="ai-pipeline-grid">
          <div><h5><Cpu size={12} /> Generation</h5><span className={`badge ${ai.ready && generationVerified ? 'badge-published' : 'badge-draft'}`}>{ai.ready ? ai.preference === 'browser' || health?.connection?.source !== 'personal' ? 'Connected' : generationVerified ? 'Generation verified' : 'Model listed · not tested' : busy ? 'Checking…' : 'Not connected'}</span><p>{ai.preference === 'browser' ? ai.label : health?.model ? `${health.provider} · ${health.model}` : 'Choose on-device AI or a provider above.'}</p><small>{ai.preference === 'browser' ? ai.local.message : health?.message}</small></div>
          <div><h5>Embeddings (free, in-process)</h5><strong>{pipeline?.embeddings.model || 'Checking…'}</strong><p>{pipeline ? modelState(pipeline.embeddings.state) : ''}</p><small>Open model run with ONNX Runtime. No API key and no per-request fee.</small></div>
          <div><h5>Reranker (free, in-process)</h5><strong>{pipeline?.reranker.model || 'Checking…'}</strong><p>{pipeline ? modelState(pipeline.reranker.state) : ''}</p><small>Scores each passage against the question before the Writer sees it.</small></div>
          <div><h5>Vector database</h5><strong>{pipeline?.vectorStore || '—'}</strong><p>{health?.database.message}</p><small>{pipeline?.retrieval}</small></div>
          <div><h5>Document sandbox</h5><strong>{pipeline?.extraction.sandbox || '—'}</strong><p>{pipeline ? `${pipeline.extraction.formats.map(f => f.toUpperCase()).join(', ')} · up to ${Math.round(pipeline.extraction.maxBytes / 1e6)} MB` : ''}</p><small>Type sniffing, archive-bomb checks and page limits run before parsing.</small></div>
        </div>
        <div className="ai-agent-chips" aria-label="Named agents">{Object.entries(AGENT_META).map(([name, meta]) => <span key={name} className="ai-agent-chip" style={{ '--agent-color': meta.color }} title={meta.role}>{name}</span>)}</div>
        <p className="ai-notice">{health?.identity.mode === 'local-workspace' ? 'Local workspace: inference, embeddings and your library stay on this computer.' : user?.authenticated ? 'Documents are private to your verified account.' : 'Preview access searches the public product guide. Sign in to build a private library.'} The library adds evidence to conversation and drafting; it does not limit Pulse to search.</p>
        {error && <p role="alert" className="ai-notice">{error}</p>}
        {health?.checkedAt && <p className="text-sm text-muted">Last checked: {new Date(health.checkedAt).toLocaleString()}</p>}
      </div></div>
    <KnowledgeLibrary canIndex={Boolean(health?.database.ready)} onChange={() => refresh()} />
  </div>
}
