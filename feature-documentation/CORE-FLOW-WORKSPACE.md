# Core flow workspace: Dean and Program Coordinator, Instructor, Student

One shared plan for the core academic flow of EduPulse:
**Dean / Program Coordinator -> Instructor -> Student -> monitoring.**
Everyone who works on this flow (Claude, Codex, the owner) reads this file first, works one goal at a
time and updates the task rows and the log **in the same commit** as the work.

- Owner request: 18 November 2026. The owner's original wording governs; the refined prompt the owner
  supplied with it is used where it states the same goal more precisely.
- Live site: https://edupulse-prototype.vercel.app (a push to `main` deploys).
- Production database: Supabase project `xyziepdkdvvuhgkymooo`, linked in `edupulse-app/supabase/.temp`.

## How work moves

| Stage | Meaning | Evidence in the task row |
|---|---|---|
| Draft | Task and acceptance written, nothing built | none |
| Build | Being implemented | files being changed |
| Complete | Code done; its own unit and browser tests pass | test names |
| Tested | The release gate passes on the exact commit | gate run |
| Ready | Pushed to `main`, migration applied to production, deployment live | commit, migration, deploy check |

1. One goal at a time. A goal is Ready only when every task in it is Ready; then push, migrate and
   start the next goal.
2. Keep what works. Read the feature's manual, walkthrough and ADRs before changing it
   ([AGENTS.md](../AGENTS.md)); a missing backend operation is unfinished work, never a reason to
   remove an interface.
3. A task row moves only with evidence: a test name, a command run, a commit or a migration version.
   A button, a preview or a toast is not evidence.
4. Anything found broken or missing while working is added as a task (or to the backlog) instead of
   being fixed silently in another goal.

### Release gate (run from `edupulse-app`)

1. `npm run verify` (docs check, lint, typecheck, model fetch, unit and integration tests, build,
   deployment check).
2. `VERCEL=1 npm test` (hosted mode turns every request into a guest).
3. The browser specs of the touched screens with one worker
   (`npx playwright test <spec> --workers=1`); compare failures with the known list in
   [.claude/CLAUDE.md](../.claude/CLAUDE.md) before blaming a change.
4. Migrations: the PGlite tests apply the same SQL file; production gets
   `npx supabase db push --linked`, then `npx supabase migration list --linked` must show the version
   on the remote side.
5. Deployment: the GitHub status of the pushed commit reports the Vercel deployment as successful and
   the live bundle contains the new screen text.

### Private data

