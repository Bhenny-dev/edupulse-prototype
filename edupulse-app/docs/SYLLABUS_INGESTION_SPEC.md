# EduPulse — Syllabus Ingestion & Registration Form Specification

**Formalizes Figure 2, Step 1 of *EduPulse Chapter 1 & 2* — syllabus intake ("the instructor either uploads an existing syllabus, which the system parses and confirms… or is guided by the AI assistant in building one in the official KCP format").** This document extends `docs/REQUIREMENTS.md` FR-SYL-01 through FR-SYL-05 and FR-SYL-15 with a full machine-readable form spec. It does not replace that document — read it first for the governing scope constraints (four roles, no System Admin persona, "assistive and prompt-guided… not a catalogue of configurable features").

**Provenance of the 7-section structure.** No enumerated "7-section KCP template" exists anywhere in Chapter 1-2 — Appendix D1 cites an external file ("Official KCP Syllabus Sample/Template," Google Drive) this document has no access to. The 7 sections below are derived transparently from the field schema supplied directly by the user in this conversation, grouped into sections by field cohesion. If the actual KCP template document becomes available, section 2 of this spec should be diffed against it and corrected — treat the section names here as a working structure, not verified ground truth.

**Scope correction applied.** The source request included "admin workflows." The system has exactly four roles (Dean, Associate Dean, Instructor, Student — see `docs/REQUIREMENTS.md` FR-AUTH-01) and no System Administrator persona. Every control in the original draft labeled "for admins" (the VMOCV read-only toggle, the extraction "Admin Override") is instead **instructor-facing** in this spec: the instructor who owns the syllabus is the one who locks fields or accepts/rejects the AI's extraction, consistent with FR-CW-04 ("no AI-generated courseware reaches students without instructor review") applied one level upstream, to syllabus intake itself.

---

## 1. Canonical 7-Section Template

| # | Section | Fields |
|---|---|---|
| 1 | **Course Information** | course_code, course_title, period_offered, academic_year, credit_units, classification, no_of_hours, prerequisites |
| 2 | **Course Description** | course_description |
| 3 | **Institutional Context** | vision, mission, objectives, core_values, college_mission, college_objectives — prefilled from institutional defaults, editable per syllabus |
| 4 | **Program Outcomes** | program_outcomes[] |
| 5 | **Course Outline** | course_outline[] — week, intended_learning_outcomes, contents[], teaching_learning_activities[], assessments[], timeframe |
| 6 | **Requirements & Policies** | course_requirements[], evaluation_and_grading (components with weights), course_policy[] |
| 7 | **References** | books[], online_references[] |

`metadata` (uploader, upload method, original filename, extraction confidence, version, timestamps) is cross-cutting system data, not an instructor-facing section — it's attached to the record, never rendered as a form section.

---

## 2. JSON Schema

