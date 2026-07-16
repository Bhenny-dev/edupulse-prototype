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
  greeting: () => "Want a read on which syllabi still need routing, how delivery is tracking against the outline, or a student-oversight summary?",
  intents: [
    {
      key: 'syllabus-status', label: 'Which syllabi still need attention?',
      steps: [
        { title: 'Open Syllabus Status', body: 'Every loaded course, grouped by instructor, with its current station — drafted, checked, out for approval, approved, or active.' },
        { title: 'Look for "not routed"', body: 'Those are still drafted or checked — they haven\'t even started the offline signatory route yet.' },
        { title: 'Follow up directly', body: 'The approval itself happens outside the system, so a nudge to the instructor is the next step, not an in-app action.' },
      ],
    },
    {
      key: 'delivery', label: 'How is delivery tracking?',
      steps: [
        { title: 'Open Delivery Progress', body: 'Published courseware against each active course\'s outline weeks — are materials and assessments going out on schedule?' },
        { title: 'Check outline-week coverage', body: 'A course with 5 of 18 weeks covered partway through the term is falling behind, at a glance.' },
      ],
    },
    {
      key: 'students', label: 'Student oversight summary',
      steps: [
        { title: 'Open Student Oversight', body: 'Students within the courses each instructor handles, grouped by block, straight from the EduSuite roster.' },
        { title: 'For scores', body: 'That detail lives in each instructor\'s Scoring Sheet — this view is structure and coverage only.' },
      ],
    },
  ],
})
