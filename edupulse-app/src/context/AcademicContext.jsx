import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { useWorkspace } from './WorkspaceContext'
import { aiRequest } from '../lib/aiClient'

const EMPTY_ACADEMIC = { courses: [], publications: [], enrollments: [], attempts: [], accesses: [], institutional: [], faculty: [], events: [], notices: [] }
const AcademicContext = createContext(null)

// Background reads cost a serverless call and a read of every records table, so they are spaced
// out: a visible tab rereads every five minutes, and focus or reconnecting rereads data older than a
// minute. The user's own commands and other tabs' changes still reload at once.
const REFRESH_MS = 300000, RECHECK_MS = 60000

export function AcademicProvider({ children }) {
  const { user } = useAuth()
  // A view switch preserves the surrounding chat, but never reuses another view's records.
  return <AcademicSession key={`${user?.id}:${user?.baseRole || user?.role}:${!!user?.authenticated}`} user={user}>{children}</AcademicSession>
}

function AcademicSession({ children, user }) {
  const workspace = useWorkspace(), workspaceRef = useRef(workspace)
  workspaceRef.current = workspace
  const role = user?.role, enabled = Boolean(user?.authenticated && role !== 'admin')
  const currentRole = useRef(role), alive = useRef(true), request = useRef(null), channel = useRef(null)
  currentRole.current = role
  const timing = useRef({ success: 0, retryAt: 0, failures: 0, invalidation: 0, projected: false, syncing: false })
  const seenRevision = useRef(null)
  const [snapshot, setSnapshot] = useState({ role, data: EMPTY_ACADEMIC, loaded: false })
  const [loading, setLoading] = useState(enabled), [error, setError] = useState('')
  const [online, setOnline] = useState(navigator.onLine !== false)
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.controller.abort() } }, [])

  const load = useCallback((invalidate = false) => {
    if (!enabled || !alive.current || currentRole.current !== role || navigator.onLine === false) return Promise.resolve()
    if (invalidate === true) timing.current.invalidation++
    if (request.current?.role === role) return request.current.promise
    request.current?.controller.abort()
    const controller = new AbortController(), entry = { role, controller, promise: null }
    request.current = entry
    setLoading(true); setError('')
    const valid = () => alive.current && currentRole.current === role && !controller.signal.aborted
    entry.promise = (async () => {
      try {
        let version
        do {
          version = timing.current.invalidation
          const saved = workspaceRef.current
          // Normal saves already run the projection transaction. Reconcile legacy snapshots once,
          // only after their own revision is loaded and no local edit/save/conflict is pending.
          if (!timing.current.projected && role === 'instructor' && saved.mode === 'cloud' && !saved.loading && !saved.saving && !saved.dirty && !saved.conflict && !saved.error && saved.syllabi.length) {
            timing.current.syncing = true
            try {
              const result = await aiRequest('academic', 'POST', { operation: 'sync' }, controller.signal)
              if (result?.synced !== true) throw new Error('Workspace synchronization was not confirmed. Your saved work remains available.')
              timing.current.projected = true
            } finally { timing.current.syncing = false }
          }
          const records = await aiRequest('academic', 'GET', undefined, controller.signal)
          if (!valid()) return
          // A mutation arriving during a GET invalidates that response; read the newer projection.
          if (version === timing.current.invalidation) setSnapshot({ role, data: Object.fromEntries(Object.keys(EMPTY_ACADEMIC).map(key => [key, Array.isArray(records[key]) ? records[key] : []])), loaded: true })
        } while (valid() && version !== timing.current.invalidation)
        if (valid()) { timing.current.success = Date.now(); timing.current.failures = 0; timing.current.retryAt = 0 }
      } catch (failure) {
        if (valid()) {
          if ([401, 403].includes(failure.status)) setSnapshot({ role, data: EMPTY_ACADEMIC, loaded: false })
          setError(failure.message)
          timing.current.retryAt = Date.now() + Math.min(300000, 15000 * 2 ** Math.min(timing.current.failures++, 5))
        }
      } finally {
        if (request.current === entry) { request.current = null; if (alive.current) setLoading(false) }
      }
    })()
    return entry.promise
  }, [enabled, role])

  useEffect(() => {
    timing.current.success = timing.current.retryAt = timing.current.failures = 0
    if (enabled) void load(true)
    return () => { request.current?.controller.abort(); request.current = null }
  }, [enabled, load])
  useEffect(() => {
    const revision = `${role}:${workspace.mode}:${workspace.revision}`
    if (enabled && !workspace.loading && !workspace.saving && !workspace.dirty && !workspace.error && !workspace.conflict && seenRevision.current !== revision) { seenRevision.current = revision; void load(true) }
  }, [enabled, load, workspace.loading, workspace.saving, workspace.dirty, workspace.error, workspace.conflict, workspace.revision])

  useEffect(() => {
    if (!enabled) return
    const wake = () => {
      setOnline(navigator.onLine !== false)
      if (navigator.onLine !== false && document.visibilityState === 'visible' && Date.now() >= timing.current.retryAt && Date.now() - timing.current.success >= RECHECK_MS) void load()
    }
    const offline = () => { setOnline(false); request.current?.controller.abort(); request.current = null; setLoading(false) }
    const changed = event => {
      if (event.detail?.operation === 'sync' && timing.current.syncing) return
      if (event.detail?.action === 'workspace') timing.current.projected = true
      channel.current?.postMessage('invalidate') // No records, tokens, names or command payloads cross tabs.
      void load(true)
    }
    if (typeof BroadcastChannel === 'function') {
      try {
        channel.current = new BroadcastChannel(`edupulse-records-${user.id}`)
        channel.current.onmessage = event => { if (event.data === 'invalidate') { timing.current.invalidation++; timing.current.success = 0; wake() } }
      } catch { /* Periodic/focus refresh still works when cross-tab messaging is blocked. */ }
    }
    const timer = setInterval(() => { if (Date.now() - timing.current.success >= REFRESH_MS || timing.current.retryAt) wake() }, 15000)
    window.addEventListener('focus', wake); window.addEventListener('online', wake); window.addEventListener('offline', offline)
    document.addEventListener('visibilitychange', wake); window.addEventListener('edupulse-records-change', changed)
    return () => {
      clearInterval(timer); channel.current?.close(); channel.current = null
      window.removeEventListener('focus', wake); window.removeEventListener('online', wake); window.removeEventListener('offline', offline)
      document.removeEventListener('visibilitychange', wake); window.removeEventListener('edupulse-records-change', changed)
    }
  }, [enabled, load, user?.id])
  const command = useCallback(async input => {
    // Business commands are sent once. Only their authorized readback is automatic.
    const result = await aiRequest('academic', 'POST', input)
    if (alive.current && currentRole.current === role) await load()
    return result
  }, [load, role])
  const sameView = snapshot.role === role
  return <AcademicContext.Provider value={{ data: sameView ? snapshot.data : EMPTY_ACADEMIC, loading: sameView ? loading : enabled, loaded: sameView && snapshot.loaded, error: sameView ? error : '', online, load, command }}>{children}</AcademicContext.Provider>
}

export function useAcademicRecords() {
  const value = useContext(AcademicContext)
  if (!value) throw new Error('AcademicProvider is required')
  return value
}
