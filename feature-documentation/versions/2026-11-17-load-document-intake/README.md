# Student restoration and teaching-load document intake · 17 November 2026

Restored the 1,869 preserved students outside CIT, bringing the active directory to 2,286. Cleared the 129 old instructor loads and 4,029 derived enrollments at the owner's explicit request. The 60-course catalog, 417 block-roster records, nine workspaces, retained content and account passwords were preserved. Private before-state backup and rolled-back rehearsal preceded the committed maintenance transaction. Legacy role placeholders remain retired.

Pulse and Course now recognize teaching-load PDF tables without AI. The page review preserves source columns, schedules and term labels, computes weekly schedule hours, flags discrepancies, requires actual instructor/course/block mapping and an explicit confirmation, and saves the reviewed metadata atomically. OCR retains ruled grid boundaries and word positions; missing/unreadable rows are identified rather than fabricated. Management role checks, stale-record protection and bounded inputs remain in both API and SQL.

Current, next and previous term filters follow the owner's confirmed AY/semester distinction. Year-bearing keys prevent term collisions; past/next loads do not feed current enrollments. Course and Instructor details expose source schedules, hours, room and source provenance. Source qualifications are retained without overwriting current staff profiles.

The supplied files were inspected in full: 56 rows across 11 forms for First Semester AY 2026–2027, and 66 rows across 12 forms for Second Semester AY 2025–2026. They were not imported into live loads. No syllabus approval, generated courseware, artificial grades or student activity was added.

See the [guide](../../system-manual/47-teaching-load-documents/README.md) and [validation](validation/results.md).

Released runtime `bfe3a711` is Ready on the production alias. The complete hosted gate passes 446 native tests; all six corrected desktop/phone PDF/OCR browser cases pass. The no-text sandbox response now correctly starts local PDF OCR. Upload a source through Pulse or Course, compare its mappings and warnings, and explicitly confirm the intended loads.
