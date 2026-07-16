# EduPulse Flow Spec (Business Flow with AI)

Reference for the prototype. Grounded in the confirmed business process of the CIT (interview with the Associate Dean, representing the Dean and Associate Dean) and the redirected study scope: AI-Driven Syllabus with Courseware Generation and Performance Monitoring. This spec is the source of truth for what happens, in what order, and what the AI is allowed to do at each step.

## 1. Ground truths (do not violate in the prototype)

1. The curriculum is fixed. The BSIT program follows CHED CMO No. 25, series of 2015, which is the basis of the released courses. The system never edits the curriculum.
2. **Course** is the official term. Never "subject" in any UI label, data field, or generated text.
3. EduSuite is the system of record for course records, course loads, and student rosters. EduPulse receives these as exported files (upload). No direct integration; that is future work.
4. Students enroll in EduSuite and are blocked into sections first come, first served: a block holds up to 35 students; when full, a new block opens. A block enlists the same courses on a shared schedule; different blocks can have different schedules. EduPulse consumes this structure, it never creates it.
5. The Dean and the Associate Dean have the same role in the business process. One shared UI and permission set (role: `admin`, displayed as Dean / Associate Dean).
6. The LMS (Moodle, Google Classroom) is an abiding variable of the current process, not the focus. EduPulse is not an LMS replacement pitch; it is the syllabus-centered layer: build syllabus, generate mapped courseware, deliver, monitor.
7. Student monitoring, not grading. EduPulse tracks assessment scores and learning material access for visualization only. No institutional grades are computed (MG/TFG/FG formulas stay in the official KCP grading sheet, outside the system).
8. The instructor (or the Dean/Assoc Dean for loading) is the deciding author. Nothing AI-generated reaches a downstream actor without human review and an explicit action.

## 2. Actors

| Actor | In system? | Role in flow |
|---|---|---|
| Dean | Yes (`admin`) | Uploads EduSuite records, loads courses, monitors faculty and delivery |
| Associate Dean | Yes (`admin`, same UI as Dean) | Same as Dean |
| Instructor | Yes (`instructor`) | Builds syllabus, generates/reviews/publishes courseware, monitors students via Student Monitoring |
| Student | Yes (`student`) | Opens learning materials, answers assessments, gets AI guidance and reminders |
| Chief Academic Officer | No (offline signatory) | Approves the syllabus |
| Executive Vice President | No (offline signatory) | Notes the syllabus |

Syllabus signatory chain (occurs OUTSIDE the system, on the downloaded file): reviewed by the Dean → approved by the Chief Academic Officer → noted by the Executive Vice President.

## 3. The flow, phase by phase

### Phase 0. Records intake (Dean / Assoc Dean)
- Upload EduSuite export files: course records (per CMO-based curriculum), course loads, student rosters (blocks/sections with schedules).
- System parses and shows what it understood; admin confirms.

### Phase 1. Course loading (Dean / Assoc Dean)
- Load each released course to an instructor.
- Business rule for who gets a course: priority 1 = holder of a master's degree; priority 2 = specialization or forte in the course.
- **AI role:** two modes.
  - *Assist:* admin assigns manually, AI suggests candidates ranked by the priority rule.
  - *Auto:* AI proposes the complete assignment in place using the same rule.
  - Either way the Dean/Assoc Dean confirms every assignment before it takes effect. AI never finalizes loading.

### Phase 2. Syllabus building (Instructor)
- Instructor opens an assigned course and builds the syllabus in the official KCP 7-section format (see SYSTEM_SPEC.md §3).
- If a ready-made syllabus exists, the instructor uploads/edits it instead of starting blank.
- **Syllabus section locking rule:**
  - **Section 1 (Course Information)** — Course, Course Title, Period Offered, Academic Year: auto-filled from the curriculum when the instructor selects a course. **Locked — not editable.**
  - **Section 2 (Course Description)** — Course Description, Credit Units, Classification, No. of Hours, Prerequisites: auto-filled from the curriculum. **Locked — not editable.**
  - **Section 4 (Program Outcomes)** — prefilled from the curriculum but **editable** — instructor can add, edit, or remove rows.
  - Sections 3, 5, 6, 7 remain fully editable by the instructor.
  - When the instructor selects a course in Section 1, all locked fields auto-populate from `CURRICULUM_COURSES` (classification, prerequisites, noOfHours = units × 18, description).
