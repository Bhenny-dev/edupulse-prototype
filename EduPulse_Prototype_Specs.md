# EduPulse — Prototype Specification (v2.5)

> **Implementation status (2026-07-10):** the codebase now holds a **single live version** — `index.html` plus the role pages (`dean/`, `instructor/`, `student/`) and shared `assets/*.js` (login title reads "Prototype v3.0"). The legacy single-file `EduPulse_Prototype.html` (v2.2) and all `_backup-*` snapshots have been removed; going forward, updates are made directly to this codebase in place rather than as separate versioned copies. **Open `index.html` to run the current prototype.**

## v2.6 changes — syllabus category model + submission bins + editable scoring sheet (July 2026)

Aligns the prototype with the revised paper. New syllabus-builder **setting pipeline**: **time-framed Topic → Subtopics (⠿ draggable to reorder) → tap a Subtopic → its two category sets and their contents.**

- **Fixed category set (replaces the old open activity list).** Every subtopic groups its entries under two sets:
  - **Teaching and Learning Material Categories:** Lecture / Discussion (Word/PDF) · Presentation (PPT).
  - **Activities & Assessments Category:** Recitation (Word/PDF) · Short Quiz (Multiple Choice) · Seatwork (Word/PDF) · Practical Exercise (Word/PDF) · Examination (Word/PDF/Multiple Choice).
  - Removed categories (Demonstration, Video, Group Activity, Case Study, Laboratory, Debate, Workshop, Career Talk, Guided Research, Brainstorming, Output Submission, Reflection Paper, Rubric-graded, Capstone) are remapped into the set above; seed data updated so nothing renders blank.
- **AI generation = 3 generators + 1 check.** Documents are **Word/PDF only (XLSX dropped)**; the three fixed content generators are Document (Word/PDF), Presentation (PPT), Short Quiz/Examination (MCQ), plus EduPulse-CHECK. Format selectors and the "Documents (.docx / .xlsx / .pdf)" labels are now Word/PDF.
- **Submission bin per activity (instructor-configured).** Each activity/assessment carries a submission bin set **Applicable** (students submit within EduPulse) or **Not applicable** — rubric-guided work students complete outside the system; its score is then **entered manually** in the scoring sheet.
- **Editable scoring sheet (reverses the v2.5 read-only rule).** Every score cell is an editable input: the instructor can **override any auto-recorded score** or enter a score for an offline/rubric-guided activity; entering a score clears a *Missed* flag, and Hi / Lo / Class Average and per-student totals recompute automatically.
- **Draggable subtopics** (in addition to the existing draggable, auto-timeframed topics).

## v2.5 changes — paper-final alignment (Chapter 1 & 2, July 2026)

All terminology, features, and flows now trace to the final paper; section references are given so panels can verify.

- **Renames (paper 1.4, Figs 1–3):** EduPulse *grading sheet* → **EduPulse scoring sheet**; instructor *Grading Sheet* page → **Score Visualization**; *Class Analytics* → **Class Performance**; student *My Analytics* → **My Performance**; Dean *Oversight Analytics* → **Oversight / Class Performance**; "descriptive/predictive/prescriptive analytics" labels → **performance summary / score-based projection / score-based suggestions of topics to review** (1.4 allows projections only when score-based).
- **Added — EduPulse-DOC v1 (paper 1.4: four fixed templates):** fourth fixed, versioned prompt template generating **documents (reading materials as DOCX, XLSX, or PDF)** per planned item; shown beside PPT/QUIZ/CHECK in the fixed-prompt modals. AI content types are exactly three: Document, Presentation (PPT), Quiz (MCQ); File/URL remain manual instructor uploads.
- **Real generated files (paper 1.4 scope):** Course Content sections open as **actual `.pptx`/`.docx`/`.xlsx`/`.pdf` files**, built client-side (vendored PptxGenJS / docx / jsPDF / SheetJS, offline — no server, no HTML-mimic popup) from the syllabus-mapped content each section already carries; format for Documents is auto-picked by content nature (rubric/scored items → Excel, narrative guides → Word) with a PDF export always available. Editing a section's draft text now actually persists and changes the file it produces.
- **Added — Completed/Missed status (paper 1.4):** each posted activity is auto-marked **Completed** or **Missed** per student based on the set timeframe; shown in the instructor scoring sheet and student My Scores.
- **Added — Dean term scheme, labels only (paper 1.2, 1.5, IPO figure):** Academic Settings again carries the college-wide **Midterm and Finals** term scheme; the scoring sheet groups activity columns per term. **No term-grade computation** (MG/TFG/FG stay excluded per 1.4).
- **Removed — manual score editing (paper 1.4):** the scoring sheet is **read-only**; scores appear automatically when students answer. Instructor actions are limited to viewing, filtering, and follow-up/consultation.
- **Removed — INTL (International/Irregular) roster (plan §D4):** the final IPO figure names only "Student rosters (sections)"; the INTL roster is not in the paper as basis, so Dean → Students & Enrollment, instructor → Students & Enrollment, and the scoring sheet now carry only the regular block-section rosters (BSIT 1A/1B/2A).
- **Decisions applied (plan §F):** practice retakes generate rephrased items **through EduPulse-QUIZ v1** (no fifth AI use); recap/re-quiz announcements kept as ordinary instructor actions; per-student total + running average kept, justified under "performance summaries."
- **Removed — Dean Oversight & Audit page:** the standalone "Oversight & Audit" nav item/page (class-performance-by-subject chart, privileged-action audit trail log, and PDF/CSV report export buttons) is not named in the paper's IPO figure or Dean flows, so it's been dropped; scattered "audit trail" / "audit-logged" phrasing elsewhere in the Dean UI was cleaned up to match. Dean now has 5 nav items: Dashboard, Academic Settings, Curriculum, Instructor Assignment, Students & Enrollment.

