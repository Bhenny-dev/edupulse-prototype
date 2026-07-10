# EduPulse Prototype — v2.5 Update Plan

**Basis:** final paper "EduPulse Chapter 1 & 2" (July 2026 merged version). Every item cites the paper section a panel can verify it against. Applies to `EduPulse_Prototype_Specs.md`, `EduPulse_System_Specifications.md`, and `EduPulse_Prototype.html`.

---

## A. RENAME — terminology must match the paper exactly

| # | Prototype today | Rename to | Paper basis |
|---|---|---|---|
| A1 | EduPulse **grading sheet** / instructor "Grading Sheet" page | **EduPulse scoring sheet** / "Score Visualization" module | 1.4 scope; Fig 1 & 2 ("scoring sheet"); IPO figure |
| A2 | **Grading module** wording anywhere | **Score visualization module** (instructor-exclusive) | 1.4 |
| A3 | Instructor **Class Analytics** | **Class Performance** (per-subject score visualization + performance summaries) | 1.4, 1.5-Instructors, 2.2 |
| A4 | Student **My Analytics** | **My Performance** (score visualizations + performance summary) | 1.4, 1.5-Students |
| A5 | Dean **Oversight Analytics** | **Oversight / Class Performance** (view-only) | 1.5-Dean |
| A6 | "descriptive / predictive / **prescriptive** analytics" labels | "performance summary," "score-based projection," "**score-based suggestions of topics to review**" | 1.4 exclusions (at-risk prediction allowed only as *score-based projections*); IPO |
| A7 | Data model `grade_columns/grade_records` | `score_columns/score_records` | 1.4 |

**Why:** the panel struck "analytics" and "grading" from the study; any screen still labeled with them contradicts 1.4 on sight.

## B. ADD

| # | Addition | Paper basis |
|---|---|---|
| B1 | **EduPulse-DOC v1** — 4th fixed, versioned prompt template: generates **documents (reading materials as DOCX, XLSX, PDF)** per planned item. Show it beside PPT/QUIZ/CHECK in the "view fixed prompt" modals. | 1.4: **four** fixed templates (document, presentation, quiz, consistency) |
| B2 | **Completed / Missed status** per activity: auto-marked by whether the student answered within the set timeframe; visible in the instructor scoring sheet and student My Scores. | 1.4 score visualization module |
| B3 | **Dean term scheme (Midterm and Finals)** restored in Academic Settings — **labels/grouping only**: scoring sheet groups activity columns per term. **No MG/TFG/FG computation** (stays excluded). | 1.2 + Fig 2 box 1 + 1.5-Dean ("term scheme"); IPO "Grade recording (Midterm and Finals)"; 1.4 exclusion of term-grade computation |
| B4 | "Follow-up / consultation" framing on score views (instructor sees per-student records to support grade consultations). | 1.4 ("follow-up/consultation purposes"); 1.5-Students |

## C. REPLACE

| # | Remove this | Replace with | Paper basis |
|---|---|---|---|
| C1 | Content types "lecture notes / activity documents" as loose pack sections | Three AI content types only: **Document (DOCX/XLSX/PDF)** · **Presentation (PPT)** · **Quiz (MCQ)**; manual uploads (File/URL) remain as instructor uploads, not AI outputs | 1.4 taxonomy |
| C2 | "Page/Lesson notes" activity label (System Specs §3) | "Document" | 1.4 |
| C3 | System Specs §1 chain "…Automatic grading → Prescriptive analytics" | "…Automatic scoring → Scoring sheet → Score visualization & performance summaries with score-based suggestions" | 1.4, IPO |
| C4 | System Specs §7 evaluation "ISO 25010 + TAM" | **Researcher-made questionnaire** validated by adviser + IT experts, pilot-tested; 4-point Likert; frequency/percentage + weighted mean (Table 1 scale) | 2.4.1 |
| C5 | System Specs §2 rule "Instructor load: 1 subject" and §4 "three fixed templates" | Multi-subject loads (prototype already demos 3); **four** templates | 1.2 ("subject loads"), 1.4 |

## D. REMOVE

| # | Feature | Reason (paper basis) |
|---|---|---|
| D1 | **Manual score editing** in the scoring sheet (and testing-checklist item "edit a score → stats recompute") | Scores are **automatically recorded** when students answer; module is visualization, not input (1.4; client's decision) |
| D2 | Any leftover MG/TFG/FG, 60/40, UD references in HTML/demo data | Excluded in 1.4 (future integration) |
| D3 | "Risk per subject" wording in student predictive view | Keep the number, rename to **score-based projection** (1.4 exclusions) — remove the word "risk" |
| D4 | **INTL (International / Irregular) roster** — dean/instructor enrollment screens, seed data, and gradebook merge | Final IPO figure names only "Student rosters (sections)"; not in the paper as basis — scope narrowed to the regular block-section roster (client's decision) |

## E. KEEP (already matches the paper — do not touch)

Secure Answering Environment exactly as built: full-screen, timer, per-choice hover reveal, copy/select disabled, focus-loss warnings, 3rd violation/timer auto-submit, pre-start rules disclosure (1.4). Immediate results + per-item explanations + **ungraded practice retakes** feeding only the personal practice log (1.5-Students). Roster-based block sectioning + Dean curriculum/prerequisites/assignments (1.2, 1.4). Consistency Checker three actions (1.4, 2.2). Hi/Lo/Class-average per activity (1.4). React+Tailwind / Node+Express / cloud DB / server-side AI (2.3).

## F. DECISIONS TO CONFIRM (paper is silent — pick before the panel asks)

1. **Practice-retake item rephrasing** currently implies a 5th AI use. Either route it through **EduPulse-QUIZ v1** (item-variation mode of the same template) or drop rephrasing and reuse the same items shuffled. Recommend: route through QUIZ template.
2. **"Post recap review / Schedule re-quiz" announcements** (Class Analytics interventions) — not in the paper. Keep as plain instructor actions (posting an activity is in scope) or remove the automated announcement flow. Recommend: keep, relabeled as ordinary instructor actions.
3. **Per-student total + running average** — paper lists only Hi/Lo/average + completion status; running average is defensible under "performance summaries," but be ready to justify.

## G. Testing checklist changes

- Replace item 3 with: "Instructor → Score Visualization → per-activity columns grouped by term (Midterm/Finals) with Hi/Lo/Class Average footers and Completed/Missed marks — **read-only**; a new quiz submission appears automatically."
- Add: "Instructor → Course Content → Generate → pack contains Document (DOCX/XLSX/PDF) sections via EduPulse-DOC v1."
- Add: "Student → My Scores → activity shows Completed or Missed based on timeframe."

## H. Version note to add to the specs after applying

> **v2.5 — paper-final alignment:** grading→scoring sheet/score visualization renames (A1–A7); 4th fixed template EduPulse-DOC v1 (B1); completed/missed status (B2); Dean term-scheme labels restored, computation still excluded (B3); manual score entry removed (D1); evaluation aligned to researcher-made instrument (C4).
