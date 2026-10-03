import { defineAgent } from './defineAgent'

// Course Loading — FLOW_SPEC Phase 1. AI has two modes: Assist (ranked
// suggestions per course) and Auto (propose the whole assignment in place).
// Either way, the Dean / Associate Dean confirms every assignment — AI never
// finalizes loading.
export default defineAgent({
  id: 'course-loading',
  zone: 'course-loading',
  label: 'Course Loading',
  roles: ['admin'],
  greeting: () => "Course loading currently uses sample assignments. Want to inspect the example load or instructor cards?",
  intents: [
    {
      key: 'assist', label: 'Suggest a candidate for one course',
      steps: [
        { title: 'Find the course row', body: 'Review the displayed sample suggestion. It is not a live AI recommendation from institutional records.' },
        { title: 'Check the reasoning', body: 'Priority 1 is a master\'s degree holder; priority 2 is specialization or forte in the course.' },
        { title: 'Try the preview control', body: 'A choice here changes the prototype view only. Confirm official assignments in the institution’s course-loading process.' },
      ],
    },
    {
      key: 'auto', label: 'Propose the whole load at once',
      steps: [
        { title: 'Preview Auto-Propose', body: 'The current control demonstrates proposed assignments with sample data; it does not run connected inference or write official course loads.' },
        { title: 'Review each proposal', body: 'Proposed rows are highlighted until you act on them — nothing is final yet.' },
        { title: 'Review the prototype result', body: 'Confirming a proposal changes the preview state only. Check the institution’s system of record for actual assignments.' },
      ],
    },
    {
      key: 'workload', label: 'Who\'s carrying what?',
      steps: [
        { title: 'Open the Instructors tab', body: 'Each card shows master\'s-degree status, specialization, and current course count.' },
        { title: 'Click a card', body: 'See every course loaded to that instructor and its syllabus station.' },
      ],
    },
  ],
})
