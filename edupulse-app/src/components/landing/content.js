import records from '../../assets/product/records.webp'
import syllabus from '../../assets/product/syllabus.webp'
import courseware from '../../assets/product/courseware.webp'
import performance from '../../assets/product/performance.webp'

// Landing copy. Sources: the EduPulse study (Rivera, Botay & De Vera, 2026; Chapters 1–2),
// docs/FLOW_SPEC.md and docs/SYSTEM_SPEC.md. Statistics are the study's cited findings,
// not measured EduPulse results. Copy stays short: the visuals carry the rest.

export const PROBLEM = [
  { key: 'syllabus', area: 'Syllabus', today: 'Recycled from earlier versions', next: 'Official seven-section KCP format' },
  { key: 'materials', area: 'Materials', today: 'Rushed, or pasted from AI chats', next: 'Grounded in the syllabus and your files' },
  { key: 'delivery', area: 'Delivery', today: 'Split between Moodle and paper', next: 'One place for every block' },
  { key: 'oversight', area: 'Oversight', today: 'Unseen after course loading', next: 'Every course’s status at a glance' },
  { key: 'performance', area: 'Performance', today: 'Checked by hand', next: 'Scores by syllabus topic' },
]

export const CHAPTERS = [
  {
    key: 'records', who: 'Dean · Program Coordinator', title: 'Records and course loading', image: records, screen: 'Records page',
    alt: 'EduPulse Records page: Import EduSuite Files, with course records, course loads and student class lists',
    body: 'EduSuite stays the system of record. Upload its exports, check them, confirm.',
    points: ["Loads by rule: master's degree, then specialization", 'Pulse suggests instructors; people decide'],
  },
  {
    key: 'syllabus', who: 'Instructor', title: 'The Syllabus Builder', image: syllabus, screen: 'Syllabus Builder',
    alt: 'EduPulse Syllabus Builder with the upload area and the Course Information section',
    body: 'Build the seven-section KCP syllabus, upload one, or co-write it with Pulse.',
    points: ['AI drafts wait for your check', 'Signed outside EduPulse; its outline maps the rest'],
  },
  {
    key: 'courseware', who: 'Instructor', title: 'Courseware from the course outline', image: courseware, screen: 'My Courseware list',
    alt: 'EduPulse Courseware page listing sample courses, each with Start Generating',
    body: 'Each outline week becomes materials and assessments, drawn from your sources first.',
    points: ['By week, by term or the whole outline', 'Only published items reach students'],
  },
  {
    key: 'performance', who: 'Students · Instructors · Dean', title: 'Performance by syllabus topic', image: performance, screen: 'My Performance page',
    alt: 'EduPulse My Performance page with sample scores and topics mastered',
    body: 'Mastery by topic for students, missed work for instructors, delivery for the Dean.',
    points: ['Reminders for unopened and missed work', 'Scores shown; grades stay official'],
  },
]

// Each phase hands over from the AI (a draft) to people (the decision).
export const PHASES = [
  { phase: 0, icon: 'records', title: 'Records intake', who: ['Dean', 'Program Coordinator'], what: 'Upload the EduSuite exports.', ai: 'Reads and previews them', human: 'Confirm before saving' },
  { phase: 1, icon: 'loading', title: 'Course loading', who: ['Dean', 'Program Coordinator'], what: 'Load each course to an instructor.', ai: "Ranks by master's degree, then specialization", human: 'Confirm every assignment' },
  { phase: 2, icon: 'syllabus', title: 'Syllabus building', who: ['Instructor'], what: 'Build or upload the seven-section syllabus.', ai: 'Co-writes each section', human: 'Check, then sign outside EduPulse' },
  { phase: 3, icon: 'courseware', title: 'Courseware generation', who: ['Instructor'], what: 'Turn each outline week into courseware.', ai: 'Drafts from the approved syllabus', human: 'Review, edit and publish' },
  { phase: 4, icon: 'access', title: 'Student access', who: ['Students'], what: 'Open materials, answer assessments.', ai: 'Reminders and missed work only', human: 'Pulse never answers assessment items' },
  { phase: 5, icon: 'monitoring', title: 'Monitoring', who: ['Everyone'], what: 'Scores, delivery progress and notices.', ai: 'Summarizes the charts', human: 'No grades: the KCP sheet stays official' },
]

