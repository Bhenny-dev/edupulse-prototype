import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, useCallback } from 'react'
import { aiRequest, getAiHealth } from '../lib/aiClient'
import { aiPreference, browserAIState, resumeBrowserAI, setAiPreference, stopBrowserAI, subscribeBrowserAI } from '../lib/browserAI'
import { useAuth } from './AuthContext'
import { clearProviderAuthorization, providerAuthorizationReturn, PROVIDER_CALLBACK_PATH } from '../lib/providerOAuth'

const AIContext = createContext(null)
export function AIProvider({ children }) {
  const { user, authLoading } = useAuth()
  const userId = user?.id, role = user?.role
  const local = useSyncExternalStore(subscribeBrowserAI, browserAIState)
  const [health, setHealth] = useState(null), [preference, setPreference] = useState(aiPreference)
  const latestHealth = useRef(0), callbackRequest = useRef(null)
  const [connectionNotice, setConnectionNotice] = useState(''), [connectionRevision, setConnectionRevision] = useState(0)
  const [connectionFailed, setConnectionFailed] = useState(false)
  const clearConnectionNotice = useCallback(() => { setConnectionNotice(''); setConnectionFailed(false) }, [])
  const [callback] = useState(() => providerAuthorizationReturn(new URL(window.location.href)))
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
    if (clean.pathname === PROVIDER_CALLBACK_PATH) clean.pathname = '/'
    window.history.replaceState(window.history.state, '', clean)
    if (authLoading) return
    if (!userId) { setConnectionNotice('Sign in to EduPulse, then reconnect OpenRouter. The provider return could not be linked to an active EduPulse session.'); return }
    window.location.hash = '/settings?tab=ai-provider'
    let alive = true
    if (callback.error || !callback.code || !callback.state) { setConnectionFailed(true); setConnectionNotice('Provider authorization was not completed. Your saved connection is unchanged.'); return }
    callbackRequest.current ||= aiRequest('provider-oauth', 'POST', { operation: 'complete', code: callback.code, state: callback.state })
    void callbackRequest.current.then(async result => {
      if (!alive) return
      clearProviderAuthorization()
      setConnectionFailed(false)
      setAiPreference('server'); stopBrowserAI(); setConnectionRevision(value => value + 1)
      setConnectionNotice(result.warning || 'OpenRouter authorized and saved. Choose an available model below. Usage follows your OpenRouter account limits.')
      await refresh()
    }).catch(err => { if (alive) { setConnectionFailed(true); setConnectionNotice(err.message) } })
    return () => { alive = false }
  }, [callback, userId, authLoading, refresh])
  const usingBrowser = preference === 'browser'
  const ready = usingBrowser ? local.status === 'ready' : Boolean(health?.ready)
  const label = usingBrowser ? local.status === 'loading' ? 'Loading local AI' : ready ? 'On-device AI' : 'Local AI needs attention' : ready ? `${health.provider} · ${health.model}${health.connection?.source === 'personal' && !health.connection.testedAt ? ' · not tested' : ''}` : 'Set up Pulse AI'
  return <AIContext.Provider value={{ health, refresh, local, preference, ready, label, connectionNotice, connectionFailed, clearConnectionNotice, connectionRevision }}>{callback && !userId && connectionNotice && <div role="alert" className="ai-notice">{connectionNotice}</div>}{children}</AIContext.Provider>
}
export const useAI = () => useContext(AIContext)
