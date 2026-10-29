import records from '../../assets/product/records.webp'
import syllabus from '../../assets/product/syllabus.webp'
import courseware from '../../assets/product/courseware.webp'
import performance from '../../assets/product/performance.webp'

// Landing copy. Sources: the EduPulse study (Rivera, Botay & De Vera, 2026; Chapters 1–2),
// docs/FLOW_SPEC.md and docs/SYSTEM_SPEC.md. Statistics are the study's cited findings,
// not measured EduPulse results.

export const PROBLEM = [
  { area: 'Syllabus', today: 'Edited from earlier versions, or recycled.', next: 'Built in the official seven-section KCP format, or uploaded and checked.' },
  { area: 'Materials', today: 'Rushed, often pasted from AI chat tools and polished by hand.', next: 'Generated from the approved course outline and grounded in the syllabus and your files.' },
  { area: 'Delivery', today: 'Split between Moodle and paper handouts.', next: 'Published to each block from one place; paper copies remain possible.' },
  { area: 'Oversight', today: "After course loading, the Dean's office cannot see what is delivered.", next: 'Syllabus status and delivery for every loaded course, at a glance.' },
  { area: 'Performance', today: 'Checked by hand, on paper or in the grading sheet.', next: 'Scores collated by syllabus topic for students and instructors.' },
]

export const CHAPTERS = [
  {
    key: 'records', who: 'Dean · Associate Dean', title: 'Records and course loading', image: records,
    alt: 'EduPulse Records page: Import EduSuite Files, with course records, course loads and student class lists',
    body: "EduSuite stays the system of record. Its exported course records, course loads and block class lists are uploaded, checked and confirmed. Courses are loaded to instructors by the college's rule: a master's degree first, then specialization.",
    points: ["Nothing is saved until the Dean's office confirms", 'Pulse can suggest instructors; people decide'],
  },
  {
    key: 'syllabus', who: 'Instructor', title: 'The Syllabus Builder', image: syllabus,
    alt: 'EduPulse Syllabus Builder with the upload area and the Course Information section',
    body: 'Build the official seven-section KCP syllabus, upload one you already have, or let Pulse co-write it section by section. AI drafts stay Drafted until you check them.',
    points: ['Signed outside EduPulse: Dean review, CAO approval, EVP noting', 'The approved Section 5 course outline becomes the map for everything else'],
  },
  {
    key: 'courseware', who: 'Instructor', title: 'Courseware from the course outline', image: courseware,
    alt: 'EduPulse Courseware page listing sample courses, each with Start Generating',
    body: 'Each outline week becomes learning materials and assessments. Generation retrieves from the approved syllabus and your own files first, so drafts stay aligned with the course.',
    points: ['Generate by week, by term or for the whole outline', 'Review, edit and publish; only published items reach students'],
  },
  {
    key: 'performance', who: 'Students · Instructors · Dean', title: 'Performance by syllabus topic', image: performance,
    alt: 'EduPulse My Performance page with sample scores and topics mastered',
    body: "Students see which topics they have mastered and what to review. Instructors see completed and missed work and unopened materials; the Dean's office follows delivery across the college.",
    points: ['Reminders for unopened materials and missing activities', 'Scores are visualized; official grades stay outside EduPulse'],
  },
]

