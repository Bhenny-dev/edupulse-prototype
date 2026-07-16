# EduPulse System Spec

Companion to FLOW_SPEC.md. Defines roles/UI, data model, the KCP syllabus schema, AI service boundaries, and non-goals for the prototype.

## 1. Roles and UI surfaces

### 1.1 Dean / Associate Dean (`admin`, one shared UI)
- **Records:** upload EduSuite exports (courses, course loads, student rosters/blocks); review parsed result; confirm.
- **Loading:** assign courses to instructors; AI suggestion panel (ranked by masters degree first, then specialization/forte); "AI auto-assign" action that fills all assignments as proposals; confirm/override each.
- **Faculty monitoring dashboard:** per instructor: syllabus status per loaded course (none / drafted / in approval / approved / active), courseware delivery progress against the course outline weeks, delivered materials and assessments; graphs for visualization.
- **Student oversight:** students within the courses each instructor handles.

### 1.2 Instructor (`instructor`)
- **My courses:** loaded courses with syllabus status.
- **Syllabus builder:** 7-section KCP template editor; AI assist per section or auto-generate full draft (status `drafted`); upload existing/ready-made syllabus to edit; download checked syllabus for the signatory route; upload approved file; extraction preview (Section 5 rows parsed into outline records).
- **Courseware studio:** per outline row (week): generate/author learning materials and assessments; AI scope selector: this week / this semester (term) / whole outline; review-edit-finalize; publish (immediate or scheduled to outline timeframe).
- **Student Monitoring:** per course: two tabs — Assessment Scores (students × assessments matrix, Completed/Missed, class averages, completion rates) and Learning Material Access (students × materials, accessed/unopened, access rates); charts; remind feature for missing items.
- **Notifications:** student inactivity alerts (unopened materials, unanswered assessments).

### 1.3 Student (`student`)
- **My courses:** published materials and assessments per enrolled course (via block section).
- **Open/answer:** view materials (marks accessed), answer assessments (auto-scored where objective, e.g. MCQ; recorded to Student Monitoring).
- **AI guide:** course navigation help, reminders of unopened materials, pointers to missed/missing activities. Refuses to answer or review assessment content.
- **My performance:** own completion and score visualization per syllabus topic.

## 2. Data model (core entities)

- `User` (role: admin | instructor | student; instructor profile: hasMasters, specializations[])
- `Course` (code, title, units, classification, hours, prerequisites, period; source: EduSuite/CMO record)
- `Block` (name, schedule, capacity 35, students[]; source: EduSuite roster)
- `Enrollment` (student ↔ block ↔ courses)
- `CourseLoad` (course ↔ instructor ↔ block; assignedBy, aiProposed: bool, confirmedAt)
- `Syllabus` (course, instructor, status: drafted | checked | downloaded_for_approval | approved_uploaded | active; sections 1–7; approvedFile)
- `OutlineRow` (syllabus, week, ILO, contents[], TLA, assessments[]; examWeek: bool)
- `CoursewareItem` (outlineRow, type: material | activity | assessment; status: draft | finalized | published; aiGenerated: bool, publishAt)
- `AssessmentAttempt` (student, coursewareItem, answers, score, answeredAt)
- `MaterialOpen` (student, coursewareItem, openedAt)
- `StudentMonitoring` (derived view: course → students × assessments [Completed/Missed, scores] + students × materials [accessed/unopened]; remind feature)
- `Notification` (target: instructor | student; kind: unopened_material | missing_assessment | syllabus_status | delivery_gap)

## 3. KCP Official Syllabus schema (7 sections)

Confirmed against the official KCP template (CABM sample; same flow as CIT).

| # | Section | Fields | Prototype handling |
|---|---|---|---|
| 1 | Course identity | Course Code, Course Title, Period Offered | Prefill from EduSuite course record |
| 2 | Course info | Description, Credit Units, Classification (Major/Minor), No. of Hours, Prerequisites | Prefill units/hours/prereqs from record; AI drafts description |
| 3 | VMO | KCP Vision, Mission, Objectives, Core Values; College Mission and Objectives | Static institutional boilerplate, auto-inserted, not AI-generated |
| 4 | Program Outcomes | Outcomes relevant to this course, per PSG (CMO 25 s. 2015) | AI proposes the relevant subset; instructor selects/edits |
| 5 | **Course Outline** | Table: Week, Intended Learning Outcomes, Contents (numbered subtopics), Teaching-Learning Activities, Assessments. 18 weeks; Week 9 = Midterm Examination, Week 18 = Final Examination | The mapping backbone. Each row is a generation unit for courseware |
| 6 | Requirements & grading | Course Requirements; Evaluation and Grading System (MG = 60% CS + 40% Exam; TFG = 60% CS + 40% Exam; FG = (MG + TFG)/2); Course Policy | Displayed/stored text only. The formulas are NEVER computed by EduPulse (grading sheet is out of scope) |
| 7 | References | Books, Online references | AI may propose; instructor curates |

Extraction rule (approved syllabus upload): parse Sections 1–7; Section 5 rows become `OutlineRow` records; exam weeks flagged; a failed parse falls back to a manual mapping screen.

## 4. AI layer

- Plug-and-play: locally hosted model or free API keys (configurable, no paid dependency).
- RAG grounding: parsed curriculum record + approved syllabus + instructor-provided files form the retrieval base; generation must cite/derive from grounded content, keeping courseware mapped to the course outline.
- Generation surfaces:
  1. Loading suggestions (rank instructors by masters/specialization).
  2. Syllabus assist/auto (per section or full draft; output marked `drafted`).
  3. Courseware assist/auto (scope: week | semester | whole outline; per row: materials from Contents+ILO, assessments from the Assessments column, activity type from TLA).
  4. Student guide (reminders and missed-activity guidance only; hard refusal on answering/reviewing assessment content).
- Every AI output is labeled as AI-generated in the UI until a human finalizes it.

## 5. Monitoring & notifications

- Dean/Assoc Dean graphs: syllabus completion per instructor, delivery progress per course vs outline weeks, materials/assessments delivered counts.
- Instructor Student Monitoring: assessment scores (Completed/Missed per assessment, class averages) and learning material access tracking (accessed/unopened). Remind feature for missing items.
- Notifications fan out to both instructor and student on unopened materials and unanswered assessments.

## 6. Non-goals (explicitly out of scope)

- No direct EduSuite integration (file export/upload only).
- No institutional grading: no MG/TFG/FG computation, no grading sheet replacement, no grade submission.
- Not an LMS replacement; LMS is only the delivery channel in the current process narrative.
- No native mobile app (responsive web only).
- No plagiarism detection, AI integrity scoring, or at-risk prediction beyond score-based visualization.
- No editing of the CHED curriculum; it is fixed input.
