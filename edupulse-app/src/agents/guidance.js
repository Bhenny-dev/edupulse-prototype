// Authored workflow controls, kept outside the mascot. Only allowlisted UI
// targets/actions are used; model output is never executed as a selector/tool.
export function prepareIntent(agent, intent, user = null) {
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
    steps[3].body = user?.authenticated ? 'Set delivery dates and assessment rules, save, review and check the draft, then explicitly publish. Enrolled students can open it after release; a future release remains hidden.' : 'Review and check the draft before publication. Preview changes stay on this device; they do not deliver material to real students.'
  }
  if (agent.id === 'performance' && intent.key === 'review') steps[steps.length - 1].path = '/courseware'
  const account = user?.authenticated && accountSteps(agent.id, intent.key, user.role)
  return { ...intent, agentId: agent.id, steps: account || steps }
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

// Account guidance describes the persisted workflow; preview guidance retains its sample disclosure.
export function accountGreeting(agent, user) {
  if (!user?.authenticated) return agent?.greeting(user)
  return ({ records: 'Review official EduSuite CSV exports, then confirm shared course, load and roster imports.', 'course-loading': 'Review saved loads and provisioned instructor qualifications, preview proposals, then confirm any assignment change.', monitor: 'Review saved syllabus stations, outline coverage and confirmed rosters. Signatures remain offline.', performance: 'Review authorized saved assessment results and mapped topic mastery. Official institutional grades stay in EduSuite.', courseware: user.role === 'student' ? 'Open released materials for your enrolled courses and review your saved responses. Pulse does not provide assessment answers.' : 'Generate from an active syllabus, review drafts and choose when to publish them to enrolled students.' })[agent?.id] || agent?.greeting(user)
}
function accountSteps(agent, intent, role) {
  const step = (title, body, path) => ({ title, body, ...(path ? { path } : {}) })
  if (agent === 'records' && intent === 'import') return [step('Choose the export type', 'Import Course Records first, then Course Loads, then Student Class Lists. Download the matching CSV template.', '/records?tab=import'), step('Preview the parsed rows', 'Review valid and rejected rows. Loads need an imported course and a provisioned instructor; rosters match by block and verified student email.'), step('Confirm the shared import', 'Confirm Import saves shared records and matching enrollments. Review the saved receipt and History. EduPulse does not write back to EduSuite.')]
  if (agent === 'course-loading') return [step('Open instructor loading', 'Inspect imported courses, confirmed loads and recorded qualifications. Missing qualifications stay explicit.', '/course-loading?tab=instructors'), step(intent === 'auto' ? 'Propose the semester load' : intent === 'assist' ? 'Preview a candidate' : 'Inspect saved loads', intent === 'auto' ? 'Enter block and semester, then Auto-propose semester loads. Review every proposed instructor.' : intent === 'assist' ? 'Choose course and block, then Suggest highest-priority instructor. Recorded master\'s degree ranks before specialization match.' : 'The qualifications table shows current load counts; expand instructor delivery to inspect course readiness.'), step('Review before confirming', 'Override proposals as needed. Confirm proposed loads only after checking them; the saved receipt verifies the shared update. Official institutional assignments remain in EduSuite.')]
  if (agent === 'monitor') return [step('Review the selected oversight view', intent === 'students' ? 'Read confirmed block rosters and course coverage.' : intent === 'delivery' ? 'Compare published teaching weeks with the saved approved outline. Coverage alone does not prove every activity was delivered or that a course is late.' : 'Read saved syllabus stations and expand the course details.', '/monitor?tab=' + (intent === 'students' ? 'students' : intent === 'delivery' ? 'delivery' : 'syllabi')), step('Follow up within your role', role === 'dean' ? 'Use Review Inbox to inspect the outline and send a saved correction request. Dean review, CAO approval and EVP noting remain offline; College Performance is read-only.' : 'Review delivery and rosters, then contact the syllabus owner when correction is needed. Associate Dean has no student-score access.')]
  if (agent === 'performance') return [step('Choose the scope', 'Filter the authorized course, block and date range. Missing attempts are distinct from a zero score.', intent === 'scoring-sheet' ? '/student-monitoring' : '/performance?tab=' + (intent === 'flag' ? 'alerts' : intent === 'review' ? 'bytopic' : 'overview')), step('Read saved evidence', 'Topic mastery uses graded responses explicitly mapped to approved syllabus topics. Pending marking and unmapped responses do not become guessed mastery scores.'), step('Choose a follow-up', role === 'student' ? 'Open related released material in My Courses, or submit an appeal on your own saved assessment.' : role === 'dean' ? 'Review the read-only results and contact the instructor. The Dean cannot change marks.' : 'Review responses and reasons before confirming marks. Confirm reminders for missing work or acknowledge topic alerts. Notices are in-app; no email is sent.')]
  if (agent === 'courseware' && intent === 'explain') return [step('Open released courseware', 'The account view shows publications for confirmed enrollment. Scheduled items remain hidden until release.'), step('Review a saved result', 'Assessments use the instructor\'s saved duration, deadline and attempt policy. Written responses await marking. Pulse cannot answer assessment questions.')]
  return null
}
