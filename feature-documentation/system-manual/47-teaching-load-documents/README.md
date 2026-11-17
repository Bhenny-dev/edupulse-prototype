# 47 · Teaching-load documents and academic terms

The active directory includes the original students from all six departments. **Switch view → Student** and the instructor's registered-student picker start with **All departments** and retain department, program, year, search and pagination filters. Restoration reactivates preserved identities; it does not create new passwords or enroll students automatically.

The owner requested a fresh course-loading start on 17 November: 129 old loads and their 4,029 derived memberships were removed. The catalog, 417 block-roster records, accounts, passwords and workspace content were retained. Upload and review the actual loads to assign courses again.

## Read a PDF through Pulse

1. Open Pulse and attach or drop a teaching-load PDF. Up to three attachments may be read sequentially. Each file must be at most 4 MB; local PDF reading/OCR supports up to 60 pages per file. Larger documents require splitting, rather than silently omitting pages.
   A PDF without usable embedded text continues into on-device OCR even when the sandbox reports that it needs OCR. Account, rate-limit, network and unsupported-format errors still stop the upload and show their actual reason.
2. Ask to extract the teaching loads, then choose **Review extracted course loads**. This is a system extraction, not a model request. Its page modal shows the entire extracted table, instructor forms, units and computed schedule hours. Reading and previewing make no record changes.
3. Use **Instructor form** to focus one form, and choose which rows to import. The preview retains instructor name, highest degree, source subject code/title, semester/year, time, days, units, lecture/lab units, listed hours, computed schedule hours, room, student count, program, page and row. Wrapped cells remain in their original column. An unreadable page is explicitly identified.
4. Compare warnings and totals with the source. Multiple meetings on one day count as separate sessions. `TTH` means Tuesday/Thursday; a single interval on two days counts twice. AM/PM that is absent from the source remains unconfirmed. These times do not automatically become publication or assessment delivery schedules.
5. Map each selected row to a verified active instructor, recorded course and actual block. Retired instructor accounts are excluded; a current account ban or suspension prevents load assignment. Source section suffixes are retained but are not invented block assignments. Unmatched names/codes require a choice; no instructor or curriculum course is created from OCR. A source degree is retained per load and does not replace a current staff qualification automatically.
6. Check **I compared the selected rows…**, then **Confirm selected loads**. A Dean, Program Coordinator or System Admin can confirm; an Instructor can inspect an attached document but cannot assign a load. Invalid mappings, duplicate class/term targets or records changed since preview reject the transaction. At most 500 rows can be confirmed in one import.

The same PDF review is available from **Course → Upload course load**. Existing CSV/Excel intake remains available. Confirming a load does not approve a syllabus, generate courseware, publish materials, fabricate student activity or turn the source's headcount into student memberships. Current block rosters remain the source of actual students.

## Switch term records

**Academic term** appears on Course, Instructors and the Instructor's course list. The owner confirmed these labels:

| Filter | Record term |
| --- | --- |
| Current | 1st Semester · AY 2026–2027 |
| Next | 2nd Semester · AY 2026–2027 |
| Previous | 2nd Semester · AY 2025–2026 |

Other recorded terms, **Term not recorded** and **All terms** remain selectable. Term choices are URL references and survive reload without replaying an import. The instructor dashboard uses the current term. Historical/next-term imports remain separate records and do not create current enrollments. The current-term baseline is the owner's explicit designation, not an inferred date rollover.

Course and Instructor load details show schedule, room, units, lecture/lab units, listed and computed hours, source headcount/program/degree and source filename/page. The filename/page are retained with the record; this upload flow does not retain original PDF bytes or turn them into a public link. Unconfirmed upload forms and selections are not replayed after reload.

## Supplied-file inspection

The original First Semester AY 2026–2027 file contains 11 instructor forms and 56 rows. The Second Semester AY 2025–2026 file contains 12 forms and 66 rows. The latter is past loading, not next-semester loading. Source values and printed total discrepancies remain reviewable; the files were scanned without assigning their rows to live instructors. Their real names, signatures and source files are kept out of public documentation captures.

The [release record](../../versions/2026-11-17-load-document-intake/README.md) separates source-file inspection, controlled browser checks and hosted database verification.
