import { defineAgent } from './defineAgent'

export default defineAgent({
  id: 'courseware',
  zone: 'courseware',
  label: 'Courseware',
  roles: ['instructor', 'admin', 'dean', 'associate_dean', 'student'],
  greeting: (user) => user?.role === 'student'
    ? "Looking for something specific here? This student view includes sample materials; I can explain the controls, but I can't answer assessment items."
    : user?.role === 'admin'
      ? "This view includes sample courseware. Want a quick read on the displayed statuses?"
      : "Want to generate a draft from an active syllabus, review saved drafts, or inspect an item?",
  intents: [
    {
      key: 'generate', label: 'Generate courseware from my outline', roles: ['instructor'],
      steps: [
        { title: 'Choose scope', body: 'This week, a term (midterm/finals), or the whole Course Outline — only active syllabi (outline extracted) can generate.' },
        { title: 'Generation runs, grounded in your syllabus', body: 'It retrieves your approved syllabus and instructor-provided materials before drafting anything — you\'ll see the stages in plain language.' },
        { title: 'Review the draft', body: 'Every item shows which outline week and content it was grounded in. Edit, finalize, or regenerate just that one item.' },
        { title: 'Review and publish', body: 'After reviewing an item with View, choose Check in its three-dot actions menu. Once saved, choose Publish; enrolled students can access released courseware.' },
      ],
    },
    {
      key: 'review', label: 'Help me get through my review queue', roles: ['instructor'],
      steps: [
        { title: 'Open Courseware', body: 'Choose View for a course with saved content. Open a week with View, then inspect its items before checking them from the three-dot actions menu.' },
        { title: 'Check the grounding note on each item', body: 'It tells you which outline week and topic it drew from.' },
        { title: 'Check, or regenerate', body: 'Review and check each draft. Regeneration can replace a draft, while checked and published items are preserved by batch generation.' },
      ],
    },
    {
      key: 'itembank', label: 'Find an existing item', roles: ['instructor'],
      steps: [
        { title: 'Choose a course', body: 'The Courseware list combines generation progress and saved items. Choose View for generated content or Generate for a course that has not started.' },
        { title: 'Preview before reusing', body: 'Check it still fits the outline row you\'re working from.' },
      ],
    },
    {
      key: 'explain', label: 'Explain what I\'m looking at', roles: ['student', 'admin'],
      steps: [
{ title: 'Displayed materials', body: 'This view may contain sample courseware. Verify availability with your instructor.' },
{ title: 'How a generated draft is grounded', body: 'A new draft uses the active syllabus outline and any available references, then requires instructor review. This preview does not verify delivery to your block.' },
      ],
    },
  ],
})
