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

## Backlog

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
- 2026-11-22: The Classroom-style UI redesign (U1 to U5: `e69758bb`, `cf7ad117`, `618f3283`, `83608e8d`) was
  reverted at the owner's request. The signed-in pages for every role are back to the `7c548a38` interface.
  The owner will decide the next UI change from that baseline. No migration.
- 2026-11-22: Owner request: within each role, no page repeats another page's sections, and the Dashboard
  no longer previews or links to other pages. Dean and Program Coordinator: the Dashboard is the oversight
  page (syllabus stations, released courseware, syllabus and delivery table, alerts, recent activity);
  `/monitor` redirects to it, its Student Oversight tab and the class-list columns are removed (Students and
  Course pages hold them), and the preview persona uses the same view with the sample Dean records.
  Instructor: the Dashboard keeps recent course activity (getting started in the preview); course counts stay
  on Course, students and scores on Student Monitoring. Student: the Dashboard keeps reminders, upcoming
  activities, the block and material sources; course cards stay in My Courses, scores and trends in
  Performance. Documentation captures under `tests/snapshots` still visit `/monitor` tabs; they are updated
  when the owner resumes the documentation policy. No migration.
- 2026-11-23: Owner request: course loads are uploaded from the College's Excel schedule
  (`CIT-TENTATIVE-SCHEDULE-FOR-First-Semester-S.Y-2026-2027.xlsx`), not from PDF or picture scans. Course >
  "Upload course load (Excel)" reads every sheet on the device (`utils/loadWorkbook.ts`): the faculty-load
  sheet (instructor name row, then SC_ID, Descriptive Title, Hour, Day, Room, Block, Units, Hours and a totals
  row) becomes the existing teaching-load review, and the block timetable sheet checks each block, year and
  schedule. BLOCK A-1 is block A of a Year 1 course, BLOCK 2-E block E of Year 2, BLOCK A&B-1 a shared class.
  The review shows sheet and row, the year level, source checks (a timetable block printed twice, a printed
  total that disagrees with its rows, schedules that differ from the timetable, a block listed under two
  instructors) and the timetable classes that no instructor in the file teaches. A PDF on the course-load
  button is refused; Pulse also reads an attached Excel schedule. Tested: `npm run verify` 536 of 536,
  `VERCEL=1 npm test` 536 of 536, teaching-load, load-field-edit (its Days step now uses the picker; it
  failed on `0cb7fd7c` too), course-semesters and dean-management on desktop; `dean-management:116` fails
  the same way on `fe8ca171`. No migration.


## 23 November 2026 - Supporting UI specification ownership

See versions/supporting-ui-qa-2026-11-23.md for the independent QA matrix and Claude handoffs. Codex supporting changes: student course table with home-block context, no standalone Dean Students station (authorized class-directory links retained), presentation-only Pulse suppression during the actual unanswered student assessment reader, a named Next action for accessible same-course reader items, and neutral Recorded sources wording. Do not turn these UI changes into new enrollment, source processing, scoring, submission, release or academic approval implementations. Schema-limited MCQ options and the audited baseline three-source cap must be resolved with their connected backend, not cosmetic controls. Never claim fixture verification proves real learner achievement or server-side integrity.

## 23 November 2026 - Claude: connected items from the supporting specification

