import { AGENTS, getAgentForZone } from '../../agents'

// Reads the real component under Pulse. Pure DOM helpers shared by the drag
// interaction, the focused-help panel and walkthrough generation.
const TARGETS = '[data-pulse-target], [data-section], .form-group, .card, button, input, select, textarea, [role="tab"], table, a[href]'
const CONTROLS = 'input:not([type="hidden"]), select, textarea, button, [role="tab"], a[href]'
const clean = text => (text || '').replace(/\s+/g, ' ').trim()
/** Fields whose values Pulse never reads: credentials, contact details, payment data and explicit opt-outs. */
export function isSensitive(element) {
  if (!(element instanceof HTMLElement)) return false
  const auto = element.getAttribute('autocomplete') || ''
  return element.closest('[data-pulse-private]') !== null || (element instanceof HTMLInputElement && ['password', 'email', 'tel'].includes(element.type)) || /^(cc-|current-password|new-password|one-time-code)/.test(auto)
}
const visible = element => { const r = element.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(element).visibility !== 'hidden' }

function labelOf(element) {
  if (!element) return ''
  const by = element.getAttribute('aria-labelledby')?.split(/\s+/).map(id => document.getElementById(id)?.textContent).join(' ')
  // A trailing "*" is the visual required marker, not part of the name (required state is read separately).
  return clean(element.getAttribute('data-pulse-target') || element.getAttribute('aria-label') || by || element.labels?.[0]?.textContent || element.querySelector?.(':scope > legend, :scope > label, h2, h3, h4, label')?.textContent || (element.matches('input, select, textarea') ? element.closest('.form-group')?.querySelector(':scope > label, :scope > .form-label')?.textContent : '') || element.getAttribute('placeholder') || element.getAttribute('title') || (element.matches('button, a, [role="tab"]') ? element.textContent : '')).replace(/\s*\*$/, '').slice(0, 140)
}

function kindOf(element) {
  if (element.matches('[data-section]')) return 'syllabus section'
  if (element instanceof HTMLSelectElement) return 'dropdown'
  if (element instanceof HTMLTextAreaElement) return 'text area'
  if (element instanceof HTMLInputElement) return ({ checkbox: 'checkbox', radio: 'option', file: 'file upload', number: 'number field', date: 'date field', search: 'search field', range: 'slider' })[element.type] || 'text field'
  if (element.matches('button')) return 'button'
  if (element.matches('a[href]')) return 'link'
  if (element.matches('[role="tab"]')) return 'tab'
  if (element.matches('table')) return 'table'
  if (element.matches('.form-group')) return 'form field'
  if (element.matches('.card')) return 'card'
  return 'page area'
}

/**
 * Describes the real element under Pulse: kind, label, state, constraints and
 * on-page help text. Accurate by construction, because it reads the DOM.
 */
