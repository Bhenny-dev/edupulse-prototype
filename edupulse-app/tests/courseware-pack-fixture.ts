import type { PackText } from '../scripts/lib/courseware-pack'
import type { WorkspaceData } from '../server/workspace'

// A small invented pack in the layout the PDF reader returns: running headers, wrapped lines, two-page materials, five assessment kinds.
const wrap = (text: string, width = 96) => { const lines: string[] = []; let line = ''; for (const word of text.split(' ')) { if ((line + ' ' + word).trim().length > width) { lines.push(line); line = word } else line = (line + ' ' + word).trim() } if (line) lines.push(line); return lines }
const header = (label: string, page: number) => ['KCP / COLLEGE OF SAMPLE STUDIES SAMPLE 101 · INSTRUCTIONAL PACK', `${label} Page ${page}`]
const two = (week: number) => String(week).padStart(2, '0')
const honesty = ['Academic honesty: Responses must reflect your own understanding. The instructor may adapt administration and marking', 'requirements.']

function material(week: number, title: string[], lesson: string, notes: [string, string][], scenario: string, steps: string[], expected: string, ids: string[]) {
  const label = `Week ${two(week)} · Teaching material`
  const first = [...header(label, 1), `WEEK ${two(week)} / TEACHING MATERIAL`, ...title, lesson, 'Instructor-ready lesson notes | Guided classroom activity | Independent learning prompts', 'Intended Learning Outcomes', '1. Explain the first concept with an', 'appropriate example.', '2. Analyze the second concept.', 'Teaching Notes', ...notes.flatMap(([heading, body]) => [heading, ...wrap(body)])]
  const second = [...header(label, 2), 'Applied ICT Scenario', ...wrap(scenario), 'Follow-Along Classroom Activity', ...steps.map((step, index) => `${index + 1}. ${step}`), `Expected output: ${expected}`, 'Check for Understanding', '• How would you distinguish Alpha from Beta?', '• What evidence would validate the proposed approach to the second concept?', 'Source Links', 'See the separate Sources_and_References.pdf for author, title, verified website/PDF link and reading guidance.', `Related source IDs: ${ids.join(', ')}.`, 'Teaching adaptation: Examples and learning activities were originally written for this pack; validate local institutional', 'policies and live prices or legal requirements before instruction.']
  return [first.join('\n'), second.join('\n')]
}
function sheet(week: number, title: string[], lesson: string, body: string[], practice = false) {
  return [[...header(`Week ${two(week)} · Assessment (10 points)`, 1), `WEEK ${two(week)} / ASSESSMENT / 10 POINTS`, ...title, lesson, ...(practice ? ['Practice test only - this does not replace the official midterm/final examination.'] : []), 'Name: ______________ Section: ______ Date: ______', 'Score: ______ / 10 Instructions: Answer independently unless your instructor states otherwise. Every item or criterion', 'is marked as indicated.', ...body, ...honesty].join('\n')]
}
const choices = (items: [string, string[]][]) => items.flatMap(([text, options], index) => [...wrap(`${index + 1}. ${text} ______`), ...options.map((option, at) => `${String.fromCharCode(65 + at)}. ${option}`)])
const note = (heading: string, body: string): [string, string] => [heading, body]
const alpha = 'Alpha is the first sample concept and it is described with a sentence that is long enough to wrap onto a second line of text.'
const beta = 'Beta is the second sample concept.'
const gamma = 'Gamma groups the third sample concept with its limits.'