- K6 / G1 four sources: a Pulse message carries up to four files (`MAX_CHAT_SOURCES` in `server/contracts.ts`, saved conversations, chat body limit 400 kB). Each file is read on its own; an unreadable file is named with its reason and the readable ones stay attached. `tests/chat-sources.test.ts`, `tests/browser/pulse-components.spec.ts`.
- I3 immediate answer review: migration `20261123090000_assessment_answer_review.sql` adds `edupulse_attempt_feedback(attempt)`. Only the student who submitted the attempt reads each question's result, the key and the instructor's explanation (taken from the saved item only when it is the version answered). Nothing is released while a later attempt is open and still submittable; an unmarked written response stays "awaiting review"; a revised assessment says the review is no longer available. Academic operation `feedback` (students only, never a support view), `AnswerReview.jsx` under the saved score. Delivery settings tells the instructor that with more than one attempt students see the answers before retaking (the conflict is surfaced, not decided). `tests/assessment-answer-review.test.ts`, `tests/browser/assessment-attempts.spec.ts`.
- Checked, unchanged: N2 draft continuation is on main (`9115b147`, `tests/editable-syllabus.test.ts`); answer keys and explanations are stripped from student copies in the database, so Pulse has no route to them.
- Still open from the handoff: K4 reassignment conflicts, K8 more than four MCQ options (schema), K10 essay review flow, K11 file submissions, K12 radar semantics (owner decision), K13 history.
- Released: `b0d6fafc` pushed to main; migration `20261123090000` applied with `npx supabase db push --linked` (listed on both sides); production deployment `dpl_4UpdpZjKyDtJBVKn7ibTgkwuLZw7` Ready on `edupulse-prototype.vercel.app` (remote `npm run verify` passed). The production API recognizes the `feedback` operation (a guest is refused with 403, an unknown operation with 400).


## 23 November 2026 - Student classroom phase

Owner now requests student Home course cards, Join Class, published announcements, weekly topics/material-associated assessments, own Scores and a read-only published outline. This supersedes the earlier table-only Home interpretation; My Courses retains its secondary table. Codex owns Student UI; Claude owns Instructor UI and concurrent class-code/announcement backend. See versions/student-ui-2026-11-23.md for the audit matrix, test evidence and dependencies. Do not regress backend membership uniqueness, publication visibility, student-owned answer review or pending manual scores. Never turn an unavailable student draft/upload API into a fake saved draft or successful file submission.

## 24 November 2026 - Claude: instructor class space (G13)

Owner request (23 November): a Classroom-style layout for instructors first, keeping the top bar; Dashboard becomes Home; Create class for instructors and Join class for students (Codex builds the student side on this backend); topics collapse with their teaching materials, assessments and announcements; People is the Class List; Marks are Scores; provider links (Drive, Docs, Slides, Sheets, Forms, YouTube, web pages) instead of new editors. The earlier left-rail redesign, reverted on 22 November at the owner's request, is not reused.

### G13. Instructor class space

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T13.1 | Home for instructors and students in the top bar and in Pulse (Dean, Program Coordinator and System Admin keep Dashboard). Instructor Home (`classroom/InstructorHome.jsx`) has one card per assigned course with its blocks, student counts and syllabus status, and Create class. The Course station reopens the class last opened in the tab, otherwise Home | `tests/browser/instructor-classroom.spec.ts` (desktop and mobile), `tests/operator.test.ts`, the updated instructor specs | Complete |
| T13.2 | Class space (`courseware/InstructorCourses.jsx`): banner with code, title, term, blocks and syllabus status; tabs Announcements, Teaching Materials & Assessments, Class List, Scores; Syllabus and Block sections as class actions. Old `?view=` links and `week`, `item`, `publication`, `add` links open the right tab; an unknown course says so with Back to Home | instructor-classroom spec; block-delivery, instructor-courses, courseware-pack, term-calendar, syllabus-repository, supporting-spec, approved-syllabus-original | Complete |
| T13.3 | Class codes, migration `20261123120000_class_codes_and_announcements.sql`: one code per block section, 7 characters without I, L, O, 0 or 1; create, replace, turn off; a block the load does not list yet is added as Add block section already allows. A student looks a code up, then joins through `register_instructor_class`, as the Dean's `block.add` does: never moved from another block of the course, at most 35, joins logged for the Class List. Academic operations `class-code` (instructor) and `class-join` (student); support views cannot use either | `tests/class-codes.test.ts` (PGlite), `tests/classroom-commands.test.ts` | Complete |
| T13.4 | A join changes the instructor's workspace revision. A newer copy that differs only in the class lists now merges into pending edits and into confirmed commits (`utils/workspaceRoster.ts`, `WorkspaceContext.jsx`) instead of a save conflict; any other change still raises the conflict | `tests/classroom-utils.test.ts` | Complete |
| T13.5 | Weeks collapse and expand (Expand all, Collapse all, kept for the tab); each week counts its teaching materials, assessments and announcements and lists the announcements filed under it; a linked week is always shown | instructor-classroom spec | Complete |
| T13.6 | Announcements (`classroom/ClassStream.jsx`): post, edit, delete; all block sections or one; optional week; up to 10 links. Students read those of their own enrolled block (`edupulse_class_announcements`), none while suspended | PGlite announcement test, instructor-classroom spec | Complete |
| T13.7 | Class List per block: the existing roster (suspend, remove, add students) once the course exists, the confirmed class list before; the block's code and who joined with it. Scores per block with the existing assessment score view (EduPulse scores, not official grades) | instructor-classroom spec | Complete |
| T13.8 | Provider links on drafts, link materials and announcements: recognized providers, Open with the provider, a privacy-enhanced YouTube player on request (CSP `frame-src` allows `www.youtube-nocookie.com`). The instructor handover copies file paths only, and the Dean's course inspection keeps links | `tests/classroom-utils.test.ts`, PGlite patch assertions, instructor-classroom spec | Complete |

