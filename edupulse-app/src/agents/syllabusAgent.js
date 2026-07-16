import { defineAgent } from './defineAgent'

export default defineAgent({
  id: 'syllabus',
  zone: 'syllabus-builder',
  label: 'Syllabus Builder',
  roles: ['instructor'],
  greeting: (user) => `Hi ${user?.name?.split(' ').slice(-1)[0] || 'there'} — want help with your syllabus? I can walk you through each section, help you fill in a specific topic, or explain what goes where.`,
  intents: [
    {
      key: 'walkthrough', label: 'Walk me through the syllabus',
      steps: [
        { section: 1, title: 'Section 1 — Course Information', body: 'Select your course from the dropdown. Everything here auto-fills from the curriculum: course code, title, period, and academic year. You cannot edit these fields directly — they are locked to ensure consistency.', tip: 'Pick the course first; all other sections depend on it.' },
        { section: 2, title: 'Section 2 — Course Description', body: 'This section pulls the course description, credit units, classification, hours, and prerequisites from the curriculum. Review it for accuracy — if something looks off, it may need a curriculum update.', tip: 'The description text comes from the CHED-approved curriculum for your program.' },
        { section: 3, title: 'Section 3 — Institutional Context', body: "This is pre-filled with King's College of the Philippines vision, mission, objectives, and core values, plus the College of Information Technology mission and objectives. You can edit these if your campus has specific variations.", tip: 'Most instructors leave this section as-is unless the college updates its mission.' },
        { section: 4, title: 'Section 4 — Program Outcomes', body: 'Program outcomes are pre-filled from the curriculum (4 per course). You can add, edit, or remove outcomes to match what is relevant for this specific course. Refer to your PSGs for the full list.', tip: 'Each outcome should be something students can demonstrate by the end of the course.' },
        { section: 5, title: 'Section 5 — Course Outline', body: 'This is the core of the syllabus. For each week, fill in: learning outcomes, topics (contents), activities, assessment details, teaching materials (from the six-layer dropdown), and assessment types. Weeks 9 and 18 are exam weeks.', tip: 'Use the paperclip icon on each week to attach files or links — these auto-populate Section 7.' },
        { section: 6, title: 'Section 6 — Requirements, Grading, Policy', body: 'Pre-filled with standard KCP course requirements, the grading formula (MG/TFG/FG), and course policies. Edit these to match your course-specific needs.', tip: 'The grading formula: MG = 60% Class Standing + 40% Exam; TFG follows the same pattern.' },
        { section: 7, title: 'Section 7 — References', body: 'Add textbooks and online references here. If you attached files or links in Section 5, they appear here automatically. Add any additional references manually below the auto-synced section.', tip: 'Books need: title, authors, year, publisher. Online references need: title and URL.' },
      ],
    },
    {
      key: 'build', label: 'Build a new syllabus',
      steps: [
        { section: 1, title: 'Pick the subject', body: 'Choose the CHED-registered subject code this syllabus is for — all fields auto-fill from the curriculum reference.' },
        { section: 4, title: 'Write your program outcomes', body: 'Outcomes are pre-filled from the curriculum. Add, edit, or remove them to match what is relevant for this course.' },
        { section: 5, title: 'Add your course outline', body: 'For each week, add: learning outcomes, topics, activities, assessment details, teaching materials, and assessment types. Use the six-layer dropdowns to categorize materials and assessments.' },
        { section: 6, title: 'Set requirements and grading', body: 'Review the pre-filled requirements and grading formula. Adjust for your course as needed.' },
        { section: 7, title: 'Add references', body: 'Add your textbooks and online references. Files and links from Section 5 sync automatically.' },
        { title: 'Review and submit', body: 'Check the summary, save your draft, and submit it to your Dean for approval when ready.' },
      ],
    },
    {
      key: 'edit', label: 'Edit an existing syllabus',
      steps: [
        { title: 'Open the syllabus', body: 'Pick it from your list — you will see its current status and version number.' },
        { section: 5, title: 'Update the outline', body: 'Edit any week row directly — ILOs, contents, activities, assessments, teaching materials, or assessment types. Every change is versioned automatically.' },
        { title: 'Check downstream courseware', body: 'If this topic already has generated courseware, it will be flagged as out of alignment so you know what to revisit.' },
        { title: 'Save and resubmit if needed', body: 'Approved syllabi that change substantially should go back to your Dean for another look.' },
      ],
    },
    {
      key: 'upload', label: 'Upload an existing syllabus',
      steps: [
        { title: 'Upload the file', body: 'Drag and drop your .docx file, or click to browse. The parser extracts content from all 7 sections of the KCP template.' },
        { title: 'Review extracted content', body: 'The parsed content auto-fills the form. Sections 1-2 are locked (from curriculum), so any mismatches mean the curriculum reference may need updating.' },
        { section: 5, title: 'Verify the Course Outline', body: 'The parser maps your existing outline rows into the midterm/finals structure. Add teaching materials and assessment types using the six-layer dropdowns.' },
        { section: 7, title: 'Check references', body: 'References from the parsed file appear in Section 7. Add or correct as needed.' },
        { title: 'Save or submit', body: 'Save as Drafted to keep editing, or Mark as Checked to start the approval route.' },
      ],
    },
    {
      key: 'explain', label: 'Explain this page',
      steps: [
        { title: 'The 7-section KCP template', body: 'Sections 1-2 are auto-filled from the curriculum and locked. Section 3 is the institutional context. Section 4 lists program outcomes. Section 5 is the course outline — the heart of the syllabus. Section 6 covers requirements and grading. Section 7 lists references.' },
        { section: 5, title: 'Course Outline — six-layer system', body: 'Teaching materials and assessment types are categorized using a six-layer taxonomy: Knowledge Recall, Comprehension, Application, Analytical, Judgment, and Innovation. Use the dropdowns to classify each week.' },
        { title: 'Lifecycle flow', body: 'Drafted → Checked → Downloaded for Approval → Approved/Uploaded → Active. The signatory chain (Dean → CAO → EVP) happens offline between download and re-upload.' },
        { title: 'Pulse AI assist', body: 'I can help you draft learning outcomes, suggest activities, or explain what goes in each section. Just ask!' },
      ],
    },
  ],
})