## v2.4 changes — grading module rescoped *(superseded terms: read "scoring sheet" for "grading sheet" throughout)*

- **EduPulse grading sheet (replaces the KCP grading-sheet mirror):** the instructor grading page now records the scores of the **graded activities given by the instructor within EduPulse**, organized by **student, subject, section, and semester**. Once the individual scores are updated in the sheet, it computes the **highest score, lowest score, and class average per activity**, plus each student's total and running average (%).
- Removed from the prototype: Midterm/Finals term tabs, 60% Class Standing + 40% Exam columns, MG/TFG/FG computation, UD column, and the Dean's grading term-scheme setter. Term markers (Midterm/Final exam weeks) remain **only** in the official KCP syllabus format.
- **Student · My Scores:** term-grade KPIs (MG/TFG/FG) replaced with recorded-activity count, total score, and running average; predictive analytics now project the running average instead of FG.
- **Future integration & improvements (out of prototype scope):** export/integration with the official KCP grading sheet and its institutional term-grade computation (60/40, FG = average of term grades).

## v2.3 additions

- ~~Roster-based sectioning (Dean → Students & Enrollment): block sections (BSIT 1A/1B) hold student rosters — applying a roster enrolls every rostered student to a subject and its instructor in one action, never individually. A separate INTL (International/Irregular) roster holds students without a block section, enrolled per subject around individual (cluttered) schedules with prerequisite/duplicate/clash checks.~~ **(INTL roster removed in v2.5 — see below; block-section rostering itself stands.)**
- **Instructor now carries 3 subjects** (GE EELECT-IT, CC-INTCOM11, IT-WST21 — assigned by the Dean) so every instructor page demonstrates subject lists, per-subject page modals, and different states (approved/draft syllabi, generated/ungenerated packs, with/without analytics data; grading shows an empty-state sheet for subjects without records).
- **Analytics semantics:** Total and Average are shown as *gained score / perfect score* with the percentage of that scale; High and Low show the highest and lowest **individually gained** scores (overall and per activity).
- **Quiz results page:** every attempt ends on a concluding page — score ring (gained/perfect + %), items-answered list, per-item **Review** modal (evaluation of why the chosen answer is wrong + an elaboration giving wider context on the correct answer), and a descriptive / predictive / prescriptive analysis of the attempt.
- **Practice retakes (ungraded):** from Quiz Reviews and the analytics Practice buttons — the AI presents **rephrased versions of the same items**; results never touch the grading sheet and feed only the student's personal **Practice growth** log in My Analytics, where improvement over the graded attempt is tracked.
- **Spacing pass:** list items, popovers (scrollable, max-height), sheets, KPI chips, and week headers re-spaced; text wraps instead of overlapping; action clusters wrap on narrow widths.


