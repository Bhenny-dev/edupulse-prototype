# EduPulse — System Specifications (Core-Concept Scope, v2.5)

**EduPulse: An AI-Driven Learning Management System for the College of Information Technology, King's College of the Philippines–Benguet**

> v2.5 aligns this summary with the **final paper (Chapter 1 & 2, July 2026)**; paper section references are cited throughout so panels can trace every rule. v2.0 reworked the system around a single core concept per the adviser's guidance.
>
> **Implemented (2026-07-09):** the v2.5 rules below are now reflected in the live modular prototype (`prototype/index.html` + `assets/*.js`) — scoring sheet / Score Visualization terminology, the four fixed templates including **EduPulse-DOC v1**, per-activity **Completed/Missed** status, **Midterm/Finals** term labels (grouping only, no term-grade computation), and the **read-only** auto-recorded scoring sheet.

---

## 1. Core Concept (paper 1.2, 1.4)

Curriculum → Syllabus → AI-generated content → Instructor control → Secure delivery → Automatic scoring → Scoring sheet → Score visualization & performance summaries with score-based suggestions.

1. The **CIT Dean** maintains the curriculum (subjects, units, **prerequisites**), assigns instructors their **subject loads**, organizes students into block sections through **section rosters**, and configures the college-wide **grading term scheme (Midterm and Finals) — labels/grouping only; no term-grade computation** (1.2, 1.5, IPO figure).
2. Each **Instructor** (one or more subjects, multiple sections) builds a **KCP-format syllabus** organized as **topics with subtopics** — each topic has a flexible timeframe and a **varied** list of planned lessons/activities (1.2, 1.4).
3. The **AI** parses each topic and generates a labeled **content pack** — one section per planned item (1.4):
   - *document* → reading materials as **DOCX, XLSX, or PDF** via the fixed **EduPulse-DOC v1** prompt
   - *presentation* → PPT slide deck via **EduPulse-PPT v1**
   - *quiz* → **MCQ-only** quiz via **EduPulse-QUIZ v1** (per-item explanation + topic tag)
4. Instructors **edit / add / remove / upload**; nothing is published without instructor review (1.4; Fig 2).
5. On any edit, the **AI Consistency Checker** (EduPulse-CHECK v1) diffs the change, flags related inconsistencies, and offers exactly three actions: **Accept suggestion / Edit manually / Keep as is** (1.4, 2.2).
6. Students answer quizzes in the **Secure Answering Environment**: independent full-screen view, no back-navigation, instructor-set countdown timer, **each answer choice individually hidden (blurred) and readable only while hovered** with copy/select disabled, focus-loss warnings, **3rd violation or timer expiry auto-submits**. Exit only by submitting or hitting the violation limit; rules disclosed before the attempt (1.4, 2.1.1 ethics). Immediate post-attempt results with per-item explanations; **ungraded practice retakes** (rephrased items generated through EduPulse-QUIZ v1) feed only the student's personal practice log (1.4, 1.5).
7. **Score visualization module (instructor-exclusive, read-only):** quiz results are **automatically recorded into the EduPulse scoring sheet** — no manual score entry. Records are organized by **student, subject, section, and semester**, grouped per term (Midterm/Finals labels), each activity marked **Completed/Missed** per the set timeframe, with **highest score, lowest score, and class average per activity**, for **visualization, evaluation, and follow-up/consultation** purposes. Students see their own scores and answered work (transparency for grade consultations) (1.4, 1.5, IPO).
8. **Performance summaries:** students get score visualizations per activity/subject with **score-based suggestions of topics to review**; instructors get per-subject summaries identifying **topics/subtopics to consider re-teaching**; the Dean has view-only oversight of class performance (1.4, 1.5, IPO). Projections are **score-based only** — no AI/behavioral at-risk prediction (1.4 exclusions).

## 2. Roles & Rules (paper 1.2, 1.4)

| Rule | Detail |
|---|---|
| Instructor load | One or more subjects per semester (Dean-assigned subject loads); multiple classes/sections |
| Student enrollment | Roster-based: block sections enroll as a unit; max 1 section per subject |
| Curriculum & assignments | Dean-only; prerequisite gates enforced |
| Score records | Auto-recorded on submission; instructor-exclusive view rights; Dean views; students see own rows |
| Syllabus approval | Dean oversight; instructor authors; approval before generation/publication use |

## 3. Activity & Content Types (narrowed set — paper 1.4)

AI-generated: **Document (DOCX/XLSX/PDF reading materials) · Presentation (PPT) · Quiz (MCQ)**. Manual instructor uploads: File · URL · Label.
Per-activity settings: open/close dates, timer (quiz), attempts, completion prerequisite, shuffle, score release, per-section visibility. College-level setting: term scheme labels (Midterm and Finals). Anti-cheat policy is fixed (individually hidden hover-reveal choices + copy disabled + 3 violations = auto-submit).

## 4. Architecture (deliberately simple 3-tier — paper 2.3)

- **Client:** React + Tailwind (responsive web). Secure environment uses Fullscreen API + Page Visibility API + focus/blur events + navigation guards.
- **API:** Node.js + Express — auth/RBAC, curriculum, syllabus, generation orchestration, activities, attempts, score recording, performance summaries, audit logs.
- **Data:** cloud database service (Firebase: Firestore, Storage, Auth).
- **AI:** hosted LLM called server-side with the **four fixed, versioned prompt templates only** (DOC / PPT / QUIZ / CHECK), placeholders auto-filled from the parsed syllabus. JSON output validated → stored as draft → instructor review → publish. Instructors never write prompts; no student-facing chat (1.4, 2.3).

## 5. Data Model (key entities)

users · curriculum_subjects · subject_prerequisites · teaching_assignments · sections/enrollments · syllabi · syllabus_topics · content_packs/sections · quizzes/quiz_items · attempts (+ violation events) · submissions · **score_columns/score_records (+ completed/missed status)** · consistency_findings · audit_logs.

## 6. Explicitly Out of Scope (paper 1.4 Scope & Limitations)

RAG knowledge repository & AI tutor/chat · AI integrity scoring, plagiarism detection, behavioral profiling, at-risk prediction beyond score-based projections · non-MCQ item types · **integration with the official KCP grading sheet and institutional term-grade computation (future work; EduPulse score records remain applicable to it)** · native mobile app · attendance/forums/wikis/chats/workshops/SCORM/H5P/IMS · institution-wide rollout.

## 7. Evaluation (paper 2.4.1)

**Researcher-made user-acceptance questionnaire**, validated by the capstone adviser and IT experts and pilot-tested before administration; purposively selected Dean/instructor/student respondents rate each item on a **4-point Likert scale**; analysis via frequency and percentage distributions plus **weighted mean** per criterion and overall, interpreted with the paper's Table 1 scale (Highly Acceptable → Not Acceptable). Preceded by technical testing (unit, integration, system) and usability testing.
