// Lightweight event bus so any page can drive Pulse's expression/dialogue
// without threading context through every merged page. See docs/REQUIREMENTS.md
// FR-GUIDE-07 (thinking state during generation) and FR-GUIDE-08/09/10.
const listeners = new Set()

function emit(event) {
  listeners.forEach(fn => fn(event))
}

export const pulse = {
  progress(name, detail = '') { emit({ type: 'progress', name, detail }) },
  // expression: 'idle' | 'curious' | 'thinking' | 'encouraging' | 'cheerful' | 'concern'
  expression(name) {
    emit({ type: 'expression', expression: name })
  },
  // Open the dialogue bubble with a message, optionally with quick-reply actions.
  say(message, options = {}) {
    emit({ type: 'say', message, actions: options.actions || [], expression: options.expression })
  },
  celebrate(message) {
    emit({ type: 'say', message, expression: 'cheerful' })
  },
  // Open Pulse and send a request, optionally scoped to library documents or a task
  // (e.g. Compare from the knowledge library). The user sees and can stop the request.
  ask(message, options = {}) {
    emit({ type: 'ask', message, documentIds: options.documentIds || [], task: options.task || 'auto', label: options.label || '' })
  },
  // Dispatch a form action to the active page (e.g., syllabus builder)
  formAction(action, payload = {}) {
    emit({ type: 'formAction', action, payload })
  },
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