export const samplePages = {
  m1: material(1, ['Orientation to Sample Studies and', 'Course Basics'], 'Lesson 1 | Sample foundations', [note('Alpha', alpha), note('Beta', beta), note('Course orientation', 'Connect objectives and grading to responsible work.')], 'A team compares two sample devices for a kiosk.', ['Read the syllabus.', 'List two layers.', 'Mark the components.', 'Explain one risk.', 'Submit a labeled stack.'], 'Submit a labeled stack.', ['S01', 'S02']),
  m2: material(2, ['Sample Concepts and Limits'], 'Lesson 2 | Concepts, Part 1', [note('Alpha', alpha), note('Beta', beta), note('Gamma', gamma)], 'Two threads update a shared counter.', ['Describe a counter.', 'Sketch two threads.', 'Find a bad interleaving.', 'Add a lock.', 'Submit a diagram.'], 'Submit a concurrency diagram.', ['S01']),
  m3: material(3, ['Matching Sample Terms'], 'Lesson 2 | Concepts, Part 2', [note('Device management', 'Drivers translate generalized requests into device-specific operations.'), note('File systems', 'File systems organize persistent data with files and metadata.'), note('Protection domains', 'The kernel enforces boundaries between processes.')], 'A user cannot open a shared folder.', ['Draw a request path.', 'List checks.', 'Create a sequence.', 'Propose a fix.', 'Submit a report.'], 'Submit a report.', ['S02']),
  m4: material(4, ['Midterm Review: Sample Studies'], 'Week 4 | Official Midterm Examination', [note('Review', 'Review the concepts of weeks 1 to 3 before the examination.'), note('Exam practice', 'The syllabus reserves this week for the official examination.')], 'A kiosk is slow.', ['Draw a map.', 'Classify terms.', 'Solve one exercise.', 'Take the quiz.', 'Submit a plan.'], 'Submit a plan.', ['S01', 'S02']),
  a1: sheet(1, ['Orientation to Sample Studies and', 'Course Basics'], 'Lesson 1 | Sample foundations', ['Follow-Along Documentation / Case Analysis (10 points)', 'A team compares two sample devices for a kiosk. Explain which layers differ and', 'why a framework does not guarantee compatibility.', 'Criterion Points', 'Read the syllabus vision, outcomes and grading formula. 2', 'List platform layers for two candidate devices. 2', 'Mark components belonging to hardware, OS, framework and', 'application. 2', 'Explain one compatibility risk for each candidate. 2', 'Submit a labeled platform stack and course learning agreement. 2', 'Student response / attach an extra sheet if needed:']),
  a2: sheet(2, ['Sample Concepts and Limits'], 'Lesson 2 | Concepts, Part 1', ['Part A - Multiple Choice (5 points; 1 each)', ...choices([['Which concept fits: Alpha is the first sample concept?', ['Beta', 'Alpha', 'Gamma', 'Delta']], ['Which concept fits: Beta is the second sample concept and this statement is long enough to wrap onto a second line?', ['Alpha', 'Beta', 'Gamma', 'Delta']], ['Which concept fits: Gamma groups the third sample concept?', ['Alpha', 'Beta', 'Delta', 'Gamma']]]), 'Part B - True or False (5 points; 1 each)', '1. ______ Alpha: Alpha is the first sample concept.', '2. ______ Beta: Gamma groups the third sample concept with its', 'limits.']),
  a3: sheet(3, ['Matching Sample Terms'], 'Lesson 2 | Concepts, Part 2', ['Part A - Matching Concepts (5 points; 1 each)', 'Write the letter of the appropriate concept. Each option is used once.', 'A. Device management B. File systems C. Protection domains', 'D. Authentication and authorization', '1. ______ Drivers translate generalized requests into device-specific operations.', '2. ______ The kernel enforces boundaries between processes.', '3. ______ File systems organize persistent data with files and metadata.', 'Part B - Applied Decision (5 points)', '1. [5 points] Using the following case, prepare five brief decision or verification steps: A user cannot', 'open a shared departmental folder. Diagnose the concerns without elevating everyone.']),
  a4: sheet(4, ['Midterm Review: Sample Studies'], 'Week 4 | Official Midterm Examination', ['Ten-Item Diagnostic Practice Test (10 points; 1 each)', ...choices([['Which term matches: Alpha is the first sample concept?', ['Beta', 'Alpha', 'Gamma', 'Delta']], ['Which term matches: Device drivers translate requests?', ['Device management', 'Beta', 'Gamma', 'Delta']]])], true),
  keys: [[...header('Instructor-only keys and rubrics', 1), 'INSTRUCTOR RESOURCE / KEEP SEPARATE', 'Assessment Keys and Marking Rubrics', 'SAMPLE 101 | Weeks 1-4 | 10 points per assessment',
    'Week 01 - Orientation to Sample Studies and Course', 'Basics', 'Follow-Along Documentation / Case Analysis (10 points)', 'Illustrative response: A complete submission performs and explains all five stages: Read the syllabus.', 'List two layers.', '[2 pts] Read the syllabus vision, outcomes and grading formula.', '[2 pts] List platform layers for two candidate devices.', '[2 pts] Mark components belonging to hardware, OS, framework and', 'application.', '[2 pts] Explain one compatibility risk for each candidate.', '[2 pts] Submit a labeled platform stack and course learning agreement.',
    'Week 02 - Sample Concepts and Limits', 'Part A - Multiple Choice (5 points; 1 each)', '1. B - Correct: Alpha. Alpha is the first sample concept and it is described with a sentence that is long enough to', 'wrap onto a second line of text.', '2. B - Correct: Beta. Beta is the second sample concept.', '3. D - Correct: Gamma. Gamma groups the third sample concept with its limits.', 'Part B - True or False (5 points; 1 each)', '1. True - Alpha is the first sample concept.', '2. False - The described property belongs to Gamma, not Beta.'].join('\n'),
  [...header('Instructor-only keys and rubrics', 2),
    'Week 03 - Matching Sample Terms', 'Part A - Matching Concepts (5 points; 1 each)', '1. A - Device management: Drivers translate generalized requests into device-specific operations.', '2. C - Protection domains: The kernel enforces boundaries between processes.', '3. B - File systems: File systems organize persistent data with files and metadata.', 'Part B - Applied Decision (5 points)', '1. [5 pts] Expected: Expected steps: Draw a request path.; List two checks.; Create a non-destructive sequence.;', 'Propose a least-privilege fix.; Submit a case report.', 'Marking: Award 1 point for each correctly adapted step. Accept equivalent safe and justified answers.',
    'Week 04 - Midterm Review: Sample Studies', 'Ten-Item Diagnostic Practice Test (10 points; 1 each)', '1. B - Correct: Alpha. Alpha is the first sample concept.', '2. A - Correct: Device management. Drivers translate requests.'].join('\n')],
  sources: [[...header('Sources and References', 1), 'SOURCE GUIDE / VERIFIED READING PATHS', 'Sources and References', 'How to Use This File', 'Each weekly teaching material lists source IDs.', 'S01 | Sample Studies Course Syllabus, First Semester', 'Publisher/author: KCP College of Information Technology. Related weeks: 1-4.', 'Authoritative coverage and examination weeks.', 'Supplied PDF (copy included)', 'S02 | A sample operating systems book (2025)', 'Publisher/author: Sample Press. Related weeks: 2-4.', 'Teaching PDF for processes and files.', 'https://example.org/books/sample-os/book-rev5.pdf', 'S03 | A long reference with a wrapped link', 'Publisher/author: Example Org. Related weeks: 3, 4.', 'Vendor PDF.', 'https://example.org/documentation/long/Red_Ha', 't_Enterprise-en-US.pdf', 'Source Integrity and Usage Notes', 'Links were checked in November 2026.'].join('\n')],
}

