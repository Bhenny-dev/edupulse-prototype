# Instructor course loads, 27 November 2026

The Dean and Program Coordinator dashboard opens on instructor workloads in the selected academic term. Both roles can assign a course from the instructor row, edit a saved load, and review the corresponding syllabus, class roster and delivery. Term-wide monitoring and alerts remain in the dashboard. The catalog and directories provide links into the relevant workspace.

Per-block delivery uses the assigned teaching syllabus, released weeks and the same saved or term-calendar class windows as the instructor. A different instructor or teaching copy does not contribute to that load. Course inspection remains read-only. [Manual and captures](../system-manual/36-dean-activity-records/README.md)

## Validation

- Twenty targeted unit and database tests passed, including distinct teaching copies, saved slots, default term-calendar schedules and view-reference isolation.
- Six targeted Playwright checks passed on desktop and phone, including both staff roles, assignment persistence, file-reader reload, withdrawal of a stale instructor load and read-only block delivery.
- Eleven documentation capture tests passed with synthetic accounts and bundled previews. The capture assets were visually reviewed.
- This release uses the existing academic commands and requires no migration.
