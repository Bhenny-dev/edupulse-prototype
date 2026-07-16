import { defineAgent } from './defineAgent'

// Performance / Scoring Sheet — FLOW_SPEC Phase 5, instructor and student
// sides. Shares zone 'performance' with the Scoring Sheet page. The Dean /
// Associate Dean's monitoring view lives in Monitor, not here.
export default defineAgent({
  id: 'performance',
  zone: 'performance',
  label: 'Performance',
  roles: ['instructor', 'student'],
  greeting: (user) => user?.role === 'student'
    ? "Want to know what to review next, based on your recent scores? I can point you to it, but I won't answer or review assessment items for you."
    : "Want a read on your class, or should I flag anyone below the mastery threshold? Remember — this is visualization only, not the official grading sheet.",
  intents: [
    {
      key: 'review', label: 'What should I review next?', roles: ['student'],
      steps: [
        { title: 'Check your topic mastery', body: 'Anything under 75% is flagged as needing review.' },
        { title: 'Open the lowest one first', body: 'That\'s usually the highest-leverage place to spend study time.' },
        { title: 'Find the related courseware', body: 'Published materials for that topic are one click away in My Courses.' },
      ],
    },
    {
      key: 'flag', label: 'Flag students below threshold', roles: ['instructor'],
      steps: [
        { title: 'Open the Alerts tab', body: 'Set the mastery cutoff — students below it are flagged automatically, no manual refresh needed.' },
        { title: 'Review the flagged list', body: 'Each one shows their current score and section.' },
        { title: 'Decide next steps', body: 'Email, flag for follow-up, or just keep watching.' },
      ],
    },
    {
      key: 'scoring-sheet', label: 'Open my Scoring Sheet', roles: ['instructor'],
      steps: [
        { title: 'Pick the course', body: 'Only your loaded courses appear — the sheet fills in as students answer published assessments.' },
        { title: 'Read Completed / Missed', body: 'Green scores mean completed; red badges mean missed. Opened/unopened tracks materials the same way.' },
        { title: 'Remember the boundary', body: 'This is visualization only — MG/TFG/FG grades stay in the official KCP grading sheet, outside EduPulse.' },
      ],
    },
    {
      key: 'explain', label: 'Explain what I\'m looking at', roles: ['instructor', 'student'],
      steps: [
        { title: 'Overview', body: 'Your top-line numbers for this scope.' },
        { title: 'By Topic', body: 'Mastery broken down per syllabus topic, so you can see exactly where things stand.' },
      ],
    },
  ],
})
