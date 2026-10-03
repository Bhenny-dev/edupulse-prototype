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
    ? "These scores are sample data. Want help interpreting a topic chart or planning what to review?"
    : "This performance view uses sample scores. Want help interpreting a chart or threshold? It is not the official grading sheet.",
  intents: [
    {
      key: 'review', label: 'What should I review next?', roles: ['student'],
      steps: [
        { title: 'Check the example topic chart', body: 'The current 75% threshold is illustrated with sample scores. Use your actual course feedback to choose what to review.' },
        { title: 'Open the lowest one first', body: 'That\'s usually the highest-leverage place to spend study time.' },
        { title: 'Find the related courseware', body: 'Published materials for that topic are one click away in My Courses.' },
      ],
    },
    {
      key: 'flag', label: 'Flag students below threshold', roles: ['instructor'],
      steps: [
        { title: 'Open the Alerts tab', body: 'Try the threshold control on sample scores. It does not flag real students or send a notification.' },
        { title: 'Review the flagged list', body: 'Each one shows their current score and section.' },
        { title: 'Decide next steps', body: 'Verify any concern using official course records before contacting a student. This preview does not send email or create a follow-up record.' },
      ],
    },
    {
      key: 'scoring-sheet', label: 'Open my Scoring Sheet', roles: ['instructor'],
      steps: [
        { title: 'Pick the course', body: 'This sheet currently shows example course and assessment data; it does not sync with live student responses.' },
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