export function componentBrief(element) {
  const control = element.matches(CONTROLS) ? element : element.matches('.form-group') ? element.querySelector(CONTROLS) : null
  const subject = control || element, kind = control && element.matches('.form-group') ? kindOf(control) : kindOf(element)
  const hints = new Set()
  for (const id of (subject.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean)) hints.add(clean(document.getElementById(id)?.textContent))
  for (const small of element.querySelectorAll(':scope > small, :scope > .form-hint, :scope > p.text-muted')) hints.add(clean(small.textContent))
  if (subject.title && subject.title !== labelOf(subject)) hints.add(clean(subject.title))
  if (subject.maxLength > 0 && subject.maxLength < 100000) hints.add(`Up to ${subject.maxLength.toLocaleString()} characters.`)
  if (subject.getAttribute?.('accept')) hints.add(`Accepts ${subject.getAttribute('accept').replace(/,/g, ', ')}.`)
  if (subject.min || subject.max) hints.add(`Allowed range: ${subject.min || '…'} to ${subject.max || '…'}.`)
  const sensitive = isSensitive(subject)
  let state = '', value = ''
  if (subject instanceof HTMLSelectElement) { const option = subject.selectedOptions[0]; state = subject.value ? `Selected: ${clean(option?.textContent)}` : 'Nothing selected yet'; value = subject.value ? clean(option?.textContent) : '' }
  else if (subject instanceof HTMLInputElement && ['checkbox', 'radio'].includes(subject.type)) state = subject.checked ? 'Checked' : 'Not checked'
  else if (subject instanceof HTMLInputElement && subject.type === 'file') state = subject.files?.length ? `${subject.files.length} file(s) chosen` : 'No file chosen'
  else if (subject instanceof HTMLInputElement || subject instanceof HTMLTextAreaElement) { state = subject.value.trim() ? (sensitive ? 'Filled (value not read)' : 'Filled') : 'Empty'; value = sensitive ? '' : subject.value.trim().slice(0, 300) }
  else if (subject.matches('table')) { const rows = subject.querySelectorAll('tbody tr').length; const headers = [...subject.querySelectorAll('thead th')].map(th => clean(th.textContent)).filter(Boolean).slice(0, 6); state = `${rows} row${rows === 1 ? '' : 's'}${headers.length ? ` · columns: ${headers.join(', ')}` : ''}` }
  else if (subject.matches('button, [role="tab"]')) state = subject.disabled || subject.getAttribute('aria-disabled') === 'true' ? 'Unavailable right now' : subject.getAttribute('aria-selected') === 'true' ? 'Selected tab' : 'Available'
  else {
    const fields = [...element.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea')].filter(visible)
    const filled = fields.filter(f => f.value?.trim()).length
    state = fields.length ? `${filled} of ${fields.length} fields filled` : `${element.querySelectorAll(CONTROLS).length} controls`
  }
  return {
    kind, label: labelOf(element) || labelOf(subject) || kind, state, value, sensitive,
    required: Boolean(subject.required || subject.getAttribute?.('aria-required') === 'true' || /\*\s*$/.test(subject.labels?.[0]?.textContent || element.querySelector?.(':scope > label')?.textContent || '')), disabled: Boolean(subject.disabled),
    hints: [...hints].filter(Boolean).slice(0, 4),
  }
}

export const briefText = brief => [`${brief.label} (${brief.kind})`, brief.state, brief.required ? 'required' : '', brief.disabled ? 'disabled' : '', brief.value ? `current value: “${brief.value}”` : '', ...brief.hints].filter(Boolean).join('; ')

const FIELD_KINDS = ['text field', 'dropdown', 'text area', 'number field', 'date field', 'search field', 'checkbox', 'option', 'file upload', 'slider', 'form field']
/** One plain sentence naming what the component is, read from its accessible label. */
export function describeSentence(brief) {
  const noun = FIELD_KINDS.includes(brief.kind) ? 'field' : ['button', 'link', 'tab', 'table'].includes(brief.kind) ? brief.kind : 'section'
  return `This ${noun} is ${['table', 'section'].includes(noun) ? 'titled' : 'labeled'} ${brief.label}.`
}

/** Brief of one control, using its form group (label, notes, required marker) when it has one. */
const controlBrief = control => {
  const group = control.closest('.form-group')
  return componentBrief(group && group.querySelector(CONTROLS) === control ? group : control)
}
const stepText = brief => `${brief.kind[0].toUpperCase()}${brief.kind.slice(1)} · ${brief.state}${brief.required ? ' · required' : ''}${brief.disabled ? ' · currently unavailable' : ''}.${brief.hints.length ? ` ${brief.hints.join(' ')}` : ''}`
/** Current description of a tour step's control, so auto-filled or edited values never show stale state. */
export const liveStepBody = step => step?.element?.isConnected ? stepText(controlBrief(step.element)) : step?.body

/**
 * Walkthrough of the visible, labelled controls a component contains. A single
 * field is toured together with the section, card or form around it.
 */
export function componentTour(element) {
  const scope = element.matches(CONTROLS) || element.matches('.form-group') ? element.closest('[data-section], .card, form, fieldset, [data-pulse-target]:not(input):not(select):not(textarea):not(button)') || element.closest('[data-pulse-zone], #main-content') : element
  if (!scope) return []
  const seen = new Set()
  return [...scope.querySelectorAll(CONTROLS)].filter(control => visible(control) && !control.closest('[data-pulse-ui]') && labelOf(control)).filter(control => { const key = labelOf(control); if (seen.has(key)) return false; seen.add(key); return true }).slice(0, 12).map(control => {
    const brief = controlBrief(control)
    // A required field that is still empty must be filled before the tour continues.
    const waits = brief.required && !brief.disabled && /^(Empty|Nothing selected yet|No file chosen|Not checked)$/.test(brief.state)
    return { title: brief.label, body: stepText(brief), element: control, ...(waits ? { requiresInput: true, hint: `Fill in ${brief.label} to continue.` } : {}) }
  })
}

/** Resolves what Pulse was dropped on, or why it cannot help there. */
export function describeDrop(element, role) {
  if (!(element instanceof Element) || element.closest('[data-pulse-ui]')) return { reason: 'self' }
  const zoneElement = element.closest('[data-pulse-zone]') || element.closest('#main-content')
  if (!zoneElement) return { reason: 'outside' }
  const zone = zoneElement.getAttribute('data-pulse-zone') || 'general'
  const agent = getAgentForZone(zone, role)
  if (!agent) return { reason: 'role', area: AGENTS.find(a => a.zone === zone)?.label || 'this area' }
  const target = element.closest(TARGETS) || zoneElement
  if (target instanceof HTMLInputElement && target.type === 'password') return { reason: 'sensitive' }
  const brief = componentBrief(target)
  return { target: { element: target, zoneElement, agent, label: brief.label.slice(0, 140), brief, section: target.closest('[data-section]')?.getAttribute('data-section') || null, recordId: element.closest('[data-syllabus-id]')?.getAttribute('data-syllabus-id') || null } }
}
export const describeTarget = (element, role) => describeDrop(element, role).target || null
export const REASONS = {
  outside: 'Drop me on a field, card, table or section inside the page.',
  sensitive: 'I don’t read password fields. Drop me on another part of the form.',
  role: area => `The ${area} guide isn’t available for your role, so I returned to my dock.`,
}