The official samples in `C:\Users\Benny\OneDrive\Documents\EduPulse\` (`Class List`, `Course Load`,
`Syllabi`) contain real names and student numbers. Never commit them or copy their rows into
fixtures. Tests build synthetic files; checks against the originals run only on this machine and
skip when the folder is absent.

### Seeded data and exclusions

The owner keeps Marielle Angela Fianza-Buya and Rogelio L. Guisdan out of seeding: their courses
(WMADE 4, WMADE 3, and their IT 204 blocks B and D) stay untouched so the owner can try the Course Load
and Class List uploads on them. `scripts/seed-courseware-pack.ts` refuses those two accounts unless
`--include-protected-owner` is passed.

- Sharmaine Pangcog (current semester, six blocks of 35 demonstration students, seeded earlier): IT 204
  has the 18-week courseware pack (`Coursewares\IT204_...`, 36 drafts, 145 questions); IT 103 and
  GE ELEC-IT have no pack. Everything is a draft: nothing is delivered, no scores or access are written.
- The other seven instructors have only 2nd Semester 2025-2026 loads on record, so no current course
  exists to seed for them.
- The two WMADE 3 class lists (sections 4 and 5, 20 and 29 students) still upload: the blocks A and B
  exist on Guisdan's load with no students, every listed student has an active account and none is in
  WMADE 3 yet; the Dean's matching picks section 4 -> block B and section 5 -> block A.
- The WMADE 3 pack (`Coursewares\WMADE3_...`) is staged only: its assessments use about 15 other part
  layouts that the reader does not support yet, and its only course is Guisdan's. WMADE 4 is not used.

## Owner requirements

Dean and Program Coordinator
- **R-D1** Upload the course load that defines each instructor's load, and upload student lists that
  fill the block sections. (Owner: complete.)
- **R-D2** Monitor each instructor's uploaded syllabus, the course outline per week and topic, and the
  courseware delivered. (Owner: not sure.)
- **R-D3** Changing the instructor of a block keeps its courseware: the new instructor continues the
  delivery and can add and attach files; the records belong to the new instructor and are revoked from
  the former one. The former instructor keeps a copy of the syllabus on their syllabus page but can no
  longer open the course block, so scores and courseware cannot be touched by mistake.
- **R-D4** See student progress from material access and assessment scores: an overall summary and a
  breakdown per topic and per material, in modals, popovers or sections of one page. (Owner: not done.)

Instructor
- **R-I1** Receive the course loads from the Dean or Program Coordinator.
- **R-I2** Upload the syllabus on the course once; it applies to every block section of that course.
- **R-I3** Delivery follows each block's scheduled days and times from the course load; each week shows
  the hours and meeting days available, so topics, materials and assessments fit.
- **R-I4** Create or attach any file as teaching material or assessment.
- **R-I5** Answer their own assessments.
- **R-I6** Generation is optional. Teaching materials are generated from the references section
  (crawled, extracted, stored and vector indexed) and from attached files (extracted on the backend,
  original kept as the true copy). Asked where content came from, the chat opens the extracted file at
  the exact section, highlighted, with the original attached. It warns about insufficient context but
  never fails indefinitely: when the instructor confirms, it generates from the context available, and
  for cited sources it cannot reach it suggests links to open, or extracts them (noise removed) into
  the reference's attachments.
- **R-I7** Assessment generation uses only the materials that come before the assessment (all of them,
  extracted on the backend for fast generation), produces at least 50 complete items (question,
  options, explanation) and can elaborate an explanation on request.
- **R-I8** Delivery is set automatically on the block schedule for old and new courseware; editing one
  material or assessment changes only that item, and automatic placement continues for new items.
- **R-I9** Monitor student performance overall, per topic, per item, per student and per course, with
  few clicks (modals).

Student
- **R-S1** Receive the courses they are added to by the instructor or the Dean; open the delivered
  courseware.
- **R-S2** A horizontal progress bar on each course card and on the learning materials.
- **R-S3** Practice quizzes from past or finished quizzes; mock quizzes from advanced reading materials
  (unavailable when there are none).
- **R-S4** A dashboard of their own performance from material access and assessments.
- **R-S5** Assessments allow 1 to 3 attempts, set by the instructor.
- **R-S6** Reminders: blue (delivered assessment, gentle), orange (3 days before the due date),
  red (due date missed).

Chat (Pulse)
- **R-C1** Understands misspellings, synonyms and composed requests, and picks the right path
  (system only, conversational, research, reference, reasoning).
- **R-C2** Knows the components, fields, pages, roles, data and files, and fills the right fields when
  it generates.
- **R-C3** Official teaching materials and assessments use the references section, never Wikipedia or
  other unreliable sources.
- **R-C4** Recognizes the official Class List, Course Load and Syllabus formats on upload and starts the
  matching import.

## Audit (18 November 2026, commit `d94a52e0`)

Functional: works and is covered by tests. Partial: exists but incomplete or unverified. Missing: not
in the code.

| Req | Today | Evidence | Goal |
|---|---|---|---|
| R-D1 loads | Functional | Load import with block sections (`97405adc`), `tests/load-block-sections.test.ts`; migration `20261118090000` applied in production | - |
| R-D1 lists | Partial (G1 in progress) | Class lists accepted `.csv,.xlsx,.pdf,.docx,.txt`; the official `.xls` (BIFF8 compound file) was not read. The list names sections `WMADE 3 - 4`, the load names the same block `WMADE 3 B`. Every listed student must already have an account (`register_instructor_class`) | G1 |
| R-D2 | Partial | Instructor cards open `DeanCourseInspection` (syllabus, blocks, weekly outline with items); no planned, scheduled or delivered counts per block | G7 |
| R-D3 | Functional, verify | `20261117104340_instructor_load_continuity.sql`, `tests/load-handover.test.ts` (block handover copies teaching, keeps scores, access and schedules); former instructor's syllabus copy not checked in the browser | G8 |
| R-D4 | Partial | `StudentMonitoring.jsx`, `MonitoringAnalytics.jsx`, `TopicMastery.jsx`; per-material and per-item drill-down unverified | G7 |
| R-I1 | Functional | Course cards from loads (`InstructorCourses.jsx`, `utils/instructorCourses.ts`) | - |
| R-I2 | Partial, verify | Syllabus kept per course; blocks listed under the course (`CourseBlockSections.jsx`) | G2 |
| R-I3 | Partial | Delivery window editor preset from load days and time (`blockDelivery.ts`); saved only by hand; no weekly contact hours from actual meetings, no check against the outline's hours | G2 |
| R-I4 | Functional, verify | `TopicContentForm.jsx`, `TeachingAttachments.jsx`, `AssessmentEditor.jsx`, original file viewer | G3 |
| R-I5 | Missing | No instructor test attempt | G4 |
| R-I6 | Partial | Agentic RAG with pgvector, extraction, `SourcePassageInspector.jsx`, reference intake; coverage warning with "generate anyway", highlighted citation in the original and link suggestions unverified | G9 |
| R-I7 | Missing | Generated assessments allow 3 to 5 questions (`server/contracts.ts`, `courseContentGenerator.js`) | G10 |
| R-I8 | Partial | Publications carry delivery windows (`deliveryState`); automatic placement and isolated edits unverified | G3 |
| R-I9 | Partial | `AcademicPerformance.jsx`, `AttemptReview.jsx`, `ScoringSheet.jsx`, `TopicMastery.jsx`; item analysis and course drill-down unverified | G7 |
| R-S1 | Functional, verify | Enrollment through instructor class lists; `StudentCourses.jsx` | G1 |
| R-S2 | Missing | No progress element in `StudentCourses.jsx` (material opens are already stored) | G5 |
| R-S3 | Partial | 3 to 5 question practice quiz from a delivered reading (`server/domains/practice.ts`, `StudentPractice.jsx`); none from finished quizzes; no advanced-reading marker | G6 |
| R-S4 | Partial, verify | `Performance.jsx`, dashboard reminders | G5 |
| R-S5 | Functional, verify | Instructor sets 1 to 3 attempts and a time limit in `DeliverySettings.jsx` (`assessmentPolicy.maxAttempts`, 1 to 3 in `server/workspace.ts`); the database enforces it (`20261028130100_assessment_workflows.sql`, `tests/baseline-workflows.test.ts` "timed attempts"); students see allowed attempts and "Start next allowed attempt" (`AcademicLibrary.jsx`) | G4 |
| R-S6 | Partial | Dashboard "Pulse Reminders" lists unopened materials and unanswered assessments without due-date colours | G5 |
| R-C1, R-C2 | Partial | Goal routing (`agents/requestGoal.ts`), list edits (`requestFrame.ts`, `itemEdits.ts`) | G11 |
| R-C3 | Partial, verify | RAG over the library and references; web only on explicit research requests (`systemChatPolicy.ts`) | G9 |
| R-C4 | Partial | Teaching-load PDF and picture recognized (`teachingLoad.ts`, `imageReference.ts`); class list and syllabus files not routed from the chat | G1, G11 |

## Goals and tasks

### G1. Official class lists fill block sections (R-D1, R-S1, R-C4)

The Dean or Program Coordinator uploads the registrar's class lists; each lands in its course-load
block, and the listed students get the course.

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T1.1 | Read legacy `.xls` workbooks in the browser (`src/utils/xlsWorkbook.ts`): compound file, BIFF8 shared strings split across CONTINUE records, labels, numbers, RK and MULRK, formula strings. `readGrid` uses it, so every spreadsheet import (student directory, course loads, class lists) takes `.xls` | `tests/xls-workbook.test.ts` (mini stream and regular sectors, CONTINUE split switching to UTF-16, rich and phonetic strings, damaged files); local-only test reads both official class lists (20 and 29 students, every declared row) | Tested |
| T1.2 | Recognize the official Class List report (`src/utils/classListReport.ts`): course code, registrar section, title, units, faculty, term, schedule, students (name, sex, student number, program, status), declared count | `tests/class-list-report.test.ts`; a declared count that differs from the rows read, and students without a number, are reported | Tested |
| T1.3 | Match a class list to its course-load block: course and term must agree; faculty surname, first meeting day and start time, and room rank the blocks; a tie is left to the Dean. `sectionOf` also reads `WMADE 3 - 4` | `tests/class-list-report.test.ts`: `WMADE 3 - 4` (Mon and Tue 07:30, A322) goes to `WMADE 3 B` (MT 7:30 - 10:00), `WMADE 3 - 5` (02:00 pm) to `WMADE 3 A`, on the official files too | Tested |
| T1.4 | Dean Courses page: "Upload class lists" takes several files and previews each one's proposed block (with the reasons), its registered students, those without an EduPulse account and those not enrolled; the block can be changed; Confirm adds the registered students with `block.add` (a block known only from the teaching-load rows is saved with its printed schedule) | `tests/browser/class-lists.spec.ts` (desktop and mobile): two lists land on IT 202 A and B; uploading the same list again adds nobody twice; a non-list file and a course without a load explain themselves | Tested |
| T1.5 | The instructor's class list uploader reads `.xls` with the same reader, keeps enrolled students, leaves the block to the instructor and warns when the file is for another course | `tests/browser/class-lists.spec.ts` (instructor case) | Tested |
| T1.6 | A student added from a class list gets the course | `tests/load-block-sections.test.ts`: after the Dean's `block.add`, the students are enrolled in the block as soon as the instructor's syllabus for that term is saved, and a student sees only their own enrollment | Tested |

Design rule confirmed by T1.6: a student reaches a course through the instructor's course, which exists once the
instructor has a syllabus for it in that term (`project_workspace`). Until then the class list waits on the block,
visible to the Dean and the instructor.

### G2. Syllabus and weekly schedule per block (R-I2, R-I3)

The course load gives each block its meeting days and time; the Dean's term calendar gives the first day of
classes. Together they date every teaching week, so courseware opens on class days without the instructor
typing dates; an instructor can still save other dates for a block.

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T2.1 | Meeting calendar per block from the load's days and time and the term calendar: each week's meetings and contact hours (MT 7:30 - 10:00 is 2 meetings, 5 hours); `src/utils/blockCalendar.ts` and the same rule in the database (`default_block_window`) | `tests/block-calendar.test.ts` (TTH, MT, lecture plus laboratory slots, afternoon times, classes starting mid-week) | Tested |
| T2.2 | Block sections show each block's weekly contact hours and warn when the term's scheduled hours fall short of the syllabus's "No. of Hours"; topics are never dropped. The official syllabi print a total ("No. of Hours: 90 Hours") and no weekly hours, so the check is per term | `tests/block-calendar.test.ts` (`termHours`); `tests/browser/term-calendar.spec.ts` | Tested |
| T2.3 | One syllabus per course serves all its blocks; blocks keep their own schedules | `tests/browser/term-calendar.spec.ts`: IT 102's one syllabus serves BSIT-1A (saved dates) and BSIT-1B (class schedule) | Tested |
| T2.4 | A block without saved dates opens each week at its first class meeting with no manual save; a block the instructor customized keeps its dates; publishing no longer needs a saved schedule once the term calendar exists | `tests/term-calendar-delivery.test.ts`: refused before the calendar, week 1 open at Monday 7:30 Manila time, week 10 scheduled, a saved schedule replaces the default; `tests/browser/block-delivery.spec.ts` unchanged | Tested |
| T2.5 | The Dean or Program Coordinator records when classes start and how many teaching weeks the semester has (Dean Courses, "Set classes start"; command `term.calendar`; migration `20261119010000_term_calendar_default_delivery.sql`) | `tests/term-calendar-delivery.test.ts` (validation, roles, instructor read); `tests/browser/term-calendar.spec.ts` | Tested |

### G3. Courseware delivery lifecycle (R-I8, R-I4)

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T3.1 | A new material or assessment is placed on each block's schedule for its week | `tests/term-calendar-delivery.test.ts`: the same lessons open Monday 7:30 for block A and Tuesday 2:00 PM for block B; `tests/block-calendar.test.ts` (`weekDeliveries`) | Tested |
| T3.2 | Editing one item creates a new version of that item only; other items' schedules and student records stay | `tests/term-calendar-delivery.test.ts`: a revised lesson keeps its publication and gets a new version, the other lesson is unchanged and the student's reading record stays | Tested |
| T3.3 | Instructor sees each item's state per block: draft, scheduled, open, closed (Weeks and topics: "Delivery: A open since ..., B opens ..."; "Opens when delivered" for a checked draft) | `tests/browser/term-calendar.spec.ts` (the weeks view line for BSIT-1A and BSIT-1B) | Tested |
| T3.4 | Any file type can be attached as material or assessment and opened as the original. Add teaching material and Add assessment already take any file up to 4 MB; "Attach teaching file" (a material read from the file) now takes every format the server reads: PDF, Word, PowerPoint, Excel, CSV, HTML, text and Markdown (`src/utils/teachingSources.ts`) | `tests/teaching-source-types.test.ts` (each offered type is one the extractor reads); `tests/browser/teaching-original-file.spec.ts` (PowerPoint, PDF, Word and pictures shown as themselves, other files downloadable) | Tested |

### G4. Assessment attempts and instructor test attempts (R-S5, R-I5)

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T4.1 | Attempts already exist (1 to 3 in Delivery settings, enforced by the database): the student sees the allowed count and "Start next allowed attempt" only while attempts remain | `tests/baseline-workflows.test.ts` ("timed attempts": a third start is refused with code 22023); `tests/browser/assessment-attempts.spec.ts` (student with 2 attempts: no restart after the second) | Tested |
| T4.2 | Show which attempt counts (the database's scoring rule: the latest submitted attempt) to the student and the instructor: the student's result reads "Attempt 2 of 2. No attempts left." or "Your latest attempt is the one recorded."; Delivery settings says the latest submitted attempt is the one recorded in performance | `tests/browser/assessment-attempts.spec.ts` | Tested |
| T4.3 | Instructor "Test attempt" on any assessment in Weeks and topics: answered like a student, marked with the answer key in the browser (`src/utils/assessmentTrial.ts`), written questions left unmarked, nothing sent or saved | `tests/assessment-trial.test.ts`; `tests/browser/assessment-attempts.spec.ts` (no workspace or academic command is sent) | Tested |

### G5. Student progress and reminders (R-S2, R-S4, R-S6)

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T5.1 | Course card progress bar: confirmed-read materials and answered assessments over delivered items (`src/components/academic/studentProgress.ts` `courseProgress`), with a text label such as "2 of 4 items done", also in the opened course | `tests/student-progress.test.ts`; `tests/browser/student-progress.spec.ts` | Tested |
| T5.2 | Progress per material (sections confirmed read) and per week ("Week 1 · 2 item(s) · 1 of 2 done") inside the course | `tests/browser/student-progress.spec.ts` | Tested |
| T5.3 | Reminder states in Asia/Manila days, on the server's clock (`serverNow` in the academic read, kept as `clockOffset`): blue (delivered, more than 3 days left or no due date), orange (3 days or less), red (due date missed), done; most urgent first on the dashboard and in notifications | Unit tests at the 3-day, due-moment and Manila-midnight boundaries; `tests/browser/student-progress.spec.ts` (a device 10 days behind the server) | Tested |
| T5.4 | The student performance page shows access and scores per course and topic (already built: By Topic, Learning Materials and Assessment Scores views) | `tests/browser/role-restoration.spec.ts` (student pages) | Tested |

### G6. Practice and mock quizzes (R-S3)

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T6.1 | Practice quiz from a finished quiz: new questions on the same topics, never the official items or the keys of open assessments | Test that no official item or key reaches the prompt or the result | Draft |
| T6.2 | Instructor marks materials as advanced reading; students take mock quizzes from them; the action explains itself and stays disabled when there are none | Browser spec | Draft |

### G7. Performance monitoring (R-I9, R-D4, R-D2)

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T7.1 | One set of calculations for instructor and Dean views: overall, course, block, student, topic, material, item | Unit tests | Draft |
| T7.2 | Instructor drill-down in modals: course, block, student or topic, item (percent correct per item) | Browser spec | Draft |
| T7.3 | Dean and Program Coordinator drill-down, read-only: overview, course, block, student, topic, material or item | Browser spec | Draft |
| T7.4 | Delivery oversight per instructor: syllabus uploaded, weeks planned, items prepared, scheduled and delivered per block | Browser spec | Draft |

### G8. Instructor change continuity (R-D3)

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T8.1 | After a handover the new instructor sees the courseware and can add files; the former instructor cannot open the block; scores and access are unchanged | Browser spec over the handover fixture | Draft |
| T8.2 | The former instructor keeps a read-only copy of their syllabus on the Syllabus page | Browser spec | Draft |

### G9. Source-grounded material generation (R-I6, R-C3)

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T9.1 | Generation reads only the course's references and attached files (extracted, chunked, indexed); the web only when asked | Test of the retrieval scope | Draft |
| T9.2 | Coverage check before generation names uncovered topics and offers "Attach more sources" and "Generate from what is available" | Browser spec | Draft |
| T9.3 | "Where is this from?" opens the extracted text at the cited passage, highlighted, with the original file | Browser spec | Draft |
| T9.4 | Unreachable cited sources: candidate links to open; on request the page text is extracted, cleaned and attached to that reference for review | Test with a fixed fetch | Draft |

### G10. Assessment generation from preceding materials (R-I7)

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T10.1 | Collect every material before the assessment (by week and order) from stored extracted text | Unit test | Draft |
| T10.2 | Generate 50 or more multiple-choice items in validated batches: four options, one correct, explanation, topic and source; duplicates removed; partial results kept on failure | Test with a scripted model | Draft |
| T10.3 | Pulse elaborates an item's explanation without changing the item unless accepted | Browser spec | Draft |

### G11. Pulse and the official documents (R-C1, R-C2, R-C4)

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T11.1 | A Class List `.xls` dropped in Pulse offers the matched block import (Dean) or block registration (instructor) | Browser spec | Draft |
| T11.2 | A syllabus PDF dropped in Pulse offers the approved syllabus intake for the matching course | Browser spec | Draft |
| T11.3 | Misspelled or composed requests for these actions reach the same actions | Unit tests with typos | Draft |

### G12. End-to-end scenarios

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T12.1 | Load, class list, syllabus, delivery, student opens a material and takes an assessment, instructor and Dean monitoring show it | One scenario test | Draft |
| T12.2 | A student cannot read another student's scores; a former instructor cannot read the block; answer keys stay hidden before release | Database tests | Draft |

## UI redesign: Classroom-style authenticated pages (U1-U5)

Owner request, 22 November 2026: give the signed-in pages the familiar layout of Google Classroom
(student and teacher views), with Moodle where Classroom has no answer, and give the Dean / Program
Coordinator the same layout around their own work. Show data as tables with inline filters instead of
one card per record and instead of filter modals. The landing page and the public pages are not part
of this work. Every feature and process stays: Pulse (AI), syllabus, course loads, teaching
materials and assessments, delivery, monitoring. Owner decisions (same day): EduPulse colors, type
and logo on the Classroom layout; shell first, then Instructor, Student, Dean, Admin; this section is
the guide and log; screenshots and guides stay paused (`doc-map.json`) until the UI settles.

### Reference (read before changing a screen)

- Classroom Home, Stream, Classwork, People, Grades: https://support.google.com/edu/classroom/answer/9582854
  (teachers) and https://support.google.com/edu/classroom/answer/9582544 (students).
- Classroom To-do (Assigned, Missing, Done) and "Your work": https://support.google.com/edu/classroom/answer/6020284
- Classroom To review and "View all your students' work": https://support.google.com/edu/classroom/answer/9157286
- Classroom gradebook colors (red missing, green turned in or draft, black returned) and statuses
  (Assigned, Turned in, Graded, Returned): https://services.google.com/fh/files/misc/google_classroom_user_guide.pdf,
  https://support.google.com/edu/classroom/answer/16643267
- Moodle My courses filters (All, In progress, Future, Past) and list view: https://docs.moodle.org/en/My_courses
- Moodle grader report (search, group filter, rows per page, sticky first column): https://docs.moodle.org/en/Grader_report
- Moodle activity completion report (one row per student, one column per item): https://docs.moodle.org/en/Activity_completion_report

### Layout rules

1. **Shell.** Top bar: menu button, logo, the current page or class name, tools (search, theme,
   language, notifications, account). Left rail: Home, then the role's sections, then Settings; the
   menu button collapses it to icons (remembered per browser) and opens it as a drawer on phones.
   Landmarks stay `Main navigation` (rail) and `Mobile navigation` (drawer); the phone button stays
   `Open menu`; `.app-topbar` stays the top bar.
2. **Home** is the class card grid (Classroom Home): one card per class or block with the course code,
   title, section and up to three due items. Cards are used only here; everything else is a table.
3. **Class page** (Instructor, Student): tabs Stream, Classwork, People, Grades (students: Stream,
   Classwork, People, and their own work). Classwork is grouped by week (Classroom topics). Grades is a
   Moodle-style grid: students down, items across, cells colored by status.
4. **To-do / To review** list work across classes with status tabs (Assigned, Missing, Done for
   students; To review, Reviewed for instructors) and a class filter.
5. **Dean / Program Coordinator**: Home shows the term's courses and blocks as cards; Course loads,
   Instructors, Students and Monitoring are tables with inline filters (term, program, year, status).
6. **Tables** use the shared `DataTable` (`src/components/ui/DataTable.jsx`): search box, select
   filters and status tabs in one toolbar above the table, sortable headers with `aria-sort`, row
   click to open, empty state, paging. Never a card per row, never a modal only for filtering.

### Iterations

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| U1 | Shell: left rail and drawer, top bar with page title; shared `DataTable` with toolbar, tabs, sort and paging; used by Notifications | Unit test for the table model; browser specs that open menus pass | Tested (`data-table.test.ts`, `layout-reload`, `workflows`, `role-restoration`, `layout-feedback`) |
| U2 | Instructor: Home class cards; class page with Stream, Classwork by week, People, Grades grid; To review | Instructor browser specs pass | Tested (instructor-courses, instructor-updates, instructor-scope, syllabus-repository, class-lists, term-calendar, assessment-attempts; Grades grid is still Student Monitoring) |
| U3 | Student: Home class cards with due items; class page; To-do with Assigned, Missing, Done | Student browser specs pass | Tested (student-progress, student-blocks, student-learning, student-block-delivery, page-readers) |
| U4 | Dean / Program Coordinator: Home term cards; Course loads, Instructors, Students, Monitoring as filtered tables | Dean browser specs pass | Tested (card-actions, course-semesters, dean-block-sections, dean-management, dean-records, historical-loads, monitoring, oversight, role-monitoring, student-blocks; Home keeps the course table instead of cards because a term has dozens of courses) |
| U5 | System Admin and remaining pages (Settings, Performance, Records) on the shell and tables; recapture screenshots when the owner resumes the docs | Admin specs pass | Draft |

## Backlog

- The signed-in instructor Home (`InstructorOverview`) has no "My Courses / Active Syllabi / Drafts to
  Review / Published Items" summary links, "My Block Sections" or "Score Snapshot" sections, which
  `dashboard-navigation.spec.ts` 5/44 and `instructor-updates.spec.ts:5` expect (they fail on `e69758bb`
  and before it; only the preview persona's dashboard has them).
- Students on an uploaded class list who have no EduPulse account yet are enrolled automatically when
  their account is created (today: upload the same list again).
- Students see a course they are listed in before the instructor's syllabus exists, marked as waiting for
  the syllabus (today the course appears with the syllabus; see the G1 design rule).
- The instructor's class list upload sets aside listed students who have no account instead of refusing
  the whole list (the Dean's upload already does).

## Log

- 2026-11-18: workspace created from the owner's request and the audit above. Production migrations up
  to `20261118090000` are applied (`npx supabase migration list --linked`).
- 2026-11-18: audit correction. R-S5 was marked Missing because a search pattern did not cover
  `assessmentPolicy.maxAttempts`; attempts 1 to 3 exist and are enforced. G4 now verifies them.
- 2026-11-18: G1 built (T1.1 to T1.6 Complete). Both official class lists are read in full and land on
  their teaching-load blocks; no migration needed.
- 2026-11-19: G1 Tested and pushed as `edbe7f13`: `npm run verify` 497 of 497, `VERCEL=1 npm test` 497 of
  497, browser specs class-lists, dean-block-sections, dean-management, dean-records, course-semesters
  and historical-loads on desktop and mobile (`automatic-records` 18/19/33 fail on `6d872a35` too).
  Not yet Ready: Vercel created no build for `6d872a35` or `edbe7f13` (last build `d94a52e0`,
  13:13 UTC on 18 November) and the live bundle does not contain "Upload class lists"; the owner checks
  the Vercel dashboard.
- 2026-11-19: G2 built (T2.1 to T2.5 Complete): the Dean records when classes start, and blocks
  without saved dates open each week at their first class meeting.
- 2026-11-19: G2 Tested and pushed as `b841dbce`: `npm run verify` 503 of 503, `VERCEL=1 npm test` 503 of
  503, browser specs term-calendar, block-delivery, dean-management and dean-records on desktop and
  mobile (56 passed; `courseware-unified` fails on `d94a52e0` too). Migration
  `20261119010000_term_calendar_default_delivery` applied with `npx supabase db push --linked`.
  Not yet Ready for the same reason as G1: no Vercel build since `d94a52e0`.
- 2026-11-19: Owner correction: schedule editors use Monday-Saturday, one or two checked days (M, T, W, Th, F, S). Shared day picker used by document review, manual loads and block creation. Calendar regression covers TTh and Saturday; original imported source facts are preserved.
- 2026-11-19: G3 Tested: `npm run verify` 505 of 505, `VERCEL=1 npm test` 505 of 505, browser specs
  term-calendar, block-delivery and teaching-original-file on desktop and mobile (22 passed).
  `outline-sources.spec.ts` (5 tests, desktop and mobile) fails on clean `main` too: its fixture course
  `retained-course` is not in the instructor's teaching load. No migration.
- 2026-11-19: Courseware packs. `scripts/lib/courseware-pack.ts` reads a pack folder of weekly PDFs (teaching
  material, assessment, instructor key, source register) and `scripts/seed-courseware-pack.ts` adds the weeks
  a course lacks as drafts (dry run, `--check-transaction` rollback, `--apply`; private evidence under `.data`).
  A written part worth several points becomes one question per marking point, because every question is
  worth one mark. Tests: `tests/courseware-pack.test.ts` (invented sample pack, plus the real IT 204 pack when
  it is present), `tests/browser/courseware-pack.spec.ts`. Applied to Pangcog IT 204: revision 18 to 19, 18
  materials and 18 assessments (145 questions) as drafts; enrollments (210), publications (0), attempts (0)
  and the Guisdan and Fianza-Buya workspaces are unchanged.
- 2026-11-19: Blockers found. GitHub Actions cannot run for any recent commit ("The job was not started because
  your account is locked due to a billing issue"), and Vercel has not built a commit after `d94a52e0`. The
  owner checks both dashboards; G1 to G3 stay Tested, not Ready, until a build reports success.
- 2026-11-19: G4 Tested: `npm run verify` 521 of 521, `VERCEL=1 npm test` 521 of 521, browser specs
  assessment-attempts (new), student-block-delivery and pipeline-progress on desktop and mobile (all pass).
  In `baseline-workflows.spec.ts` line 29 (Dean course loading, no "Released course" field) and line 47
  (assessment builder, no `data-content-id`) fail the same way on `d94a52e0`, before today's work, and
  line 54 is the documented Pulse failure. No migration.
- 2026-11-19: G4 pushed as `72c97eea`.
- 2026-11-19: G5 Tested: `npm run verify` 528 of 528, `VERCEL=1 npm test` 528 of 528, browser specs
  student-progress (new), assessment-attempts, student-block-delivery and role-restoration on desktop and
  mobile. Two role-restoration tests (instructor pages, student "assigned units") fail the same way on
  `72c97eea`. The academic read now returns `serverNow`; no migration.
- 2026-11-22: UI redesign U1 (shell) Tested. `Layout.jsx` replaces the top-bar section links and the
  breadcrumb with a Classroom-style left rail (`layout.css`: Home, the role's sections, Settings;
  the menu button collapses it to icons, remembered in localStorage `edupulse-rail`; tablets start
  collapsed; phones get the `Mobile navigation` drawer) and a page title in the top bar. New shared
  `DataTable` (`components/ui/DataTable.jsx`, rules in `dataTableModel.ts`, unit test
  `data-table.test.ts`): search, select filters and status tabs in one toolbar, sortable headers,
  paging, row click. Notifications is the first page on it (tabs All/Unread, category filter). The
  account menu is now a group named "Account" (layout-reload scopes its Settings link there);
  workflows expects the tab "Unread 2". Gate: `npm run verify` exit 0; `VERCEL=1 npm test` 531 of 531; browser specs layout-reload,
  workflows, role-restoration and layout-feedback on desktop and mobile: 33 passed, 2 skipped, 19
  failed, all on the known list (workflows 17/102/114/216, layout-feedback 9/18/24/29 where 29 looks
  for a student link named "Assessments" that is "Practice Assessments", role-restoration instructor
  pages and student units). No migration.
- 2026-11-22: UI redesign U2 and U3 Tested together (they share `Dashboard.jsx`). New `ClassCard`
  (`components/ui/ClassCard.jsx`, banner color from `classTone.js`): Classroom Home cards for the
  instructor's courses (signed-in `InstructorOverview` and the course list in `InstructorCourses`), the
  preview instructor's block sections and the student's classes (button cards keep the name
  "Open course <code>"). `SummaryCard` is now one cell of a flat stat strip (`.kpi-grid` in
  `index.css`), which removes the floating KPI cards on every role. Instructor Home adds "To review"
  (answers waiting for marking) and "Recent course activity" tables; the preview Home shows Syllabus
  Stations, the review queue and marked results as tables. The open course has a colored class banner
  and underlined tabs with a Grades link to Student Monitoring. Student Home: Pulse Reminders is a
  To-do table with tabs Assigned, Due soon, Missing (rows keep `data-reminder`), My Block is one line
  of facts, Upcoming Activities and Learning Material Sources are tables. `DataTable` gained
  `rowProps` and `openLabel`. Phones get 96 px below the page so the Pulse button never covers the
  last row (it covered the Dean students "Next" button once the breadcrumb was gone). Tests updated:
  `instructor-updates-ui.ts`, `student-blocks.spec.ts`, `student-progress.spec.ts`. Gate: `npm run
  verify` exit 0 (531 of 531), `VERCEL=1 npm test` 531 of 531; browser specs above on desktop and mobile
  pass except `dashboard-navigation` 5/44 and `instructor-updates:5`, which fail before this change
  too (backlog). No migration.
- 2026-11-22: UI redesign U4 (Dean / Program Coordinator) Tested. Dean Home: quick actions without a
  card, Syllabus Stations and Delivery Progress charts on flat panels, Syllabus Status by Course as a
  table (status and instructor filters), Faculty Overview as a table with tabs No load, Not yet routed,
  On track. Instructors: the card grid is one table (instructor and email, degree, specialization,
  loads, status, actions menu); search, the Show filter, CSV and Add instructor sit in its toolbar;
  rows keep `.dean-person-card` and the open button "View instructor <name>". Students: the
  department's block cards are filter chips (`.filter-chip`, still "Filter students in <block>").
  Tests follow U1/U2 names: rail link "Home" instead of "Dashboard" (`dean-records`,
  `workspace-cache`), stat icons `.kpi-icon` instead of `.glass-icon` (`dean-management`,
  `dean-records`, `monitoring`, snapshot `student-learning`); U2 changed these without running the
  Dean specs, found here. Remaining failures predate the redesign: `monitoring:48` (directory roster
  registration, like `automatic-records` 18/19/33) and `workspace-cache` 7/17/31/47 (instructor
  unified-material fixture and a student list without "Open material", like `courseware-unified`).
  Gate: `npm run verify` exit 0 (531 of 531), `VERCEL=1 npm test` 531 of 531. No migration.