- **AI role:** *Assist* (step-by-step co-writing per section) or *Auto* (generate a complete syllabus). Auto output is always saved with status `drafted`; the instructor must check and correct it before anything else can happen.
- Approval loop (outside the system):
  1. Instructor downloads the checked syllabus file.
  2. File is routed: Dean review → CAO approval → EVP noting.
  3. Once fully approved, instructor uploads the approved file.
  4. EduPulse extracts the uploaded file, especially Section 5 (Course Outline), which becomes the mapping backbone for everything downstream.
- Statuses: `none → drafted → checked → downloaded_for_approval → approved_uploaded → extracted (active)`.

### Phase 3. Courseware generation (Instructor)
- Basis: the extracted Course Outline rows (Week, Intended Learning Outcomes, Contents, Teaching-Learning Activities, Assessments).
- **AI role:** *Assist* (instructor creates manually with AI help) or *Auto* with three scopes: by week, by semester/term, or the whole course outline.
- Generation is retrieval-grounded (RAG) in the approved syllabus (plus instructor-provided materials). Contents + ILO drive learning materials; the Assessments column drives assessment items; TLA informs the activity type.
- Every generated item lands as a draft. Instructor reviews, edits, finalizes, then **publishes**. Only published items are visible to students.
- Exam weeks (midterm, final) are outline rows without generated teaching content; they surface as milestones.

### Phase 4. Student access
- Students see published learning materials and assessments for their block's courses; they open materials and answer assessments in the system (or receive them physically, outside the system).
- **AI role: guide only.** Allowed: guiding when they miss an activity, reminding about unopened learning materials, pointing out missing/unanswered assessments, helping navigate the course. Forbidden: reviewing for them, answering or solving assessment items, hinting at answers.

### Phase 5. Monitoring (both sides)
- **Dean / Assoc Dean view:** per instructor and per course: does an approved syllabus exist? Are the mapped teaching materials and assessments being delivered on the outline's schedule? Graphs for visualization (coverage per week, delivery progress per course/instructor).
- **Instructor view (Student Monitoring):** two tabs — Assessment Scores (students × assessments, Completed/Missed, class averages) and Learning Material Access (students × materials, accessed/unopened, access rates). Remind feature for missing items.
- **Notifications:** both the instructor and the student are notified about the student's unopened materials and unanswered assessments.

## 4. AI role matrix (summary)

| Phase | Assist mode | Auto mode | Hard boundary |
|---|---|---|---|
| Course loading | Suggest candidates by masters/specialization rule | Propose full assignment in place | Admin confirms every assignment |
| Syllabus building | Section-by-section co-writing | Full draft, marked `drafted` | Instructor checks before download/approval |
| Courseware generation | Help manual creation | Generate by week / semester / whole outline | Instructor reviews and publishes |
| Student side | Guidance, reminders, missed-activity pointers | n/a | Never reviews or answers assessments |
| Monitoring | Summaries over the tracked data | n/a | No grading, Student Monitoring is visualization only |

## 5. One-line flow

EduSuite files in → Dean/Assoc Dean load courses (AI assist/auto, human confirm) → Instructor builds syllabus (AI assist/auto, `drafted` → checked) → download → Dean review → CAO approve → EVP note → upload approved → extract course outline → generate courseware (AI assist/auto by week/semester/whole, instructor review) → publish → students open and answer (AI guide only) → Student Monitoring (assessment scores + material access tracking) + Dean/Assoc Dean delivery monitoring + notifications.