Not done, and why:
- Google Drive Picker needs a Google Cloud project with an OAuth client ID, an API key, the `drive.file` scope and the College's approval. Until then instructors paste share links; nothing claims a Drive connection.
- Student Monitoring still shows the same per-block rosters and scores as the Class List and Scores tabs; a next step can make it open the class tabs instead of its own window.
- Reordering topics, sub-topics below week, topic and item, and files on announcements (files stay with teaching materials).

Failures seen while checking that do not come from this change (same on HEAD `e1a75166`, or they need pages that no longer exist for signed-in instructors): `pulse-navigation.spec.ts:4` (Pulse stays open after an account view switch, identical on HEAD), the support case of `dashboard-readonly.spec.ts` (no `.support-view-banner` exists in the app), the five `approved-syllabus.spec.ts` intake tests (the signed-in Course page has had no Upload syllabi link), `dashboard-navigation.spec.ts` 18 and 40 and the instructor `workspace-cache.spec.ts` tests (the old `[data-course]` and `[data-content-id]` lists), and `dean-records` and `layout-feedback` as already listed in `.claude/CLAUDE.md`.

- 2026-11-24: G13 built. Also fixed: the preview student Home used `BookOpen` without importing it, so its sources card crashed (present on HEAD).
- 2026-11-24: Released together with Codex's student Home and Join class (`feature-documentation/versions/student-ui-2026-11-23.md`), at the owner's choice, because both sides share Dashboard, Layout and the academic context and the join needs migration `20261123120000`. `npm run verify` and `VERCEL=1 npm test` passed (549 tests); the instructor and student classroom, class-lists and course-semesters browser specs passed; only the known support case of `dashboard-readonly` failed.
- 2026-11-24: Consistency pass after a rendered audit of every instructor page (desktop and mobile): the class title now uses the page-header size (24px) with a space between code and title for screen readers, every section heading inside a class is the card-title size (18px; the class sidebar stays smaller), block counts say "1 student", and the Class List roster card is titled "Enrolled students" under its block heading (Student Monitoring keeps its title).

## Topic files, submission bins and comments

Instructors can attach batches of files when creating a topic item or editing its draft. Each file uses private storage and the existing 4 MB file limit. The workspace stores file references. An instructor can publish a standalone submission bin or enable a bin on an assessment. Checks, delivery schedules, deadlines and delivered revisions follow the existing courseware flow.

Students can attach files, submit a link or write inside a delivered bin. A saved receipt restores on reload and the assigned instructor can review the work. Class threads are scoped to the enrolled block. A private thread and its replies are available to its student and assigned instructor. Test coverage lives in tests/topic-work.test.ts and tests/browser/topic-work.spec.ts.

Local verification passed all 551 automated tests and six targeted browser cases across desktop and mobile. Browser cases used local fixtures. Database isolation and storage access were exercised in PGlite.

## 24 November 2026 - Claude: class pages nested in Home (G14)

