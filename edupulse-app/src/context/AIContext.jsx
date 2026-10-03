import { createContext, useContext, useEffect, useState, useSyncExternalStore, useCallback } from 'react'
import { getAiHealth } from '../lib/aiClient'
import { aiPreference, browserAIState, resumeBrowserAI, stopBrowserAI, subscribeBrowserAI } from '../lib/browserAI'
import { useAuth } from './AuthContext'

const AIContext = createContext(null)
export function AIProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id, role = user?.role
  const local = useSyncExternalStore(subscribeBrowserAI, browserAIState)
  const [health, setHealth] = useState(null), [preference, setPreference] = useState(aiPreference)
  const refresh = useCallback(async signal => { const status = await getAiHealth(signal); if (!signal?.aborted) setHealth(status); return status }, [])
  useEffect(() => {
    const controller = new AbortController()
    setHealth(null)
    if (userId) { void refresh(controller.signal).catch(() => {}); void resumeBrowserAI() }
    else stopBrowserAI()
    return () => controller.abort()
  }, [userId, role, refresh])
  useEffect(() => { const update = () => { setPreference(aiPreference()); void refresh().catch(() => {}) }; window.addEventListener('edupulse-ai-change', update); return () => window.removeEventListener('edupulse-ai-change', update) }, [refresh])
  const usingBrowser = preference === 'browser'
  const ready = usingBrowser ? local.status === 'ready' : Boolean(health?.ready)
  const label = usingBrowser ? local.status === 'loading' ? 'Loading local AI' : ready ? 'On-device AI' : 'Local AI needs attention' : ready ? `${health.provider} · ${health.model}` : 'Set up Pulse AI'
  return <AIContext.Provider value={{ health, refresh, local, preference, ready, label }}>{children}</AIContext.Provider>
}
export const useAI = () => useContext(AIContext)