const file = (path: string, pages: string[]): PackText => ({ path, sha256: path.length.toString(16).padStart(64, '0'), pages })
export const samplePack = (): PackText[] => [
  file('Course_Outline/Week_01_orientation/01_Teaching_Material/Week_01_Teaching_Material.pdf', samplePages.m1), file('Course_Outline/Week_01_orientation/02_Assessment/Week_01_Assessment_10_Points.pdf', samplePages.a1),
  file('Course_Outline/Week_02_concepts/01_Teaching_Material/Week_02_Teaching_Material.pdf', samplePages.m2), file('Course_Outline/Week_02_concepts/02_Assessment/Week_02_Assessment_10_Points.pdf', samplePages.a2),
  file('Course_Outline/Week_03_matching/01_Teaching_Material/Week_03_Teaching_Material.pdf', samplePages.m3), file('Course_Outline/Week_03_matching/02_Assessment/Week_03_Assessment_10_Points.pdf', samplePages.a3),
  file('Course_Outline/Week_04_midterm/01_Teaching_Material/Week_04_Teaching_Material.pdf', samplePages.m4), file('Course_Outline/Week_04_midterm/02_Assessment/Week_04_Assessment_10_Points.pdf', samplePages.a4),
  file('Instructor_Only/Instructor_Assessment_Keys_and_Rubrics.pdf', samplePages.keys), file('Sources/Sources_and_References.pdf', samplePages.sources),
  file('Sources/Original_Sample_Course_Syllabus.pdf', ['A page the pack reader ignores.']),
]

/** An instructor workspace with one approved-style syllabus: week 1 has two sections, week 4 is the midterm. */
export function sampleWorkspace(): { revision: number; data: WorkspaceData } {
  const section = (id: string, contents: string[], ilos = 'Explain the concepts.') => ({ id, ilos, contents, activities: '', assessments: '', assessmentTypes: [] as string[] })
  const row = (week: number, contents: string[], extra: Record<string, unknown> = {}) => ({ week, ilos: 'Explain the concepts.', contents, activities: '', assessments: '', assessmentTypes: [], teachingMaterials: [], resources: [], ...extra })
  const lesson2 = ['Lesson 2: Concepts', 'A. Alpha', 'B. Beta', 'C. Gamma', 'D. Device management', 'E. File systems', 'F. Protection domains']
  const data = {
    syllabi: [{
      id: 'syllabus-sample', courseCode: 'SAMPLE 101', courseTitle: 'Sample Studies', status: 'drafted', courseInfo: { academicYear: '2026-2027', periodOffered: '1st Semester' },
      courseOutline: [
        row(1, ['Class orientation', 'Lesson 1: Sample foundations', 'A. Alpha', 'B. Beta'], { sections: [section('s-orientation', ['Class orientation']), section('s-lesson-1', ['Lesson 1: Sample foundations', 'A. Alpha', 'B. Beta'])] }),
        row(2, lesson2, { sections: [section('s-lesson-2', lesson2)] }),
        row(3, lesson2, { sections: [section('s-lesson-2', lesson2)] }),
        { week: 4, ilos: '', contents: ['MIDTERM EXAMINATION'], activities: '', assessments: 'MIDTERM EXAMINATION', assessmentTypes: [] },
      ],
    }],
    content: {} as Record<string, never>,
    registrations: [{ id: 'sample-roster', courseCode: 'SAMPLE 101', blockSection: 'A', students: [{ StudentID: 'S-1', Email: 'sample.student@example.invalid', Name: 'Sample Student' }] }],
  } as unknown as WorkspaceData
  return { revision: 7, data }
}
