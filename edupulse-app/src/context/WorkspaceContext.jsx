import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { aiRequest } from '../lib/aiClient'
import { DEFAULT_SYLLABI, BLOCK_SECTION_REGISTRATIONS } from '../data/mockData'
import { recordAudit } from '../lib/audit'

const WorkspaceContext = createContext(null)
const empty = () => ({ syllabi: [], content: {}, registrations: [] })
const clone = value => JSON.parse(JSON.stringify(value))
function initialJournal(key, owner, preview) {
  try {
    const pending = JSON.parse(sessionStorage.getItem(key) || 'null')
    const saved = pending?.dirty ? pending : JSON.parse(localStorage.getItem(key) || 'null')
    if (Array.isArray(saved?.data?.syllabi) && saved.data.content && typeof saved.data.content === 'object' && Number.isInteger(saved.revision) && saved.revision >= 0) return saved
  } catch { /* Recover usable legacy content below. */ }
  const data = preview ? { syllabi: clone(DEFAULT_SYLLABI).map(s => ({ ...s, sample: true })), content: {}, registrations: clone(BLOCK_SECTION_REGISTRATIONS) } : empty()
  try {
    const legacy = JSON.parse(localStorage.getItem(`edupulse-content-v1-${owner}`) || '{}')
    data.content = Object.fromEntries(Object.entries(legacy).filter(([, item]) => item?.content?.title && ['material', 'activity', 'assessment'].includes(item.type)))
  } catch { /* Empty old cache. */ }
  return { data, revision: 0, dirty: false }
}

export function WorkspaceProvider({ children }) {
  const { user } = useAuth()
  const owner = user?.authenticated ? user.id : 'preview'
  return <WorkspaceSession key={owner} owner={owner} user={user} preview={!user?.authenticated}>{children}</WorkspaceSession>
}
function WorkspaceSession({ children, owner, user, preview }) {
  const key = `edupulse-workspace-v2-${owner}`
  const [journal, setJournal] = useState(() => initialJournal(key, owner, preview))
  const [mode, setMode] = useState(null), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false)
  const [error, setError] = useState(''), [cacheError, setCacheError] = useState(''), [conflict, setConflict] = useState(false), [backedUp, setBackedUp] = useState(false)
  const current = useRef(journal), mounted = useRef(true)
  current.current = journal
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    try { sessionStorage.setItem(key, JSON.stringify(journal)); localStorage.setItem(key, JSON.stringify(journal)); setCacheError('') }
    catch { setCacheError('Device storage is full or unavailable. Export a backup before leaving this page.') }
  }, [key, journal])
  const load = useCallback(async (discard = false, signal) => {
    setLoading(true); setError('')
    try {
      const remote = await aiRequest('workspace', 'GET', undefined, signal)
      if (!mounted.current || signal?.aborted) return
      setMode(remote.mode)
      if (remote.mode === 'preview') { setConflict(false); setJournal(previous => ({ ...previous, dirty: false })); return }
      const local = current.current
      if (!discard && local.dirty && remote.revision !== local.revision) {
        setConflict(true); setError('A newer saved workspace exists. Pending edits remain on this device. Export them before loading the latest copy.'); return
      }
      setConflict(false)
      if (discard || !local.dirty) setJournal({ data: remote.data || local.data, revision: remote.revision, dirty: !remote.data && (local.data.syllabi.length > 0 || Object.keys(local.data.content).length > 0) })
    } catch (err) { if (mounted.current && !signal?.aborted) setError(err.message) }
    finally { if (mounted.current && !signal?.aborted) setLoading(false) }
  }, [])
  useEffect(() => { const controller = new AbortController(); void load(false, controller.signal); return () => controller.abort() }, [load])
  useEffect(() => {
    if (!journal.dirty || loading || saving || conflict || error || !mode) return
    if (mode === 'preview') { setJournal(previous => ({ ...previous, dirty: false })); return }
    const timer = setTimeout(async () => {
      const sent = current.current
      setSaving(true)
      try {
        if (new TextEncoder().encode(JSON.stringify(sent.data)).length > 2_950_000) throw new Error('Workspace is near its 3 MB limit. Export a backup and remove unused approved-file attachments.')
        const saved = await aiRequest('workspace', 'PUT', { revision: sent.revision, data: sent.data })
        void recordAudit(user, 'workspace_save', 'success', `Revision ${saved.revision}`)
        if (mounted.current) setJournal(previous => ({ data: previous.data, revision: saved.revision, dirty: previous.data !== sent.data }))
      } catch (err) { void recordAudit(user, 'workspace_save', 'failure', 'Save failed'); if (mounted.current) { setError(err.message); setConflict(err.status === 409) } }
      finally { if (mounted.current) setSaving(false) }
    }, 500)
    return () => clearTimeout(timer)
  }, [journal, mode, loading, saving, conflict, error, user])
  const update = useCallback(change => {
    setBackedUp(false)
    setJournal(previous => ({ ...previous, data: change(previous.data), dirty: true }))
  }, [])
  const setSyllabi = useCallback(change => update(data => ({ ...data, syllabi: typeof change === 'function' ? change(data.syllabi) : change })), [update])
  const setContent = useCallback(change => update(data => ({ ...data, content: typeof change === 'function' ? change(data.content) : change })), [update])
  const setRegistrations = useCallback(change => update(data => ({ ...data, registrations: typeof change === 'function' ? change(data.registrations) : change })), [update])
  const exportBackup = useCallback(() => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(current.current.data, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = `edupulse-workspace-${new Date().toISOString().slice(0, 10)}.json`; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000); setBackedUp(true)
  }, [])
  return <WorkspaceContext.Provider value={{ ...journal.data, setSyllabi, setContent, setRegistrations, loading, saving, dirty: journal.dirty, mode, error: cacheError || error, conflict, backedUp, exportBackup, retry: () => mode ? setError('') : load(), reload: () => load(true) }}>{children}</WorkspaceContext.Provider>
}
export function useWorkspace() {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error('WorkspaceProvider is required')
  return value
}
export function WorkspaceStatus() {
  const workspace = useWorkspace()
  return <aside className="workspace-status" role="status" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: '8px 24px', fontSize: '0.75rem', borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
    <span>{workspace.loading ? 'Loading saved workspace…' : !workspace.mode ? 'Workspace connection unavailable' : workspace.mode === 'preview' ? 'Preview workspace · saved on this device' : `${workspace.mode === 'cloud' ? 'Account workspace' : 'Local workspace'} · ${workspace.saving ? 'Saving…' : workspace.dirty ? 'Pending save' : 'Saved'}`}</span>
    {workspace.error && <strong role="alert">{workspace.error}</strong>}
    <button className="btn btn-ghost btn-sm" onClick={workspace.exportBackup}>Export backup</button>
    {workspace.error && !workspace.conflict && <button className="btn btn-secondary btn-sm" disabled={workspace.loading || workspace.saving} onClick={workspace.retry}>Retry save</button>}
    {workspace.conflict && <button className="btn btn-secondary btn-sm" disabled={!workspace.backedUp || workspace.saving} onClick={workspace.reload}>Load latest after export</button>}
  </aside>
}