Formal JSON Schema (2020-12), machine-validatable. This is the canonical shape every ingestion path (file, link, manual) converges to before a syllabus record is written.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://edupulse.kcp.edu.ph/schemas/syllabus.json",
  "title": "EduPulse Syllabus Record",
  "type": "object",
  "required": ["course", "description", "institution", "program_outcomes", "course_outline", "requirements_and_policies", "references", "metadata"],
  "properties": {
    "course": {
      "type": "object",
      "required": ["course_code", "course_title", "period_offered", "academic_year", "credit_units", "no_of_hours"],
      "properties": {
        "course_code": { "type": "string", "pattern": "^[A-Z0-9][A-Z0-9\\- ]{2,19}$", "examples": ["IT 102", "WMAD 303-1", "GE ELEC-ES"] },
        "course_title": { "type": "string", "minLength": 1, "maxLength": 200 },
        "period_offered": { "type": "string", "enum": ["1st Semester", "2nd Semester", "Summer"] },
        "academic_year": { "type": "string", "pattern": "^\\d{4}-\\d{4}$", "examples": ["2026-2027"] },
        "credit_units": { "type": "number", "minimum": 0.5, "multipleOf": 0.5 },
        "classification": { "type": "string", "enum": ["Major", "Minor", "Elective", "Core"] },
        "no_of_hours": { "type": "integer", "minimum": 1 },
        "prerequisites": { "type": "array", "items": { "type": "string" }, "default": [] }
      }
    },
    "description": {
      "type": "object",
      "required": ["course_description"],
      "properties": { "course_description": { "type": "string", "minLength": 50 } }
    },
    "institution": {
      "type": "object",
      "description": "Snapshotted from institutional defaults at syllabus creation time (see FORM-DATA-14) — editable per syllabus, does not retroactively change on later default edits.",
      "properties": {
        "vision": { "type": "string" },
        "mission": { "type": "string" },
        "objectives": { "type": "array", "items": { "type": "string" } },
        "core_values": { "type": "array", "items": { "type": "string" } },
        "college_mission": { "type": "string" },
        "college_objectives": { "type": "array", "items": { "type": "string" } },
        "locked": { "type": "boolean", "default": true, "description": "Instructor-facing lock toggle — see FORM-UI-19." }
      }
    },
    "program_outcomes": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
    "course_outline": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["week", "intended_learning_outcomes", "contents", "timeframe"],
        "properties": {
          "week": { "type": "integer", "minimum": 1 },
          "intended_learning_outcomes": { "type": "string", "minLength": 1 },
          "contents": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
          "teaching_learning_activities": { "type": "array", "items": { "type": "string" } },
          "assessments": { "type": "array", "items": { "type": "string" } },
          "timeframe": {
            "type": "object",
            "required": ["start_week", "end_week"],
            "properties": {
              "start_week": { "type": "integer", "minimum": 1 },
              "end_week": { "type": "integer", "minimum": 1 }
            }
          }
        }
      }
    },
    "requirements_and_policies": {
      "type": "object",
      "properties": {
        "course_requirements": { "type": "array", "items": { "type": "string" } },
        "evaluation_and_grading": {
          "type": "object",
          "properties": {
            "components": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["name", "weight"],
                "properties": {
                  "name": { "type": "string" },
                  "weight": { "type": "number", "minimum": 0, "maximum": 100 }
                }
              }
            }
          }
        },
        "course_policy": { "type": "array", "items": { "type": "string" } }
      }
    },
    "references": {
      "type": "object",
      "properties": {
        "books": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["title", "authors", "year"],
            "properties": {
              "title": { "type": "string" },
              "authors": { "type": "string" },
              "year": { "type": "integer", "minimum": 1900, "maximum": 2100 },
              "publisher": { "type": "string" },
              "isbn": { "type": "string", "pattern": "^(97[89])?\\d{9}(\\d|X)$" }
            }
          }
        },
        "online_references": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["title", "url"],
            "properties": {
              "title": { "type": "string" },
              "url": { "type": "string", "format": "uri", "pattern": "^https?://" },
              "access_date": { "type": "string", "format": "date" }
            }
          }
        }
      }
    },
    "metadata": {
      "type": "object",
      "required": ["uploader_id", "upload_method", "version"],
      "properties": {
        "uploader_id": { "type": "string" },
        "upload_method": { "type": "string", "enum": ["file", "link", "manual"] },
        "original_filename": { "type": ["string", "null"] },
        "extraction_confidence": { "type": ["number", "null"], "minimum": 0, "maximum": 100 },
        "field_confidence": { "type": "object", "description": "Per-field confidence map, e.g. {\"course.course_code\": 92}", "additionalProperties": { "type": "number", "minimum": 0, "maximum": 100 } },
        "version": { "type": "integer", "minimum": 1 },
        "created_at": { "type": "string", "format": "date-time" },
        "updated_at": { "type": "string", "format": "date-time" }
      }
    }
  }
}
```

---

## 3. UI Component List

Legend: **Sec** = which of the 7 sections it belongs to (0 = upload/extraction meta-UI, not a syllabus section).

| Sec | Label | Input type | Validation | Example |
|---|---|---|---|---|
| 0 | Upload Source | Radio (File / Link / Manual Entry) | Required before any section renders | `File` |
| 0 | File Upload | File input | Accepts `.pdf,.docx,.doc,.odt,.txt`; max 50MB; single file only | `WMAD303-1_Syllabus.docx` |
| 0 | Link Input | URL input | `https?://` only; fetch preview before commit; 10s timeout | `https://kcp.edu.ph/syllabi/wmad303.pdf` |
| 0 | Extraction Preview | Read-only panel, per-field inline edit toggle | Renders after extraction; blocks nothing, informs everything | — |
| 0 | Confidence Badge | Numeric % chip, per field + section rollup | Color bands: ≥85 green, 60-84 amber, <60 red | `92%` |
| 0 | Accept / Reject Extracted Value | Per-field toggle (instructor-facing, not admin) | Reject clears the field for manual entry; does not delete the source file | — |
| 0 | Save Draft / Submit / Cancel | Buttons, Submit gated by validation | Cancel with unsaved changes prompts confirm | — |
| 0 | Version History | Side panel, reuses existing `VersionHistory` component | Read-only list + diff view | — |
| 0 | Accessibility Controls | Font size / high contrast toggles (Settings-level, not per-form) | Reuses existing Settings → Appearance, not duplicated here | — |
| 0 | Ask Pulse | Contextual help, reuses `data-pulse-help` + `syllabusAgent` | Triggers on dwell/focus per FR-GUIDE-02 | — |
| 1 | Course Code | Text | Required; `^[A-Z0-9][A-Z0-9\- ]{2,19}$` | `IT 102` |
| 1 | Course Title | Text | Required; max 200 chars | `Computer Programming 1` |
| 1 | Period Offered | Dropdown | Required; enum `1st Semester / 2nd Semester / Summer` | `1st Semester` |
| 1 | Academic Year | Year-range picker | Required; `YYYY-YYYY`, end = start+1 | `2026-2027` |
| 1 | Credit Units | Number | Required; min 0.5; step 0.5 | `3.0` |
| 1 | Classification | Dropdown | Optional; enum `Major/Minor/Elective/Core` | `Major` |
| 1 | No. of Hours | Number | Required; integer; min 1 | `54` |
| 1 | Prerequisites | Multi-select tags | Optional; suggestions from `CURRICULUM_SUBJECTS` (autocomplete only, not a mapping dashboard — see scope note in §7 FORM-INT-03) | `["IT 101"]` |
| 2 | Course Description | Rich text | Required; min 50 chars | — |
| 3 | Vision / Mission | Rich text, prefilled | Editable; "Lock" toggle defaults on (see FORM-UI-19) | — |
| 3 | Objectives / Core Values | Editable list, prefilled | Same lock behavior as Vision/Mission | — |
| 4 | Program Outcomes | Multi-line add/remove list | Required; min 1 entry; supports multi-line paste (splits on newline) | `"Apply IT principles to develop web and mobile solutions"` |
| 5 | Course Outline | Repeating row group | Required; min 1 row; each row requires ILO + Contents + timeframe | — |
| 5 | — Week | Number (per row) | Integer, min 1 | `3` |
| 5 | — Intended Learning Outcome | Text (per row) | Required | `"Explain the client-server model"` |
| 5 | — Contents | Multi-select / rich text (per row) | Required, min 1 item | `["HTTP/HTTPS", "DNS"]` |
| 5 | — Teaching-Learning Activities | Multi-select (per row) | Optional | `["Lecture", "Live coding demo"]` |
| 5 | — Assessments | Multi-select (per row) | Optional | `["Quiz 1"]` |
| 5 | — Timeframe | Week-range pair (per row) | `start_week ≤ end_week`, within course duration | `{start:3, end:4}` |
| 6 | Course Requirements | Checklist + free text | Optional | `["Laptop with VS Code installed"]` |
| 6 | Evaluation & Grading | Table editor (name, weight %) | Weights must sum to exactly 100 before submit | `Prelim 30 / Midterm 30 / Finals 40` |
| 6 | Course Policy | Rich text, bullet-friendly | Optional | — |
| 7 | Books | Repeating row (title, authors, year, publisher, ISBN) | Title + authors + year required; ISBN pattern-checked if present | — |
| 7 | Online References | Repeating row (title, URL, access date) | Title + URL required; URL format-checked; access date not in the future | — |

---

## 4. Mapping Rules — Common Formats → Canonical Fields

