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
  greeting: () => "Want AI to suggest candidates for a course, propose the whole load in one pass, or a read on who's carrying what?",
  intents: [
    {
      key: 'assist', label: 'Suggest a candidate for one course',
      steps: [
        { title: 'Find the course row', body: 'Each row already shows an AI suggestion, ranked by the loading rule.' },
        { title: 'Check the reasoning', body: 'Priority 1 is a master\'s degree holder; priority 2 is specialization or forte in the course.' },
        { title: 'Assign and confirm', body: 'Pick from the dropdown — your choice becomes the confirmed assignment immediately.' },
      ],
    },
    {
      key: 'auto', label: 'Propose the whole load at once',
      steps: [
        { title: 'Run AI Auto-Propose', body: 'Every unassigned course gets a suggested instructor, ranked by the same rule.' },
        { title: 'Review each proposal', body: 'Proposed rows are highlighted until you act on them — nothing is final yet.' },
        { title: 'Confirm one by one, or all at once', body: '"Confirm All Proposals" accepts every pending suggestion; you can still reject and reassign any individual row first.' },
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
