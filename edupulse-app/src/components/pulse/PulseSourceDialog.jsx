import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { aiRequest } from '../../lib/aiClient'
import ModalLayer from '../ui/ModalLayer'
import { LoadingStatus } from '../ui/LoadingFeedback'
import CoursewareText from '../courseware/CoursewareText'

import { sourceDestination } from '../../lib/systemChatPolicy'

/** Navigation references survive reload; source text and access decisions are fetched afresh. */
export default function PulseSourceDialog({ reference, messages, role, onClose }) {
  const latestMessages = useRef(messages); latestMessages.current = messages
  const [state, setState] = useState({ loading: true, source: null, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    setState({ loading: true, source: null, error: '' })
    void (async () => {
      let thread = latestMessages.current.map(message => ({ id: message.id, role: message.from === 'user' ? 'user' : 'assistant', text: message.text }))
      if (!thread.some(message => message.id === reference.messageId) && reference.threadId) thread = (await aiRequest('conversations', 'GET', undefined, controller.signal, { query: { id: reference.threadId } })).messages
      const index = thread.findIndex(message => message.id === reference.messageId)
      const preceding = index >= 0 ? thread.slice(0, index) : []
      const question = preceding.findLast(message => message.role === 'user')
      if (!question) throw new Error('This source cannot be restored from the saved conversation. Ask the question again to search your current records.')
      const answer = await aiRequest('system-chat', 'POST', { message: question.text.slice(0, 4000), viewRole: role, grounding: 'auto', task: 'answer', history: preceding.slice(0, -1).slice(-8).map(message => ({ role: message.role, content: message.text.slice(0, 3000) })), allowWeb: false }, controller.signal)
      const source = answer.sources?.find(item => item.id === reference.sourceId)
      if (!source) throw new Error('This source is no longer available in the current authorized search. Ask again or open the course to review its current content.')
      if (!controller.signal.aborted) setState({ loading: false, source, error: '' })
    })().catch(error => { if (!controller.signal.aborted) setState({ loading: false, source: null, error: error.message }) })
    return () => controller.abort()
  }, [reference, role]) // The reference identifies one immutable question; later chat messages do not restart the search.
  const source = state.source, destination = sourceDestination(source?.destination)
  return <ModalLayer onDismiss={onClose}><section className="modal-content pulse-source-dialog" role="dialog" aria-modal="true" aria-label="System source reference">
    <div className="modal-header"><h2>Source reference</h2><button className="modal-close" aria-label="Close source reference" onClick={onClose}>×</button></div>
    {state.loading && <LoadingStatus label="Checking the current source..." />}
    {state.error && <p role="alert">{state.error}</p>}
    {source && <><h3>{source.title}</h3><p className="text-sm text-muted">Current accessible source · {source.page ? `Page ${source.page}` : source.section || 'EduPulse records'}</p><blockquote><CoursewareText>{source.text}</CoursewareText></blockquote><p className="text-sm text-muted">Review this source before opening its page. The page verifies your current access again.</p>{destination && <Link className="btn btn-primary" to={destination.path} onClick={onClose}>{destination.label}</Link>}</>}
  </section></ModalLayer>
}