export const ROLES = [
  {
    key: 'instructor', label: 'Instructor', kicker: 'Prepare and deliver', title: 'Teach from one organized place',
    summary: 'Build the syllabus, generate courseware, publish it, follow every student.',
    tasks: [['courses', 'Loaded courses and syllabus status'], ['syllabus', 'Build or upload the syllabus'], ['drafts', 'Review, edit and publish drafts'], ['scores', 'Scores and access per student']],
    sections: ['Dashboard', 'Syllabus', 'Courseware', 'Student Monitoring', 'Performance'],
    benefit: 'Less repetitive preparation; you keep control. SDG 4.c.',
  },
  {
    key: 'student', label: 'Student', kicker: 'Learn', title: 'Everything for your courses, in one place',
    summary: 'Materials, assessments and your own progress, together.',
    tasks: [['materials', 'My Materials, ready to open'], ['assessments', 'My Assessments and results'], ['mastery', 'Mastery by topic'], ['reminders', 'Reminders for missed work']],
    boundary: 'Pulse will not answer or hint at assessment items.',
    sections: ['Dashboard', 'My Courses', 'Assessments', 'Performance'],
    benefit: 'Syllabus-aligned courseware. SDG 4.3 and 4.4.',
  },
  {
    key: 'dean', label: 'Dean', kicker: 'Lead the college', title: 'See delivery across the college',
    summary: 'Import records, load courses and monitor delivery across the CIT.',
    tasks: [['records', 'Records: EduSuite files and class lists'], ['loading', 'Course Loading with ranked suggestions'], ['monitor', 'Monitor: syllabus status and delivery'], ['scores', 'Performance: college-wide, read-only']],
    sections: ['Dashboard', 'Records', 'Course Loading', 'Monitor', 'Performance'],
    benefit: 'One view of preparation, delivery and results.',
  },
  {
    key: 'associate_dean', label: 'Program Coordinator', kicker: 'Coordinate', title: "Work beside the Dean's office",
    summary: 'Records, course loading and monitoring, in a separate account.',
    tasks: [['records', 'Import and confirm records'], ['loading', 'Load courses, confirm assignments'], ['monitor', 'Follow syllabus status and delivery'], ['dashboard', 'A dashboard of its own']],
    boundary: 'Performance scores and approval authority stay with the Dean.',
    sections: ['Dashboard', 'Records', 'Course Loading', 'Monitor'],
  },
  {
    key: 'admin', label: 'System Admin', kicker: 'Keep it running', title: 'Accounts, health and accountability',
    summary: 'Runs the platform, not the curriculum.',
    tasks: [['accounts', 'Create accounts and assign roles'], ['health', 'Check health and role coverage'], ['audit', 'Review audit activity'], ['agents', "Follow each AI agent's tasks"]],
    sections: ['Dashboard'],
    benefit: 'An audit trail that keeps the AI accountable.',
  },
]

export const PRINCIPLES = [
  { title: 'Grounded first', body: 'Drafts start from the approved syllabus and your files.' },
  { title: 'Sources you can check', body: 'Every answer names the passages it used.' },
  { title: 'Nothing publishes itself', body: 'Drafts wait until an instructor publishes them.' },
  { title: 'Guide, never answer', body: 'Students get reminders, never assessment answers.' },
  { title: 'Asks before acting', body: 'Records change only after you confirm.' },
  { title: 'Scores, not grades', body: 'Official grades stay in the KCP grading sheet.' },
]

// Pulse's named agents (src/lib/rag/agents.ts), in the order a request meets them. A request
// passes only the agents it needs; the Guardian always checks it first. `ring` is the line set
// around the agent's ring; `words` are its keywords on cards.
export const AGENTS = [
  { key: 'guardian', words: ['Checks first', 'Appropriate use', 'Stops what breaks rules'], name: 'Guardian', ring: 'GUARDIAN · CHECKS APPROPRIATE USE', role: 'Checks every request against the college’s appropriate-use rules first, and declines what breaks them, such as asking for assessment answers.' },
  { key: 'planner', words: ['Reads the request', 'Plans the searches'], name: 'Planner', ring: 'PLANNER · PLANS THE SEARCH', role: 'Works out what the request needs and plans the searches that will answer it.' },
  { key: 'researcher', words: ['Your syllabus', 'Your files', 'Web when needed'], name: 'Researcher', ring: 'RESEARCHER · SEARCHES YOUR SOURCES', role: 'Runs several searches at once over the approved syllabus and your files, and public web sources when a request needs them.' },
  { key: 'librarian', words: ['Open catalogs', 'Readings', 'References'], name: 'Librarian', ring: 'LIBRARIAN · SEARCHES OPEN CATALOGS', role: 'Finds readings and references in open catalogs when you ask for them.' },
  { key: 'ranker', words: ['Keeps the best passages', 'Drops duplicates'], name: 'Ranker', ring: 'RANKER · RANKS THE EVIDENCE', role: 'Weighs what the searches found, keeps the most relevant passages and stops when nothing relevant turns up.' },
  { key: 'comparator', words: ['Lines up documents', 'Shared · different'], name: 'Comparator', ring: 'COMPARATOR · ALIGNS SOURCES', role: 'Lines up passages from different documents when a request compares them.' },
  { key: 'writer', words: ['Writes from sources', 'Cites every line'], name: 'Writer', ring: 'WRITER · WRITES FROM THE SOURCES', role: 'Writes the answer or draft from the ranked passages, quoting them directly when it has to.' },
  { key: 'verifier', words: ['Checks each claim', 'Against its source'], name: 'Verifier', ring: 'VERIFIER · CHECKS EVERY CLAIM', role: 'Checks each claim in a written answer against its sources before you see it.' },
  { key: 'corrector', words: ['Fixes citations', 'Or shows the excerpts'], name: 'Corrector', ring: 'CORRECTOR · FIXES CITATIONS', role: 'Fixes the citations the Verifier flags, or replaces an answer it cannot verify.' },
]