| Source pattern | Canonical target | Rule |
|---|---|---|
| First-page header block (top ~15 lines) | `course.course_code`, `course.course_title`, `course.period_offered`, `course.academic_year` | Positional heuristic — these fields cluster at the top of every observed KCP-format document |
| Heading text matching `/course description/i` | `description.course_description` | Section-anchor match; capture text until next heading |
| Heading matching `/vision|mission|objectives|core values/i` | `institution.*` | One anchor per sub-field; if institutional text is a near-exact match (>90% similarity) to the stored default, treat as confirmation not new data — keep the default, don't duplicate it |
| Heading matching `/program outcomes|graduate attributes/i` followed by a list | `program_outcomes[]` | List-parse: numbered or bulleted lines become array entries |
| Table with header row containing `week` + (`ilo`\|`outcome`) + (`content`\|`topic`) | `course_outline[]` | Table-parse: column-header similarity match, tolerant of reordering |
| Table without a `week` column but with sequential week-like labels ("Week 1-2", "Wk 3") | `course_outline[].timeframe` | Regex `/week\s*(\d+)(?:\s*[-–]\s*(\d+))?/i` against row labels |
| Text matching `/(\d+(?:\.\d+)?)\s*units?/i` | `course.credit_units` | Inline metadata regex |
| Text matching `/(\d+)\s*hours?/i` | `course.no_of_hours` | Inline metadata regex |
| Text matching `/prerequisites?:\s*(.+)/i` | `course.prerequisites[]` | Split captured group on `,`/`;`; `"none"` (case-insensitive) → empty array |
| Heading matching `/references|bibliography/i` | `references.*` | Sub-classify each line: has a URL → `online_references`, else → `books` |
| Line matching `/^(.+?)\.\s*\((\d{4})\)\.\s*(.+)/` (Author. (Year). Title.) | `references.books[]` | APA-style citation heuristic |
| Line containing a bare URL | `references.online_references[].url` | URL extraction regex, `access_date` defaults to ingestion date if not stated |
| Table/list with a "%" column near "grading"/"evaluation" heading | `requirements_and_policies.evaluation_and_grading.components[]` | Table-parse; weight column coerced to number, strip `%` |

---

## 5. Extraction Heuristics

