# Connected academic workflow

## Saved records

The syllabus builder now saves actual form values, loads existing drafts for editing, increments document versions, copies a syllabus into a new draft, and archives/restores records. Course registrations and generated courseware use the same workspace. Active saved syllabi drive both the Courseware Builder and its outline viewer.

The status bar distinguishes device preview, local database, and authenticated account storage. Pending changes are journaled on the device; server writes use revision checks. A stale save cannot silently replace the newer server copy. Conflict recovery exports the pending snapshot before loading the current server version.

## Approval and extraction

1. Save a draft and review its actual weekly outcomes and topics.
2. Mark it checked, then download a real seven-section DOCX.
3. Complete the institutional approval route outside EduPulse.
4. Attest that approvals are complete and upload the returned DOCX (up to 500 KB).
5. Review the extracted rows, then explicitly activate the syllabus.
6. Generate courseware from those rows through the existing AI API. Output remains a draft until instructor review.

EduPulse retains the original approved file, filename, size, SHA-256 checksum, upload time, and instructor attestation. The API checks attachment size and checksum. Downloading the retained file reproduces the original bytes. EduPulse does not verify signatures. Removing an attachment returns the syllabus to draft.

## Corrections to prototype behavior

- Removed simulated AI outline timers and invented weekly topics. “Load curriculum outline” now copies only an available curriculum reference and says when none exists.
- Parsing preserves document paragraphs, supports labeled weeks and common outline tables, and emits only rows found in the document. It does not invent missing grading rules, attendance policies, or a match to the first curriculum course.
- Replaced syllabus history's fabricated version actions with recorded lifecycle changes. History records metadata, not full historical document snapshots; full workspace backup is available separately.
- Fixed duplicate sample syllabus IDs and form-component remounting that could interrupt typing. Imported non-contiguous weeks now edit their own rows.
- The Courseware header wraps its generation action onto another row on small screens so long course titles remain readable.
- Labeled the shared repository as a sample library. Copying a sample always starts a new draft.

## Boundaries

Institutional curriculum, roster import parsing, dashboards, student monitoring, scores, and several administrative modules still contain prototype behavior. Account workspaces are private; this release does not add cross-instructor sharing or student delivery. Unsaved text in the syllabus builder still requires the Save button before leaving; the recovery journal covers changes already submitted to the workspace. Hosted generation still needs a configured provider; local Ollama remains the default without API fees.
