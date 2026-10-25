import { useCallback, useEffect, useRef, useState } from 'react'
import { aiRequest } from '../../lib/aiClient'

const archivedMessage = message => ({
  id: message.id, role: message.from === 'user' ? 'user' : 'assistant',
  text: (message.text || message.proposals?.map(proposal => proposal.text || `${proposal.type}: ${proposal.label || proposal.courseCode || proposal.attachment?.fileName || 'reviewable proposal'}`).join('\n') || '').slice(0, 20000),
  attachments: (message.attachedNames || message.fileNames || []).slice(0, 3),
  kind: message.mode === 'actions' ? 'action' : message.mode === 'receipt' ? 'receipt' : 'chat',
})
/** Archive text and file names only. Restored action cards cannot replay mutations. */
export default function usePulseArchive(user, messages, setMessages) {
  const userKey = user?.id ?? null
  const [state, setState] = useState({ threads: [], memories: [], automaticMemory: true, mode: 'session', loading: false, saving: false, error: '' })
  const [threadId, setThreadId] = useState(null), [revision, setRevision] = useState(0)
  const current = useRef({ messages }), active = useRef(null), saved = useRef(new Set()), owner = useRef(0), created = useRef(false), saving = useRef(false)
  current.current = { messages }
  const refresh = useCallback(async () => {
    if (!userKey) return
    const version = owner.current
    const result = await aiRequest('conversations')
    if (version === owner.current) setState(previous => ({ ...previous, ...result, error: '' }))
    return result
  }, [userKey])
  useEffect(() => {
    const version = ++owner.current, controller = new AbortController()
    active.current = null; created.current = false; saved.current = new Set(); saving.current = false; setThreadId(null)
    setState({ threads: [], memories: [], automaticMemory: true, mode: 'session', loading: Boolean(userKey), saving: false, error: '' })
    if (userKey) void aiRequest('conversations', 'GET', undefined, controller.signal).then(result => {
      if (version === owner.current) setState(previous => ({ ...previous, ...result, loading: false }))
    }).catch(error => { if (version === owner.current && !controller.signal.aborted) setState(previous => ({ ...previous, error: error.message, loading: false })) })
    return () => { owner.current = version + 1; controller.abort() }
  }, [userKey])
  useEffect(() => {
    if (!userKey || state.loading || state.error || !messages.length || saving.current) return
    const version = owner.current
    const timer = setTimeout(async () => {
      const pending = []
      let bytes = 0
      for (const message of current.current.messages.map(archivedMessage).filter(message => message.text && !saved.current.has(message.id))) {
        const size = new TextEncoder().encode(JSON.stringify(message)).length
        if (pending.length >= 20 || bytes + size > 180000) break
        pending.push(message); bytes += size
      }
      if (!pending.length || saving.current) return
      saving.current = true; setState(previous => ({ ...previous, saving: true }))
      try {
        if (!active.current) { active.current = crypto.randomUUID(); setThreadId(active.current) }
        const id = active.current
        if (!created.current) {
          await aiRequest('conversations', 'POST', { operation: 'create', id, title: pending.find(message => message.role === 'user')?.text.slice(0, 160) || 'Pulse conversation' })
          if (version !== owner.current) return
          created.current = true
        }
        await aiRequest('conversations', 'POST', { operation: 'append', id, messages: pending })
        if (version !== owner.current) return
        pending.forEach(message => saved.current.add(message.id))
        await refresh()
      } catch (error) { if (version === owner.current) {
        if (error.code === 'CONVERSATION_FULL') { active.current = null; created.current = false; setThreadId(null) }
        else setState(previous => ({ ...previous, error: error.message }))
      } }
      finally { if (version === owner.current) { saving.current = false; setState(previous => ({ ...previous, saving: false })); setRevision(value => value + 1) } }
    }, 350)
    return () => clearTimeout(timer)
  }, [messages, userKey, state.loading, state.error, refresh, revision])
  const hasUnsaved = () => current.current.messages.some(message => archivedMessage(message).text && !saved.current.has(message.id))
  const openThread = async id => {
    if (saving.current || hasUnsaved()) throw new Error('Wait for this conversation to finish saving.')
    const version = owner.current, result = await aiRequest('conversations', 'GET', undefined, undefined, { query: { id } })
    if (version !== owner.current) return
    active.current = id; created.current = true; saved.current = new Set(result.messages.map(message => message.id)); setThreadId(id)
    setMessages(result.messages.map(message => ({ id: message.id, from: message.role === 'user' ? 'user' : 'pulse', text: message.text, mode: 'archived', attachedNames: message.attachments })))
    setState(previous => ({ ...previous, ...result, error: '' }))
  }
  const newThread = () => {
    if (saving.current || state.error || hasUnsaved()) throw new Error('Save or retry this conversation before starting a new one.')
    active.current = null; created.current = false; saved.current = new Set(); setThreadId(null); setMessages([])
  }
  const command = async input => { await aiRequest('conversations', 'POST', input); await refresh() }
  const deleteThread = async id => { if (active.current === id && (saving.current || hasUnsaved())) throw new Error('Wait for this conversation to finish saving before deleting it.'); await command({ operation: 'delete', id }); if (active.current === id) { active.current = null; created.current = false; saved.current = new Set(); setThreadId(null); setMessages([]) } }
  return { ...state, threadId, unsaved: hasUnsaved(), refresh, openThread, newThread, deleteThread, command, retry: () => { setState(previous => ({ ...previous, error: '' })); setRevision(value => value + 1) } }
}
