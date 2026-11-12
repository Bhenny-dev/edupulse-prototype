# Targeted outline edits with Pulse

**Who:** an authorized instructor. **Where:** **Syllabus Builder ? Course Outline**.

Ask **Complete Week 1 Section 1 only** to complete that existing section. **Complete Week 1 Sections 1 and 2** selects both. Name a field, such as **Edit Week 1 Section 1 activities only**, or drag Pulse onto an editable field. Week/section numbers refer to the currently displayed outline, not the seven main syllabus sections.

Pulse prepares a review; generation does not change the form or save it. The review names the selected week, section and fields. **Before** and **Proposed** show changed fields only. Shared sections appear under every linked week because their content is one shared scope. Existing section IDs and week associations are retained by application code; the model cannot create or replace them.

![Targeted shared-section review](desktop-review.png)

Choose **Apply to open form** to place the reviewed values without saving. The example below fills the first section while keeping the second section's text. **Confirm and save draft** uses the existing explicit save, course/program-outcome prerequisites, authorization and workspace revision check. A changed form invalidates the preview; request **Refresh preview**. **Cancel edit** discards the proposal. Nothing is automatically checked, approved or published.

![Applied section with its sibling preserved](desktop-applied.png)

A validation failure identifies the field or constraint, for example `edits.0.changes.contents` for an invalid contents value. Missing targets, extra fields, forged identifiers, duplicate targets and inconsistent shared content are rejected. One bounded repair can regenerate the selected values; it does not apply the invalid attempt. A stale database revision is rejected rather than overwriting another save.

![Phone review](mobile-review.png)
![Phone outline after explicit placement](mobile-applied.png)

These captures use synthetic instructor form content and controlled model transport through the actual planner/validator. They demonstrate review and explicit placement, not live provider generation, Google sign-in or hosted data changes. Native tests separately verify database persistence, conflicts and rejection without partial writes. The route and authorized support-view restoration use the existing view-state mechanism; reload never replays generation or a confirmation. Unsaved form placement is not a saved draft.