The **live prototype** is the modular build: open `prototype/index.html` (role pages under `dean/`, `instructor/`, `student/` with shared logic in `assets/*.js`). AI behavior is **simulated** for design validation; the flows, labels, and rules match the final paper (Chapter 1 & 2) and the SRS exactly. (`EduPulse_Prototype.html` is the superseded single-file **v2.2 legacy** build.)

## v2.2 — subject-rooted pages + complete popover/modal system

Three overlay layers everywhere (no dropdowns): **page modal** (full "sheet" that opens from a subject card) → **popover** (anchored card that opens on tap of any item/action) → **modal** (centered form for follow-up input). All action buttons now have real flows.

- ~~Term scheme is Dean-owned (grading tabs and FG formula adapt everywhere)~~ **(superseded in v2.4)** — the Dean still sets the semester/AY in Academic Settings, but grading is activity-based; term markers survive only in the syllabus format.
- **Syllabus Builder:** lists the subjects the Dean assigned to the instructor; each subject has its own individual syllabus (page modal). Tapping a topic opens a **popover** (ILO, subtopic chips, planned items); tapping a subtopic opens a **modal** with its guide/direction notes; edit/add topic and add-subtopic are modals. The Dean can open any syllabus in Dean-edit mode.
- **Course Content:** every section opens an actions **popover** (preview + Edit ▸ editor modal · Regenerate ▸ options modal · Restrictions ▸ modal · Publish/Unpublish ▸ modal · Remove ▸ confirm modal); topic-level: Add section ▸ type popover ▸ form modal, Upload notes/documents ▸ modal, Publish topic ▸ sections/schedule popover ▸ confirm modal.
- **Consistency Checker:** "Edit manually" opens an **inspection popover** showing the affected file with the flagged part highlighted, so the instructor can scan and judge first — then Apply AI suggestion / Edit the flagged part (modal) / Not applicable.
- **Class Analytics (per subject):** subject card ▸ page modal with total/average/high/low KPIs, per-activity statistics, per-item analysis popovers (distribution + prescriptive feedback), and low-mastery interventions: **Post recap review** / **Schedule re-quiz** ▸ announcement modal posted to students.
- **Student · My Subjects:** enrolled subject card ▸ page modal showing the instructor-posted syllabus; every material (lecture notes, PPT, quiz, recitation guide, file) opens a **popover** with preview → reader modal or secure quiz start.
- **Student · My Scores:** subject card ▸ page modal (recorded-activity KPIs + record list) ▸ record **popover** with grade detail + prescriptive analysis + review link; missing items flagged.
- **Student · Quiz Reviews:** subject card ▸ page modal listing answered quizzes ▸ per-item review with a prescription line per item.
- **Student · My Analytics** (replaces "What to Review"): descriptive (progress, submission rate over all documents/forms/quizzes/answers), predictive (projected running average + risk per subject incl. missing-activity impact), prescriptive (ranked next actions), and full topic-mastery map.
- **Dean side additions:** Academic Settings (semester/AY term setup with effect preview), Students & Enrollment (manage popovers, enroll/move-section modals with rule checks), curriculum Manage popovers (edit/assign/open syllabus/archive), Dean-edit access to any syllabus. *(Oversight reports + audit trail removed in v2.5 — see above.)*

## Design system (v2.1 — 2026 "formal glass + 3D depth" direction)
Researched from current 2026 UI-trend guidance (refined glassmorphism, spatial depth, tactile neo-3D components):

- **Typography:** Plus Jakarta Sans (headings/numbers) + Manrope (body) — geometric, professional 2026 favorites (Google Fonts).
- **Color:** ink `#171A3F`, deep navy `#1B2559`, primary indigo `#3D5AF1` (gradient `#4E6BFF→#2A41C8`), AI violet `#7C3AED`, emerald/amber/red for status; soft gradient-mesh page background (indigo/violet/emerald radial washes).
- **Glass surfaces:** translucent white cards (`rgba(255,255,255,.74)`) with `backdrop-filter: blur(18px) saturate(1.25)`, hairline white borders, layered elevation shadows (3 tiers).
- **3D effects:** claymorphic buttons with gradient fill, inner top highlight + inner bottom shade, hover lift (`translateY(-1.5px)`) and pressed state (`translateY(1px)` + inset shadow); raised topic number tiles; glass modals with spring pop-in animation; segmented controls with inset track + floating knob; dark glass sidebar with glowing active pill.
- Purple always marks AI-origin UI; AI content is always labeled.