export const PHASES = [
  { phase: 0, title: 'Records intake', who: 'Dean · Associate Dean', what: 'Upload the EduSuite exports: course records, course loads and block rosters.', ai: 'Reads the files and shows what it understood.', human: 'The Dean or Associate Dean confirms before anything is saved.' },
  { phase: 1, title: 'Course loading', who: 'Dean · Associate Dean', what: 'Load each released course to an instructor.', ai: "Suggests or proposes instructors: master's degree first, then specialization.", human: 'Every assignment is confirmed before it takes effect.' },
  { phase: 2, title: 'Syllabus building', who: 'Instructor', what: 'Build the seven-section syllabus, or upload a ready-made one.', ai: 'Co-writes section by section, or drafts the whole syllabus as Drafted.', human: 'Checked, then signed outside EduPulse: Dean review, CAO approval, EVP noting. The approved file is uploaded and its course outline extracted.' },
  { phase: 3, title: 'Courseware generation', who: 'Instructor', what: 'Turn each outline week into learning materials and assessments.', ai: 'Drafts by week, by term or for the whole outline, grounded in the approved syllabus.', human: 'The instructor reviews, edits and publishes. Only published items reach students.' },
  { phase: 4, title: 'Student access', who: 'Students', what: "Open published materials and answer assessments for the block's courses.", ai: 'Guides only: reminders, missed activities and finding the way.', human: 'Pulse never answers, reviews or hints at assessment items.' },
  { phase: 5, title: 'Monitoring', who: 'Everyone', what: "A scoring sheet for instructors, delivery progress for the Dean's office and notices for students.", ai: 'Summarizes what the charts show.', human: 'No grades are computed; the KCP grading sheet stays official.' },
]

export const ROLES = [
  {
    key: 'instructor', label: 'Instructor', kicker: 'Prepare and deliver', title: 'Teach from one organized place',
    summary: 'Build and check the syllabus, generate and review courseware, publish it to your blocks, and follow every student in the scoring sheet.',
    tasks: ['See your loaded courses and each syllabus status', 'Build the seven-section syllabus or upload one you already have', 'Review AI drafts, edit them and publish when ready', 'Track assessment scores and material access per student'],
    sections: ['Dashboard', 'Syllabus', 'Courseware', 'Student Monitoring', 'Performance'],
    benefit: 'Removes the most repetitive part of course preparation while you keep full control of every output. SDG 4.c: well-supported teachers.',
  },
  {
    key: 'student', label: 'Student', kicker: 'Learn', title: 'Everything for your courses, in one place',
    summary: "Open the materials your instructors published for your block's courses, answer assessments, and follow your own progress whenever you want.",
    tasks: ['My Materials: readings and activities, ready to open', 'My Assessments: answer them and see your results', 'Performance: your scores and mastery by topic', 'Reminders about unopened materials and missed work'],
    boundary: 'Pulse will not answer or hint at assessment items.',
    sections: ['Dashboard', 'My Courses', 'Assessments', 'Performance'],
    benefit: 'Organized, syllabus-aligned courseware and a view of the topics you have mastered. SDG 4.3 and 4.4.',
  },
  {
    key: 'dean', label: 'Dean', kicker: 'Lead the college', title: 'See delivery across the college',
    summary: 'Import EduSuite records, load courses to instructors, and monitor syllabus status, delivery progress and students across the CIT.',
    tasks: ['Records: EduSuite files, blocks, class lists and the course catalog', 'Course Loading: assign instructors with ranked suggestions', 'Monitor: syllabus status, delivery progress, student oversight and alerts', 'Performance: a read-only, college-wide view of results'],
    sections: ['Dashboard', 'Records', 'Course Loading', 'Monitor', 'Performance'],
    benefit: 'A consolidated view of syllabus preparation, delivery and class performance in the college.',
  },
  {
    key: 'associate_dean', label: 'Associate Dean', kicker: 'Coordinate', title: "Work beside the Dean's office",
    summary: 'A separate account with the same records, course loading and monitoring stations as the Dean, and a dashboard of its own.',
    tasks: ['Import and confirm EduSuite records', 'Load courses and confirm every assignment', 'Follow syllabus status and delivery progress', 'Open a dashboard built for the Associate Dean'],
    boundary: 'Performance scores and approval authority stay with the Dean.',
    sections: ['Dashboard', 'Records', 'Course Loading', 'Monitor'],
    benefit: 'The same oversight of syllabus preparation and delivery, in a separate account.',
  },
  {
    key: 'admin', label: 'System Admin', kicker: 'Keep it running', title: 'Accounts, health and accountability',
    summary: 'Runs the platform rather than the curriculum: creates role accounts, watches system health and reviews what happened.',
    tasks: ['Create accounts and assign or change roles', 'Check system health and role coverage', 'Review audit activity, filtered by successes and failures', "Follow each named AI agent's task, goal and results"],
    sections: ['Dashboard'],
    benefit: 'An audit trail that keeps a locally built AI system accountable to the college.',
  },
]

