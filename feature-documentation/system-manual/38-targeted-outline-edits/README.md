# Targeted outline edits with Pulse

**Who:** an authorized instructor. **Where:** **Syllabus Builder ? Course Outline**.

Ask **Complete Week 1 Section 1 only** to complete that existing section. **Complete Week 1 Sections 1 and 2** selects both. Name a field, such as **Edit Week 1 Section 1 activities only**, or drag Pulse onto an editable field. Week/section numbers refer to the currently displayed outline, not the seven main syllabus sections.

Pulse validates content-only output and directly places the requested values in the open draft form. Optional **Review changes** shows Before and Now text. Shared sections appear under every linked week because their content is one shared scope. Existing IDs and week associations come from application data; the model cannot create or replace them.

![Placed shared section with optional review](desktop-review.png)

The example fills the first section while preserving the second section. **Save as Drafted** saves explicitly and keeps the builder open. A manual target edit during inference rejects the chunk atomically; unrelated changes remain. Nothing is automatically checked, approved, activated or published.

![Placed section with its sibling preserved](desktop-applied.png)

A validation failure identifies the field or constraint, for example `edits.0.changes.contents` for an invalid contents value. Missing targets, extra fields, forged identifiers, duplicate targets and inconsistent shared content are rejected. One bounded repair can regenerate the selected values; it does not apply the invalid attempt. A stale database revision is rejected rather than overwriting another save.

![Phone review](mobile-review.png)
![Phone outline after validated placement](mobile-applied.png)

These captures use synthetic instructor form content and controlled model transport through the actual planner/validator. They demonstrate direct placement and optional review, not live provider generation, Google sign-in or hosted data changes. Native tests separately verify database persistence, conflicts and rejection without partial writes. The route and authorized support-view restoration use the existing view-state mechanism; reload never replays generation or a confirmation. Unsaved form placement is not a saved draft.
