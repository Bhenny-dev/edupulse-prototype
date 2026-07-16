import { defineAgent } from './defineAgent'

export default defineAgent({
  id: 'courseware',
  zone: 'courseware',
  label: 'Courseware',
  roles: ['instructor', 'admin', 'student'],
  greeting: (user) => user?.role === 'student'
    ? "Looking for something specific here? I can point you to what's newest, or explain how your materials are grounded. I can't answer or review your assessment items, though."
    : user?.role === 'admin'
      ? "This is the college's published courseware. Want a quick read on what's out and what's still pending, per instructor?"
      : "Want me to generate courseware from your extracted Course Outline, help you get through the review queue, or find something in the item bank?",
  intents: [
    {
      key: 'generate', label: 'Generate courseware from my outline', roles: ['instructor'],
      steps: [
        { title: 'Choose scope', body: 'This week, a term (midterm/finals), or the whole Course Outline — only active syllabi (outline extracted) can generate.' },
        { title: 'Generation runs, grounded in your syllabus', body: 'It retrieves your approved syllabus and instructor-provided materials before drafting anything — you\'ll see the stages in plain language.' },
        { title: 'Review the draft', body: 'Every item shows which outline week and content it was grounded in. Edit, finalize, or regenerate just that one item.' },
        { title: 'Publish or schedule', body: 'Publish immediately, or line it up against the outline timeframe. Only published items reach students.' },
      ],
    },
    {
      key: 'review', label: 'Help me get through my review queue', roles: ['instructor'],
      steps: [
        { title: 'Open the Review Queue tab', body: 'Everything waiting on your decision, newest first.' },
        { title: 'Check the grounding note on each item', body: 'It tells you which outline week and topic it drew from.' },
        { title: 'Check, or regenerate', body: 'Regenerating only redoes that one item — the rest of your batch is untouched. Checked items are ready to publish.' },
      ],
    },
    {
      key: 'itembank', label: 'Find something in the item bank', roles: ['instructor'],
      steps: [
        { title: 'Search or filter by course', body: 'The item bank holds every checked and published item, reusable for a new assessment or block.' },
        { title: 'Preview before reusing', body: 'Check it still fits the outline row you\'re working from.' },
      ],
    },
    {
      key: 'explain', label: 'Explain what I\'m looking at', roles: ['student', 'admin'],
      steps: [
{ title: 'Published materials', body: 'Everything your instructor has checked and published to your block.' },
{ title: 'How it\'s grounded', body: 'Each item is generated from the approved syllabus, reviewed and checked by your instructor before you ever see it.' },
      ],
    },
  ],
})
