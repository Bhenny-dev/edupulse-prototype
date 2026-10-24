import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, useCallback } from 'react'
import { aiRequest, getAiHealth } from '../lib/aiClient'
import { aiPreference, browserAIState, resumeBrowserAI, setAiPreference, stopBrowserAI, subscribeBrowserAI } from '../lib/browserAI'
import { useAuth } from './AuthContext'

const AIContext = createContext(null)
export function AIProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id, role = user?.role
  const local = useSyncExternalStore(subscribeBrowserAI, browserAIState)
  const [health, setHealth] = useState(null), [preference, setPreference] = useState(aiPreference)
  const latestHealth = useRef(0), callbackRequest = useRef(null)
  const [connectionNotice, setConnectionNotice] = useState(''), [connectionRevision, setConnectionRevision] = useState(0)
  const [callback] = useState(() => { const url = new URL(window.location.href); return url.searchParams.get('provider_callback') === 'openrouter' ? { code: url.searchParams.get('code'), state: url.searchParams.get('state'), error: url.searchParams.get('error') } : null })
  const refresh = useCallback(async signal => { const sequence = ++latestHealth.current; const status = await getAiHealth(signal); if (!signal?.aborted && sequence === latestHealth.current) setHealth(status); return status }, [])
  useEffect(() => {
    const controller = new AbortController()
    latestHealth.current++
    setHealth(null)
    if (userId) { void refresh(controller.signal).catch(() => {}); void resumeBrowserAI() }
    else stopBrowserAI()
    return () => controller.abort()
  }, [userId, role, refresh])
  useEffect(() => { const update = () => { setPreference(aiPreference()); void refresh().catch(() => {}) }; window.addEventListener('edupulse-ai-change', update); return () => window.removeEventListener('edupulse-ai-change', update) }, [refresh])
  useEffect(() => {
    if (!callback) return
    const clean = new URL(window.location.href)
    for (const name of ['provider_callback', 'code', 'state', 'error', 'error_description']) clean.searchParams.delete(name)
    window.history.replaceState(null, '', clean)
    if (!userId) return
    window.location.hash = '/settings?tab=ai-provider'
    let alive = true
    if (callback.error || !callback.code || !callback.state) { setConnectionNotice('Provider authorization was not completed. Your saved connection is unchanged.'); return }
    callbackRequest.current ||= aiRequest('provider-oauth', 'POST', { operation: 'complete', code: callback.code, state: callback.state })
    void callbackRequest.current.then(async () => {
      if (!alive) return
      setAiPreference('server'); stopBrowserAI(); setConnectionRevision(value => value + 1)
      setConnectionNotice('OpenRouter authorized and saved. Choose an available model below. Usage follows your OpenRouter account limits.')
      await refresh()
    }).catch(err => { if (alive) setConnectionNotice(err.message) })
    return () => { alive = false }
  }, [callback, userId, refresh])
  const usingBrowser = preference === 'browser'
  const ready = usingBrowser ? local.status === 'ready' : Boolean(health?.ready)
  const label = usingBrowser ? local.status === 'loading' ? 'Loading local AI' : ready ? 'On-device AI' : 'Local AI needs attention' : ready ? `${health.provider} · ${health.model}` : 'Set up Pulse AI'
  return <AIContext.Provider value={{ health, refresh, local, preference, ready, label, connectionNotice, connectionRevision }}>{children}</AIContext.Provider>
}
export const useAI = () => useContext(AIContext)