// The agent workspace: a scripted example of how the agents above handle requests (the graph
// in src/lib/rag/agents.ts). Not live AI output; the section says so.
export const WORKSPACE_TALK = {
  guardian: { ask: 'Can you give me the quiz answers?', reply: 'No. That breaks the assessment rule, so I stop the request here and no other agent runs.' },
  planner: { ask: 'Summarize Week 3 from my syllabus.', reply: 'I’ll plan the searches: the Week 3 outline, your notes and the course outcomes.' },
  researcher: { ask: 'Where do you look?', reply: 'In the approved syllabus and your files, several searches at once. Public web sources only when a request needs them.' },
  librarian: { ask: 'Any open readings on normalization?', reply: 'I’ll search Open Library, OpenAlex and Wikipedia, then rank what I find.' },
  ranker: { ask: 'Which passages matter?', reply: 'The most relevant ones. I drop near-duplicates and stop if nothing relevant turns up.' },
  comparator: { ask: 'Compare my syllabus with last year’s.', reply: 'I’ll line them up: what is shared, what is related and what only one of them has.' },
  writer: { ask: 'Write the summary.', reply: 'Only from the ranked passages, and every sentence cites one, like this [2].' },
  verifier: { ask: 'Can I trust it?', reply: 'I check every claim against its source before you see the answer.' },
  corrector: { ask: 'What if a claim fails?', reply: 'I fix the citation or ask the Writer to revise. If it still fails, you get the cited source excerpts instead.' },
}

// Separate findings from separate studies: each is shown on its own, never compared with the
// others. `share` draws a meter for a finding that is a share of a whole.
export const EVIDENCE = [
  { icon: 'clock', value: 7.4, decimals: 1, suffix: ' h', label: 'a week preparing lessons, the OECD teacher average', source: 'OECD, Results from TALIS 2024 (2025)' },
  { icon: 'less', value: 31, decimals: 0, suffix: '%', share: 0.31, label: 'less lesson-planning time with generative AI, quality unchanged', source: 'Education Endowment Foundation (2024)' },
  { icon: 'recovered', value: 5.9, decimals: 1, suffix: ' h', label: 'recovered weekly by educators who use AI regularly', source: 'Gallup & Walton Family Foundation (2025)' },
]

export const GOALS = [
  { icon: 'access', code: 'SDG 4.3', text: 'Equitable access to quality tertiary education' },
  { icon: 'skills', code: 'SDG 4.4', text: 'Technical skills for employment' },
  { icon: 'teachers', code: 'SDG 4.c', text: 'Well-supported teachers' },
  { icon: 'industry', code: 'SDG 9', text: 'Industry, innovation and infrastructure' },
]

export const FAQ = [
  { question: 'Who can sign in to EduPulse?', answer: 'Anyone with an account the system administrator created: the Dean, the Program Coordinator, and the instructors and students of the College of Information Technology. Each account has one role, and that role decides which pages you see.' },
  { question: 'Does EduPulse replace our LMS or the official grading sheet?', answer: 'No. EduPulse is the syllabus-centred layer: build the syllabus, generate mapped courseware, deliver it and monitor it. The scoring sheet is for visualization only; grades stay in the official KCP grading sheet.' },
  { question: 'How does the AI stay accurate?', answer: "Generation is grounded: Pulse first retrieves passages from the approved syllabus and the instructor's files, then drafts from them and names its sources. Language models can still make mistakes, which is why every draft is reviewed by the instructor." },
  { question: 'Can the AI publish materials on its own?', answer: "No. Every AI draft is labelled and stays a draft until an instructor reviews it and chooses to publish. Course-loading suggestions also wait for the Dean's or Program Coordinator's confirmation." },
  { question: 'Will Pulse answer assessments for students?', answer: 'No. For students, Pulse is a guide: it reminds them about unopened materials, points to missed activities and helps them find their way. It declines to answer, review or hint at assessment items.' },
  { question: 'Is the syllabus approved inside EduPulse?', answer: 'No. The instructor downloads the checked syllabus. It is reviewed by the Dean, approved by the Chief Academic Officer and noted by the Executive Vice President outside the system. The approved file is then uploaded, and EduPulse extracts its course outline.' },
  { question: 'Where do courses, loads and class lists come from?', answer: "From EduSuite, the college's system of record. The Dean or Program Coordinator uploads its export files; EduPulse has no direct connection to EduSuite." },
  { question: 'What about the other colleges of KCP?', answer: 'The study is scoped to the College of Information Technology. Adoption by other KCP colleges is planned future work; a college joins when its instructors are registered and its records are imported.' },
]

export const COMMUNITY_ALT = [
  'CIT students seated around a banquet table at a KCP event',
  'CIT students gathered around a table, some seated and some standing',
  'A group of CIT students and faculty standing on the stage steps',
  'CIT students holding certificates on stage',
  'A small group of CIT students posing on stage',
  'A long row of CIT students and faculty lined up on stage',
  'A large group photo of CIT students and faculty',
  'CIT students gathered around a dinner table',
  'CIT students seated and standing together in a function hall',
  'CIT students posing around a table at a college event',
]
