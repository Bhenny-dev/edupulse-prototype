import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { useWorkspace } from './WorkspaceContext'
import { aiRequest } from '../lib/aiClient'

const EMPTY_ACADEMIC = { courses: [],assignedCourses:[], publications: [], enrollments: [], attempts: [], accesses: [],reading:[],sessions:[], institutional: [], faculty: [], events: [], notices: [] }
const AcademicContext = createContext(null)

// Load on identity entry and after this tab's confirmed mutations. Focus, timers and
// reconnects preserve the loaded snapshot; other tabs announce updates for manual refresh.

export function AcademicProvider({ children }) {
  const { user,authLoading } = useAuth()
  // A view switch preserves the surrounding chat, but never reuses another view's records.
  return <AcademicSession key={`${user?.accountId || user?.id}:${user?.id}:${user?.role}:${!!user?.authenticated}`} user={user} authLoading={authLoading}>{children}</AcademicSession>
}

function AcademicSession({ children, user,authLoading }) {
  const workspace = useWorkspace()
  const role = user?.role, enabled = Boolean(!authLoading && user?.authenticated && role !== 'admin')
  const currentRole = useRef(role), alive = useRef(true), request = useRef(null), channel = useRef(null)
  currentRole.current = role
  const timing = useRef({ invalidation: 0 })
  const [refreshAvailable,setRefreshAvailable]=useState(false)
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
          // Confirmed workspace saves project records transactionally. Opening or
          // restoring a view must only read them, never replay a projection write.
          const records = await aiRequest('academic', 'GET', undefined, controller.signal)
          if (!valid()) return
          // A mutation arriving during a GET invalidates that response; read the newer projection.
          if (version === timing.current.invalidation) {setSnapshot({ role, data: Object.fromEntries(Object.keys(EMPTY_ACADEMIC).map(key => [key, Array.isArray(records[key]) ? records[key] : []])), loaded: true });setRefreshAvailable(false)}
        } while (valid() && version !== timing.current.invalidation)
      } catch (failure) {
        if (valid()) {
          if ([401, 403].includes(failure.status)) setSnapshot({ role, data: EMPTY_ACADEMIC, loaded: false })
          setError(failure.message)
        }
      } finally {
        if (request.current === entry) { request.current = null; if (alive.current) setLoading(false) }
      }
    })()
    return entry.promise
  }, [enabled, role])

  useEffect(() => {
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
    }
    const offline = () => { setOnline(false); request.current?.controller.abort(); request.current = null; setLoading(false) }
    const changed = () => {
      channel.current?.postMessage('invalidate') // No records, tokens, names or command payloads cross tabs.
      void load(true)
    }
    if (typeof BroadcastChannel === 'function') {
      try {
        channel.current = new BroadcastChannel(`edupulse-records-${user.id}`)
        channel.current.onmessage = event => { if (event.data === 'invalidate') setRefreshAvailable(true) }
      } catch { /* Manual refresh remains available without cross-tab messaging. */ }
    }
    window.addEventListener('online', wake); window.addEventListener('offline', offline)
    window.addEventListener('edupulse-records-change', changed)
    return () => {
      channel.current?.close(); channel.current = null
      window.removeEventListener('online', wake); window.removeEventListener('offline', offline)
      window.removeEventListener('edupulse-records-change', changed)
    }
  }, [enabled, load, user?.id])
  const command = useCallback(async input => {
    // Business commands are sent once. Only their authorized readback is automatic.
    const result = await aiRequest('academic', 'POST', input)
    if (alive.current && currentRole.current === role) await load()
    return result
  }, [load, role])
  const sameView = snapshot.role === role
  return <AcademicContext.Provider value={{ data: sameView ? snapshot.data : EMPTY_ACADEMIC, loading: sameView ? loading : enabled, loaded: sameView && snapshot.loaded, error: sameView ? error : '', online, refreshAvailable, load, command }}>{children}</AcademicContext.Provider>
}

export function useAcademicRecords() {
  const value = useContext(AcademicContext)
  if (!value) throw new Error('AcademicProvider is required')
  return value
}