1. **Header detection** — scan the first page only for course-identity fields; do not search the whole document (false-positive risk from repeated headers/footers).
2. **Section anchors** — fuzzy-match heading text against a synonym table per canonical section (e.g., "Course Outline" ≈ "Table of Contents" ≈ "Course Content" ≈ "Weekly Plan"); Levenshtein distance ≤ 2 or substring match.
3. **Table parsing** — detect tables by structural markers (DOCX `<w:tbl>`, PDF column-aligned whitespace runs, or `\t`/`|`-delimited plain text); map columns by header-cell similarity, not position, since column order varies across instructor-authored documents.
4. **List parsing** — numbered (`1.`, `1)`, `a.`) or bulleted (`•`, `-`, `*`) runs become array entries; a run must have ≥2 consecutive items to count as a list (avoids misreading a single dash as a list).
5. **Inline metadata** — regex-driven, field-specific (see mapping table above); each pattern runs independently, first match wins per field.
6. **Bibliography parsing** — APA-pattern heuristic first; if no match, fall back to "one non-empty line per reference" and mark low confidence.
7. **Confidence scoring** — per field: `40% pattern-match strength + 30% proximity to the correct section anchor + 20% source file type reliability (DOCX > PDF-text > PDF-scanned/OCR > TXT) + 10% consistency with existing curriculum reference data (e.g., does the extracted course_code exist in `CURRICULUM_SUBJECTS`)`.
8. **Threshold fallback** — any field below 60% confidence is pre-filled with the best guess but visually flagged and excluded from the "ready to submit" count; the instructor must explicitly accept or overwrite it (see FORM-UI's Accept/Reject control).
9. **Scanned/image-only PDFs** — OCR is out of guaranteed scope for this prototype (flagged Could-priority, FORM-BE-19); such files should be detected (no extractable text layer) and routed straight to Manual Entry with a plain-language explanation, not silently produce empty fields.
10. **Link ingestion** — heuristics 1-8 apply identically once the linked resource is fetched and reduced to the same text/table representation as an uploaded file; no separate extraction path.

---

## 6. Functional & Non-Functional Requirements

Numbered, grouped by category. ID scheme `FORM-<CAT>-##`. Priority: `M` Must / `S` Should / `C` Could.

### 6.1 FORM-FLOW — Form Lifecycle (21)

| ID | Requirement | Pri |
|---|---|---|
| FORM-FLOW-01 | The form shall require an explicit Upload Source choice (File / Link / Manual Entry) before rendering the 7 sections. | M |
| FORM-FLOW-02 | Manual Entry shall be the default when the instructor has no source file to upload, per FR-SYL-13. | M |
| FORM-FLOW-03 | Selecting File shall show only the File Upload control until a file is chosen. | M |
| FORM-FLOW-04 | Selecting Link shall show only the Link Input control until a URL is submitted. | M |
| FORM-FLOW-05 | Selecting Manual Entry shall render all 7 sections empty, with Institutional Context pre-filled from defaults. | M |
| FORM-FLOW-06 | File or Link submission shall always produce an Extraction Preview before any field is committed to the live record. | M |
| FORM-FLOW-07 | The Extraction Preview shall never auto-save; the instructor must explicitly accept the syllabus to proceed (Fig. 2's "Are you okay with the uploaded syllabus?"). | M |
| FORM-FLOW-08 | If the instructor declines the preview, the system shall route them to the lowest-confidence section first, not section 1 by default. | S |
| FORM-FLOW-09 | The instructor may switch Upload Source mid-flow without losing sections already explicitly accepted. | S |
| FORM-FLOW-10 | The form shall autosave a draft on blur and at a fixed interval while editing (ties NFR-REL-03). | M |
| FORM-FLOW-11 | Submitting the form shall transition the syllabus from `draft` to `submitted` (FR-SYL-08). | M |
| FORM-FLOW-12 | Submission shall be blocked if Evaluation & Grading component weights do not sum to exactly 100. | M |
| FORM-FLOW-13 | Submission shall be blocked if any Course Outline row is missing ILO, Contents, or a valid timeframe. | M |
| FORM-FLOW-14 | Saving as a draft shall not enforce submission-only validation (a draft may be incomplete). | M |
| FORM-FLOW-15 | Cancelling with unsaved changes shall prompt confirmation before discarding. | M |
| FORM-FLOW-16 | The original uploaded file shall be retained as an attachment on the syllabus record for audit purposes. | M |
| FORM-FLOW-17 | Every accepted submission shall create a new syllabus version (FR-SYL-07). | M |
| FORM-FLOW-18 | Re-uploading a new file on an existing draft shall replace the draft's extracted values, not merge them silently with prior manual edits, without a diff prompt. | S |
| FORM-FLOW-19 | Before any section renders, the instructor shall select which of their actually-assigned subjects (per FR-AUTH-06's subject-load scoping) this syllabus is for — not a free choice of any curriculum code. | M |
| FORM-FLOW-20 | The system shall flag it if the instructor already has a syllabus for the selected subject and term, rather than silently allowing a duplicate. | M |
| FORM-FLOW-21 | The instructor shall be able to start a new syllabus pre-filled from their own prior version of the same subject ("Copy from previous term"), then edit forward rather than re-entering everything. | S |

### 6.2 FORM-UI — Component-Level (58)

| ID | Requirement | Pri |
|---|---|---|
| FORM-UI-01 | Course Code shall render as a required text input matching `^[A-Z0-9][A-Z0-9\- ]{2,19}$`. | M |
| FORM-UI-02 | Course Title shall render as a required text input, max 200 characters, with a live character counter past 180. | M |
| FORM-UI-03 | Period Offered shall render as a required dropdown with exactly 3 options. | M |
| FORM-UI-04 | Academic Year shall render as a year-range control that auto-fills the end year as start+1. | M |
| FORM-UI-05 | Credit Units shall render as a number input with 0.5 step and a minimum of 0.5. | M |
| FORM-UI-06 | Classification shall render as an optional dropdown; leaving it unset is valid. | S |
| FORM-UI-07 | No. of Hours shall render as a required integer input, minimum 1. | M |
| FORM-UI-08 | Prerequisites shall render as multi-select tags with autocomplete suggestions drawn from `CURRICULUM_SUBJECTS` course codes only (not a curriculum-mapping feature — autocomplete data source only). | S |
| FORM-UI-09 | Course Description shall render as a rich-text field enforcing a 50-character minimum before it counts as filled. | M |
| FORM-UI-10 | Vision/Mission/Objectives/Core Values shall render pre-filled from institutional defaults on every new syllabus. | M |
| FORM-UI-11 | Institutional Context fields shall remain editable per syllabus (a local override), never force-synced from the default after creation. | M |
| FORM-UI-12 | Program Outcomes shall render as an add/remove list requiring at least 1 entry before submission. | M |
| FORM-UI-13 | Program Outcomes shall accept multi-line paste, splitting on newlines into separate entries. | S |
| FORM-UI-14 | Course Outline shall render as a repeating row group, minimum 1 row, with add/remove/reorder controls. | M |
| FORM-UI-15 | Each Course Outline row's Week field shall be a positive integer input. | M |
| FORM-UI-16 | Each Course Outline row's ILO field shall be required text. | M |
| FORM-UI-17 | Each Course Outline row's Contents field shall require at least 1 item. | M |
| FORM-UI-18 | Each Course Outline row's Timeframe shall enforce `start_week ≤ end_week`. | M |
| FORM-UI-19 | Institutional Context fields shall have a per-syllabus "Lock" toggle (instructor-facing — see scope correction in §0), defaulting to locked, to prevent accidental edits to institutional text. | S |
| FORM-UI-20 | Course Requirements shall render as a checklist with a free-text "other" entry. | S |
| FORM-UI-21 | Evaluation & Grading shall render as a table editor with a running sum indicator, turning red when ≠100. | M |
| FORM-UI-22 | Evaluation & Grading rows shall support add/remove with a minimum of 1 row at submission time. | M |
| FORM-UI-23 | Course Policy shall render as rich text supporting bullet lists. | S |
| FORM-UI-24 | Books reference rows shall require title, authors, and year at minimum. | M |
| FORM-UI-25 | Books reference rows shall validate ISBN format only if a value is entered (ISBN itself is optional). | S |
| FORM-UI-26 | Online reference rows shall require title and a valid `http(s)://` URL. | M |
| FORM-UI-27 | Online reference rows' access date shall default to today and reject future dates. | S |
| FORM-UI-28 | Upload Source shall render as a 3-way radio, no default pre-selection forcing a choice. | M |
| FORM-UI-29 | File Upload shall display accepted formats and the 50MB limit inline, before a file is chosen. | M |
| FORM-UI-30 | File Upload shall reject unsupported extensions client-side with a specific error naming the accepted list. | M |
| FORM-UI-31 | Link Input shall offer a "Preview" action that fetches and shows a content snippet before committing to full extraction. | S |
| FORM-UI-32 | Extraction Preview shall show every field with its confidence badge inline, not in a separate report. | M |
| FORM-UI-33 | Confidence badges shall use consistent color bands (≥85 green / 60-84 amber / <60 red) across every field. | M |
| FORM-UI-34 | Each extracted field shall carry an Accept/Reject control; Reject clears the field for manual entry without deleting the source file. | M |
| FORM-UI-35 | Save Draft shall be available at every step regardless of validation state. | M |
| FORM-UI-36 | Submit shall be disabled (not hidden) with an inline reason when blocking validation fails. | M |
| FORM-UI-37 | Cancel shall trigger a confirmation modal only when there are unsaved changes. | M |
| FORM-UI-38 | Version History shall reuse the existing `VersionHistory` component rather than a new bespoke panel. | M |
| FORM-UI-39 | Accessibility controls (font size, contrast) shall link to the existing Settings → Appearance rather than duplicating controls on this form. | M |
| FORM-UI-40 | The full form shall be completable via keyboard alone, including all repeating-row add/remove controls. | M |
| FORM-UI-41 | Contextual help shall be available via Pulse on every section (dwell-triggered per FR-GUIDE-02), not a separate tooltip system. | M |
| FORM-UI-42 | The form shall render usably down to a 768px viewport width (NFR-COMPAT-01). | M |
| FORM-UI-43 | Repeating row groups (Course Outline, References) shall support drag-free reordering (up/down controls), matching the existing Syllabus Wizard's topic-reorder pattern. | S |
| FORM-UI-44 | Long extracted text (e.g., pasted course descriptions) shall not overflow their containers — wrap and scroll, never clip. | M |
| FORM-UI-45 | Supplemental files (rubrics, reading lists) shall be attachable to the syllabus record separately from the primary source file. | S |
| FORM-UI-46 | Less-common fields (Classification, Prerequisites, Course Policy) shall sit in a collapsible "More details" area so the default form reads shorter than its full field count. | S |
| FORM-UI-47 | Institutional Context shall show a visible "edited from default" indicator once unlocked and changed, distinct from its untouched pre-filled state. | S |
| FORM-UI-48 | A required-fields checklist shall be visible before submission, naming exactly what's still missing rather than only a generic "cannot submit" state. | M |
| FORM-UI-49 | A "Preview as Student" action shall show the syllabus content roughly as it will read once published, reusing the pattern already established for courseware item previews. | S |
| FORM-UI-50 | Version History shall include an explicit "Restore this version" action, not only view and diff. | S |
| FORM-UI-51 | File Upload shall support drag-and-drop in addition to the file picker (already present in the existing `UploadZone` component — this documents it as a requirement, not a new build). | M |
| FORM-UI-52 | Inline field edits within an active session shall support undo/redo. | C |
| FORM-UI-53 | Alongside per-field Accept/Reject (FORM-UI-34), a bulk "Accept All Above Threshold" action shall be available, with confirmation, for forms with many extracted fields. | S |
| FORM-UI-54 | Course Outline rows shall support duplicate, split, and merge actions, not only add/remove. | C |
| FORM-UI-55 | Each low-confidence field flag shall include a one-line explanation of why (e.g., "no matching section heading found"), not just the numeric badge. | S |
| FORM-UI-56 | Extraction Preview fields shall show the source text snippet they were extracted from, inline next to the field — a lightweight citation, not a full interactive document viewer. | S |
| FORM-UI-57 | The instructor shall be able to export the canonical record as JSON for their own records, alongside the existing PDF export (FR-SYL-17). | C |
| FORM-UI-58 | Character counters (per FORM-UI-02) shall extend to all long-text fields (Course Description, Course Policy), not Course Title alone. | S |

### 6.3 FORM-BE — Extraction & Mapping Pipeline (27)

| ID | Requirement | Pri |
|---|---|---|
| FORM-BE-01 | The pipeline shall detect course-identity fields only from the first page of the source document. | M |
| FORM-BE-02 | Section anchors shall be matched via synonym table + fuzzy distance, not exact string match. | M |
| FORM-BE-03 | Table detection shall work across DOCX, PDF (text-layer), and delimited plain text. | M |
| FORM-BE-04 | Table columns shall be mapped by header-cell similarity, tolerant of column reordering. | M |
| FORM-BE-05 | List parsing shall require ≥2 consecutive marked items to qualify as a list. | S |
| FORM-BE-06 | Inline-metadata regexes (units, hours, prerequisites) shall run independently per field, first match wins. | M |
| FORM-BE-07 | Bibliography parsing shall attempt APA-pattern matching before falling back to line-per-reference. | S |
| FORM-BE-08 | Every extracted field shall carry a computed confidence score per the formula in §5.7. | M |
| FORM-BE-09 | Fields below the 60% confidence threshold shall be flagged and excluded from "ready to submit" counts. | M |
| FORM-BE-10 | Files with no extractable text layer (image-only PDFs) shall be detected and routed to Manual Entry with a plain-language explanation. | M |
| FORM-BE-11 | Malformed files shall be rejected with a specific, actionable error — never a silent empty result. | M |
| FORM-BE-12 | Oversized files (>50MB) shall be rejected before any parsing attempt begins. | M |
| FORM-BE-13 | Unsupported file types shall be rejected server-side, independent of the client-side check in FORM-UI-30. | M |
| FORM-BE-14 | Text shall be normalized to UTF-8 before any pattern matching runs. | M |
| FORM-BE-15 | Extraction shall have a hard timeout (e.g., 30s); on timeout, return whatever fields were successfully extracted rather than failing the whole request. | S |
| FORM-BE-16 | Partial extraction results shall always be returned rather than an all-or-nothing failure. | M |
| FORM-BE-17 | Re-extraction on re-upload shall replace, not merge with, the prior draft's extracted (but not yet accepted) values. | M |
| FORM-BE-18 | Link fetching shall enforce a redirect limit (≤5) and a content-type allowlist (HTML or the same document types as file upload). | M |
| FORM-BE-19 | OCR for scanned documents is out of guaranteed scope for the prototype; flagged Could-priority, deferred to future work. | C |
| FORM-BE-20 | Extraction shall be idempotent — re-submitting the identical file shall not create duplicate draft records. | S |
| FORM-BE-21 | Extraction results may be cached keyed by file content hash to avoid re-parsing an identical upload. | C |
| FORM-BE-22 | Every extraction attempt shall be logged (success/fail, duration, field count) for audit and pipeline-improvement purposes — internal logs only, not a new UI dashboard (ties NFR-SEC-08). | M |
| FORM-BE-23 | If the extraction pipeline is unavailable, the form shall degrade gracefully to Manual Entry rather than blocking the instructor entirely. | M |
| FORM-BE-24 | Extraction shall run asynchronously with a plain-language progress indicator (via Pulse's "thinking" state, FR-GUIDE-07) rather than a blocking synchronous wait with no feedback. | M |
| FORM-BE-25 | The extraction pipeline shall be implementable as pure pattern/heuristic matching — it does not require a paid AI service (ties NFR-AI-02) and may optionally be enhanced by the same locally-hosted-or-free-API model used elsewhere in EduPulse. | M |
| FORM-BE-26 | Pasting a copied table (from Word/Excel/Sheets) directly into the Course Outline shall parse it into rows using the same table-mapping heuristic as file extraction (§4), not require a full file upload for a quick paste. | S |
| FORM-BE-27 | Re-uploading the identical file (by content hash) shall surface a duplicate warning rather than silently reprocessing it. | S |

### 6.4 FORM-INT — Integrations (13)

| ID | Requirement | Pri |
|---|---|---|
| FORM-INT-01 | Pulse shall be aware of per-field confidence and proactively offer help on the lowest-confidence section (extends `syllabusAgent`). | S |
| FORM-INT-02 | Pulse's contextual help shall trigger identically on this form as on the rest of the Syllabus Builder (`data-pulse-help`), not a separate help system. | M |
| FORM-INT-03 | Course Code autocomplete shall query `CURRICULUM_SUBJECTS` as a plain data source — this is not a reintroduction of the removed CHED-mapping monitoring feature; no coverage percentage or compliance badge shall be shown here. | M |
| FORM-INT-04 | Accepted Course Outline rows shall be available downstream as the topic list courseware generation grounds on (ties FR-CW-01). | M |
| FORM-INT-05 | Submission shall trigger the existing Dean notification path (FR-NOTIF-04) unchanged — no new notification system for this form specifically. | M |
| FORM-INT-06 | Submitted syllabi shall appear in the Dean's Review Inbox exactly as today (FR-REV-01) — this form changes intake, not the review workflow. | M |
| FORM-INT-07 | The original file attachment shall use the same storage mechanism as other EduPulse file uploads (Curriculum import, etc.), not a bespoke store. | S |
| FORM-INT-08 | No live web crawling beyond a single fetch of the provided link is permitted — no recursive link-following. | M |
| FORM-INT-09 | No external analytics/tracking service shall receive uploaded syllabus content. | M |
| FORM-INT-10 | Extraction may optionally use the same configurable AI provider as courseware generation (Settings → AI Provider, FR-SET-01) but shall function via pure heuristics if no provider is configured. | S |
| FORM-INT-11 | EduSuite-imported roster/subject-load context (Curriculum → Import Data) may inform prerequisite suggestions but is not required for the form to function. | C |
| FORM-INT-12 | Version History integration shall show file-upload-triggered versions distinctly from manual-edit versions in the timeline. | S |
| FORM-INT-13 | Book/online reference rows may optionally auto-fill from a pasted ISBN or DOI via a public lookup service; the field remains fully manually-editable if the lookup is unavailable or unconfigured — never a hard dependency. | C |

### 6.5 FORM-DATA — Data Model (18)

| ID | Requirement | Pri |
|---|---|---|
| FORM-DATA-01 | The canonical schema in §2 is the single target every ingestion path (file, link, manual) converges to — no path writes a different shape. | M |
| FORM-DATA-02 | `metadata.upload_method` shall be one of exactly `file`, `link`, `manual`. | M |
| FORM-DATA-03 | `metadata.extraction_confidence` shall be `null` for manual entries (confidence is meaningless when nothing was extracted). | M |
| FORM-DATA-04 | `metadata.field_confidence` shall be a flat map of dotted field paths to 0-100 scores, present only for file/link ingestion. | M |
| FORM-DATA-05 | `metadata.version` shall increment by exactly 1 on every accepted submission, never reused or decremented. | M |
| FORM-DATA-06 | All timestamps shall be stored in ISO-8601 UTC. | M |
| FORM-DATA-07 | `course.prerequisites` shall always be an array, empty when there are none — never `null` or a free-text string. | M |
| FORM-DATA-08 | `references.books` and `references.online_references` shall remain separate arrays, never merged into one generic "references" list. | M |
| FORM-DATA-09 | `institution.*` shall be snapshotted at syllabus creation, not a live reference to the institutional-default record (see FORM-UI-11). | M |
| FORM-DATA-10 | `program_outcomes` shall enforce `minItems: 1` at the data layer as well as the UI layer (defense in depth). | M |
| FORM-DATA-11 | `course_outline[].timeframe` weeks shall be validated against the course's total declared duration where known. | S |
| FORM-DATA-12 | `evaluation_and_grading.components[].weight` values shall sum to 100 at the data layer, re-validated independent of the UI check. | M |
| FORM-DATA-13 | The original uploaded file reference shall be immutable once attached — re-upload creates a new attachment, not an overwrite. | M |
| FORM-DATA-14 | Institutional defaults (the un-snapshotted source vision/mission/objectives/core values) shall live in one shared record, editable only through an explicit institutional-settings flow — never edited implicitly via a single syllabus form. | M |
| FORM-DATA-15 | A syllabus record's `course.course_code` should, but is not required to, match an entry in `CURRICULUM_SUBJECTS` — unmatched codes are allowed (new/updated curricula lag behind CHED updates in practice). | S |
| FORM-DATA-16 | Draft records shall be distinguishable from submitted records by `status`, independent of `metadata.version`. | M |
| FORM-DATA-17 | Deleting a syllabus record shall not delete its version history or original file attachment (soft-delete / retention). | S |
| FORM-DATA-18 | The schema shall remain backward-compatible with the existing `DEFAULT_SYLLABI` shape's `topics[]` concept — `course_outline[]` here is the canonical successor; any migration must preserve existing `topicId` references used by Courseware. | M |

### 6.6 FORM-VAL — Field Validation (30)

| ID | Requirement | Pri |
|---|---|---|
| FORM-VAL-01 | `course_code` — required, pattern `^[A-Z0-9][A-Z0-9\- ]{2,19}$`. | M |
| FORM-VAL-02 | `course_title` — required, 1-200 characters. | M |
| FORM-VAL-03 | `period_offered` — required, one of the 3 enum values. | M |
| FORM-VAL-04 | `academic_year` — required, `YYYY-YYYY`, end year = start + 1. | M |
| FORM-VAL-05 | `credit_units` — required, ≥0.5, multiple of 0.5. | M |
| FORM-VAL-06 | `classification` — optional; if present, one of the 4 enum values. | S |
| FORM-VAL-07 | `no_of_hours` — required, integer ≥1. | M |
| FORM-VAL-08 | `prerequisites` — optional array; each entry non-empty if present. | S |
| FORM-VAL-09 | `course_description` — required, ≥50 characters. | M |
| FORM-VAL-10 | `vision`/`mission`/`objectives`/`core_values` — non-empty on first render (from defaults); instructor edits may not reduce to empty. | M |
| FORM-VAL-11 | `program_outcomes` — required array, ≥1 non-empty entry. | M |
| FORM-VAL-12 | `course_outline` — required array, ≥1 row. | M |
| FORM-VAL-13 | `course_outline[].week` — positive integer. | M |
| FORM-VAL-14 | `course_outline[].intended_learning_outcomes` — required, non-empty. | M |
| FORM-VAL-15 | `course_outline[].contents` — required array, ≥1 entry. | M |
| FORM-VAL-16 | `course_outline[].timeframe.start_week` ≤ `end_week`. | M |
| FORM-VAL-17 | `course_requirements` — optional array. | C |
| FORM-VAL-18 | `evaluation_and_grading.components` — required array, ≥1 entry, weights sum to exactly 100. | M |
| FORM-VAL-19 | `evaluation_and_grading.components[].weight` — 0-100. | M |
| FORM-VAL-20 | `course_policy` — optional array. | C |
| FORM-VAL-21 | `references.books[].title` — required if the row exists. | M |
| FORM-VAL-22 | `references.books[].authors` — required if the row exists. | M |
| FORM-VAL-23 | `references.books[].year` — integer, 1900-2100. | M |
| FORM-VAL-24 | `references.books[].isbn` — optional; if present, matches ISBN-10/13 pattern. | S |
| FORM-VAL-25 | `references.online_references[].title` — required if the row exists. | M |
| FORM-VAL-26 | `references.online_references[].url` — required, `http(s)://` only. | M |
| FORM-VAL-27 | `references.online_references[].access_date` — not in the future. | S |
| FORM-VAL-28 | File upload — extension in `{pdf, docx, doc, odt, txt}`, size ≤50MB. | M |
| FORM-VAL-29 | Link input — `http(s)://` only, no `file://`/`ftp://`/private-IP targets (ties FORM-SEC-04). | M |
| FORM-VAL-30 | All free-text fields are trimmed of leading/trailing whitespace before validation runs. | S |
| FORM-VAL-31 | `no_of_hours` that looks inconsistent with `credit_units` (e.g., far outside the typical ~18 hours/unit/semester range) shall show a soft warning, not a hard block — real courses vary and this must not be a false-positive gate. | S |
| FORM-VAL-32 | `course_outline[].week` values shall be checked for sequential ordering and non-overlap across the whole outline, not only `start_week ≤ end_week` within a single row. | M |

### 6.7 FORM-SEC — Security (17)

| ID | Requirement | Pri |
|---|---|---|
| FORM-SEC-01 | File type shall be verified server-side by content sniffing, not just by the client-supplied extension. | M |
| FORM-SEC-02 | Uploaded files shall be scanned for malware before parsing begins. | M |
| FORM-SEC-03 | File size limits shall be enforced server-side, independent of the client-side check. | M |
| FORM-SEC-04 | Link fetching shall block private/internal IP ranges and non-HTTP(S) schemes (SSRF protection). | M |
| FORM-SEC-05 | DOC/DOCX/ODT parsing shall treat macro or embedded-script content as inert data, never execute it. | M |
| FORM-SEC-06 | Original file attachments shall be access-controlled to the owning instructor, the Dean, and no one else. | M |
| FORM-SEC-07 | Extraction and audit logs shall exclude raw student PII (this form does not handle student data directly, but downstream-linked records must not leak into these logs). | M |
| FORM-SEC-08 | The ingestion endpoint shall be rate-limited per user to prevent abuse. | M |
| FORM-SEC-09 | The ingestion endpoint shall require authentication; no anonymous ingestion path exists. | M |
| FORM-SEC-10 | Uploaded file retention shall follow the institution's data-retention policy and be deletable on account offboarding. | S |
| FORM-SEC-11 | Form submission shall be protected against CSRF. | M |
| FORM-SEC-12 | Extracted text rendered back into the UI shall be sanitized before render — extracted content is untrusted input and must not enable XSS. | M |
| FORM-SEC-13 | Every ingestion attempt (success or failure) shall produce an audit log entry with actor, timestamp, and outcome. | M |
| FORM-SEC-14 | The Extraction Preview shall never execute any embedded content (scripts, macros, active links) from the source file. | M |
| FORM-SEC-15 | Link-fetch responses shall be size-capped identically to file uploads (50MB) to prevent resource exhaustion. | M |
| FORM-SEC-16 | API keys or credentials for an optional AI-assisted extraction provider (FORM-INT-10) shall be stored server-side only, never exposed to the browser (ties NFR-SEC-05). | M |
| FORM-SEC-17 | Fetching a Link-ingestion URL shall show a brief notice that content from an external site is being retrieved, alongside the SSRF protections already required (FORM-SEC-04) — the instructor should know a third-party fetch is happening. | S |

### 6.8 FORM-TEST — Testing (15)

| ID | Requirement | Pri |
|---|---|---|
| FORM-TEST-01 | Every FORM-VAL rule shall have a corresponding unit test, both pass and fail cases. | M |
| FORM-TEST-02 | Extraction heuristics shall be tested against fixture files in each supported format (PDF, DOCX, DOC, ODT, TXT). | M |
| FORM-TEST-03 | Malformed/corrupted files shall be included in the fixture set to verify graceful rejection (FORM-BE-11). | M |
| FORM-TEST-04 | Boundary tests shall cover file size at exactly 50MB and 50MB+1 byte. | S |
| FORM-TEST-05 | The full form shall be tested for keyboard-only completion (FORM-UI-40). | M |
| FORM-TEST-06 | Manual, file, and link ingestion paths shall each be tested end-to-end across supported browsers. | M |
| FORM-TEST-07 | Resubmission of an already-accepted syllabus shall be tested to confirm it does not duplicate downstream courseware topic links (ties FORM-INT-04). | M |
| FORM-TEST-08 | Concurrent ingestion requests shall be load-tested for pipeline stability. | S |
| FORM-TEST-09 | The JSON Schema in §2 shall be validated against a real sample syllabus once the actual KCP template document is available (closes the provenance gap noted in §0). | M |
| FORM-TEST-10 | Frontend-backend contract tests shall verify the API response shapes in §7 match what the frontend expects. | M |
| FORM-TEST-11 | Every FORM-SEC rule shall have a corresponding negative-path test (e.g., attempted SSRF, oversized payload, disallowed file type). | M |
| FORM-TEST-12 | The form's English/Filipino label pairs shall be tested for completeness against `LanguageContext`. | S |
| FORM-TEST-13 | Editing Institutional Context on one syllabus shall be tested to confirm it does not alter any other syllabus's snapshot (ties FORM-DATA-09). | M |
| FORM-TEST-14 | The low-confidence fallback path (FORM-BE-09) shall be tested with a deliberately ambiguous fixture file. | S |
| FORM-TEST-15 | Usability testing with actual instructors shall be conducted per the RAD prototype-test-refine cycle (§2.2 of the thesis methodology) before this form is considered validated. | M |

### 6.9 FORM-MON — Monitoring (12)

| ID | Requirement | Pri |
|---|---|---|
| FORM-MON-01 | Extraction success/failure rate shall be logged per ingestion attempt. | M |
| FORM-MON-02 | Per-field confidence distributions shall be aggregated over time to identify systematically weak heuristics. | S |
| FORM-MON-03 | An internal alert shall fire if extraction success rate drops below a defined threshold. | S |
| FORM-MON-04 | Average time-to-complete the form shall be logged per upload-source type (file/link/manual). | C |
| FORM-MON-05 | Section-level abandonment (started but not completed) shall be logged to identify friction points. | C |
| FORM-MON-06 | Sections most frequently corrected after extraction shall be logged to prioritize heuristic improvements. | S |
| FORM-MON-07 | Monitoring data shall contain no student PII (this form doesn't collect any, but any joined reporting must preserve that boundary). | M |
| FORM-MON-08 | Monitoring shall remain internal logging/ops data — it must not surface as a new user-facing dashboard page (ties NFR-SEC-08, and the earlier decision against standalone monitoring UIs). | M |
| FORM-MON-09 | Monitoring data retention shall follow the same policy as other EduPulse operational logs. | S |
| FORM-MON-10 | Error-rate alerting shall cover the ingestion endpoint specifically, not just generic server health. | S |
| FORM-MON-11 | Extraction pipeline uptime shall be monitored so that FORM-BE-23's graceful-degradation path is known to be actively exercised, not silently broken. | S |
| FORM-MON-12 | Aggregate (non-per-student) form-completion metrics may be surfaced to the Dean as part of existing college-wide reporting — not a new report type, an addition to Performance's existing export (FR-PERF-09). | C |

**Total: 213 requirements** (21 + 58 + 27 + 13 + 18 + 32 + 17 + 15 + 12), each independently meaningful — no requirement was split or duplicated solely to inflate the count.

**Revision note (July 2026, second pass).** A separately drafted 1000-item expansion was reviewed against this spec. The vast majority reintroduced enterprise-SaaS infrastructure with no basis in this system (multi-tenancy, LMS integrations, SSO/MFA, cost chargeback, ML model-training pipelines, product governance boards) or directly contradicted established scope (admin roles, plagiarism detection). 23 items were genuinely specific to this form and are folded in above (FORM-FLOW-19–21, FORM-UI-45–58, FORM-BE-26–27, FORM-INT-13, FORM-VAL-31–32, FORM-SEC-17) — each cherry-picked for real value to the instructor filling out this form, not adopted by volume.

---

## 7. API Contract

The prototype has no live backend (§2.3 of the thesis places backend construction later in the RAD cycle) — this is the contract a real backend must implement; the current frontend simulates it client-side against `mockData.js`.

### `POST /api/syllabi/ingest`

Multipart form-data (file) or JSON body (link/manual).

```
Content-Type: multipart/form-data
  file: <binary>
  upload_method: "file"
  subject_hint: "IT 102"   // optional, helps section-anchor confidence

Content-Type: application/json  (link)
{ "upload_method": "link", "url": "https://...", "subject_hint": "IT 102" }

Content-Type: application/json  (manual)
{ "upload_method": "manual", "record": { ...full schema in §2, extraction fields omitted... } }
```

### `GET /api/syllabi/{id}/extraction`

Returns the current extraction preview (fields + confidence), whether processing is still in progress.

### `PATCH /api/syllabi/{id}/fields`

Accepts a partial record — used both for the Accept/Reject flow and ordinary manual edits.

### `POST /api/syllabi/{id}/submit`

Validates against the full schema + FORM-VAL/FORM-FLOW blocking rules; transitions `draft` → `submitted`.

---

## 8. Sample Responses

**Success — file upload accepted, extraction complete:**
```json
{
  "status": "success",
  "data": {
    "id": "syl-104",
    "status": "draft",
    "metadata": {
      "upload_method": "file",
      "original_filename": "WMAD303-1_Syllabus.docx",
      "extraction_confidence": 87,
      "field_confidence": {
        "course.course_code": 96,
        "course.course_title": 94,
        "course_outline": 78,
        "references.books": 55
      },
      "version": 1,
      "created_at": "2026-07-13T09:12:00Z"
    }
  },
  "warnings": [
    { "field": "references.books", "message": "Low confidence — please review extracted citations before accepting." }
  ]
}
```

**Success — manual entry submitted:**
```json
{
  "status": "success",
  "data": { "id": "syl-105", "status": "submitted", "metadata": { "upload_method": "manual", "version": 1 } },
  "warnings": []
}
```

**Failure — unsupported file type:**
```json
{
  "status": "error",
  "error": {
    "code": "UNSUPPORTED_FILE_TYPE",
    "message": "That file type isn't supported. Please upload a PDF, DOCX, DOC, ODT, or TXT file.",
    "field": "file"
  }
}
```

**Failure — file too large:**
```json
{
  "status": "error",
  "error": { "code": "FILE_TOO_LARGE", "message": "This file is 62MB — the limit is 50MB. Try a smaller export or split the document.", "field": "file" }
}
```

**Failure — evaluation weights don't sum to 100 (submit blocked):**
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Grading components add up to 90%, not 100%. Adjust the weights before submitting.",
    "field": "requirements_and_policies.evaluation_and_grading.components"
  }
}
```

**Failure — link fetch blocked (SSRF guard):**
```json
{
  "status": "error",
  "error": { "code": "LINK_NOT_ALLOWED", "message": "That link can't be fetched. Please use a public https:// URL.", "field": "url" }
}
```

**Failure — extraction pipeline unavailable (graceful degradation):**
```json
{
  "status": "partial",
  "data": { "id": "syl-106", "status": "draft", "metadata": { "upload_method": "file", "extraction_confidence": null } },
  "warnings": [
    { "field": "*", "message": "Automatic extraction is temporarily unavailable — your file was saved, and you can fill in the syllabus manually below." }
  ]
}
```
