// Authored workflow controls, kept outside the mascot. Only allowlisted UI
// targets/actions are used; model output is never executed as a selector/tool.
export function prepareIntent(agent, intent) {
  const steps = intent.steps.map(step => ({ ...step }))
  if (agent.id === 'syllabus' && ['build', 'walkthrough'].includes(intent.key)) {
    for (const step of steps) {
      if (step.section) step.path = '/syllabus?tab=builder'
      if (step.section === 1) { step.check = 'course'; step.hint = 'Select a course in Section 1 to continue.' }
      if (step.section === 5) { step.check = 'outline'; step.hint = 'Add a learning outcome and topic in the Course Outline to continue.' }
      if (step.section === 6) { step.body = 'Enter requirements, grading rules and policies from your approved institutional reference. These fields are not invented or filled with assumed grading formulas.'; step.tip = 'Ask Pulse to help phrase a policy only after you provide its source.' }
    }
    const save = { title: 'Save your syllabus draft', body: 'Use Save as Drafted below the builder. I will wait for the application to record the draft before marking this task complete. Checking and external approval come afterward.', path: '/syllabus?tab=builder', target: '[data-pulse-action="save-syllabus"]', event: 'syllabus-saved', hint: 'Save as Drafted to complete this walkthrough.' }
    if (intent.key === 'build') steps[steps.length - 1] = save
    else steps.push(save)
  }
  if (agent.id === 'syllabus' && intent.key === 'upload') steps[0].path = '/syllabus?tab=builder'
  if (agent.id === 'courseware' && intent.key === 'generate') {
    steps[0].path = '/courseware?tab=builder'
    steps[1].event = 'courseware-generated'; steps[1].hint = 'Generate a week using the page controls. I will continue when a valid draft has been saved.'
    steps[2].event = 'courseware-checked'; steps[2].hint = 'Read and check a draft in Courseware before continuing.'
    steps[3].body = 'A checked draft is ready for your explicit publication decision. This private workspace does not yet deliver content to enrolled students. Do not interpret the preview visibility control as institutional delivery.'
  }
  if (agent.id === 'performance' && intent.key === 'review') steps[steps.length - 1].path = '/courseware'
  return { ...intent, agentId: agent.id, steps }
}

export function approvalResumeStep(record) {
  return ({ drafted: 0, checked: 1, downloaded_for_approval: 2, approved_uploaded: 4, active: 4 })[record?.status] || 0
}

export function stepReadiness(step, events, guide, records = []) {
  if (!step) return true
  if (guide?.key === 'activate') {
    const record = records.find(item => item.id === guide.recordId && !item.sample && item.status !== 'archived')
    if (!record) return false
    const rank = ['drafted', 'checked', 'downloaded_for_approval', 'approved_uploaded', 'active'].indexOf(record.status)
    const needed = { 'syllabus-checked': 1, 'syllabus-downloaded': 2, 'syllabus-approved-uploaded': 3, 'syllabus-activated': 4 }[step.event]
    return needed ? rank >= needed && (needed < 3 || Boolean(record.approvedFile)) : true
  }
  if (step.requiresInput) {
    // Generated component-tour step: wait for the user's own input in that control.
    const control = step.element
    if (!control?.isConnected) return false
    return control.type === 'checkbox' || control.type === 'radio' ? control.checked : control.type === 'file' ? Boolean(control.files?.length) : Boolean(control.value?.trim())
  }
  if (step.event) return events.has(step.event)
  if (step.check === 'course') return Boolean(document.querySelector('[data-section="1"] select')?.value)
  if (step.check === 'outline') {
    const section = document.querySelector('[data-section="5"]')
    return Array.from(section?.querySelectorAll('tr') || []).some(row => row.querySelector('[placeholder="Learning outcome..."]')?.value.trim() && Array.from(row.querySelectorAll('[placeholder="Topic..."]')).some(input => input.value.trim()))
  }
  return true
}

export function stepTarget(step) {
  // Component tours carry the live element they were generated from.
  if (step?.element) return step.element.isConnected ? step.element : null
  return step?.target ? document.querySelector(step.target) : step?.section ? document.querySelector(`[data-section="${Number(step.section)}"]`) : null
}

export const previewAgents = new Set(['records', 'course-loading', 'performance', 'monitor'])