Owner request (24 November): opening a class on Home must not leave Home for a separate Course page. Remove the instructor Course station and nest the class as a page modal over Home so no section repeats another page. Apply Google Classroom's documented teacher features and common UI principles (consistency, recognition over recall, user control and an obvious way out, visible status, minimal repetition), in at least ten iterations, each pushed and deployed.

Sources: Classroom Help "Get started with Classroom for teachers", "Invite students to your class", "Manage class details and settings", "Add topics to the Classwork page", "View or update your gradebook".

### G14. Class pages nested in Home

| Iteration | Work | Classroom reference | Stage |
|---|---|---|---|
| T14.1 | A class opens as a page modal over Home (`?course=` on `/dashboard`); Back, Escape and Close return to Home; the instructor Course station is gone and old `/courseware` links open the same modal | Home: "To enter a class, click the class name on the card" | Complete |
| T14.2 | Class header: one identity line (code, title, term) in the modal header, tabs fixed under it, Block sections with its own heading and a way back | Stream: class Settings, tabs at the top | Complete |
| T14.3 | Class card More menu on Home: Copy class code, Open Class List, Open Scores, Open Block sections; the card shows blocks, students and syllabus | Class card More: Copy invite link, Open gradebook | Complete |
| T14.4 | Home "To review" and "Upcoming" across classes: submissions waiting for review and the next due assessments, each opening its class | Home To Review module, Upcoming | Complete |
| T14.5 | Announcements: class code card with Copy and Display (large code for a projector); Upcoming lists the next items with View all | Stream: class code with Full screen display | Complete |
| T14.6 | Teaching Materials & Assessments: week filter (All weeks or one week), Expand all / Collapse all; add actions stay inside their topic | Classwork: Create menu, topic filter, collapse all | Complete |
| T14.7 | Class List: the instructor then each block with its student count, search and Invite students (makes and copies the class code) | People: Teachers, Students, Invite students | Complete |
| T14.8 | Scores: the block's scores with a banner for written responses waiting for marking and a jump to the review list | Grades: gradebook grid, colour-coded status | Complete |
| T14.9 | States and access: loading, empty and error states inside the modal; focus returns to the card; full-screen modal on phones; Pulse and notifications open the class modal | UI principles | Complete |
| T14.10 | Audit: release gate, 14 instructor specs on desktop, the instructor Home grid is a labelled "Your classes" region, notes and log updated | UI principles | Complete |

