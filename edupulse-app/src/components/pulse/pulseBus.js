// Lightweight event bus so any page can drive Pulse's expression/dialogue
// without threading context through every merged page. See docs/REQUIREMENTS.md
// FR-GUIDE-07 (thinking state during generation) and FR-GUIDE-08/09/10.
const listeners = new Set()

function emit(event) {
  listeners.forEach(fn => fn(event))
}

export const pulse = {
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
  // Dispatch a form action to the active page (e.g., syllabus builder)
  formAction(action, payload = {}) {
    emit({ type: 'formAction', action, payload })
  },
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