## v2.1 functional additions
1. ~~Grading term scheme — Midterm + Finals (FG = average of the two term grades)~~ **(superseded in v2.4 by the activity-based EduPulse grading sheet).**
2. **Topic/subtopic syllabus** — the plan is a list of topics, each with a flexible timeframe (e.g., "Wk 5–6"), ILOs, subtopic chips, and a **varied** set of planned lessons/activities; AI generates one section per planned item, so packs differ per topic.
3. **Individually hidden choices** — in the secure environment each choice's text is blurred **independently**; only the hovered choice reveals (no group reveal), selection/copy/cut/right-click disabled.

## Screens by role

**Login** — role picker (Dean / Instructor / Student).

**Dean (5):** Dashboard (syllabus pipeline, attention points) · Academic Settings (semester/AY + **Midterm and Finals term scheme — labels only**) · Curriculum (subjects CRUD + prerequisite configuration, versioned) · Instructor Assignment (subject loads, multi-section rule check) · Students & Enrollment (roster-based enrollment, prerequisite/duplicate/section-capacity checks).

**Instructor (6):** Dashboard (this week's plan, re-teach flags) · Syllabus Builder (KCP weekly outline as structured data; edit row → triggers consistency check) · Course Content (per-topic packs; generate with AI → simulated generation log; edit/regenerate/remove sections; upload documents; publish per section; **⚙ Restrictions** modal: open/close, timer, attempts, completion prerequisite, shuffle, release + fixed anti-cheat policy; **View fixed prompt** modals show EduPulse-DOC v1 / EduPulse-PPT v1 / EduPulse-QUIZ v1 verbatim) · Consistency Checker (detected edit → findings with severity → Accept / Edit manually / Keep as is) · Score Visualization (EduPulse scoring sheet: BSIT 1A/1B tabs; one **read-only** column per instructor-posted activity with ⚡ auto-recorded quiz scores; activity columns grouped by term (Midterm/Finals); **Completed/Missed** mark per student per activity; Hi / Lo / Class Average footer rows per activity; per-student total + running average) · Class Performance (per-subject performance summaries, topics to consider re-teaching with evidence, item analysis).

**Student (5):** Dashboard (open/locked activities, review topics) · My Subjects (one section per subject; published weeks) · My Scores (recorded-activity / total / running-average cards, **Completed/Missed** status per activity + every recorded score linked to answered work) · Review Quiz (answer vs. correct + explanations + topic tags) · My Performance (performance summary, score-based projection, and score-based suggestions of topics to review with links).

**Secure Answering Environment** — independent full-screen popover (requests real browser fullscreen): countdown timer (pulses red < 60 s), violation dots, MCQ items with question navigator, submit confirmation. **Real** anti-cheat listeners: Page Visibility API + window blur (alt-tab) + popstate trap (back button). Each violation → full-screen red warning; **3rd violation or timer expiry → auto-submit** → score auto-recorded. Exit is possible only via submit or violation limit. Rules are disclosed in a pre-start modal.

## Demo data
Based on the official sample syllabus (GE EELECT-IT, "Living in the IT Era") weeks 1–9; scoring demo data is a set of instructor-posted activities (quizzes, activities, practical exercises, examinations) auto-recorded in the EduPulse scoring sheet, grouped under the Midterm/Finals terms.

## Testing checklist
1. Student → Dashboard → Start quiz → hover choices (each reveals individually; try selecting/copying — blocked) → alt-tab three times → attempt auto-submits.
2. Instructor → Course Content → Generate Topic 4 → one generated section per planned item (varied pack), including Document (DOCX/PDF) sections via EduPulse-DOC v1.
3. Instructor → Score Visualization → per-activity columns grouped by term (Midterm/Finals) with Hi / Lo / Class Average footers and Completed/Missed marks — **read-only**; a new quiz submission appears automatically.
4. Instructor → Syllabus Builder → Edit Topic 3 → Save → Consistency Checker findings → three actions.
5. Instructor → Score Visualization → switch subject/section tabs → student rows show total and running average.
6. Dean → Curriculum → Edit subject → prerequisite multi-select; each subject's syllabus opens in Dean-edit mode via Curriculum.
7. Student → My Scores → an activity past its close date without an attempt shows **Missed**; an answered one shows **Completed**.