export const PRINCIPLES = [
  { title: 'Grounded first', body: 'Before it writes, Pulse retrieves from the approved syllabus and your own files, so drafts follow official documents.' },
  { title: 'Sources you can check', body: 'Answers name the passages from your library they came from.' },
  { title: 'Nothing publishes itself', body: 'AI drafts stay labelled until an instructor reviews them and chooses to publish.' },
  { title: 'Guide, never answer', body: 'For students, Pulse reminds and points to missed work. It declines to answer or hint at assessment items.' },
  { title: 'Asks before acting', body: 'Registering a class list or filing a document waits for your confirmation.' },
  { title: 'Scores, not grades', body: 'The scoring sheet visualizes results; final grades stay in the official KCP grading sheet.' },
]

export const EVIDENCE = [
  { value: 7.4, decimals: 1, suffix: ' h', label: 'a week spent preparing lessons, on average, by teachers across OECD countries', source: 'OECD, Results from TALIS 2024 (2025)' },
  { value: 31, decimals: 0, suffix: '%', label: 'less lesson-planning time for teachers using generative AI, with no measurable drop in lesson quality', source: 'Education Endowment Foundation (2024)' },
  { value: 5.9, decimals: 1, suffix: ' h', label: 'of work recovered each week by educators who use AI tools regularly', source: 'Gallup & Walton Family Foundation (2025)' },
]

export const GOALS = [
  { code: 'SDG 4.3', text: 'Equitable access to quality tertiary education' },
  { code: 'SDG 4.4', text: 'Technical skills for employment' },
  { code: 'SDG 4.c', text: 'Well-supported teachers' },
  { code: 'SDG 9', text: 'Industry, innovation and infrastructure' },
]

export const FAQ = [
  { question: 'Who can sign in to EduPulse?', answer: 'Anyone with an account the system administrator created: the Dean, the Associate Dean, and the instructors and students of the College of Information Technology. Each account has one role, and that role decides which pages you see.' },
  { question: 'Does EduPulse replace our LMS or the official grading sheet?', answer: 'No. EduPulse is the syllabus-centred layer: build the syllabus, generate mapped courseware, deliver it and monitor it. The scoring sheet is for visualization only; grades stay in the official KCP grading sheet.' },
  { question: 'How does the AI stay accurate?', answer: "Generation is grounded: Pulse first retrieves passages from the approved syllabus and the instructor's files, then drafts from them and names its sources. Language models can still make mistakes, which is why every draft is reviewed by the instructor." },
  { question: 'Can the AI publish materials on its own?', answer: "No. Every AI draft is labelled and stays a draft until an instructor reviews it and chooses to publish. Course-loading suggestions also wait for the Dean's or Associate Dean's confirmation." },
  { question: 'Will Pulse answer assessments for students?', answer: 'No. For students, Pulse is a guide: it reminds them about unopened materials, points to missed activities and helps them find their way. It declines to answer, review or hint at assessment items.' },
  { question: 'Is the syllabus approved inside EduPulse?', answer: 'No. The instructor downloads the checked syllabus. It is reviewed by the Dean, approved by the Chief Academic Officer and noted by the Executive Vice President outside the system. The approved file is then uploaded, and EduPulse extracts its course outline.' },
  { question: 'Where do courses, loads and class lists come from?', answer: "From EduSuite, the college's system of record. The Dean or Associate Dean uploads its export files; EduPulse has no direct connection to EduSuite." },
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
