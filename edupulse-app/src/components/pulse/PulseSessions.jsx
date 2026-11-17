import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, SquarePen } from 'lucide-react'
import { sessionAge } from './sessionAge'

/** Session dropdown: search and reopen a saved Pulse conversation, or start a new one. */
export default function PulseSessions({ archive, disabled, onOpen, onNew, onClose }) {
  const [query, setQuery] = useState(''), [error, setError] = useState(''), [opening, setOpening] = useState('')
  const search = useRef(null)
  useEffect(() => { search.current?.focus() }, [])
  const threads = useMemo(() => {
    const wanted = query.trim().toLowerCase()
    return archive.threads.filter(thread => !wanted || thread.title.toLowerCase().includes(wanted))
  }, [archive.threads, query])
  const open = async id => {
    if (opening || disabled) return
    setOpening(id); setError('')
    try { await onOpen(id) } catch (failure) { setError(failure.message) } finally { setOpening('') }
  }
  return <div className="pulse-popover pulse-sessions" data-pulse-popover="sessions" role="dialog" aria-label="Conversation history">
    <label className="pulse-popover-search"><Search size={14} aria-hidden="true" /><input ref={search} type="search" value={query} placeholder="Search recent chats" aria-label="Search recent chats" onChange={event => setQuery(event.target.value)} /></label>
    <button type="button" className="pulse-popover-item" disabled={disabled} onClick={onNew}><SquarePen size={14} aria-hidden="true" /><span>New chat</span></button>
    {archive.loading && <p className="pulse-popover-note" role="status">Loading conversations...</p>}
    {!archive.loading && archive.mode === 'session' && <p className="pulse-popover-note">Sign in to keep conversations between visits.</p>}
    {!archive.loading && archive.mode !== 'session' && !threads.length && <p className="pulse-popover-note">{query.trim() ? 'No conversation matches that search.' : 'No saved conversations yet.'}</p>}
    {threads.length > 0 && <ul aria-label="Recent chats">{threads.map(thread => <li key={thread.id}>
      <button type="button" className="pulse-popover-item pulse-session" aria-current={thread.id === archive.threadId ? 'true' : undefined} disabled={disabled || Boolean(opening)} onClick={() => thread.id === archive.threadId ? onClose() : void open(thread.id)}>
        <span className="pulse-session-title">{thread.title}</span>
        {thread.archived && <span className="pulse-session-tag">Archived</span>}
        <time dateTime={thread.updated_at} title={new Date(thread.updated_at).toLocaleString()}>{opening === thread.id ? 'Opening...' : sessionAge(thread.updated_at)}</time>
      </button>
    </li>)}</ul>}
    {error && <p className="pulse-popover-note" role="alert">{error}</p>}
  </div>
}
