# EduPulse — Software Requirements Specification

**Traceability baseline for the EduPulse prototype (`edupulse-app`).**
Every requirement below cites the section of *EduPulse Chapter 1 & 2* (Rivera, Botay, De Vera — King's College of the Philippines, CIT) it derives from. No requirement exists without a citation, and no page or component in the app should exist without a requirement. This document replaces the untraceable `REQ-012`…`REQ-3120` comment tags found in the prior build (see the UI audit, July 13 2026) — those numbers referenced no source and produced 29 out-of-scope pages.

**Actors.** Four system users: **Dean**, **Associate Dean**, **Instructor**, **Student**. §1.5 (Significance of the Study) names three *beneficiary* categories, but Appendix B.2's interview with the Associate Dean describes a distinct functional role in the client's actual organizational structure — she assigns subject loads and imports EduSuite records, separate from the Dean's compliance-monitoring and approval role. This corrects an earlier version of this document that collapsed both into one "Dean" role; see the July 13 2026 audit for that decision and this note for why it changed. No System Administrator persona is in scope — account provisioning remains a one-time Cutover activity (§2.4.2), not a role. A full reconciliation of the client's organizational structure against the system's role model is future work for the thesis itself, not this prototype pass.

**Priority key.** `M` = Must (required for the system to satisfy §1.3's objectives) · `S` = Should (materially improves the workflow but the system functions without it) · `C` = Could (nice-to-have polish, deferrable past the six-month window in §2).

**ID scheme.** `FR-<area>-##` for functional requirements, `NFR-<area>-##` for non-functional. Areas map 1:1 to the sections of the rebuilt navigation (see the audit), so a requirement's ID tells you which screen it governs.

---

## 1. Functional Requirements

### 1.1 FR-AUTH — Identity, Roles & Access (12)

| ID | Requirement | Source | Pri |
|---|---|---|---|
| FR-AUTH-01 | The system shall support four account roles: Dean, Associate Dean, Instructor, Student. | §1.5, Appendix B.2 | M |
| FR-AUTH-02 | Each account shall belong to exactly one role at a time; role is fixed at provisioning, not user-switchable in production. | §2.4.2 | M |
| FR-AUTH-03 | The login screen shall authenticate by institutional email and password, no self-registration. | §1.2 (EduSuite as source of record) | M |
| FR-AUTH-04 | The system shall restrict every route and every navigation item to the roles permitted to see it, server-side and client-side. | §1.2 | M |
| FR-AUTH-05 | A demo-only role switcher may remain in the prototype build, clearly labeled as a demo affordance and excluded from the production build. | Prototype convenience, not cited in Ch.1-2 | C |
| FR-AUTH-06 | Instructor accounts shall be scoped to the subject loads assigned to them for the current semester. | §1.2 | M |
| FR-AUTH-07 | Dean accounts shall have read access to all instructors' syllabi and courseware within the CIT, and approval authority over syllabus/courseware submissions. | §1.2, §1.5 | M |
| FR-AUTH-08 | Student accounts shall have read access only to courseware published to their enrolled block section. | §1.2 | M |
| FR-AUTH-09 | Session sign-out shall be reachable from the profile menu in the top bar on every screen. | Usability baseline | S |
| FR-AUTH-10 | Associate Dean accounts shall be able to import EduSuite-exported records and assign subject loads and block sections, but shall not have syllabus/courseware approval authority. | Appendix B.2 | M |
| FR-AUTH-11 | Associate Dean accounts shall not have access to student performance or score data — that scope belongs to the Instructor and Dean roles. | Appendix B.2 (interview scope: grading structure and load assignment, not performance monitoring) | M |
| FR-AUTH-12 | The Dean's landing dashboard and the Associate Dean's landing dashboard shall be distinct, each reflecting that role's actual responsibilities rather than a shared generic view. | Appendix B.2 | M |

### 1.2 FR-SYL — Syllabus (22)

| ID | Requirement | Source | Pri |
|---|---|---|---|
| FR-SYL-01 | The Instructor shall be able to upload an existing syllabus file, which the system parses into the official KCP format. | §1.2, Fig. 2 step 1 | M |
| FR-SYL-02 | After parsing an upload, the system shall present the confirmation prompt "Are you okay with the uploaded syllabus?" before proceeding. | §1.2, Fig. 2 | M |
| FR-SYL-03 | If the instructor declines the parsed result, the system shall ask "What do you want to do next?" and offer re-upload or AI-guided building. | §1.2, Fig. 2 | M |
| FR-SYL-04 | The system shall support AI-guided syllabus building as an alternative to upload, drawing on the CHED-approved curriculum and any files the instructor provides. | §1.2, Fig. 2 | M |
| FR-SYL-05 | The syllabus builder shall capture, per topic: intended learning outcomes, subtopics, timeframes, and planned lessons/activities/assessments, matching the official KCP format. | §1.2 | M |
| FR-SYL-06 | The syllabus builder shall reference the CHED-approved curriculum inline while the instructor edits, without requiring a separate lookup screen. | §1.2, §1.4 | M |
| FR-SYL-07 | The system shall version every syllabus edit and allow the instructor to view prior versions. | Implied by "when the plan changes mid-semester" §1.1 | S |
| FR-SYL-08 | The instructor shall be able to submit a syllabus for Dean approval. | §1.5 | M |
| FR-SYL-09 | The Dean shall be able to approve, or request changes to, a submitted syllabus. | §1.5 | M |
| FR-SYL-10 | The system shall allow syllabus edits mid-semester and shall flag which published courseware items are now out of alignment. | §1.1 (production gap: plans and materials drift apart) | M |
| FR-SYL-11 | The system shall list all syllabi owned by the logged-in instructor, with status (draft / submitted / approved / needs revision). | §1.2 | M |
| FR-SYL-12 | The system shall not require the instructor to configure a template before starting — it shall ask and proceed. | §1.2 ("assistive and prompt-guided") | M |
| FR-SYL-13 | The system can be used before subject loads are finalized: syllabus building may start with no uploaded file. | §1.2 | M |
| FR-SYL-14 | The system shall let the instructor start syllabus work as soon as the EduSuite student list is uploaded, even before block-section assignment is complete. | §1.2 | S |
| FR-SYL-15 | Each syllabus topic shall link to the CHED curriculum code(s) it maps to. | §1.2, §1.4 | M |
| FR-SYL-16 | The syllabus screen shall show, per topic, whether courseware has been generated for it yet. | §1.2 (mapped courseware) | S |
| FR-SYL-17 | The system shall support exporting an approved syllabus to a document format for institutional filing. | §1.2 | S |
| FR-SYL-18 | The system shall not expose model selection, prompt templates, or retrieval configuration on the syllabus screen. | §1.2 ("not a catalogue of configurable features") | M |
| FR-SYL-19 | When the instructor selects a course in Section 1, the system shall auto-fill Section 1 (Course, Course Title, Period Offered, Academic Year) and Section 2 (Course Description, Credit Units, Classification, No. of Hours, Prerequisites) from the CHED curriculum reference. | §1.2 (curriculum grounding), §1.4 (FR-CUR-06) | M |
| FR-SYL-20 | Section 1 (Course Information) and Section 2 (Course Description + metadata) shall be locked (read-only) after course selection — the instructor shall not be able to edit curriculum-sourced fields. | §1.2 (curriculum is fixed per CHED CMO No. 25 s. 2015) | M |
| FR-SYL-21 | Section 4 (Program Outcomes) shall be prefilled from the curriculum reference but remain editable — the instructor may add, edit, or remove program outcome rows. | §1.2, §1.5 (instructor adapts outcomes to the specific course) | M |
| FR-SYL-22 | No. of Hours shall be calculated as Credit Units × 18 (standard semester formula) and displayed as read-only in Section 2. | KCP institutional convention | M |

### 1.3 FR-CUR — Curriculum & Data Import (11)

| ID | Requirement | Source | Pri |
|---|---|---|---|
| FR-CUR-01 | The system shall accept a single, unified import of curriculum, subject-load, and student-roster files exported from EduSuite, primarily performed by the Associate Dean. | §1.2, §1.4, Appendix B.2 | M |
| FR-CUR-02 | The system shall not implement live, system-to-system synchronization with EduSuite. | §1.4 (explicit exclusion) | M |
| FR-CUR-03 | The import screen shall show a log of prior imports with timestamp, file, and row counts accepted/rejected. | Baseline for a data-entry feature | S |
| FR-CUR-04 | The system shall let the Associate Dean or Dean assign imported students to block sections. | §1.2, Appendix B.2 | M |
| FR-CUR-05 | The system shall let the Associate Dean or Dean manage block sections and their instructor assignments. | §1.2, Appendix B.2 | M |
| FR-CUR-06 | The CHED curriculum reference shall be used as grounding/reference data where relevant (subject pickers when building a syllabus, generation grounding) — not surfaced as its own browsable page or dashboard. | §1.2, §1.4; corrected per user feedback, July 2026: "CHED Curriculum... never to be used in the system as a separate entity but can be used in the description or info that relates to it" | M |
| FR-CUR-07 | The curriculum reference shall remain read-only in the app; it changes only when CHED replaces it. | §1.2 ("remains static until replaced by CHED") | M |
| FR-CUR-08 | The system shall support import even when no syllabus file yet exists, so setup does not block on syllabus readiness. | §1.2 | S |
| FR-CUR-09 | Import templates (expected column layout) shall be downloadable from the import screen. | Usability for a manual-upload workflow | S |
| FR-CUR-10 | The system shall reject and clearly report malformed import rows rather than silently dropping them. | Data-integrity baseline | M |
| FR-CUR-11 | The system shall not present CHED curriculum-mapping coverage as a tracked/exportable metric — no role's job is to monitor curriculum-mapping compliance as a distinct entity; only syllabus-to-courseware alignment (instructor-facing) and section/roster management are monitored. | Corrected per user feedback, July 2026 | M |

### 1.4 FR-CW — Courseware Generation, Review & Publication (20)

| ID | Requirement | Source | Pri |
|---|---|---|---|
| FR-CW-01 | The system shall generate courseware mapped to an approved syllabus via retrieval-augmented generation grounded in the syllabus and instructor-approved materials. | §1.2, §1.4 | M |
| FR-CW-02 | Generation shall be selectable by whole syllabus, by topic, or by content type (teaching materials, activities, assessments). | §1.2 | M |
| FR-CW-03 | Every generated item shall carry a visible, one-line grounding citation (which syllabus topic / curriculum reference it drew from). | §1.4, replaces cut Provenance/Grounding pages | M |
| FR-CW-04 | The instructor shall review each generated item before it can be published; no AI-generated courseware reaches students unreviewed. | §1.4 (explicit limitation) | M |
| FR-CW-05 | The instructor shall be able to edit a generated item's content and metadata before publishing. | §1.2 | M |
| FR-CW-06 | The instructor shall be able to publish an item immediately or schedule it against the syllabus timeframe. | §1.2, Fig. 2 step 3 | M |
| FR-CW-07 | The courseware list shall show status per item: generating / needs review / published / scheduled. | Usability baseline for the review queue | M |
| FR-CW-08 | The system shall re-flag published items as out of alignment when the source syllabus topic changes. | §1.1 | M |
| FR-CW-09 | The item editor shall support basic metadata (title, topic link, content type) and accessibility fields (alt text, reading level flag). | §1.4 (equitable access, SDG 4.3) | S |
| FR-CW-10 | The item editor shall not expose citation-formatting, localization, or multi-stage editorial-approval tooling beyond what one instructor needs to finish a draft. | §1.2 ("not a catalogue of configurable features") | M |
| FR-CW-11 | The courseware screen shall include an item bank view of previously generated/approved items, filterable by topic. | Consolidates former ItemBank page | S |
| FR-CW-12 | Generation shall show a live, plain-language progress state ("Retrieving syllabus context… Drafting… Checking alignment…") rather than exposing job-queue internals. | §1.2, replaces cut JobManager/Pipeline pages | M |
| FR-CW-13 | The system shall let the instructor regenerate a single item without regenerating the whole batch. | Usability for the review-and-refine loop | S |
| FR-CW-14 | The system shall log which model/provider generated an item internally, without surfacing model-selection controls to the instructor. | §1.4 ("configurable component rather than a model developed from scratch") | M |
| FR-CW-15 | The Dean shall have read access to all published courseware across the college. | §1.5 | M |
| FR-CW-16 | The system shall support the three content types named in scope: teaching materials, activities, assessments. No content type outside this list shall be added without a scope update to Ch. 1-2. | §1.2 | M |
| FR-CW-17 | Publishing an item shall notify enrolled students of that block section. | Fig. 2 step 4 (student access) | M |
| FR-CW-18 | The courseware screen shall not include AI-integrity scoring, plagiarism detection, or authorship-verification features. | §1.4 (explicit exclusion) | M |
| FR-CW-19 | The system shall allow export of a published courseware item to a common document/presentation/quiz file format. | §1.1 (parity with what instructors manually produced today) | S |
| FR-CW-20 | Consistency checking (generated content vs. syllabus) shall run automatically on generation and on syllabus edit — never as a manually triggered "QA suite." | §1.2 (IPO Process: "checking its consistency against the syllabus") | M |

### 1.5 FR-ASM — Assessment (13)

| ID | Requirement | Source | Pri |
|---|---|---|---|
| FR-ASM-01 | Students shall be able to take a published assessment (quiz/exam) within the platform. | Fig. 2 step 4 | M |
| FR-ASM-02 | The system shall auto-score objective item types and let the instructor grade open-response items. | §1.1 (reduce manual scoring burden) | M |
| FR-ASM-03 | Instructors shall be able to view and adjust a student's recorded score before it counts toward performance data. | §1.1 (instructor in full control) | M |
| FR-ASM-04 | The assessment screen shall show, per assessment, which syllabus topic it maps to. | §1.2 | M |
| FR-ASM-05 | Students shall see their own score and, where enabled, correct-answer review, immediately or on instructor-set release. | §1.5 (student benefit) | S |
| FR-ASM-06 | The system shall support timed assessments with an instructor-set duration. | Common assessment need, not exclusion-listed | S |
| FR-ASM-07 | The gradebook shall aggregate scores per student, per assessment, without a separate export/report destination. | §1.5 | M |
| FR-ASM-08 | The system shall not implement integration with the official KCP grading sheet or institutional term-grade computation. | §1.4 (explicit exclusion, future work) | M |
| FR-ASM-09 | The assessment editor shall reuse the courseware item bank rather than maintaining a separate question repository. | Consolidates former ItemBank page | S |
| FR-ASM-10 | The system shall record assessment attempts with timestamp, for the instructor's own review only (not a compliance/audit surface). | Baseline data integrity | M |
| FR-ASM-11 | The system shall not implement AI-based plagiarism detection or lockdown/proctoring features. | §1.4 (explicit exclusion) | M |
| FR-ASM-12 | Students shall be able to submit an appeal on a scored assessment to their instructor. | §1.5 (student agency) | C |
| FR-ASM-13 | The system shall support the assessment types named in scope (quizzes/exams as generated activity content); no separate "assessment security" console shall be added. | §1.4 | M |

### 1.6 FR-PERF — Performance Monitoring & Visualization (16)

| ID | Requirement | Source | Pri |
|---|---|---|---|
| FR-PERF-01 | The system shall visualize student performance against the syllabus, per topic, showing mastered vs. needs-review status. | §1.2, Fig. 2 step 5 | M |
| FR-PERF-02 | Students shall see their own performance view: which topics they've mastered, which need review. | §1.5 | M |
| FR-PERF-03 | Instructors shall see a class-level performance view across their own sections. | §1.5 | M |
| FR-PERF-04 | The Dean shall see a college-wide performance view, rolled up by instructor and by subject. | §1.5, §1.2 | M |
| FR-PERF-05 | The Dean's view shall indicate whether each instructor's syllabus is being satisfied in its delivery. | §1.2 | M |
| FR-PERF-06 | Score-based threshold alerts (e.g., students below a mastery cutoff) shall surface inside the Performance screen, not a separate alerting console. | §1.4 (score-based monitoring only) | M |
| FR-PERF-07 | The system shall not implement AI-based at-risk prediction beyond score-based monitoring. | §1.4 (explicit exclusion) | M |
| FR-PERF-08 | Performance data shall be computed from recorded assessment scores; no separate manual-consolidation step shall be required of the instructor. | §1.1 (the problem being solved) | M |
| FR-PERF-09 | The performance view shall support export to a shareable report (PDF/CSV) as an action on the screen itself, not a separate "Reports" destination. | §1.5 | S |
| FR-PERF-10 | Performance charts shall be filterable by section, subject, and date range. | Usability baseline | S |
| FR-PERF-11 | The system shall recompute topic mastery automatically when new scores are recorded — no manual refresh/recalculation step. | §1.1 | M |
| FR-PERF-12 | The Dean's compliance view shall flag syllabi with no recent courseware activity as a simple status, not a scored "compliance audit." | §1.2 | S |
| FR-PERF-13 | Student performance data shall be visible only to that student, their instructor(s), and the Dean. | §1.4 (data-handling, per Appendix B.3) | M |
| FR-PERF-14 | The system shall show historical trend (not just current snapshot) for a student's topic mastery. | §1.5 | S |
| FR-PERF-15 | Performance visualizations shall use plain mastery/needs-review language, not raw model-confidence or telemetry terms. | §1.2 (assistive framing) | M |
| FR-PERF-16 | The system shall not require a separate "KPI tracker" or project-success-metrics screen inside the product; those are researcher artifacts, not a system feature. | §2.4.1 (testing/evaluation is a study activity, not a shipped feature) | M |

### 1.7 FR-REV — Dean Review & Oversight (10)

| ID | Requirement | Source | Pri |
|---|---|---|---|
| FR-REV-01 | The Dean shall have a single Review Inbox listing syllabi and courseware pending approval. | §1.5 | M |
| FR-REV-02 | The Dean shall be able to approve or request changes on a pending syllabus, with a comment. | §1.5 | M |
| FR-REV-03 | The Review Inbox shall separate items by status: pending, approved, needs revision. | Usability baseline | M |
| FR-REV-04 | The Dean shall see a recent-activity feed (approvals, submissions, publications) on their dashboard, in place of a full audit-log console. | §1.5, replaces cut AuditLog page | S |
| FR-REV-05 | Requesting changes shall notify the instructor with the Dean's comment attached. | §1.5 | M |
| FR-REV-06 | The Dean shall be able to drill from the Review Inbox into the specific syllabus or courseware item under review. | §1.5 | M |
| FR-REV-07 | The system shall not implement a general-purpose policy-exception or approval-chain governance board beyond the syllabus/courseware review flow described in Fig. 2. | §1.2, §1.4 | M |
| FR-REV-08 | The Dean's oversight scope shall be the CIT only; multi-department oversight is out of scope. | §1.4 (delimited to CIT of KCP-Benguet) | M |
| FR-REV-09 | The Review Inbox shall show, per instructor, how many topics have generated-but-unpublished courseware. | §1.2 | S |
| FR-REV-10 | Dean-level reporting shall be reachable as an export action from Review Inbox / Performance, not a standalone "Reports" section. | §1.5 | S |

### 1.8 FR-GUIDE — Pulse, the Ambient AI Guide (26)

| ID | Requirement | Source | Pri |
|---|---|---|---|
| FR-GUIDE-01 | The system shall provide a persistent, docked AI guide ("Pulse") rather than a configuration panel, consistent with the assistive/prompt-guided model. | §1.2 | M |
| FR-GUIDE-02 | Pulse shall offer contextual help on the field, card, or chart currently focused or dwelt-on by the user. | §1.2 ("it asks and proceeds") | M |
| FR-GUIDE-03 | Contextual help shall be invoked by a left-click on a dwell-triggered badge, or by a keyboard shortcut when the element has focus — never by hijacking the browser's native right-click menu. | Platform/accessibility constraint (Ch.1-2 requires a responsive web app, §1.4) | M |
| FR-GUIDE-04 | Pulse shall be reachable via keyboard alone, for users who do not use a mouse. | §1.4 (responsive web application) | M |
| FR-GUIDE-05 | Pulse shall render as a 2D animated character (SVG/vector-animation based), not a real-time 3D rig. | §2.3 (six-month RAD build; mobile-web performance) | M |
| FR-GUIDE-06 | Pulse shall support at minimum these expression states: idle, curious, thinking, encouraging, cheerful, and gentle-concern. | Design response to user's mascot request | M |
| FR-GUIDE-07 | Pulse's "thinking" state shall be the user-visible indicator during courseware generation, replacing job-queue/pipeline dashboards. | §1.2, replaces cut JobManager/AIPipeline pages | M |
| FR-GUIDE-08 | Pulse shall walk the instructor through syllabus field completion on request (e.g., drafting an ILO from the CHED reference). | §1.2 | M |
| FR-GUIDE-09 | Pulse shall deliver the Fig. 2 scripted confirmation prompts ("Are you okay with the uploaded syllabus?", "What do you want to do next?") as part of its dialogue, not as a separate modal system. | §1.2, Fig. 2 | M |
| FR-GUIDE-10 | Pulse shall surface grounding citations conversationally on request ("This draws on Topic 3.2…") rather than via a standalone provenance viewer. | §1.4, replaces cut ProvenanceViewer/GroundingInspector pages | M |
| FR-GUIDE-11 | Pulse shall never present model-selection, cost-tier, or prompt-template controls; those remain internal. | §1.2 ("not a catalogue of configurable features") | M |
| FR-GUIDE-12 | Pulse's dialogue shall be dismissible with one action and shall not block the underlying screen (non-modal by default). | Usability baseline | M |
| FR-GUIDE-13 | Pulse shall respect `prefers-reduced-motion` and offer a static/reduced-animation mode. | Accessibility baseline | M |
| FR-GUIDE-14 | Pulse's per-role vocabulary shall differ (e.g., "flag students below threshold" for instructors/Dean; "here's what to review" for students), but the character and interaction model shall be identical across roles. | §1.5 (distinct benefits per beneficiary, same underlying system) | S |
| FR-GUIDE-15 | Pulse shall be draggable from its docked position by mouse or touch. | User request: draggable, task-specific guidance | M |
| FR-GUIDE-16 | Dropping Pulse onto a designated page zone (syllabus builder, courseware, curriculum, performance, review inbox) shall open a focused, conversational session scoped to that zone's task. | User request | M |
| FR-GUIDE-17 | The focused session shall dim/blur the rest of the screen so attention stays on the dropped-on zone and the assistant panel; the zone itself shall remain sharp and highlighted. | User request | M |
| FR-GUIDE-18 | Dropping Pulse outside a designated zone shall be rejected with a brief visual cue (not a silent no-op or an error dialog) and Pulse shall return to its docked position. | Usability — invalid actions need feedback | M |
| FR-GUIDE-19 | The focused session shall open by asking what the user wants to do, offering role-scoped intents specific to that zone (e.g., "Build a new syllabus" vs. "Edit an existing one") rather than a single generic prompt. | User request, Fig. 2 ("it asks and proceeds") | M |
| FR-GUIDE-20 | Once an intent is chosen, Pulse shall guide the user step by step, one step visible at a time, with the ability to go back, and a visible step count. | User request | M |
| FR-GUIDE-21 | The user shall be able to exit a focused session at any point (a dedicated exit control, or clicking outside the highlighted zone), which fully restores the page to its prior state. | User request | M |
| FR-GUIDE-22 | A guided step may link to another page when the task requires navigating there; following it shall exit the current focused session and carry the conversation forward as a normal Pulse message on arrival. | User request: "redirect the user to relevant pages" | M |
| FR-GUIDE-23 | Each zone's guidance shall be authored by a dedicated task-specific agent module (`src/agents/`), not by branching logic inside the Pulse component itself — a new workflow gets a new agent, not a rewrite of Pulse. | User request: "organized models... for the specific task," "framework in which the proper agent will be connected" | M |
| FR-GUIDE-24 | An agent shall declare which roles it applies to and which intents are visible to each role; Pulse shall refuse a drop (per FR-GUIDE-18) if the current user's role has no matching agent for that zone. | §1.2 (role-scoped access) | M |
| FR-GUIDE-25 | The agents directory shall be scoped to the five real EduPulse workflows (syllabus, courseware, curriculum/import, performance, review) — not to speculative subsystems (model governance, reviewer certification, licensing, forensic tooling) absent from Ch.1-2. | §1.2, §1.4 (governs scope of every agent added here) | M |
| FR-GUIDE-26 | Dragging shall not interfere with Pulse's existing click-to-chat behavior — a click (no meaningful pointer movement) opens the normal chat drawer; only a real drag-and-drop enters the focused zone mode. | Usability — the two interaction modes must not conflict | M |

### 1.9 FR-SET — Settings (9)

| ID | Requirement | Source | Pri |
|---|---|---|---|
| FR-SET-01 | Settings shall expose exactly one AI-provider control: a choice between a locally hosted model and a free API key, entered once. | §1.4, §2.3 ("plug-and-play… does not depend on paid AI services") | M |
| FR-SET-02 | Settings shall not expose model registries, adapters, circuit breakers, or per-model tuning parameters. | §1.4 | M |
| FR-SET-03 | Settings shall include Account (name, email, password) and Appearance (theme, font scale) sections. | Usability baseline | M |
| FR-SET-04 | Settings shall include a Notifications section to control which events generate an in-app notification. | Usability baseline | S |
| FR-SET-05 | Settings shall include a Data & Privacy section limited to: export my data, request account data deletion. | §1.4 (data-handling practices, Appendix B.3) | M |
| FR-SET-06 | Settings shall not include a tenant-wide feature-flag or integrations catalog. | §1.2 ("not a catalogue of configurable features") | M |
| FR-SET-07 | Language selection (English/Filipino) shall live in Settings, not the top bar, once a user has set a preference. | Usability consolidation | C |
| FR-SET-08 | The AI-provider control shall be visible to Dean and Instructor roles only; Students shall not see AI configuration. | §1.2 (instructor-authored, instructor-controlled) | M |
| FR-SET-09 | Every Settings change shall take effect without a page reload. | Usability baseline | S |

### 1.10 FR-NOTIF — Notifications (6)

| ID | Requirement | Source | Pri |
|---|---|---|---|
| FR-NOTIF-01 | The system shall notify instructors when a syllabus is approved or returned for changes. | §1.5 | M |
| FR-NOTIF-02 | The system shall notify students when new courseware is published to their section. | Fig. 2 step 4 | M |
| FR-NOTIF-03 | The system shall notify instructors when generation for a requested batch completes. | §1.2 | S |
| FR-NOTIF-04 | The Dean shall be notified when a syllabus or courseware item is submitted for review. | §1.5 | M |
| FR-NOTIF-05 | The notification bell shall show an unread count and open a scrollable list from the top bar. | Usability baseline | S |
| FR-NOTIF-06 | The system shall not generate notifications for internal system-operations events (job retries, model latency, storage). | §1.2 (no ops console in scope) | M |

### 1.11 FR-HELP — Help & Support (5)

| ID | Requirement | Source | Pri |
|---|---|---|---|
| FR-HELP-01 | The system shall provide a single Help & Support destination reachable from the top bar on every screen. | Usability baseline | M |
| FR-HELP-02 | Help content shall cover the five-step workflow in Fig. 2 in plain language. | §1.2 | M |
| FR-HELP-03 | Help shall include a contact path to institutional technical support. | §2.4.2 (post-deployment support) | S |
| FR-HELP-04 | The system shall not maintain a separate multi-tab knowledge-base/training-module authoring surface. | Scope discipline (six-month build, §2) | M |
| FR-HELP-05 | Static legal pages (Privacy Policy, Terms of Use) shall be reachable from the footer, outside the authenticated shell. | Baseline legal requirement | M |

---

## 2. Non-Functional Requirements

### 2.1 NFR-PERF — Performance (5)

| ID | Requirement | Source | Pri |
|---|---|---|---|
| NFR-PERF-01 | Dashboard and Performance views shall render initial content within 2 seconds on a typical campus connection. | Usability baseline | S |
| NFR-PERF-02 | Courseware generation shall show progress feedback (via Pulse) within 1 second of request, even if generation itself takes longer. | §1.2 | M |
| NFR-PERF-03 | The system shall page or lazily load large lists (student rosters, courseware banks) rather than loading them in full. | Engineering baseline | S |
| NFR-PERF-04 | Pulse's animation assets shall not add more than ~300KB to initial page weight, given the mobile-web target. | §1.4, §2.3 | S |
| NFR-PERF-05 | The system shall function acceptably on standard institutional internet connectivity; the system requires internet access and has no offline mode. | §1.4 (explicit: requires internet connectivity) | M |

### 2.2 NFR-SEC — Security & Privacy (9)

| ID | Requirement | Source | Pri |
|---|---|---|---|
| NFR-SEC-01 | Student score and performance data shall be accessible only to that student, their instructor(s), and the Dean. | Appendix B.3 (interview: data-handling practices) | M |
| NFR-SEC-02 | Passwords shall be stored hashed, never in plaintext or reversible form. | Security baseline | M |
| NFR-SEC-03 | All authenticated routes shall require a valid session; expired sessions shall redirect to login. | Security baseline | M |
| NFR-SEC-04 | Uploaded curriculum/roster/syllabus files shall be scanned for type and size before processing. | Security baseline for file upload | M |
| NFR-SEC-05 | AI provider API keys (when the hosted-API option is used) shall be stored server-side only, never exposed to the browser. | §2.3 | M |
| NFR-SEC-06 | The system shall not implement a general security-operations console (session management, access-control policy editor) as a user-facing feature. | §1.4 (no such feature in scope) | M |
| NFR-SEC-07 | Data exports (performance reports, syllabus documents) shall be scoped to what the requesting role is permitted to see. | §1.4 | M |
| NFR-SEC-08 | The system shall log authentication and data-export events internally for institutional accountability, without exposing a searchable audit console as a product feature. | §1.4, replaces cut AuditLog/SecurityCenter pages | S |
| NFR-SEC-09 | The system shall not implement AI-based plagiarism/integrity scoring anywhere in the product. | §1.4 (explicit exclusion) | M |

### 2.3 NFR-ACC — Accessibility (7)

| ID | Requirement | Source | Pri |
|---|---|---|---|
| NFR-ACC-01 | All interactive elements shall be reachable and operable by keyboard alone. | §1.5 (SDG 4.3, equitable access) | M |
| NFR-ACC-02 | Pulse's contextual-help affordance shall have a non-hover, non-pointer path to invoke (see FR-GUIDE-04). | Accessibility constraint | M |
| NFR-ACC-03 | Text shall meet WCAG AA contrast in both light and dark themes. | Accessibility baseline | M |
| NFR-ACC-04 | The system shall respect `prefers-reduced-motion` for Pulse and all transition animation. | Accessibility baseline | M |
| NFR-ACC-05 | Font scale shall be user-adjustable from Settings without breaking layout. | Accessibility baseline | S |
| NFR-ACC-06 | All non-decorative images and generated content flagged with accessibility metadata shall carry alt text. | §1.5 (SDG 4.3) | S |
| NFR-ACC-07 | Skip-to-content and landmark roles shall be present on every authenticated screen. | Accessibility baseline | M |

### 2.4 NFR-USE — Usability (7)

| ID | Requirement | Source | Pri |
|---|---|---|---|
| NFR-USE-01 | The top navigation bar shall expose no more than 5 primary sections per role. | Response to nav audit finding | M |
| NFR-USE-02 | Secondary, section-specific navigation shall live in a contextual left sidebar, not the top bar. | Response to nav audit finding | M |
| NFR-USE-03 | No screen shall present AI-internal mechanics (model choice, retrieval tuning, job scheduling, prompt templates) as user-configurable controls. | §1.2 (governing usability constraint) | M |
| NFR-USE-04 | Every top-level navigation label shall use plain product language, not internal system/vendor terminology (e.g., "Review Inbox" not "Agentic Review Queue"). | §1.2 (assistive framing) | M |
| NFR-USE-05 | New pages shall not be added to the product without a corresponding requirement in this document. | Maintainability/scope-discipline, response to REQ-3120 finding | M |
| NFR-USE-06 | Orphaned/unrouted page components shall not exist in the shipped build. | Response to audit finding (7 dead files) | M |
| NFR-USE-07 | Each route shall be registered exactly once; duplicate route registrations are a defect. | Response to audit finding (`/file-import`, `/privacy` collisions) | M |

### 2.5 NFR-REL — Reliability (4)

| ID | Requirement | Source | Pri |
|---|---|---|---|
| NFR-REL-01 | A failed generation request shall be retryable by the instructor without data loss to the syllabus or in-progress edits. | §1.2 | M |
| NFR-REL-02 | Import failures shall report which rows failed and why, without discarding successfully imported rows. | §1.4 | M |
| NFR-REL-03 | The system shall auto-save syllabus and courseware drafts periodically during editing. | Usability/reliability baseline | S |
| NFR-REL-04 | System errors shall surface a plain-language message (via Pulse or an inline toast), never a raw stack trace, to non-technical users. | §1.2 (assistive framing) | M |

### 2.6 NFR-COMPAT — Compatibility & Responsiveness (5)

| ID | Requirement | Source | Pri |
|---|---|---|---|
| NFR-COMPAT-01 | The system shall be a responsive web application, usable on desktop and tablet viewports. | §1.4 | M |
| NFR-COMPAT-02 | A native mobile application is explicitly out of scope. | §1.4 (explicit exclusion) | M |
| NFR-COMPAT-03 | The top bar shall collapse to a mobile menu below 768px without losing section labels to icon-only tooltips. | Response to nav audit finding | M |
| NFR-COMPAT-04 | The system shall support current versions of Chrome, Edge, and Firefox. | Baseline for institutional deployment | S |
| NFR-COMPAT-05 | Pulse and the left sidebar shall degrade gracefully (collapse/hide) on narrow viewports rather than overflow. | Usability baseline | M |

### 2.7 NFR-AI — AI Layer (8)

| ID | Requirement | Source | Pri |
|---|---|---|---|
| NFR-AI-01 | The AI layer shall be configurable in a plug-and-play manner: a locally hosted open-source model or a free API key. | §1.4, §2.3 | M |
| NFR-AI-02 | The system shall not require a paid AI service to function. | §1.4 | M |
| NFR-AI-03 | All generation shall be grounded via retrieval-augmented generation over the CHED curriculum, the official syllabus, and instructor-approved materials. | §1.2, §1.4 | M |
| NFR-AI-04 | Generated content shall carry a traceable link back to its grounding source, surfaced via Pulse (FR-GUIDE-10), not a separate analytics page. | §1.4 | M |
| NFR-AI-05 | The AI layer shall not be developed as a custom model from scratch; it is configured, not trained, by this project. | §1.4 | M |
| NFR-AI-06 | Consistency-checking of generated content against the syllabus shall run automatically, with no manual test-suite invocation exposed to users. | §1.2 | M |
| NFR-AI-07 | AI-generated content shall never publish to students without instructor review and explicit publish action. | §1.4 (governing constraint) | M |
| NFR-AI-08 | The system shall not implement AI-based at-risk prediction, integrity scoring, or plagiarism detection anywhere. | §1.4 (explicit exclusion, applies system-wide) | M |

### 2.8 NFR-MAINT — Maintainability (4)

| ID | Requirement | Source | Pri |
|---|---|---|---|
| NFR-MAINT-01 | Every requirement ID in code comments shall reference an ID in this document; free-floating `REQ-####` tags with no traceable source are prohibited. | Response to audit finding (REQ-3120 sprawl) | M |
| NFR-MAINT-02 | Mock/sample data files shall document, per exported constant, which requirement(s) it backs. | Response to audit finding (53 untraceable `mockData.js` exports) | S |
| NFR-MAINT-03 | Adding a new top-level navigation item shall require updating this document first. | Scope-discipline, closes the loop that produced the 29 cut pages | M |
| NFR-MAINT-04 | Components under `src/pages/` shall each be reachable from at least one route; unreachable page files shall be deleted, not left in the tree. | Response to audit finding (7 orphaned files) | M |

---

## 3. Summary

| Category | Count |
|---|---|
| Functional requirements | 160 |
| Non-functional requirements | 49 |
| **Total** | **209** |

**Revision note (July 13 2026, second pass).** Two changes since the initial 190-item baseline: (1) FR-AUTH grew from 9 to 12 items to correct the role model from three roles to four, restoring Associate Dean as a distinct role per Appendix B.2 — a genuine correction, not scope creep; (2) FR-GUIDE grew from 14 to 26 items to specify Pulse's drag-and-drop, drop-to-focus conversational mode, and the `src/agents/` task-specific agent framework. A much larger 500+ item specification for the same feature was proposed and declined — it reinstated System Admin as a role and most of the enterprise-ops subsystems (reviewer SLA/certification, psychometric validation, licensing/legal review, translation backlogs, prompt A/B-testing, forensic audit tooling, cost/quota forecasting) that the original audit removed for having no basis in Chapter 1-2. The 12 new items above are the scoped equivalent: every one traces to either the user's specific request or an existing Ch.1-2 citation, and none reintroduce a cut subsystem.

**Revision note (July 14 2026, third pass).** FR-SYL grew from 18 to 22 items: (3) FR-SYL-19 through FR-SYL-22 specify the syllabus section-locking rule — Sections 1 and 2 auto-fill from the CHED curriculum reference when a course is selected and are locked (read-only); Section 4 (Program Outcomes) is prefilled but editable. This enforces the business rule that curriculum-sourced course data (classification, prerequisites, credit units, no. of hours, description) is immutable in the syllabus, while the instructor retains control over program outcomes and all other editable sections.

Every requirement above cites a specific section of Chapters 1–2, or an audit finding that this document exists to close. Nothing here targets a page, dashboard, or control that Chapter 1 or 2 does not describe.