Not done in G14, and why:
- Student Monitoring (the instructor station) still shows the same rosters and scores as the Class List and Scores tabs. The owner asked to remove the Course navbar only, and several specs depend on that page, so it stays until the owner says to fold it into the class.
- A single Create menu (Classwork's Create) was not added: materials and assessments are added inside their topic, where the week and topic are already known.
- A gradebook grid of students by assessments with status colours needs a new data view and was not built; Scores shows the existing per-assessment tables with a marking banner.

- 2026-11-24: G14 built in ten iterations, each pushed (a03312d7 class modal, a4b7db94 header, c6716d3b card menu and Home To review/Upcoming, 227401f8 code display, 821fb075 week filter, 017c3dec Invite students, 4fbbb1d9 Scores banner, 80ed2be7 focus return) and deployed from PowerShell. Deploying from Git Bash fails silently (GNU tar cannot read C: paths), so the first two iterations reached production with the next deploy.

## 25 November 2026 - Claude: automatic class codes and the class as a page (G15)

Owner request (25 November): a class code must be made automatically when the Dean or Program Coordinator loads a course and be unique across every loaded course, so each code names one class; the class page must not overlap the Pulse chat panel and must be a page modal, not a popover.

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T15.1 | Migration `20261125010000_automatic_class_codes.sql`: a trigger on the institutional records issues a code the moment a class (block section) record is created, whoever creates it (Dean load import, Dean block.add, instructor add); a changed instructor retires the old code and issues a fresh one; a deleted class retires its code; classes already loaded are given codes by `backfill_class_codes()`. Codes stay globally unique (`class_codes.code` UNIQUE, never reused). A turned-off code is not remade by an ordinary update. Issuing never blocks a load. The instructor's create returns the automatic code | `tests/class-codes.test.ts` (PGlite: automatic codes, uniqueness, join by code, turned-off stays off, handover, backfill) | Complete |
| T15.2 | The class page fills the area under the 64px top bar (the bar stays usable) and, with Pulse open, ends where the panel starts; below 1200px it leaves room for the bottom-docked panel; phones keep the full-screen page modal | `instructor-classroom.spec.ts` geometry test | Complete |
| T15.3 | Owner correction: constrain the class-code sidebar and wrap its actions so it cannot cover the announcement feed. Admin instructor support reads class codes, joins and announcements and can use code/announcement controls through the audited gateway. Code display/confirmation restore only from fresh authorized class data, without replaying writes. Supersedes T13.3's account-only instructor restriction. | `tests/class-codes.test.ts`, `tests/classroom-commands.test.ts`; desktop/mobile `tests/browser/classroom-support.spec.ts`; captures in Manual 44. Migration `20261125013623` applied and remote history confirmed; source `d96d85c0` pushed. Deployment in progress. | Complete |

Historical G15 limitation: Dean views do not list class codes. G18 subsequently removed instructor Create class and new-block creation, and G19 replaced best-effort code issuance with atomic management loading. The current behavior and production evidence are recorded in those later entries.

- 2026-11-25: Codex corrected sidebar intrinsic-width overflow and added Admin instructor classroom support. Native support tests verify code replacement/post persistence, actor audit attribution, cross-instructor isolation, revoked-subject rejection and claim restoration. `npm run verify` passed (554 tests); `VERCEL=1 npm test` passed (555, including the final view-hint regression); 17 distinct browser cases passed and one desktop-only case skipped on phones. Desktop/phone captures use fictional accounts. Production migration applied and remote history confirmed. Push/deployment in progress; no Ready claim.
- 2026-11-25: To review and Upcoming moved off Home's page (they sat after the class cards) to two circle buttons on the left edge of Home, with a count badge each (bottom-left on phones). Each opens its own page modal under the top bar (`classroom/HomePanels.jsx`, URL `?panel=review|upcoming`): To review lists waiting written responses by class and assessment with Open Scores; Upcoming lists every saved due date and week opening, each opening its class. Closing returns focus to the circle. Spec: `instructor-classroom.spec.ts` (circle buttons).
## 25 November 2026 - Approved-only course outline correction

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T15.4 | Course modal selects an attested approved retained teaching syllabus independently of repository drafts; no repeated intake or draft-editing action alongside its outline. Draft-only classes retain approved intake without rendering a draft outline. Remove the weekly instruction paragraph and source-retention footer; preserve controls and backend limits. | `instructor-courses.test.ts` approved-selection regression; `approved-course.spec.ts` desktop/phone approved/active/draft/reload checks; two reviewed Manual 44 captures. 29 browser cases passed; isolated unit gate 555/556 with the sole external-web timeout passing on rerun; build and deployment checks passed. No migration. | Complete |

- Owner correction supersedes the earlier pre-approval draft-outline display in Course. No inferred approval, automatic activation, schema change or academic mutation is introduced. Unrelated schedule work remains outside this release.

## 25 November 2026 - Claude: Schedule page (G16)

Owner request (25 November): add a Schedule station to the top bar for instructors and students: a calendar of the class schedules a student is enrolled in or an instructor teaches. (The same message asked to separate the Syllabus page from the class Syllabus view; see the next entry.)

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T16.1 | Migration `20261125030000_student_class_schedule.sql`: `edupulse_student_class_schedule()` returns only the meeting days, times and room (with code, title, block, term, instructor name) of the classes a student is in: enrolled classes, and classes joined with a code that are still on the instructor's class list. Instructors keep reading their own loads. Read into `classSchedule` (additive; a failure sets `scheduleError`) | `tests/class-codes.test.ts` (PGlite) | Complete |
| T16.2 | `/schedule` (`pages/Schedule.jsx`, top-bar Schedule for instructors and students, after Home): a week calendar with real dates, previous/next week and Today, a Next class line, an Agenda view (default on phones), overlapping meetings side by side, and classes with no recorded day and time listed apart, never guessed. A meeting opens its class page over Home. `utils/classSchedule.ts` | `tests/class-schedule.test.ts`, `tests/browser/schedule.spec.ts` (instructor, student, empty) | Complete |

Not done: the calendar shows the weekly class meetings, not due dates or week openings (those stay in Home's Upcoming page); Dean and Program Coordinator have no Schedule.

### G16 (continued): the Syllabus page and the class Syllabus view are separate

Owner request (25 November): the Syllabus page saves every syllabus uploaded, shows shared syllabi and creates drafts; the Syllabus button in the class presents only the instructor's originally uploaded file and the course outline extracted from it, which is the reference for the sections built in Teaching Materials & Assessments. The two connect by links only.

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T16.3 | Syllabus page (My Syllabus): an Upload syllabi intake saves each approved PDF or DOCX automatically. It becomes the class's approved syllabus (Active) when its course code is loaded to the instructor for the selected semester and the class has none; otherwise it is kept as Approved - Uploaded and links to the class when the course is loaded. The old `?upload=approved` link still opens it focused | `tests/browser/class-syllabus.spec.ts`, `approved-syllabus.spec.ts`, `approved-syllabus-original.spec.ts` | Complete |
| T16.4 | Class Syllabus view (`classroom/ClassSyllabus.jsx`, `?view=class-syllabus`, the banner Syllabus button): the uploaded file (View uploaded file in a page over the class, Download) and the extracted outline, read-only, with "Manage syllabi in Syllabus" and an Open Teaching Materials & Assessments button. A class with no approved syllabus says so and links to the Syllabus page. The class no longer has an upload, a shared-syllabus picker or a draft link: Announcements' Next step and Teaching Materials point to the Syllabus page | `class-syllabus.spec.ts`, `instructor-courses.spec.ts`, `supporting-spec.spec.ts` | Complete |
| T16.5 | Rendered review of Home, Schedule (desktop and phone), the Syllabus page and the class Syllabus view, with four fixes: the class card button also carried the legacy `instructor-course-card` class, whose centred, padded flex rules shrink-wrapped the banner (each card now spans its banner and body across the card); the Schedule "Next class" line is one text span (its comma no longer wraps to a new line); the Syllabus page intake clears its review once saved, so the same copy cannot be saved twice; "Manage syllabi in Syllabus" is a visible secondary button and the class tabs scroll in one line on phones | `instructor-classroom.spec.ts` (banner and body span the card), `class-syllabus.spec.ts` (Save syllabus gone after saving); 43 browser cases passed on desktop and phone | Complete |
| T16.6 | Owner correction: the Schedule meeting cards drop the coloured left stripe on a pale fill. A meeting is now a framed card like a Home class card: a solid header band across the top holds the centred course code and block (stacked in narrow side-by-side lanes), with solid 3px edges on the left, right and bottom and a plain body for the time and room. The colour is the course's own tone (`classTone`, the same as its Home card, not the code length) with fixed edge colours that keep 4.5:1 contrast for the white header text in light and dark mode. An hour is 66px so a one-hour class shows its time and room in full | `schedule.spec.ts` (edge widths, full-width header, centred code); rendered light and dark captures reviewed | Complete |
| T16.7 | Owner request: one class card holds one block section. Home lists one card per block of every loaded course (`classOf` narrows the course to its block), so a course loaded with blocks A and B is two cards. The class opens as `/dashboard?course=<id>&block=<block>` and every tab (Announcements, Teaching Materials, Class List with Add students for irregular students, Scores, Block section) reads only that block; a link without a valid block lands on the course's first block. The card menu has one code, one invitation link and Block section (singular); announcements post to the open block with no block picker. `Schedule` meetings open their own block | `instructor-classroom.spec.ts`, `term-calendar.spec.ts` (two cards, one block per class), `supporting-spec.spec.ts`, block-delivery, course-semesters; Home and Class List renders reviewed | Complete |
## 25 November 2026 - Flat interface icons (G17)

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T17.1 | Audit role routes and replace shared raised glass icons with flat outline tiles; flatten upload-state icons, Home shortcut buttons and public information badges. Preserve all actions, labels, roles and view references. | `flat-icons.spec.ts`: five roles and public routes on desktop/phone, both themes and reload. `flat-icons-support.spec.ts`: four Admin support subjects and 3:1 glyph contrast in both themes. 22 browser cases passed; 11 reviewed role/dark/phone/public/upload captures; isolated release gate passed 561 tests, with final lint/typecheck and browser audit on latest source. | Complete |

- Full page inventory and visual examples are in Manual 53. Unrelated classroom/Syllabus work is preserved separately. No database migration is required.


## 25 November 2026 - Management-loaded classes and in-class intake (G18)

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T18.1 | Remove instructor class/new-block creation; retain existing-roster enrollment and management automatic classes. Guard both classroom RPC construction paths. | Native class-code tests pass with the new migration; browser enrollment and Home regression coverage. | Complete |
| T18.2 | Copy active invitation URLs; own verified students automatically join after navigation/sign-in. Reload requires an explicit retry. | Desktop/phone invitation, sign-in, wrong-role, invalid-code and no-replay browser cases. | Complete |
| T18.3 | Empty class accepts an approved file in Teaching Materials & Assessments; header Syllabus appears only after save, with no repeated intake or draft controls. | Real PDF drag/drop, retained-original checks and save/reload browser coverage; Manual 54 captures. | Complete |

The owner's correction supersedes T13.1's Create class control and T16.4's empty-class Syllabus redirect. The separate Syllabus repository and original-file reader remain. No sample result is offered as hosted authorization proof.

- Codex evidence: 563-test isolated release gate passed; latest card/phone/reader fixes were integrated from `5b1948aa`, followed by lint/typecheck, production/capture builds and focused database/browser checks. 79 distinct browser cases pass; one desktop-only case is skipped on phones. Six capture cases and 11 reviewed images update Manual 54 and the Admin sidebar scenes. The linked migration is applied and confirmed remotely. Production Ready is inspected separately after the authorized push.


## 25 November 2026 - Atomic class codes and minimal QR card (G19)

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T19.1 | Initialize the class and code at the end of management loading; preserve supplied sections and explicit disables; backfill parent-only loads without student activity. Code failure rolls the load back. | Native persistence, batch, rollback, backfill and role regressions. Source `fb7d02fc`, applied migration `20261125084915`, hosted 566/566 tests and Ready deployment `dpl_4iY8WPvCoYSzMjTMmz6m5sGBe8YH`. | Ready |
| T19.2 | Announcements shows only Class Code, code and enlarge; popover contains enlarged code, locally generated QR and copyable invitation URL. Preserve management controls inside the popover/Class List. | Desktop/phone, light/dark pixel QR decoding, copy actions, Admin support, reload, focus and no replay; Manual 55 captures. Same released source/deployment; deployed-asset checks pass for Instructor and Admin with controlled transport. | Ready |

- Evidence: 8 native classroom tests pass after correcting the maintenance-only guard; 43 distinct desktop/phone cases pass, with one desktop-only case skipped. Light/dark QR pixels decode to the exact invitation URL for instructor and Admin. Six final capture cases and nine reviewed images update Manual 55 and the Admin sidebar. Migration applied and remote history confirmed; aggregate checks find no missing classes/code history, and the security advisor reports no error-level issues. Vercel's full release gate passes all 566 tests on `fb7d02fc`; independent inspection confirms Ready and the canonical alias. Public site/health return 200. [Production evidence and limits](versions/2026-11-25-class-code-qr/validation/results.md#production-result-25-november-2026).

## 25 November 2026 - Persistent academic population (G20)

The owner now requests populated, functional records for every active instructor and student, with natural titles and no test indicators. This authorizes new generated teaching and learning activity for the interactive population; it supersedes prior seed exclusions and the earlier actual-activity-only population instruction for this batch. Preserve original work, scores, directory identities, completed terms and access restrictions. The owner explicitly chose to keep suspended/disabled accounts restricted. Retain durable private provenance; generated activity is not evidence of independent human learning.

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T20.1 | Back up the database records; populate current management loads/classes and registered rosters with at most 35 members per class. | Private snapshot, deterministic allocation, role/capacity checks, rollback rehearsals, guarded and resumable commits. | Complete |
| T20.2 | Prepare retained authored syllabus originals and weekly content; preserve uploaded originals and saved work; check before publication, retain editable drafts, add schedules and announcements. | Validated workspace sizes, original-file checks, delivery and authorized student visibility. | Complete |
| T20.3 | Populate scored responses, reading, practice and discussion/submission records through the real RPCs; keep fresh work and attempts available. | Durable generated-row provenance, native scoring/review, student-to-instructor readback and instructor-to-student delivery. | Complete |
| T20.4 | Keep large populated academic responses complete. | Real-socket streamed JSON beyond 4.5 MB; existing disconnect/deadline checks. | Complete |

### G20 scope correction, 25 November 2026

The owner narrows the population to CIT and students in departments explicitly present in the retained instructor loads. SourceRows identify BSIT, CTELA for PROF ED 16, and CABM for GE ELEC-IT. Existing individual cross-department enrollments remain. Reconcile this session's wider allocations from the private baseline without deleting Auth/directory users or genuine activity. The scoped plan includes 1,637 registered students, 27 teaching workspaces and 115 class sections. New learning items use system-created text, with no material/assessment file attachments. Preserve uploaded syllabus originals. Vary opens, confirmed reading, answered/unanswered assessments, reviewed/pending written answers and practice.

G20 evidence: scoped classes, teaching and 115 activity batches are committed in the linked database; native publication/response/review and real browser reload checks pass. All 115 class codes are present; original files/content and restrictions remain unchanged. The release gate passes 573 tests; the classroom browser run passes 25 cases with one desktop-only skip. Ten exact-hash desktop/phone images are reviewed under capture run 2026-11-25T13-12-10-514Z-f666ebef. Deployment follows the authorized push and is inspected separately.


## 25 November 2026 - Respect source load bounds (G21)

The owner identifies excess classes and requests comparison of registered instructors against the first-semester CIT tentative workbook. This supersedes G20's inferred permission to add catalog subjects or expand section counts for population.

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T21.1 | Audit all registered instructors against source identities and rows; retain restrictions and report missing/contradictory mappings. | Read-only workbook SHA, 11-account private review, explicit blank/combined block and identity gaps. | Complete |
| T21.2 | Retire the reported instructor's 20 proven seed extras, preserving eight confirmed sections and learning history. | Native regression, hosted rollback and committed transaction, unchanged before/after teaching/history, fresh authorized browser read. | Complete |
| T21.3 | Prevent future course/section invention and receipt reuse under changed plans. | Bounded allocation/department/restriction regressions, release gate and reviewed desktop/phone captures. | Complete |
| T21.4 | Reconcile other instructors' conflicting source assignments and the missing instructor identity mapping. | Confirm source precedence and resolve overlapping course/block ownership before replacing earlier confirmed loads. Private audit records the differences; no replacements applied. | Draft |

Other instructors' workbook conflicts are documented; their assignments are not silently remapped. [Evidence and limits](versions/2026-11-25-source-load-correction/validation/results.md).


## 26 November 2026 - Loading feedback audit (G22)

| Task | Work | Acceptance | Stage |
|---|---|---|---|
| T22.1 | Prioritize a source scan of all role pages, async components, shared dialogs and lazy boundaries. | 195 JSX/TSX files, 89 async/promise units; explicit findings and delegated/already-covered exclusions in the version audit. | Complete |
| T22.2 | Replace missing pending animation with the existing themed feedback. | Actual-request flags, reduced motion, retained input/error recovery, no replay or fake success; 574-test release gate, eight held-request desktop/phone cases and eight capture cases. | Complete |

[Scan, validation and scope](versions/2026-11-26-loading-audit/README.md). Source-load mapping conflicts from G21 remain pending; this UI task does not change academic assignments.
