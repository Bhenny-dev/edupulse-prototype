# Student classroom UI - 23 November 2026

Owner request: Codex implements the student experience while Claude owns the instructor experience. Existing EduPulse routes, publication/membership relationships and scoring remain authoritative. No production demonstration data is created by this work.

## Audit: current versus target

| Area | Existing implementation | Student change / remaining boundary |
| --- | --- | --- |
| Home | Student Dashboard summaries; separate course table | Home uses real assigned/enrolled course cards, instructor/section/term, Join Class, pending assessments and recent published announcements. Secondary My Courses table remains available. |
| Membership | Instructor-confirmed roster projection; no student join screen | Explicit lookup, class identity preview, confirm, member/open and full/other-block/error handling. Depends on Claude's class-code RPC/migration and server role checks; no UI-only enrollment writes. Join refreshes the authoritative records. Existing members open the class without another mutation. A confirmed membership awaiting syllabus activation appears as a waiting card. |
| Shared shell | Persistent top bar, PageModal, academic term, publication readers | Reused without redesigning Instructor UI. Student course tabs and item IDs are in the URL. The Join Class dialog restores without retaining the entered code. Reload does not replay a join, material open, attempt start or submission. |
| Course organization | Flat weekly publication list | Announcements; Teaching Materials & Assessments; Class List; Scores; published read-only outline. Weekly sections use saved outline topic IDs and coverage IDs. Unassociated assessments remain standalone. |
| Announcements | Backend contract being introduced alongside instructor work | Chronological authorized records, one canonical post also shown in its week, provider links, specific-post deep link. No student write controls. |
| Resources | Authorized stored teaching file downloads; source references | Shared provider classification, safe HTTP(S) external links, direct provider permission fallback, no automatic public sharing or embedded editors. |
| Attempts | Server sessions, numeric-choice and short-answer responses, retakes, grading | Opening an assessment shows its instructions and questions. Only Start assessment begins an attempt. All questions stay on one page, and submissions require confirmation. Review uses the server receipt and pending manual scores stay pending. |
| Answer review | Released in b0d6fafc / migration 20261123090000 | Reused only after recorded own submission. Backend protects other learners, unpublished keys and active retakes. No key derivation from UI data. |
| Scores | Authorized raw assessment DTO and performance views | Own course results, status filtering and links to recorded attempt review. Pending manual work does not show zero as its score. No GPA or invented weighting/mastery. |
| Class List | Student database projection returns own memberships only | Read-only own membership and instructor identity. No client query to expand access to other students' names, emails or scores. |
| Draft answers | Session supports timer/attempt state; no draft response persistence API | The reader warns about unsaved responses before leaving or reloading. Responses belong to the current publication version and attempt. Switching assessments discards them. |
| Student submission files | Teaching-file upload exists for instructor ownership; no student answer-file submission contract | Not borrowed or bypassed. Secure student upload/storage/grading integration remains a backend dependency; written documentation responses continue through the existing short-answer field. |
| Notifications and Pulse | Notifications stored publication IDs but only supported marking read. Pulse used broad account destinations. | Notification actions use the authorized publication ID. Named personal score requests link to matching submitted results under Scores. Existing material citation route is retained. Pulse uses publication metadata for these links and does not read assessment keys. |

## Guardrails

- A saved class membership and official registrar enrollment are separate concepts. Only the authorized class-code backend performs the join.
- The academic DTO, not locally cached credentials or old workspace state, decides which course/item can render.
- Topic grouping uses stored `courseTopicId` / `outlineSectionId`; assessment coverage uses `materialIds`. A missing parent is not guessed from title or order.
- Students have Home/Join Class, not instructor Create Class or class-management actions. Admin support views cannot use the student Join Class action.
- Published items only; scheduled content remains governed by existing delivery checks. Preview/reload never counts as learner activity.
- Existing assessment answer review is server-gated and owner-specific. A manually evaluated response remains pending until a grade is recorded.

## Verification record

Full local verification passed 549 automated tests, the production build, and deployment checks on the integrated working tree before the final notification and Pulse link updates. Type checking and the focused six-test Pulse and assessment review suite passed after those updates. Native class-code and role tests verified unique joins, class scope and role restrictions. The shared migration has not been deployed by this student phase.

The Vite preview build passed all 26 Student UI browser cases on desktop and mobile. It caught an outdated Instructor trial selector after the shared tab was renamed. The selector was updated and the final preview build also covers Join Class dialog restoration and notification routing.

Browser fixtures are synthetic transport for UI verification, not evidence of real student scores or production enrollment. Database tests exercise actual SQL in PGlite separately. The local Student UI depends on the concurrent Instructor/backend changes, including the class-code and announcement migration. The production release is pending that integration. No hosted sign-in or production data changes were made for this task.

Documentation publication/recapture remains paused by the owner on 14 November. Student capture scripts are updated with the new navigation; private screenshots are used for visual QA.
