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
  roles: ['admin'],
  greeting: () => "These monitoring panels use sample data. Want help interpreting a syllabus status, delivery chart, or student overview?",
  intents: [
    {
      key: 'syllabus-status', label: 'Which syllabi still need attention?',
      steps: [
        { title: 'Open Syllabus Status', body: 'Review the displayed example statuses by instructor. Confirm current institutional status with the syllabus owner.' },
        { title: 'Look for "not routed"', body: 'Those are still drafted or checked — they haven\'t even started the offline signatory route yet.' },
        { title: 'Follow up directly', body: 'The approval itself happens outside the system, so a nudge to the instructor is the next step, not an in-app action.' },
      ],
    },
    {
      key: 'delivery', label: 'How is delivery tracking?',
      steps: [
        { title: 'Open Delivery Progress', body: 'This chart illustrates outline-week coverage using sample delivery records; it is not a live course delivery audit.' },
        { title: 'Check outline-week coverage', body: 'A course with 5 of 18 weeks covered partway through the term is falling behind, at a glance.' },
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
