import { defineAgent } from './defineAgent'

// Monitor — FLOW_SPEC Phase 5, Dean / Associate Dean view. There is no
// in-system syllabus approval to triage here: the signatory chain (Dean
// review → CAO approval → EVP noting) happens offline on the downloaded
// file. This agent's job is reading the two questions Monitor answers: does
// an approved syllabus exist, and is delivery on schedule?
export default defineAgent({
  id: 'monitor',
  zone: 'monitor',
  label: 'Monitor',
  roles: ['dean', 'associate_dean'],
  greeting: () => "Signed-in monitoring uses authorized records; preview panels use sample data. Want help with syllabus status, delivery or student oversight?",
  intents: [
    {
      key: 'syllabus-status', label: 'Which syllabi still need attention?',
      steps: [
        { title: 'Open Syllabus & Delivery', body: 'Review the displayed example statuses by instructor. Confirm current institutional status with the syllabus owner.' },
        { title: 'Look for "not routed"', body: 'Those are still drafted or checked — they haven\'t even started the offline signatory route yet.' },
        { title: 'Follow up directly', body: 'The approval itself happens outside the system, so a nudge to the instructor is the next step, not an in-app action.' },
      ],
    },
    {
      key: 'delivery', label: 'How is delivery tracking?',
      steps: [
        { title: 'Open Syllabus & Delivery', body: 'Compare saved syllabus stations and released courseware in the combined view. Preview charts illustrate sample records.' },
        { title: 'Check outline-week coverage', body: 'Coverage counts planned teaching weeks with at least one released item. It does not prove every activity is complete or establish lateness without a confirmed schedule.' },
      ],
    },
    {
      key: 'students', label: 'Student oversight summary',
      steps: [
        { title: 'Open Student Oversight', body: 'The grouped student rows are sample data, not a verified EduSuite class list.' },
        { title: 'For scores', body: 'That detail lives in each instructor\'s Scoring Sheet — this view is structure and coverage only.' },
      ],
    },
  ],
})
